"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { RevisionStatus } from "@/types/database";

export async function toggleBookmark(resourceId: string) {
  if (!isSupabaseConfigured()) {
    return { success: true, bookmarked: true, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to bookmark resources." };
  }

  // Check if bookmark exists
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
    revalidatePath("/bookmarks");
    revalidatePath(`/resources/${resourceId}`);
    return { success: true, bookmarked: false };
  } else {
    await supabase.from("bookmarks").insert({
      user_id: user.id,
      resource_id: resourceId,
    });
    revalidatePath("/bookmarks");
    revalidatePath(`/resources/${resourceId}`);
    return { success: true, bookmarked: true };
  }
}

export async function updateRevisionStatus(
  resourceId: string,
  status: RevisionStatus
) {
  if (!isSupabaseConfigured()) {
    return { success: true, status, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to update revision progress." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("revision_progress").upsert(
    {
      user_id: user.id,
      resource_id: resourceId,
      status,
      last_viewed_at: now,
      revised_at: status === "revised" ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id,resource_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/");
  return { success: true, status };
}

export async function deleteResource(resourceId: string) {
  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  // Fetch resource to get storage path and owner
  const { data: resource, error: fetchError } = await supabase
    .from("resources")
    .select("id, owner_id, storage_path, subject_id")
    .eq("id", resourceId)
    .single();

  if (fetchError || !resource) {
    return { error: "Resource not found." };
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (resource.owner_id !== user.id && !isAdmin) {
    return { error: "Unauthorized. You can only delete your own uploads." };
  }

  // Remove from storage
  if (resource.storage_path) {
    await supabase.storage
      .from("academic-resources")
      .remove([resource.storage_path]);
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/library");
  revalidatePath("/");
  return { success: true };
}
