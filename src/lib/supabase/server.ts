import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
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
      cookiesToSet.forEach(({ name, value, options }: any) =>
        cookieStore.set(name, value, options)
      );
    } catch {
      // Ignored in server component rendering
    }
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return createServerClient(
      "https://placeholder-project.supabase.co",
      "placeholder-anon-key",
      {
        cookies: {
          getAll: getCookies,
          setAll: setCookies,
        },
      }
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: getCookies,
      setAll: setCookies,
    },
  });
}

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
