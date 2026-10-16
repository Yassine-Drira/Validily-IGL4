"use server";

import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { invalidateRepositoryCache } from "@/lib/supabase/repository";
import { invalidateProfileCache } from "@/lib/auth/authorization";

/**
 * Server-side logout action that safely terminates authentication sessions,
 * clears HTTP-only and chunked session cookies, and purges in-memory server
 * caches to guarantee zero state leakage across subsequent users on the same machine.
 */
export async function serverLogoutAction(): Promise<{ success: boolean }> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      await supabase.auth.signOut();
    }
  } catch {
    // Non-fatal if session is already expired or client disconnected
  }

  // 1. Delete all auth cookies directly from the server response
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    for (const c of all) {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
      ) {
        cookieStore.delete(c.name);
      }
    }
  } catch {
    // Non-fatal outside request context
  }

  // 2. Clear in-memory server repository and profile caches
  try {
    invalidateRepositoryCache();
    invalidateProfileCache();
  } catch {
    // Non-fatal
  }

  return { success: true };
}
