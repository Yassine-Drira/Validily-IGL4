"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { assertAdmin, getRequesterUser } from "@/lib/auth/authorization";
import { parseAndValidateYouTubeUrl } from "@/lib/audio/youtube-parser";
import { AudioCatalogEntry, AudioCatalogCategory, AudioSourceType } from "@/types/database";
import { logAuditEvent } from "@/lib/audit/audit-logger";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

const localCatalogMap: Map<string, AudioCatalogEntry> = new Map();

/**
 * List all catalog entries including unpublished drafts (Admin only).
 */
export async function listAllCatalogEntries(): Promise<{
  success: boolean;
  entries: AudioCatalogEntry[];
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, entries: [], error: adminCheck.error };
    }

    if (!isSupabaseConfigured()) {
      const list = Array.from(localCatalogMap.values()).sort(
        (a, b) => a.sort_order - b.sort_order
      );
      return { success: true, entries: list };
    }

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
      .from("audio_catalog")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, entries: [], error: error.message };
    }

    return { success: true, entries: (data as AudioCatalogEntry[]) || [] };
  } catch (err: any) {
    return { success: false, entries: [], error: err?.message };
  }
}

/**
 * Create a new catalog track (Admin only).
 */
export async function createCatalogEntry(input: {
  title: string;
  description?: string;
  category: AudioCatalogCategory;
  sourceType: AudioSourceType;
  sourceKey: string;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<{
  success: boolean;
  entry?: AudioCatalogEntry;
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error || "Privilèges administrateur requis." };
    }

    const adminUser = await getRequesterUser();
    const cleanTitle = (input.title || "").trim();
    if (!cleanTitle || cleanTitle.length < 2) {
      return { success: false, error: "Le titre doit comporter au moins 2 caractères." };
    }

    let youtubeVideoId: string | null = null;
    let canonicalSourceKey = input.sourceKey?.trim() || "";

    if (input.sourceType === "youtube") {
      const parsed = parseAndValidateYouTubeUrl(canonicalSourceKey);
      if (!parsed.valid || !parsed.videoId || !parsed.canonicalUrl) {
        return { success: false, error: parsed.error || "URL YouTube invalide pour le catalogue." };
      }
      youtubeVideoId = parsed.videoId;
      canonicalSourceKey = parsed.canonicalUrl;
    }

    const now = new Date().toISOString();
    const entryId = `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newEntry: AudioCatalogEntry = {
      id: entryId,
      title: cleanTitle.slice(0, 90),
      description: input.description?.trim() || null,
      category: input.category || "focus",
      source_type: input.sourceType,
      source_key: canonicalSourceKey,
      youtube_video_id: youtubeVideoId,
      is_published: input.isPublished !== undefined ? input.isPublished : true,
      sort_order: input.sortOrder || 0,
      created_by: adminUser?.id || null,
      created_at: now,
      updated_at: now,
    };

    if (!isSupabaseConfigured()) {
      localCatalogMap.set(entryId, newEntry);
      await logAuditEvent({
        actor_id: adminUser?.id || "admin",
        action: "AUDIO_CATALOG_CREATE",
        target_id: entryId,
        target_type: "audio",
        metadata: { title: cleanTitle },
      });
      return { success: true, entry: newEntry };
    }

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
      .from("audio_catalog")
      .insert({
        title: cleanTitle.slice(0, 90),
        description: input.description?.trim() || null,
        category: input.category || "focus",
        source_type: input.sourceType,
        source_key: canonicalSourceKey,
        youtube_video_id: youtubeVideoId,
        is_published: input.isPublished !== undefined ? input.isPublished : true,
        sort_order: input.sortOrder || 0,
        created_by: adminUser?.id || null,
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Échec de l'insertion dans le catalogue." };
    }

    await logAuditEvent({
      actor_id: adminUser?.id || "admin",
      action: "AUDIO_CATALOG_CREATE",
      target_id: data.id,
      target_type: "audio",
      metadata: { title: cleanTitle },
    });

    safeRevalidate("/admin");

    return { success: true, entry: data as AudioCatalogEntry };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur de création de piste." };
  }
}

/**
 * Update an existing catalog entry (Admin only).
 */
export async function updateCatalogEntry(
  id: string,
  input: {
    title: string;
    description?: string;
    category: AudioCatalogCategory;
    sourceType: AudioSourceType;
    sourceKey: string;
    isPublished?: boolean;
    sortOrder?: number;
  }
): Promise<{
  success: boolean;
  entry?: AudioCatalogEntry;
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error || "Privilèges administrateur requis." };
    }

    const adminUser = await getRequesterUser();
    const cleanTitle = (input.title || "").trim();
    if (!cleanTitle || cleanTitle.length < 2) {
      return { success: false, error: "Le titre doit comporter au moins 2 caractères." };
    }

    let youtubeVideoId: string | null = null;
    let canonicalSourceKey = input.sourceKey?.trim() || "";

    if (input.sourceType === "youtube") {
      const parsed = parseAndValidateYouTubeUrl(canonicalSourceKey);
      if (!parsed.valid || !parsed.videoId || !parsed.canonicalUrl) {
        return { success: false, error: parsed.error || "URL YouTube invalide." };
      }
      youtubeVideoId = parsed.videoId;
      canonicalSourceKey = parsed.canonicalUrl;
    }

    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const existing = localCatalogMap.get(id);
      if (!existing) return { success: false, error: "Entrée introuvable." };

      existing.title = cleanTitle.slice(0, 90);
      existing.description = input.description?.trim() || null;
      existing.category = input.category;
      existing.source_type = input.sourceType;
      existing.source_key = canonicalSourceKey;
      existing.youtube_video_id = youtubeVideoId;
      if (input.isPublished !== undefined) existing.is_published = input.isPublished;
      if (input.sortOrder !== undefined) existing.sort_order = input.sortOrder;
      existing.updated_at = now;

      await logAuditEvent({
        actor_id: adminUser?.id || "admin",
        action: "AUDIO_CATALOG_UPDATE",
        target_id: id,
        target_type: "audio",
        metadata: { title: cleanTitle },
      });

      return { success: true, entry: existing };
    }

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
      .from("audio_catalog")
      .update({
        title: cleanTitle.slice(0, 90),
        description: input.description?.trim() || null,
        category: input.category,
        source_type: input.sourceType,
        source_key: canonicalSourceKey,
        youtube_video_id: youtubeVideoId,
        is_published: input.isPublished,
        sort_order: input.sortOrder,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      actor_id: adminUser?.id || "admin",
      action: "AUDIO_CATALOG_UPDATE",
      target_id: id,
      target_type: "audio",
      metadata: { title: cleanTitle },
    });

    safeRevalidate("/admin");

    return { success: true, entry: data as AudioCatalogEntry };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur de mise à jour du catalogue." };
  }
}

/**
 * Toggle publication state of a catalog track (Admin only).
 */
export async function togglePublishCatalogEntry(
  id: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error };
    }

    if (!isSupabaseConfigured()) {
      const existing = localCatalogMap.get(id);
      if (existing) {
        existing.is_published = isPublished;
        existing.updated_at = new Date().toISOString();
      }
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase
      .from("audio_catalog")
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Delete a catalog entry (Admin only).
 */
export async function deleteCatalogEntry(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error };
    }

    const adminUser = await getRequesterUser();

    if (!isSupabaseConfigured()) {
      localCatalogMap.delete(id);
      await logAuditEvent({
        actor_id: adminUser?.id || "admin",
        action: "AUDIO_CATALOG_DELETE",
        target_id: id,
        target_type: "audio",
      });
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase.from("audio_catalog").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    await logAuditEvent({
      actor_id: adminUser?.id || "admin",
      action: "AUDIO_CATALOG_DELETE",
      target_id: id,
      target_type: "audio",
    });

    safeRevalidate("/admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
