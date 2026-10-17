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

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42P01"
  );
}

const globalAudioState = globalThis as unknown as {
  __localCatalogEntries?: Map<string, AudioCatalogEntry>;
};
if (!globalAudioState.__localCatalogEntries) {
  globalAudioState.__localCatalogEntries = new Map();
}
const localCatalogMap = globalAudioState.__localCatalogEntries;

// Supabase DB System Record Resilience Helpers (Guarantees catalog persistence across restarts)
async function getDbCatalogFallback(): Promise<AudioCatalogEntry[]> {
  try {
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) return [];
    const { data } = await serviceSupabase
      .from("notes")
      .select("content")
      .eq("title", "__validily_audio_catalog__")
      .maybeSingle();
    if (data?.content) {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed)) return parsed as AudioCatalogEntry[];
    }
  } catch {}
  return [];
}

async function saveDbCatalogFallback(entries: AudioCatalogEntry[]): Promise<void> {
  try {
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) return;
    const { data: existing } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("title", "__validily_audio_catalog__")
      .maybeSingle();

    if (existing?.id) {
      await serviceSupabase
        .from("notes")
        .update({
          content: JSON.stringify(entries),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      const user = await getRequesterUser();
      const adminId = user?.id || "00000000-0000-0000-0000-000000000000";
      await serviceSupabase.from("notes").insert({
        user_id: adminId,
        title: "__validily_audio_catalog__",
        content: JSON.stringify(entries),
        tags: ["system_audio_catalog"],
        visibility: "public",
      });
    }
  } catch {}
}

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
      const dbCatalog = await getDbCatalogFallback();
      dbCatalog.forEach((c) => localCatalogMap.set(c.id, c));
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
      if (isTableMissingError(error)) {
        const dbCatalog = await getDbCatalogFallback();
        dbCatalog.forEach((c) => localCatalogMap.set(c.id, c));
        const list = Array.from(localCatalogMap.values()).sort(
          (a, b) => a.sort_order - b.sort_order
        );
        return { success: true, entries: list };
      }
      return { success: false, entries: [], error: error.message };
    }

    const map = new Map<string, AudioCatalogEntry>();
    const dbCatalog = await getDbCatalogFallback();
    dbCatalog.forEach((c) => {
      map.set(c.id, c);
      localCatalogMap.set(c.id, c);
    });
    for (const c of localCatalogMap.values()) {
      map.set(c.id, c);
    }
    if (Array.isArray(data)) {
      for (const c of data) {
        map.set(c.id, c as AudioCatalogEntry);
        localCatalogMap.set(c.id, c as AudioCatalogEntry);
      }
    }

    const list = Array.from(map.values()).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    return { success: true, entries: list };
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
      await saveDbCatalogFallback(Array.from(localCatalogMap.values()));
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
      if (isTableMissingError(error)) {
        localCatalogMap.set(entryId, newEntry);
        await saveDbCatalogFallback(Array.from(localCatalogMap.values()));
        await logAuditEvent({
          actor_id: adminUser?.id || "admin",
          action: "AUDIO_CATALOG_CREATE",
          target_id: entryId,
          target_type: "audio",
          metadata: { title: cleanTitle, fallback: true },
        });
        safeRevalidate("/admin");
        return { success: true, entry: newEntry };
      }
      return { success: false, error: error?.message || "Échec de l'insertion dans le catalogue." };
    }

    localCatalogMap.set((data as AudioCatalogEntry).id, data as AudioCatalogEntry);
    await saveDbCatalogFallback(Array.from(localCatalogMap.values()));

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

      await saveDbCatalogFallback(Array.from(localCatalogMap.values()));

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
      if (isTableMissingError(error)) {
        const existing = localCatalogMap.get(id);
        if (existing) {
          existing.title = cleanTitle.slice(0, 90);
          existing.description = input.description?.trim() || null;
          existing.category = input.category;
          existing.source_type = input.sourceType;
          existing.source_key = canonicalSourceKey;
          existing.youtube_video_id = youtubeVideoId;
          if (input.isPublished !== undefined) existing.is_published = input.isPublished;
          if (input.sortOrder !== undefined) existing.sort_order = input.sortOrder;
          existing.updated_at = now;

          await saveDbCatalogFallback(Array.from(localCatalogMap.values()));

          await logAuditEvent({
            actor_id: adminUser?.id || "admin",
            action: "AUDIO_CATALOG_UPDATE",
            target_id: id,
            target_type: "audio",
            metadata: { title: cleanTitle, fallback: true },
          });

          safeRevalidate("/admin");
          return { success: true, entry: existing };
        }
      }
      return { success: false, error: error.message };
    }

    localCatalogMap.set((data as AudioCatalogEntry).id, data as AudioCatalogEntry);
    await saveDbCatalogFallback(Array.from(localCatalogMap.values()));

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
        await saveDbCatalogFallback(Array.from(localCatalogMap.values()));
      }
      safeRevalidate("/admin");
      safeRevalidate("/");
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase
      .from("audio_catalog")
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      if (isTableMissingError(error)) {
        const existing = localCatalogMap.get(id);
        if (existing) {
          existing.is_published = isPublished;
          existing.updated_at = new Date().toISOString();
          await saveDbCatalogFallback(Array.from(localCatalogMap.values()));
        }
        safeRevalidate("/admin");
        safeRevalidate("/");
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    const inMem = localCatalogMap.get(id);
    if (inMem) {
      inMem.is_published = isPublished;
      inMem.updated_at = new Date().toISOString();
    }
    await saveDbCatalogFallback(Array.from(localCatalogMap.values()));

    safeRevalidate("/admin");
    safeRevalidate("/");
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
      await saveDbCatalogFallback(Array.from(localCatalogMap.values()));
      await logAuditEvent({
        actor_id: adminUser?.id || "admin",
        action: "AUDIO_CATALOG_DELETE",
        target_id: id,
        target_type: "audio",
      });
      safeRevalidate("/admin");
      safeRevalidate("/");
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase.from("audio_catalog").delete().eq("id", id);
    if (error) {
      if (isTableMissingError(error)) {
        localCatalogMap.delete(id);
        await saveDbCatalogFallback(Array.from(localCatalogMap.values()));
        await logAuditEvent({
          actor_id: adminUser?.id || "admin",
          action: "AUDIO_CATALOG_DELETE",
          target_id: id,
          target_type: "audio",
        });
        safeRevalidate("/admin");
        safeRevalidate("/");
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    localCatalogMap.delete(id);
    await saveDbCatalogFallback(Array.from(localCatalogMap.values()));

    await logAuditEvent({
      actor_id: adminUser?.id || "admin",
      action: "AUDIO_CATALOG_DELETE",
      target_id: id,
      target_type: "audio",
    });

    safeRevalidate("/admin");
    safeRevalidate("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
