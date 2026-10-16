import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

async function getServerClient() {
  try {
    return await import("./server");
  } catch {
    return null;
  }
}

/**
 * Returns authenticated user ID from active session, or null if unauthenticated.
 * NEVER falls back to querying arbitrary profiles to prevent guest account hijacking.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  try {
    const serverMod = await getServerClient();
    if (!serverMod) return null;
    const supabase = await serverMod.createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      return user.id;
    }
  } catch {
    // Unauthenticated / guest session
  }

  return null;
}
