import type { UserRole } from "@/types/database";

export interface AuthenticatedActor {
  id: string;
  email?: string;
  role: "admin" | "student" | "visitor";
}

// In-memory test context for local adversarial tests
let testUserOverride: AuthenticatedActor | null | undefined = undefined;

// In-memory short-lived role cache to avoid hammering database on every click
const roleMemoryCache = new Map<string, { role: AuthenticatedActor["role"]; expiry: number }>();

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
 * Never trusts a client-supplied user ID.
 */
export async function getRequesterUser(): Promise<AuthenticatedActor | null> {
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
    const cachedRole = roleMemoryCache.get(user.id);
    let role: AuthenticatedActor["role"] = "student";

    if (cachedRole && Date.now() < cachedRole.expiry) {
      role = cachedRole.role;
    } else {
      const serviceSupabase = await getAdminClient();
      if (!serviceSupabase) {
        return { id: user.id, email: user.email, role: "student" };
      }

      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      role = (profile?.role as AuthenticatedActor["role"]) || "student";
      roleMemoryCache.set(user.id, { role, expiry: Date.now() + 15000 });
    }

    // Verify if an assigned admin role is temporary and has expired
    if (role === "admin") {
      const expiresAt = user.user_metadata?.temporary_admin_expires_at;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        role = "student";
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
    };
  } catch (err) {
    console.error("Failed to authenticate requester session:", err);
    return null;
  }
}

/**
 * Verifies administrative privileges against trusted database state, honoring grant expiration
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  if (testUserOverride !== undefined) {
    return testUserOverride !== null && testUserOverride.id === userId && testUserOverride.role === "admin";
  }

  if (!userId) {
    return false;
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
}

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
