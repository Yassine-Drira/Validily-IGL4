import { cache } from "react";
import type { UserRole } from "@/types/database";

export interface AuthenticatedActor {
  id: string;
  email?: string;
  role: "admin" | "student" | "visitor";
  name?: string;
  avatarUrl?: string | null;
}

// In-memory test context for local adversarial tests
let testUserOverride: AuthenticatedActor | null | undefined = undefined;

// In-memory short-lived profile/role cache to avoid hammering database on every click
const profileMemoryCache = new Map<
  string,
  {
    role: AuthenticatedActor["role"];
    name?: string;
    avatarUrl?: string | null;
    expiry: number;
  }
>();

export function invalidateProfileCache(userId?: string): void {
  if (userId) {
    profileMemoryCache.delete(userId);
  } else {
    profileMemoryCache.clear();
  }
}

/**
 * Configure test user identity for local unit/adversarial verification
 */
export function setTestUser(user: AuthenticatedActor | null | undefined): void {
  testUserOverride = user;
}

export function getTestUser(): AuthenticatedActor | null | undefined {
  return testUserOverride;
}

// Lazy loaders to prevent Node.js ESM alias resolution issues in standalone tests
async function getSupabaseServerModule() {
  try {
    return await import("../supabase/server");
  } catch {
    return null;
  }
}

async function getAdminClient() {
  try {
    const adminMod = await import("../supabase/admin");
    return adminMod.getServiceSupabase();
  } catch {
    return null;
  }
}

/**
 * Derives requester identity from verified server-side Supabase authentication session.
 * Never trusts a client-supplied user ID. Memoized per-request with React cache().
 */
export const getRequesterUser = cache(async function getRequesterUser(): Promise<AuthenticatedActor | null> {
  // If a test context is explicitly established, honor it for isolated local testing
  if (testUserOverride !== undefined) {
    return testUserOverride;
  }

  const serverMod = await getSupabaseServerModule();
  if (!serverMod || !serverMod.isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await serverMod.createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      return null;
    }

    // Query role against cached or trusted database state in public.profiles
    const cachedProfile = profileMemoryCache.get(user.id);
    let role: AuthenticatedActor["role"] = "student";
    let name: string =
      user.user_metadata?.display_name || user.email?.split("@")[0] || "Étudiant";
    let avatarUrl: string | null = user.user_metadata?.avatar_url || null;

    const serviceSupabase = await getAdminClient();

    if (cachedProfile && Date.now() < cachedProfile.expiry) {
      role = cachedProfile.role;
      name = cachedProfile.name || name;
      avatarUrl = cachedProfile.avatarUrl !== undefined ? cachedProfile.avatarUrl : avatarUrl;
    } else {
      if (!serviceSupabase) {
        return { id: user.id, email: user.email, role: "student", name, avatarUrl };
      }

      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("role, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      role = (profile?.role as AuthenticatedActor["role"]) || "student";
      if (profile?.display_name) name = profile.display_name;
      if (profile?.avatar_url) avatarUrl = profile.avatar_url;

      profileMemoryCache.set(user.id, { role, name, avatarUrl, expiry: Date.now() + 15000 });
    }

    // Verify if an assigned admin role is temporary and has expired
    if (role === "admin" && serviceSupabase) {
      const expiresAt = user.user_metadata?.temporary_admin_expires_at;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        role = "student";
        profileMemoryCache.set(user.id, { role: "student", name, avatarUrl, expiry: Date.now() + 15000 });
        // Auto-demote in persistent storage
        try {
          await serviceSupabase.from("profiles").update({ role: "student" }).eq("id", user.id);
          await serviceSupabase.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, temporary_admin_expires_at: null },
          });
        } catch {
          // Non-blocking fallback
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      role,
      name,
      avatarUrl,
    };
  } catch (err) {
    console.error("Failed to authenticate requester session:", err);
    return null;
  }
});

/**
 * Verifies administrative privileges against trusted database state, honoring grant expiration
 */
export const isUserAdmin = cache(async function isUserAdmin(userId: string): Promise<boolean> {
  if (testUserOverride !== undefined) {
    return testUserOverride !== null && testUserOverride.id === userId && testUserOverride.role === "admin";
  }

  if (!userId) {
    return false;
  }

  const cachedProfile = profileMemoryCache.get(userId);
  if (cachedProfile && Date.now() < cachedProfile.expiry) {
    return cachedProfile.role === "admin";
  }

  const serverMod = await getSupabaseServerModule();
  if (!serverMod || !serverMod.isSupabaseConfigured()) {
    return false;
  }

  try {
    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) return false;

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "admin") return false;

    // Check expiration on user_metadata
    try {
      const { data: authUserData } = await serviceSupabase.auth.admin.getUserById(userId);
      const expiresAt = authUserData?.user?.user_metadata?.temporary_admin_expires_at;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        // Expired grant -> auto-demote
        await serviceSupabase.from("profiles").update({ role: "student" }).eq("id", userId);
        await serviceSupabase.auth.admin.updateUserById(userId, {
          user_metadata: { ...authUserData.user.user_metadata, temporary_admin_expires_at: null },
        });
        return false;
      }
    } catch {
      // Fallback to active profile role
    }

    return true;
  } catch {
    return false;
  }
});

/**
 * Server-side gate asserting the caller possesses administrative rights
 */
export async function assertAdmin(): Promise<{
  authorized: boolean;
  user?: AuthenticatedActor;
  error?: string;
}> {
  const user = await getRequesterUser();
  if (!user) {
    return {
      authorized: false,
      error: "Authentification requise pour effectuer cette action.",
    };
  }

  const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
  if (!isAdmin) {
    return {
      authorized: false,
      error: "Accès refusé. Privilèges administrateur requis.",
    };
  }

  return { authorized: true, user };
}

/**
 * Server-side gate asserting resource ownership or administrative capability
 */
export async function assertOwnershipOrAdmin(
  ownerId: string | null | undefined,
  resourceLabel: string = "cette ressource"
): Promise<{
  authorized: boolean;
  user?: AuthenticatedActor;
  isAdmin?: boolean;
  error?: string;
}> {
  const user = await getRequesterUser();
  if (!user) {
    return {
      authorized: false,
      error: "Authentification requise.",
    };
  }

  const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
  if (isAdmin || (ownerId && user.id === ownerId)) {
    return {
      authorized: true,
      user,
      isAdmin,
    };
  }

  return {
    authorized: false,
    error: `Accès refusé. Vous n'avez pas l'autorisation de modifier ou supprimer ${resourceLabel}.`,
  };
}

/**
 * Verifies grant scope for shared resources.
 * Ensures 'view' grant recipients CANNOT edit, move, rename, or delete.
 */
export function canMutateResourceWithGrant(
  user: AuthenticatedActor,
  ownerId: string,
  grantScope?: "view" | "edit" | null,
  mutationType: "delete" | "rename" | "move" | "visibility" = "delete"
): boolean {
  if (user.role === "admin" || user.id === ownerId) {
    return true;
  }

  // Deletion and visibility changes are strictly restricted to owner or admin
  if (mutationType === "delete" || mutationType === "visibility") {
    return false;
  }

  // A recipient with 'view' permission must NEVER be able to edit, move, rename, or delete
  if (grantScope === "view") {
    return false;
  }

  // For rename or move, only an explicit 'edit' grant allows mutation if supported
  if (mutationType === "rename" && grantScope === "edit") {
    return true;
  }

  return false;
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
    const shares = mockSharesStore.get(resource.id) || [];
    const grant = shares.find((s) => s.recipient_id === userId);
    if (grant) {
      if (requiredPermission === "edit" && grant.permission !== "editor") {
        return { allowed: false, reason: "Ce partage vous accorde uniquement des droits de lecture." };
      }
      return { allowed: true };
    }

    const serviceSupabase = await getAdminClient();
    if (serviceSupabase) {
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

    return { allowed: false, reason: "Vous ne faites pas partie des destinataires de ce partage." };
  }

  return { allowed: false, reason: "Accès refusé." };
}

