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
    err.code === "42P01"
  );
}

// In-memory store for offline/local-first testing and environments without live Supabase
const localVipEntitlements: Map<string, VipEntitlement> = new Map();

/**
 * Server-authoritative check for a user's VIP status.
 * VIP is an entitlement that extends custom audio slots without conferring admin rights.
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

    // Check local fallback
    if (!isSupabaseConfigured()) {
      for (const ent of localVipEntitlements.values()) {
        if (
          ent.user_id === targetId &&
          ent.status === "active" &&
          new Date(ent.expires_at) > now
        ) {
          const diffMs = new Date(ent.expires_at).getTime() - now.getTime();
          const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return { isVip: true, entitlement: ent, remainingDays };
        }
      }
      return { isVip: false, entitlement: null, remainingDays: 0 };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: ent, error } = await serviceSupabase
      .from("vip_entitlements")
      .select("*")
      .eq("user_id", targetId)
      .eq("status", "active")
      .gt("expires_at", now.toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !ent) {
      return { isVip: false, entitlement: null, remainingDays: 0 };
    }

    const diffMs = new Date(ent.expires_at).getTime() - now.getTime();
    const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      isVip: true,
      entitlement: ent as VipEntitlement,
      remainingDays,
    };
  } catch {
    return { isVip: false, entitlement: null, remainingDays: 0 };
  }
}

/**
 * Grant temporary VIP access to a selected student.
 * Strictly verified: Admin capability required. Does NOT escalate role to admin.
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

    if (!isSupabaseConfigured()) {
      localVipEntitlements.set(newEntitlement.id, newEntitlement);
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
          content: `Félicitations ! Vous bénéficiez désormais du badge VIP Vérifié avec quota étendu de soundscapes personnalisés jusqu'au ${expiresAt.toLocaleDateString("fr-FR")}.`,
          link: "/my-space",
        });
      } catch {}

      return { success: true, entitlement: newEntitlement };
    }

    const serviceSupabase = getServiceSupabase();

    // Revoke any previously active entitlements for this user to avoid conflicts
    await serviceSupabase
      .from("vip_entitlements")
      .update({ status: "revoked", updated_at: now.toISOString() })
      .eq("user_id", params.targetUserId)
      .eq("status", "active");

    const { data, error } = await serviceSupabase
      .from("vip_entitlements")
      .insert({
        user_id: params.targetUserId,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        granted_by: granterId,
        reason: params.reason?.trim() || null,
        status: "active",
      })
      .select()
      .single();

    if (error || !data) {
      if (isTableMissingError(error)) {
        localVipEntitlements.set(newEntitlement.id, newEntitlement);
        await logAuditEvent({
          actor_id: granterId,
          action: "VIP_GRANTED",
          target_id: params.targetUserId,
          target_type: "vip",
          metadata: {
            expires_at: expiresAt.toISOString(),
            reason: params.reason,
            fallback: true,
          },
        });
        safeRevalidate("/admin");
        return { success: true, entitlement: newEntitlement };
      }
      return { success: false, error: error?.message || "Échec de l'enregistrement VIP." };
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

    return { success: true, entitlement: data as VipEntitlement };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de l'octroi de l'accès VIP." };
  }
}

/**
 * Revoke an active VIP grant immediately.
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

    if (!isSupabaseConfigured()) {
      const ent = localVipEntitlements.get(entitlementId);
      if (ent) {
        ent.status = "revoked";
        ent.updated_at = now;
      }
      await logAuditEvent({
        actor_id: granterId,
        action: "VIP_REVOKED",
        target_id: entitlementId,
        target_type: "vip",
      });
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase
      .from("vip_entitlements")
      .update({ status: "revoked", updated_at: now })
      .eq("id", entitlementId);

    if (error) {
      if (isTableMissingError(error)) {
        const ent = localVipEntitlements.get(entitlementId);
        if (ent) {
          ent.status = "revoked";
          ent.updated_at = now;
        }
        await logAuditEvent({
          actor_id: granterId,
          action: "VIP_REVOKED",
          target_id: entitlementId,
          target_type: "vip",
        });
        safeRevalidate("/admin");
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      actor_id: granterId,
      action: "VIP_REVOKED",
      target_id: entitlementId,
      target_type: "vip",
    });

    safeRevalidate("/admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la révocation VIP." };
  }
}

/**
 * List all VIP entitlement grants for administrative review.
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
          user_display_name: "Étudiant Test",
          user_email: "etudiant@university.tn",
        };
      });
      return { success: true, entitlements: list };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: entitlements, error } = await serviceSupabase
      .from("vip_entitlements")
      .select(`
        *,
        user:profiles!vip_entitlements_user_id_fkey(display_name),
        granter:profiles!vip_entitlements_granted_by_fkey(display_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        const list = Array.from(localVipEntitlements.values()).map((e) => {
          const isExpired = e.status === "active" && new Date(e.expires_at) < now;
          return {
            ...e,
            status: isExpired ? ("expired" as const) : e.status,
            user_display_name: "Étudiant",
            user_email: "etudiant@university.tn",
          };
        });
        return { success: true, entitlements: list };
      }
      return { success: false, entitlements: [], error: error.message };
    }

    const formatted: VipEntitlement[] = (entitlements || []).map((e: any) => {
      const isExpired = e.status === "active" && new Date(e.expires_at) < now;
      return {
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
      };
    });

    return { success: true, entitlements: formatted };
  } catch (err: any) {
    return { success: false, entitlements: [], error: err?.message };
  }
}
