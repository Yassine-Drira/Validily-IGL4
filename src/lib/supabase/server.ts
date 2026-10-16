import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { findOrphanAuthCookies } from "@/lib/auth/cookie-utils";

/**
 * Creates or retrieves a request-scoped Supabase client for Server Components,
 * Server Actions, and Route Handlers.
 * Memoized with React cache() to avoid redundant client instantiations per request.
 */
export const createClient = cache(async function createClient() {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request store context (e.g. testing or scripts)
  }

  const getCookies = () => (cookieStore ? cookieStore.getAll() : []);
  const setCookies = (cookiesToSet: any[]) => {
    if (!cookieStore) return;
    try {
      // 1. Write the new/refreshed cookies
      cookiesToSet.forEach(({ name, value, options }: any) =>
        cookieStore.set(name, value, {
          ...options,
          sameSite: "lax",
          path: "/",
        })
      );

      // 2. Proactively prune any orphaned higher-index chunk cookies
      const allCookies = cookieStore.getAll();
      const orphans = findOrphanAuthCookies(allCookies);
      orphans.forEach((orphanName) => {
        cookieStore.delete(orphanName);
      });
    } catch {
      // Ignored in read-only Server Component rendering (handled by middleware)
    }
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return createServerClient(
      "https://placeholder-project.supabase.co",
      "placeholder-anon-key",
      {
        cookieEncoding: "base64url",
        cookies: {
          getAll: getCookies,
          setAll: setCookies,
        },
      }
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieEncoding: "base64url",
    cookies: {
      getAll: getCookies,
      setAll: setCookies,
    },
  });
});

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes("placeholder-project") &&
    !key.includes("placeholder")
  );
}
