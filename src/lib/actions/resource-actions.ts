"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase, getEffectiveUserId } from "@/lib/supabase/admin";
import { RevisionStatus, AcademicResource } from "@/types/database";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

export async function createResource(data: {
  subject_id: string;
  category_id: string;
  title: string;
  description?: string;
  storage_path?: string;
  external_url?: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  exam_session?: string;
  instructor?: string;
  tags?: string[];
}): Promise<{ success?: boolean; error?: string; resource?: AcademicResource }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database not configured." };
    }

    if (!data.title?.trim() || !data.subject_id || !data.category_id) {
      return { error: "Title, Subject, and Category are required." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || (await getEffectiveUserId());
    const serviceSupabase = getServiceSupabase();

    const storagePath = data.storage_path || data.external_url || `links/${Date.now()}`;
    const filename = data.original_filename || (data.external_url ? "External Link" : "Resource Document");
    const mimeType = data.mime_type || (data.external_url ? "application/x-url" : "application/pdf");

    const { data: resource, error } = await serviceSupabase
      .from("resources")
      .insert({
        subject_id: data.subject_id,
        category_id: data.category_id,
        owner_id: userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        storage_path: storagePath,
        original_filename: filename,
        mime_type: mimeType,
        file_size_bytes: data.file_size_bytes || 0,
        exam_session: data.exam_session || null,
        instructor: data.instructor || null,
        tags: data.tags || [],
        visibility: "public",
        publication_status: "published",
      })
      .select("*, subject:subjects(*), category:resource_categories(*)")
      .single();

    if (error) {
      console.error("Error creating resource:", error);
      return { error: error.message };
    }

    safeRevalidate("/library");
    safeRevalidate("/subjects");
    safeRevalidate(`/subjects/${resource.subject?.slug}`);
    safeRevalidate("/");
    return { success: true, resource };
  } catch (err: any) {
    return { error: err.message || "Failed to create resource." };
  }
}

export async function toggleBookmark(resourceId: string) {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true, bookmarked: true, isDemo: true };
    }

    const userId = await getEffectiveUserId();
    const serviceSupabase = getServiceSupabase();

    const { data: existing } = await serviceSupabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("resource_id", resourceId)
      .maybeSingle();

    if (existing) {
      await serviceSupabase.from("bookmarks").delete().eq("id", existing.id);
      safeRevalidate("/bookmarks");
      safeRevalidate(`/resources/${resourceId}`);
      return { success: true, bookmarked: false };
    } else {
      await serviceSupabase.from("bookmarks").insert({
        user_id: userId,
        resource_id: resourceId,
      });
      safeRevalidate("/bookmarks");
      safeRevalidate(`/resources/${resourceId}`);
      return { success: true, bookmarked: true };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateRevisionStatus(
  resourceId: string,
  status: RevisionStatus
) {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true, status, isDemo: true };
    }

    const userId = await getEffectiveUserId();
    const serviceSupabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { error } = await serviceSupabase.from("revision_progress").upsert(
      {
        user_id: userId,
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

    safeRevalidate(`/resources/${resourceId}`);
    safeRevalidate("/subjects");
    safeRevalidate("/");
    return { success: true, status };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteResource(resourceId: string) {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true, isDemo: true };
    }

    const serviceSupabase = getServiceSupabase();

    const { data: resource, error: fetchError } = await serviceSupabase
      .from("resources")
      .select("id, storage_path, subject_id")
      .eq("id", resourceId)
      .single();

    if (fetchError || !resource) {
      return { error: "Resource not found." };
    }

    if (resource.storage_path && !resource.storage_path.startsWith("http")) {
      await serviceSupabase.storage
        .from("academic-resources")
        .remove([resource.storage_path]);
    }

    const { error: deleteError } = await serviceSupabase
      .from("resources")
      .delete()
      .eq("id", resourceId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    safeRevalidate("/library");
    safeRevalidate("/subjects");
    safeRevalidate("/");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
