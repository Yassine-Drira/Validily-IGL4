"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getRequesterUser } from "@/lib/auth/authorization";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

export async function updateUserProfile(data: {
  displayName: string;
  avatarUrl?: string | null;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!data.displayName?.trim()) {
      return { error: "Le nom d'affichage ne peut pas être vide." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour modifier votre profil." };
    }

    const cleanName = data.displayName.trim();
    const avatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : null;

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const supabase = await createClient();
    const serviceSupabase = getServiceSupabase();

    // 1. Update Auth metadata (never store giant base64 strings in auth metadata to avoid bloating JWT session cookies)
    const authMetadataAvatar = avatarUrl && !avatarUrl.startsWith("data:") ? avatarUrl : null;
    await supabase.auth.updateUser({
      data: {
        display_name: cleanName,
        avatar_url: authMetadataAvatar,
      },
    });

    // 2. Upsert Profile table
    await serviceSupabase.from("profiles").upsert(
      {
        id: requester.id,
        display_name: cleanName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    safeRevalidate("/my-space");
    safeRevalidate("/");
    return { success: true };
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    return { error: err.message || "Échec de la mise à jour du profil." };
  }
}

export async function removeUserAvatar(): Promise<{ success?: boolean; error?: string }> {
  try {
    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour modifier votre photo." };
    }
    const serviceSupabase = getServiceSupabase();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("display_name")
      .eq("id", requester.id)
      .maybeSingle();

    const currentName = profile?.display_name || "Étudiant";
    return updateUserProfile({ displayName: currentName, avatarUrl: null });
  } catch (err: any) {
    return { error: err.message || "Échec de suppression de la photo." };
  }
}
