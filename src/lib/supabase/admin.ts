import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "./server";

let serviceClientInstance: any = null;

export function getServiceSupabase(): any {
  if (serviceClientInstance) {
    return serviceClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase URL or Key configuration.");
  }

  serviceClientInstance = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClientInstance;
}

export const FALLBACK_SYSTEM_USER_ID = "8d18a271-32e9-4d4d-9809-94c3cc5ca540";

/**
 * Returns current authenticated user ID if exists, otherwise returns the fallback system user ID.
 * This guarantees foreign-key constraints on auth.users(id) succeed seamlessly in both authenticated
 * and local workspace modes.
 */
export async function getEffectiveUserId(): Promise<string> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      return user.id;
    }
  } catch {
    // In guest/local mode
  }

  return FALLBACK_SYSTEM_USER_ID;
}
