import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for browser execution.
 * Avoids multiple concurrent auth listeners, competing cookie writers,
 * and duplicate refresh loops that cause HTTP 431 header bloat.
 */
export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!clientInstance) {
      clientInstance = createBrowserClient(
        "https://placeholder-project.supabase.co",
        "placeholder-anon-key"
      );
    }
    return clientInstance;
  }

  // During SSR evaluation of client components, return a fresh transient client
  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  // In the browser, maintain a single client instance
  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieEncoding: "base64url",
    });
  }

  return clientInstance;
}
