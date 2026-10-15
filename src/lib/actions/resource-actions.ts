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
  description?: string | null;
  storage_path?: string;
  external_url?: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  exam_session?: string;
  instructor?: string | null;
  chapter?: string | null;
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
        chapter: data.chapter || null,
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

/**
 * Add an external link (Google Drive, Dropbox, Web resource) without duplicating storage
 */
export async function createExternalLinkResource(data: {
  subject_id: string;
  category_id?: string;
  title: string;
  url: string;
  folder_id?: string | null;
  description?: string;
  instructor?: string;
}): Promise<{ success?: boolean; error?: string; resource?: AcademicResource }> {
  try {
    if (!data.url?.trim() || !data.title?.trim() || !data.subject_id) {
      return { error: "URL, Titre et Matière sont requis." };
    }

    let normalizedUrl = data.url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const isGoogleDrive = normalizedUrl.includes("drive.google.com");
    const isGithub = normalizedUrl.includes("github.com");
    const mimeType = isGoogleDrive ? "application/vnd.google-apps" : "application/x-url";
    const filename = isGoogleDrive ? "Google Drive Resource" : isGithub ? "GitHub Repo" : "External Web Link";

    const tags: string[] = ["external_link"];
    if (isGoogleDrive) tags.push("gdrive");
    if (isGithub) tags.push("github");

    let categoryId = data.category_id;
    if (!categoryId) {
      const serviceSupabase = getServiceSupabase();
      const { data: firstCat } = await serviceSupabase
        .from("resource_categories")
        .select("id")
        .limit(1)
        .maybeSingle();
      categoryId = firstCat?.id || "cat-courses";
    }

    return await createResource({
      subject_id: data.subject_id,
      category_id: categoryId || "cat-courses",
      title: data.title.trim(),
      description: data.description?.trim() || null,
      storage_path: normalizedUrl,
      external_url: normalizedUrl,
      original_filename: filename,
      mime_type: mimeType,
      file_size_bytes: 0,
      instructor: data.instructor || null,
      chapter: data.folder_id || null,
      tags,
    });
  } catch (err: any) {
    return { error: err.message || "Échec de l'ajout du lien externe." };
  }
}

/**
 * Move a resource into a folder or to the root of the subject
 */
export async function moveResourceAction(
  resourceId: string,
  targetFolderId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase
      .from("resources")
      .update({
        chapter: targetFolderId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resourceId);

    if (error) {
      return { success: false, error: error.message };
    }

    safeRevalidate("/subjects");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec du déplacement de la ressource." };
  }
}

/**
 * Rename a resource
 */
export async function renameResourceAction(
  resourceId: string,
  newTitle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newTitle?.trim()) {
      return { success: false, error: "Le nouveau titre est requis." };
    }

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase
      .from("resources")
      .update({
        title: newTitle.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", resourceId);

    if (error) {
      return { success: false, error: error.message };
    }

    safeRevalidate("/subjects");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec du renommage de la ressource." };
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

export async function deleteResource(resourceId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();

    const { data: resource, error: fetchError } = await serviceSupabase
      .from("resources")
      .select("id, storage_path, subject_id, subject:subjects(slug)")
      .eq("id", resourceId)
      .maybeSingle();

    if (fetchError || !resource) {
      return { error: "Ressource introuvable ou déjà supprimée." };
    }

    // 1. Delete dependent foreign-key records first (bookmarks, revision_progress)
    await serviceSupabase.from("bookmarks").delete().eq("resource_id", resourceId);
    await serviceSupabase.from("revision_progress").delete().eq("resource_id", resourceId);

    // 2. Remove file from storage if stored locally (not external HTTP link)
    if (resource.storage_path && !resource.storage_path.startsWith("http")) {
      await serviceSupabase.storage
        .from("academic-resources")
        .remove([resource.storage_path]);
    }

    // 3. Delete the resource record
    const { error: deleteError } = await serviceSupabase
      .from("resources")
      .delete()
      .eq("id", resourceId);

    if (deleteError) {
      console.error("Delete resource DB error:", deleteError);
      return { error: deleteError.message };
    }

    // 4. Revalidate all dependent routes
    safeRevalidate("/library");
    safeRevalidate("/subjects");
    safeRevalidate("/bookmarks");
    safeRevalidate(`/resources/${resourceId}`);
    if (resource.subject_id) {
      safeRevalidate(`/subjects/${resource.subject_id}`);
    }
    const slug = (resource as any).subject?.slug;
    if (slug) {
      safeRevalidate(`/subjects/${slug}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteResource uncaught exception:", err);
    return { error: err.message || "Échec de la suppression de la ressource." };
  }
}
