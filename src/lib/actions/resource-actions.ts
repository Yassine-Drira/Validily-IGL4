"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { RevisionStatus, AcademicResource } from "@/types/database";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { getRequesterUser, assertOwnershipOrAdmin } from "@/lib/auth/authorization";
import { invalidateRepositoryCache } from "@/lib/supabase/repository";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
  try {
    invalidateRepositoryCache();
  } catch {
    // Ignore cache failure
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
  academic_year?: string | null;
  exam_session?: string | null;
  instructor?: string | null;
  chapter?: string | null;
  tags?: string[];
  visibility?: "public" | "private" | "shared";
  resource_type?: "document" | "quiz" | "link" | "exercise";
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
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const requester = authUser
      ? { id: authUser.id, email: authUser.email, role: (authUser.app_metadata?.role as any) || "student" }
      : await getRequesterUser();

    if (!requester || !requester.id) {
      return { error: "Authentification requise pour créer une ressource." };
    }
    const userId = requester.id;
    const serviceSupabase = getServiceSupabase();

    const storagePath = data.storage_path || data.external_url || `links/${Date.now()}`;
    const filename = data.original_filename || (data.external_url ? "External Link" : "Resource Document");
    const mimeType = data.mime_type || (data.external_url ? "application/x-url" : "application/pdf");
    const resourceType = data.resource_type || (data.external_url ? "link" : "document");

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
        academic_year: data.academic_year || "2026-2027",
        exam_session: data.exam_session || null,
        instructor: data.instructor || null,
        chapter: data.chapter || null,
        tags: data.tags || [],
        visibility: data.visibility || "private",
        publication_status: "published",
        resource_type: resourceType,
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
 * Create an interactive HTML quiz resource with sandboxed storage
 */
export async function createHtmlQuizResourceAction(data: {
  subject_id: string;
  category_id?: string;
  title: string;
  html_content: string;
  folder_id?: string | null;
  description?: string;
  instructor?: string;
  exam_session?: string;
  tags?: string[];
  visibility?: "public" | "private" | "shared";
}): Promise<{ success?: boolean; error?: string; resource?: AcademicResource }> {
  try {
    if (!data.html_content?.trim() || !data.title?.trim() || !data.subject_id) {
      return { error: "Contenu HTML, Titre et Matière sont requis." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour publier un quiz interactif." };
    }

    let categoryId = data.category_id;
    if (!categoryId) {
      const serviceSupabase = getServiceSupabase();
      if (serviceSupabase) {
        const { data: firstCat } = await serviceSupabase
          .from("resource_categories")
          .select("id")
          .limit(1)
          .maybeSingle();
        categoryId = firstCat?.id || "cat-courses";
      }
    }

    const quizFilename = `${data.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-quiz.html`;
    const storagePath = `quizzes/html-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.html`;

    // Upload to Supabase Storage if configured
    const serviceSupabase = getServiceSupabase();
    if (isSupabaseConfigured() && serviceSupabase) {
      try {
        await serviceSupabase.storage
          .from("academic-resources")
          .upload(storagePath, Buffer.from(data.html_content, "utf-8"), {
            contentType: "text/html",
            upsert: true,
          });
      } catch (uploadErr) {
        console.warn("Storage upload for HTML quiz failed, will use inline fallback:", uploadErr);
      }
    }

    const mergedTags = Array.from(new Set(["quiz", "interactive_html", ...(data.tags || [])]));

    return await createResource({
      subject_id: data.subject_id,
      category_id: categoryId || "cat-courses",
      title: data.title.trim(),
      description: data.description?.trim() || "Quiz interactif HTML autonome avec auto-évaluation.",
      storage_path: storagePath,
      original_filename: quizFilename,
      mime_type: "text/html;quiz",
      file_size_bytes: Buffer.byteLength(data.html_content, "utf-8"),
      instructor: data.instructor || null,
      exam_session: data.exam_session || null,
      chapter: data.folder_id || null,
      tags: mergedTags,
      visibility: data.visibility || "public",
      resource_type: "quiz",
    });
  } catch (err: any) {
    return { error: err.message || "Échec de la création du quiz interactif." };
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

    const requester = await getRequesterUser();
    if (!requester) {
      return { success: false, error: "Authentification requise pour déplacer une ressource." };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: resource, error: fetchErr } = await serviceSupabase
      .from("resources")
      .select("id, owner_id, visibility, title")
      .eq("id", resourceId)
      .maybeSingle();

    if (fetchErr || !resource) {
      return { success: false, error: "Ressource introuvable ou déjà supprimée." };
    }

    const authCheck = await assertOwnershipOrAdmin(resource.owner_id, "cette ressource");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    // Explicit publication decision rule: moving a resource into a folder MUST NOT alter its visibility
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

    await logAuditEvent({
      actor_id: requester.id,
      action: "RESOURCE_MOVE",
      target_id: resourceId,
      target_type: "resource",
      metadata: { target_folder_id: targetFolderId, preserved_visibility: resource.visibility },
    });

    safeRevalidate("/subjects");
    safeRevalidate("/library");
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

    const requester = await getRequesterUser();
    if (!requester) {
      return { success: false, error: "Authentification requise pour renommer une ressource." };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: resource, error: fetchErr } = await serviceSupabase
      .from("resources")
      .select("id, owner_id, title")
      .eq("id", resourceId)
      .maybeSingle();

    if (fetchErr || !resource) {
      return { success: false, error: "Ressource introuvable ou déjà supprimée." };
    }

    const authCheck = await assertOwnershipOrAdmin(resource.owner_id, "cette ressource");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

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

    await logAuditEvent({
      actor_id: requester.id,
      action: "RESOURCE_RENAME",
      target_id: resourceId,
      target_type: "resource",
      metadata: { old_title: resource.title, new_title: newTitle.trim() },
    });

    safeRevalidate("/subjects");
    safeRevalidate("/library");
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

    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Authentification requise pour modifier vos favoris." };
    }

    const userId = requester.id;
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

    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Authentification requise pour enregistrer votre progression." };
    }

    const userId = requester.id;
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

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour supprimer une ressource." };
    }

    const serviceSupabase = getServiceSupabase();

    const { data: resource, error: fetchError } = await serviceSupabase
      .from("resources")
      .select("id, owner_id, storage_path, subject_id, title, subject:subjects(slug)")
      .eq("id", resourceId)
      .maybeSingle();

    if (fetchError || !resource) {
      return { error: "Ressource introuvable ou déjà supprimée." };
    }

    // Server-side authorization check BEFORE any deletion or mutation
    const authCheck = await assertOwnershipOrAdmin(resource.owner_id, "cette ressource");
    if (!authCheck.authorized) {
      return { error: authCheck.error };
    }

    // 1. Delete dependent foreign-key records first (bookmarks, revision_progress)
    await serviceSupabase.from("bookmarks").delete().eq("resource_id", resourceId);
    await serviceSupabase.from("revision_progress").delete().eq("resource_id", resourceId);

    // 2. Remove file from storage if stored locally (not external HTTP link)
    if (resource.storage_path && !resource.storage_path.startsWith("http")) {
      try {
        await serviceSupabase.storage
          .from("academic-resources")
          .remove([resource.storage_path]);
      } catch (storageErr) {
        console.error("Storage removal error during deleteResource:", storageErr);
      }
    }

    // 3. Delete the resource record
    const { error: deleteError } = await serviceSupabase
      .from("resources").delete()
      .eq("id", resourceId);

    if (deleteError) {
      console.error("Delete resource DB error:", deleteError);
      return { error: deleteError.message };
    }

    // Record audit event
    await logAuditEvent({
      actor_id: requester.id,
      action: "RESOURCE_DELETE",
      target_id: resourceId,
      target_type: "resource",
      metadata: { storage_path: resource.storage_path, title: resource.title },
    });

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

/**
 * Updates resource visibility (public / shared / private) with authorization check & audit log
 */
export async function updateResourceVisibility(
  resourceId: string,
  visibility: "public" | "private" | "shared"
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour modifier la visibilité." };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: resource, error: fetchErr } = await serviceSupabase
      .from("resources")
      .select("id, owner_id, title, visibility")
      .eq("id", resourceId)
      .single();

    if (fetchErr || !resource) {
      return { error: "Ressource introuvable." };
    }

    // Permission: Only owner or admin can modify visibility
    const authCheck = await assertOwnershipOrAdmin(resource.owner_id, "ce document");
    if (!authCheck.authorized) {
      return { error: "Seul le propriétaire de ce document peut modifier sa visibilité." };
    }

    const { error: updateErr } = await serviceSupabase
      .from("resources")
      .update({ visibility, updated_at: new Date().toISOString() })
      .eq("id", resourceId);

    if (updateErr) {
      return { error: updateErr.message };
    }

    await logAuditEvent({
      actor_id: requester.id,
      action: visibility === "shared" ? "RESOURCE_SHARED" : "RESOURCE_VISIBILITY_CHANGE",
      target_id: resourceId,
      target_type: "resource",
      metadata: { old_visibility: resource.visibility, new_visibility: visibility, title: resource.title },
    });

    safeRevalidate("/");
    safeRevalidate("/my-space");
    safeRevalidate("/library");
    safeRevalidate("/subjects");
    safeRevalidate(`/resources/${resourceId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Échec de modification de la visibilité." };
  }
}

