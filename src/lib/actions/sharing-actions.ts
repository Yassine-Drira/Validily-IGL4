import { getServiceSupabase } from "../supabase/admin";
import { getRequesterUser, isUserAdmin } from "../auth/authorization";
import { logAuditEvent } from "../audit/audit-logger";

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export interface ResourceShare {
  id: string;
  resource_id: string;
  grantor_id: string;
  recipient_id: string;
  permission: "viewer" | "editor";
  created_at: string;
  recipient_email?: string;
  recipient_name?: string;
}

// In-memory registry for local testing and offline execution
const mockSharesStore = new Map<string, ResourceShare[]>();

export function _resetMockSharesStore(): void {
  mockSharesStore.clear();
}

export function _injectMockShare(share: ResourceShare): void {
  const list = mockSharesStore.get(share.resource_id) || [];
  mockSharesStore.set(share.resource_id, [...list.filter((s) => s.recipient_id !== share.recipient_id), share]);
}

async function safeRevalidate(path: string) {
  try {
    const nextCache = await import("next/cache");
    if (nextCache?.revalidatePath) {
      nextCache.revalidatePath(path);
    }
  } catch {
    // Outside active request context
  }
}

/**
 * Share a resource with an explicit student recipient by email
 */
export async function shareResourceAction(data: {
  resourceId: string;
  recipientEmail: string;
  permission?: "viewer" | "editor";
}): Promise<{ success: boolean; share?: ResourceShare; error?: string }> {
  try {
    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Authentification requise pour partager une ressource." };
    }

    const permission = data.permission || "viewer";
    const cleanEmail = data.recipientEmail.trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: "Adresse e-mail du destinataire requise." };
    }

    if (requester.email && cleanEmail === requester.email.toLowerCase()) {
      return { success: false, error: "Vous ne pouvez pas partager une ressource avec vous-même." };
    }

    if (!isSupabaseConfigured()) {
      // Local/test mock implementation
      const mockShare: ResourceShare = {
        id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        resource_id: data.resourceId,
        grantor_id: requester.id,
        recipient_id: `user_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
        permission,
        created_at: new Date().toISOString(),
        recipient_email: cleanEmail,
      };
      _injectMockShare(mockShare);
      return { success: true, share: mockShare };
    }

    const serviceSupabase = getServiceSupabase();

    // 1. Verify resource ownership or admin authority
    const { data: resource, error: resErr } = await serviceSupabase
      .from("resources")
      .select("id, owner_id, title, visibility")
      .eq("id", data.resourceId)
      .maybeSingle();

    if (resErr || !resource) {
      return { success: false, error: "Ressource introuvable." };
    }

    const isAdmin = requester.role === "admin" || (await isUserAdmin(requester.id));
    if (resource.owner_id !== requester.id && !isAdmin) {
      return {
        success: false,
        error: "Accès refusé. Seul le propriétaire ou un administrateur peut partager ce document.",
      };
    }

    // 2. Resolve recipient from profiles
    const { data: recipientProfile, error: profileErr } = await serviceSupabase
      .from("profiles")
      .select("id, display_name")
      .eq("display_name", cleanEmail)
      .maybeSingle();

    let recipientId = recipientProfile?.id;

    if (!recipientId) {
      // Query auth.users via admin API
      const { data: userList } = await serviceSupabase.auth.admin.listUsers();
      const matched = userList?.users?.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );
      if (matched) {
        recipientId = matched.id;
      }
    }

    if (!recipientId) {
      return {
        success: false,
        error: `Aucun compte étudiant trouvé pour l'adresse ${cleanEmail}. L'utilisateur doit d'abord s'inscrire sur la plateforme.`,
      };
    }

    if (recipientId === requester.id) {
      return { success: false, error: "Vous ne pouvez pas partager une ressource avec vous-même." };
    }

    // 3. Insert or update share grant in resource_shares
    const { data: share, error: shareErr } = await serviceSupabase
      .from("resource_shares")
      .upsert(
        {
          resource_id: data.resourceId,
          grantor_id: requester.id,
          recipient_id: recipientId,
          permission,
          created_at: new Date().toISOString(),
        },
        { onConflict: "resource_id,recipient_id" }
      )
      .select()
      .single();

    if (shareErr) {
      console.error("Failed to insert resource_shares:", shareErr);
      return { success: false, error: shareErr.message };
    }

    // 4. Update parent resource visibility to 'shared' if it was private
    if (resource.visibility === "private") {
      await serviceSupabase
        .from("resources")
        .update({ visibility: "shared", updated_at: new Date().toISOString() })
        .eq("id", data.resourceId);
    }

    await logAuditEvent({
      actor_id: requester.id,
      action: "RESOURCE_SHARED",
      target_id: data.resourceId,
      target_type: "resource",
      metadata: {
        recipient_id: recipientId,
        recipient_email: cleanEmail,
        permission,
        resource_title: resource.title,
      },
    });

    safeRevalidate(`/resources/${data.resourceId}`);
    safeRevalidate("/my-space");
    return { success: true, share };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec du partage de la ressource." };
  }
}

/**
 * Revoke an explicit share grant from a recipient
 */
export async function revokeResourceShareAction(data: {
  resourceId: string;
  recipientId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Authentification requise pour révoquer un partage." };
    }

    if (!isSupabaseConfigured()) {
      const list = mockSharesStore.get(data.resourceId) || [];
      mockSharesStore.set(
        data.resourceId,
        list.filter((s) => s.recipient_id !== data.recipientId)
      );
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();

    // 1. Verify ownership or admin authority
    const { data: resource } = await serviceSupabase
      .from("resources")
      .select("id, owner_id, title")
      .eq("id", data.resourceId)
      .maybeSingle();

    if (!resource) {
      return { success: false, error: "Ressource introuvable." };
    }

    const isAdmin = requester.role === "admin" || (await isUserAdmin(requester.id));
    if (resource.owner_id !== requester.id && !isAdmin) {
      return { success: false, error: "Accès refusé. Seul le propriétaire peut révoquer l'accès." };
    }

    // 2. Delete share record
    const { error: delErr } = await serviceSupabase
      .from("resource_shares")
      .delete()
      .eq("resource_id", data.resourceId)
      .eq("recipient_id", data.recipientId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    await logAuditEvent({
      actor_id: requester.id,
      action: "RESOURCE_SHARE_REVOKED",
      target_id: data.resourceId,
      target_type: "resource",
      metadata: { revoked_recipient_id: data.recipientId, resource_title: resource.title },
    });

    safeRevalidate(`/resources/${data.resourceId}`);
    safeRevalidate("/my-space");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec de la révocation du partage." };
  }
}

/**
 * Check whether a user is authorized to access a given resource
 */
export async function checkResourceAccess(
  resource: { id: string; owner_id: string; visibility: string; publication_status?: string },
  userId?: string | null,
  requiredPermission: "view" | "edit" = "view"
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Public resources are readable by everyone
  if (resource.visibility === "public") {
    if (requiredPermission === "view") {
      return { allowed: true };
    }
  }

  // 2. If unauthenticated and resource is not public, access is denied
  if (!userId) {
    return { allowed: false, reason: "Authentification requise pour accéder à cette ressource non publique." };
  }

  // 3. Owners have full read/write access
  if (resource.owner_id === userId) {
    return { allowed: true };
  }

  // 4. Admin override
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return { allowed: true };
  }

  // 5. If private, only owner or admin can access
  if (resource.visibility === "private") {
    return { allowed: false, reason: "Ce document est privé et réservé à son propriétaire." };
  }

  // 6. If shared, check resource_shares table or test store
  if (resource.visibility === "shared") {
    if (!isSupabaseConfigured()) {
      const shares = mockSharesStore.get(resource.id) || [];
      const grant = shares.find((s) => s.recipient_id === userId);
      if (!grant) {
        return { allowed: false, reason: "Vous ne faites pas partie des destinataires de ce partage." };
      }
      if (requiredPermission === "edit" && grant.permission !== "editor") {
        return { allowed: false, reason: "Ce partage vous accorde uniquement des droits de lecture." };
      }
      return { allowed: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: share } = await serviceSupabase
      .from("resource_shares")
      .select("permission")
      .eq("resource_id", resource.id)
      .eq("recipient_id", userId)
      .maybeSingle();

    if (!share) {
      return { allowed: false, reason: "Vous ne faites pas partie des destinataires de ce partage." };
    }

    if (requiredPermission === "edit" && share.permission !== "editor") {
      return { allowed: false, reason: "Ce partage vous accorde uniquement des droits de lecture." };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Accès refusé." };
}
