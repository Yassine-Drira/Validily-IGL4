"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { assertAdmin, getRequesterUser } from "@/lib/auth/authorization";
import { VipEntitlement } from "@/types/database";
import { logAuditEvent } from "@/lib/audit/audit-logger";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42P01"
  );
}

// Global in-memory cache for offline/local-first testing and instant cross-worker sync
const globalVipState = globalThis as unknown as {
  __localVipEntitlements?: Map<string, VipEntitlement>;
};
if (!globalVipState.__localVipEntitlements) {
  globalVipState.__localVipEntitlements = new Map<string, VipEntitlement>();
}
const localVipEntitlements = globalVipState.__localVipEntitlements;

/**
 * Server-authoritative check for a user's VIP status.
 * VIP is an entitlement that extends custom audio slots without conferring admin rights.
 * Resiliently checks persistent Supabase auth user_metadata, database tables, and hot cache.
 */
export async function getUserVipStatus(userId?: string): Promise<{
  isVip: boolean;
  entitlement: VipEntitlement | null;
  remainingDays: number;
}> {
  try {
    let targetId = userId;
    if (!targetId) {
      const requester = await getRequesterUser();
      targetId = requester?.id;
    }

    if (!targetId) {
      return { isVip: false, entitlement: null, remainingDays: 0 };
    }

    const now = new Date();

    // 1. Check local in-memory hot cache first
    for (const ent of localVipEntitlements.values()) {
      if (
        ent.user_id === targetId &&
        ent.status === "active" &&
        new Date(ent.expires_at) > now
      ) {
        const diffMs = new Date(ent.expires_at).getTime() - now.getTime();
        const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return { isVip: true, entitlement: ent, remainingDays };
      }
    }

    if (!isSupabaseConfigured()) {
      return { isVip: false, entitlement: null, remainingDays: 0 };
    }

    const serviceSupabase = getServiceSupabase();

    // 2. Query persistent Supabase auth user_metadata (bulletproof storage across refreshes)
    try {
      const { data: userAuth } = await serviceSupabase.auth.admin.getUserById(targetId);
      const meta = userAuth?.user?.user_metadata;
      const isVipFlag = Boolean(meta?.is_vip);
      const ent = meta?.vip_entitlement as VipEntitlement | undefined;
      const expiresAtStr = meta?.vip_expires_at || ent?.expires_at;

      if ((isVipFlag || ent?.status === "active") && expiresAtStr) {
        const expiresDate = new Date(expiresAtStr);
        if (expiresDate > now) {
          const diffMs = expiresDate.getTime() - now.getTime();
          const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          const resolvedEnt: VipEntitlement = ent || {
            id: `vip-${targetId}`,
            user_id: targetId,
            starts_at: userAuth.user.created_at,
            expires_at: expiresDate.toISOString(),
            granted_by: "administration",
            reason: "Accès VIP accordé par l'administration",
            status: "active",
            created_at: userAuth.user.created_at,
            updated_at: userAuth.user.updated_at || userAuth.user.created_at,
          };
          localVipEntitlements.set(resolvedEnt.id, resolvedEnt);
          return { isVip: true, entitlement: resolvedEnt, remainingDays };
        } else if (isVipFlag) {
          // Expired VIP: automatically clean up flag
          try {
            await serviceSupabase.auth.admin.updateUserById(targetId, {
              user_metadata: {
                ...(meta || {}),
                is_vip: false,
                vip_entitlement: ent ? { ...ent, status: "expired" } : undefined,
              },
            });
          } catch {}
        }
      }
    } catch {
      // Auth admin lookup failed or network exception
    }

    // 3. Fallback to vip_entitlements table if schema exists
    try {
      const { data: ent, error } = await serviceSupabase
        .from("vip_entitlements")
        .select("*")
        .eq("user_id", targetId)
        .eq("status", "active")
        .gt("expires_at", now.toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && ent) {
        const diffMs = new Date(ent.expires_at).getTime() - now.getTime();
        const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        localVipEntitlements.set(ent.id, ent as VipEntitlement);
        return {
          isVip: true,
          entitlement: ent as VipEntitlement,
          remainingDays,
        };
      }
    } catch {
      // Table missing - handled gracefully
    }

    return { isVip: false, entitlement: null, remainingDays: 0 };
  } catch {
    return { isVip: false, entitlement: null, remainingDays: 0 };
  }
}

/**
 * Grant temporary VIP access to a selected student.
 * Strictly verified: Admin capability required. Does NOT escalate role to admin.
 * Persists to Supabase auth user_metadata, vip_entitlements table (if present), and hot cache.
 */
export async function grantVipAccess(params: {
  targetUserId: string;
  durationDays?: number;
  customExpiresAt?: string;
  reason?: string;
}): Promise<{
  success: boolean;
  entitlement?: VipEntitlement;
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error || "Privilèges administrateur requis." };
    }

    // 1. Strict hierarchy: Temporary/delegated admins CANNOT modify or assign VIP roles
    if (adminCheck.isTemporary || adminCheck.user?.isTemporaryAdmin) {
      return {
        success: false,
        error: "Action non autorisée : les administrateurs temporaires ne sont pas autorisés à attribuer le statut VIP.",
      };
    }

    if (!params.targetUserId) {
      return { success: false, error: "Identifiant utilisateur cible obligatoire." };
    }

    const now = new Date();
    let expiresAt: Date;

    if (params.customExpiresAt) {
      expiresAt = new Date(params.customExpiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt <= now) {
        return { success: false, error: "La date d'expiration doit être future et valide." };
      }
    } else {
      const days = params.durationDays && params.durationDays > 0 ? params.durationDays : 30;
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const adminUser = await getRequesterUser();
    const granterId = adminUser?.id || "system";

    const newEntitlement: VipEntitlement = {
      id: `vip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: params.targetUserId,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      granted_by: granterId,
      reason: params.reason?.trim() || "Accès VIP accordé par l'administration",
      status: "active",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Always update global in-memory cache
    localVipEntitlements.set(newEntitlement.id, newEntitlement);

    if (isSupabaseConfigured()) {
      const serviceSupabase = getServiceSupabase();

      // 1. Persistent Storage in Supabase auth user_metadata (survives refreshes & redeployments)
      try {
        const { data: userAuth } = await serviceSupabase.auth.admin.getUserById(params.targetUserId);
        if (userAuth?.user) {
          await serviceSupabase.auth.admin.updateUserById(params.targetUserId, {
            user_metadata: {
              ...(userAuth.user.user_metadata || {}),
              is_vip: true,
              vip_expires_at: expiresAt.toISOString(),
              vip_entitlement: newEntitlement,
            },
          });
        }
      } catch (authErr) {
        console.error("Failed to update user_metadata for VIP grant:", authErr);
      }

      // 2. Also attempt to insert into vip_entitlements table if schema exists
      try {
        await serviceSupabase
          .from("vip_entitlements")
          .update({ status: "revoked", updated_at: now.toISOString() })
          .eq("user_id", params.targetUserId)
          .eq("status", "active");

        await serviceSupabase
          .from("vip_entitlements")
          .insert({
            user_id: params.targetUserId,
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            granted_by: granterId,
            reason: params.reason?.trim() || null,
            status: "active",
          });
      } catch {
        // Table missing or relationship error - handled gracefully via persistent user_metadata
      }
    }

    await logAuditEvent({
      actor_id: granterId,
      action: "VIP_GRANTED",
      target_id: params.targetUserId,
      target_type: "vip",
      metadata: {
        expires_at: expiresAt.toISOString(),
        reason: params.reason,
      },
    });

    // Dispatch VIP role announcement notification
    try {
      const { createNotification } = await import("@/lib/actions/notification-actions");
      await createNotification({
        recipientId: params.targetUserId,
        senderId: granterId,
        senderName: adminUser?.name || "Administrateur Principal",
        type: "role_assignment",
        title: "✨ Statut VIP Vérifié accordé",
        content: `Félicitations ! Votre compte bénéficie désormais du badge VIP Vérifié avec quota étendu de soundscapes personnalisés jusqu'au ${expiresAt.toLocaleDateString("fr-FR")}.`,
        link: "/my-space",
      });
    } catch {}

    safeRevalidate("/admin");
    safeRevalidate("/my-space");
    safeRevalidate("/");

    return { success: true, entitlement: newEntitlement };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de l'octroi de l'accès VIP." };
  }
}

/**
 * Revoke an active VIP grant immediately.
 * Persistently revokes across Supabase auth user_metadata, database tables, and hot cache.
 */
export async function revokeVipAccess(entitlementId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error || "Privilèges administrateur requis." };
    }

    // 1. Strict hierarchy: Temporary/delegated admins CANNOT revoke VIP roles
    if (adminCheck.isTemporary || adminCheck.user?.isTemporaryAdmin) {
      return {
        success: false,
        error: "Action non autorisée : les administrateurs temporaires ne peuvent pas révoquer le statut VIP.",
      };
    }

    const adminUser = await getRequesterUser();
    const granterId = adminUser?.id || "system";
    const now = new Date().toISOString();

    // 1. Update in-memory hot cache
    const localEnt = localVipEntitlements.get(entitlementId);
    let targetUserId = localEnt?.user_id;
    if (localEnt) {
      localEnt.status = "revoked";
      localEnt.updated_at = now;
    }

    if (isSupabaseConfigured()) {
      const serviceSupabase = getServiceSupabase();

      // 2. Persistent revocation in Supabase auth user_metadata
      try {
        const { data: authData } = await serviceSupabase.auth.admin.listUsers();
        const users = authData?.users || [];
        for (const u of users) {
          const meta = u.user_metadata;
          if (
            meta?.vip_entitlement?.id === entitlementId ||
            u.id === entitlementId.replace("vip-", "") ||
            u.id === targetUserId
          ) {
            targetUserId = u.id;
            await serviceSupabase.auth.admin.updateUserById(u.id, {
              user_metadata: {
                ...(meta || {}),
                is_vip: false,
                vip_entitlement: {
                  ...(meta?.vip_entitlement || {}),
                  status: "revoked",
                  updated_at: now,
                },
              },
            });
            break;
          }
        }
      } catch (authErr) {
        console.error("Failed to revoke VIP in auth user_metadata:", authErr);
      }

      // 3. Also update vip_entitlements table if it exists
      try {
        await serviceSupabase
          .from("vip_entitlements")
          .update({ status: "revoked", updated_at: now })
          .eq("id", entitlementId);
      } catch {
        // Table missing
      }
    }

    await logAuditEvent({
      actor_id: granterId,
      action: "VIP_REVOKED",
      target_id: entitlementId,
      target_type: "vip",
    });

    safeRevalidate("/admin");
    safeRevalidate("/my-space");
    safeRevalidate("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la révocation VIP." };
  }
}

/**
 * List all VIP entitlement grants for administrative review.
 * Aggregates persistent grants from Supabase auth user_metadata, database tables, and hot cache.
 */
export async function listVipEntitlements(): Promise<{
  success: boolean;
  entitlements: VipEntitlement[];
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, entitlements: [], error: adminCheck.error };
    }

    const now = new Date();

    if (!isSupabaseConfigured()) {
      const list = Array.from(localVipEntitlements.values()).map((e) => {
        const isExpired = e.status === "active" && new Date(e.expires_at) < now;
        return {
          ...e,
          status: isExpired ? ("expired" as const) : e.status,
          user_display_name: e.user_display_name || "Étudiant Test",
          user_email: e.user_email || "etudiant@university.tn",
        };
      });
      return { success: true, entitlements: list };
    }

    const serviceSupabase = getServiceSupabase();

    // 1. Fetch persistent entitlements from Supabase auth user_metadata and profiles
    const [authDataRes, profilesRes] = await Promise.all([
      serviceSupabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
      serviceSupabase.from("profiles").select("id, display_name, avatar_url, role"),
    ]);

    const authUsers = authDataRes?.data?.users || [];
    const profiles = profilesRes?.data || [];
    const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

    const list: VipEntitlement[] = [];
    const seenUserIds = new Set<string>();

    for (const u of authUsers) {
      const meta = u.user_metadata;
      const ent = meta?.vip_entitlement as VipEntitlement | undefined;
      const isVipFlag = Boolean(meta?.is_vip);
      const expiresAt = meta?.vip_expires_at || ent?.expires_at;

      if (ent || isVipFlag) {
        seenUserIds.add(u.id);
        const profile = profileMap.get(u.id);
        const granterProfile = ent?.granted_by ? profileMap.get(ent.granted_by) : null;
        const isExpired = expiresAt && new Date(expiresAt) < now;
        const status = ent?.status === "revoked" ? "revoked" : isExpired ? "expired" : "active";

        const resolvedEnt: VipEntitlement = {
          id: ent?.id || `vip-${u.id}`,
          user_id: u.id,
          starts_at: ent?.starts_at || u.created_at,
          expires_at: expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
          granted_by: ent?.granted_by || "administration",
          reason: ent?.reason || "Accès VIP accordé par l'administration",
          status,
          created_at: ent?.created_at || u.created_at,
          updated_at: ent?.updated_at || u.updated_at || u.created_at,
          user_display_name: profile?.display_name || meta?.full_name || u.email?.split("@")[0] || "Étudiant",
          user_email: u.email,
          granter_display_name: granterProfile?.display_name || "Admin",
        };

        list.push(resolvedEnt);
        localVipEntitlements.set(resolvedEnt.id, resolvedEnt);
      }
    }

    // 2. Also check if vip_entitlements table exists with any additional records
    try {
      const { data: dbEntitlements, error } = await serviceSupabase
        .from("vip_entitlements")
        .select(`
          *,
          user:profiles!vip_entitlements_user_id_fkey(display_name),
          granter:profiles!vip_entitlements_granted_by_fkey(display_name)
        `)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(dbEntitlements)) {
        for (const e of dbEntitlements) {
          if (!seenUserIds.has(e.user_id)) {
            const isExpired = e.status === "active" && new Date(e.expires_at) < now;
            list.push({
              id: e.id,
              user_id: e.user_id,
              starts_at: e.starts_at,
              expires_at: e.expires_at,
              granted_by: e.granted_by,
              reason: e.reason,
              status: isExpired ? "expired" : e.status,
              created_at: e.created_at,
              updated_at: e.updated_at,
              user_display_name: e.user?.display_name || "Étudiant",
              granter_display_name: e.granter?.display_name || "Admin",
            });
          }
        }
      }
    } catch {
      // Table missing - expected when schema is unmigrated
    }

    // 3. Merge any in-memory local items not yet seen
    for (const ent of localVipEntitlements.values()) {
      if (!list.some((e) => e.id === ent.id || e.user_id === ent.user_id)) {
        const isExpired = ent.status === "active" && new Date(ent.expires_at) < now;
        list.push({
          ...ent,
          status: isExpired ? "expired" : ent.status,
          user_display_name: ent.user_display_name || "Étudiant",
          granter_display_name: ent.granter_display_name || "Admin",
        });
      }
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { success: true, entitlements: list };
  } catch (err: any) {
    return { success: false, entitlements: [], error: err?.message };
  }
}

/**
 * Reset local store helper for testing environments.
 */
export async function _resetLocalVipStore(): Promise<void> {
  localVipEntitlements.clear();
}
