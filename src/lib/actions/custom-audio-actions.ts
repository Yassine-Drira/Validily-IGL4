"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getRequesterUser, isUserAdmin } from "@/lib/auth/authorization";
import { parseAndValidateYouTubeUrl } from "@/lib/audio/youtube-parser";
import { getUserVipStatus } from "@/lib/actions/vip-actions";
import { CustomAudioEntry, AudioCatalogEntry } from "@/types/database";

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

// In-memory store for offline/local-first testing & schema cache fallback (bound to globalThis)
const globalAudioState = globalThis as unknown as {
  __localCustomAudioEntries?: Map<string, CustomAudioEntry>;
  __localCatalogEntries?: Map<string, AudioCatalogEntry>;
};
if (!globalAudioState.__localCustomAudioEntries) {
  globalAudioState.__localCustomAudioEntries = new Map();
}
if (!globalAudioState.__localCatalogEntries) {
  globalAudioState.__localCatalogEntries = new Map();
}
const localCustomAudioEntries = globalAudioState.__localCustomAudioEntries;
const localCatalogEntries = globalAudioState.__localCatalogEntries;

// Seed baseline catalog entries if empty for immediate rich study experience
if (localCatalogEntries.size === 0) {
  const seeds: AudioCatalogEntry[] = [
    {
      id: "cat-lofi-01",
      title: "Lofi Study Beats — Session IGL4",
      description: "Rythmes lofi doux et apaisants pour les sessions de code prolongées.",
      category: "lofi",
      source_type: "youtube",
      source_key: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      youtube_video_id: "jfKfPfyJRdk",
      is_published: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "cat-classical-02",
      title: "Concentration Baroque & Piano Zen",
      description: "Harmonies classiques favorisant la clarté mentale et la mémorisation.",
      category: "classical",
      source_type: "youtube",
      source_key: "https://www.youtube.com/watch?v=WPni755-Krg",
      youtube_video_id: "WPni755-Krg",
      is_published: true,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "cat-nature-03",
      title: "Feu de Camp & Forêt Sous la Pluie",
      description: "Crépitement chaleureux de braises et bruine apaisante en sous-bois.",
      category: "nature",
      source_type: "youtube",
      source_key: "https://www.youtube.com/watch?v=mPZkdNFkNps",
      youtube_video_id: "mPZkdNFkNps",
      is_published: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  seeds.forEach((s) => localCatalogEntries.set(s.id, s));
}

// Supabase DB System Record Resilience Helpers (Guarantees persistence across restarts)
async function getDbCustomAudioFallback(userId: string): Promise<CustomAudioEntry[]> {
  try {
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) return [];
    const { data } = await serviceSupabase
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .eq("title", "__validily_custom_audio__")
      .maybeSingle();
    if (data?.content) {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed)) return parsed as CustomAudioEntry[];
    }
  } catch {}
  return [];
}

async function saveDbCustomAudioFallback(userId: string, entries: CustomAudioEntry[]): Promise<void> {
  try {
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) return;
    const { data: existing } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "__validily_custom_audio__")
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
      await serviceSupabase.from("notes").insert({
        user_id: userId,
        title: "__validily_custom_audio__",
        content: JSON.stringify(entries),
        tags: ["system_custom_audio"],
        visibility: "private",
      });
    }
  } catch {}
}

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

const FREE_QUOTA_LIMIT = 2;
const VIP_QUOTA_LIMIT = 25;
const ADMIN_QUOTA_LIMIT = 100;

/**
 * Get the authenticated user's custom audio library and current quota entitlement.
 */
export async function getMyCustomAudio(): Promise<{
  success: boolean;
  entries: CustomAudioEntry[];
  usedCount: number;
  maxAllowed: number;
  remainingSlots: number;
  isVip: boolean;
  isAdmin: boolean;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user || !user.id) {
      return {
        success: false,
        entries: [],
        usedCount: 0,
        maxAllowed: FREE_QUOTA_LIMIT,
        remainingSlots: 0,
        isVip: false,
        isAdmin: false,
        error: "Authentification requise pour accéder à votre bibliothèque audio.",
      };
    }

    const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
    const vipStatus = await getUserVipStatus(user.id);
    const isVip = vipStatus.isVip;

    const maxAllowed = isAdmin
      ? ADMIN_QUOTA_LIMIT
      : isVip
      ? VIP_QUOTA_LIMIT
      : FREE_QUOTA_LIMIT;

    const dbFallback = await getDbCustomAudioFallback(user.id);
    const map = new Map<string, CustomAudioEntry>();
    for (const e of dbFallback) {
      if (e.user_id === user.id) map.set(e.id, e);
    }
    for (const e of localCustomAudioEntries.values()) {
      if (e.user_id === user.id) map.set(e.id, e);
    }

    if (!isSupabaseConfigured()) {
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      merged.forEach((e) => localCustomAudioEntries.set(e.id, e));

      const usedCount = merged.length;
      const remainingSlots = Math.max(0, maxAllowed - usedCount);

      return {
        success: true,
        entries: merged,
        usedCount,
        maxAllowed,
        remainingSlots,
        isVip,
        isAdmin,
      };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: entries, error } = await serviceSupabase
      .from("custom_audio_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(entries)) {
      for (const e of entries) {
        if (e.user_id === user.id) map.set(e.id, e as CustomAudioEntry);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    merged.forEach((e) => localCustomAudioEntries.set(e.id, e));

    const usedCount = merged.length;
    const remainingSlots = Math.max(0, maxAllowed - usedCount);

    return {
      success: true,
      entries: merged,
      usedCount,
      maxAllowed,
      remainingSlots,
      isVip,
      isAdmin,
    };
  } catch (err: any) {
    return {
      success: false,
      entries: [],
      usedCount: 0,
      maxAllowed: FREE_QUOTA_LIMIT,
      remainingSlots: 0,
      isVip: false,
      isAdmin: false,
      error: err?.message || "Impossible de charger la bibliothèque audio.",
    };
  }
}

/**
 * Add a new custom audio entry from YouTube.
 * Enforces strict URL validation and server-authoritative quota checks.
 */
export async function addCustomAudio(input: {
  title: string;
  youtubeUrl: string;
}): Promise<{
  success: boolean;
  entry?: CustomAudioEntry;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user || !user.id) {
      return { success: false, error: "Authentification requise pour enregistrer un son personnalisé." };
    }

    const cleanTitle = (input.title || "").trim();
    if (!cleanTitle || cleanTitle.length < 2) {
      return { success: false, error: "Le titre du son doit comporter au moins 2 caractères." };
    }

    // 1. Strict YouTube URL parse & validation
    const parsed = parseAndValidateYouTubeUrl(input.youtubeUrl);
    if (!parsed.valid || !parsed.videoId || !parsed.canonicalUrl) {
      return { success: false, error: parsed.error || "URL YouTube invalide." };
    }

    // 2. Server-side quota evaluation
    const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
    const vipStatus = await getUserVipStatus(user.id);
    const isVip = vipStatus.isVip;

    const maxAllowed = isAdmin
      ? ADMIN_QUOTA_LIMIT
      : isVip
      ? VIP_QUOTA_LIMIT
      : FREE_QUOTA_LIMIT;

    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const userEntries = Array.from(localCustomAudioEntries.values()).filter(
        (e) => e.user_id === user.id
      );

      if (userEntries.length >= maxAllowed) {
        return {
          success: false,
          error: `Quota atteint (${userEntries.length}/${maxAllowed} sons). Supprimez un son pour libérer un emplacement ou passez VIP.`,
        };
      }

      const newEntry: CustomAudioEntry = {
        id: `custom-audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: user.id,
        title: cleanTitle.slice(0, 80),
        youtube_url: parsed.canonicalUrl,
        youtube_video_id: parsed.videoId,
        source_type: "youtube",
        created_at: now,
        updated_at: now,
      };

      localCustomAudioEntries.set(newEntry.id, newEntry);
      const dbFallback = await getDbCustomAudioFallback(user.id);
      const updatedList = [newEntry, ...dbFallback.filter((e) => e.id !== newEntry.id)];
      await saveDbCustomAudioFallback(user.id, updatedList);
      return { success: true, entry: newEntry };
    }

    const serviceSupabase = getServiceSupabase();

    // Query active count
    const { count, error: countErr } = await serviceSupabase
      .from("custom_audio_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countErr) {
      if (isTableMissingError(countErr)) {
        const dbFallback = await getDbCustomAudioFallback(user.id);
        const existingList = dbFallback.length > 0
          ? dbFallback
          : Array.from(localCustomAudioEntries.values()).filter((e) => e.user_id === user.id);

        if (existingList.length >= maxAllowed) {
          return {
            success: false,
            error: `Quota atteint (${existingList.length}/${maxAllowed} sons). Supprimez un son pour libérer un emplacement ou passez VIP.`,
          };
        }
        const newEntry: CustomAudioEntry = {
          id: `custom-audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user_id: user.id,
          title: cleanTitle.slice(0, 80),
          youtube_url: parsed.canonicalUrl,
          youtube_video_id: parsed.videoId,
          source_type: "youtube",
          created_at: now,
          updated_at: now,
        };
        const updatedList = [newEntry, ...existingList.filter((e) => e.id !== newEntry.id)];
        await saveDbCustomAudioFallback(user.id, updatedList);
        localCustomAudioEntries.set(newEntry.id, newEntry);
        return { success: true, entry: newEntry };
      }
      return { success: false, error: countErr.message };
    }

    const currentCount = count || 0;
    if (currentCount >= maxAllowed) {
      return {
        success: false,
        error: `Quota atteint (${currentCount}/${maxAllowed} sons). Supprimez un son pour libérer un emplacement ou passez VIP.`,
      };
    }

    const { data, error } = await serviceSupabase
      .from("custom_audio_entries")
      .insert({
        user_id: user.id,
        title: cleanTitle.slice(0, 80),
        youtube_url: parsed.canonicalUrl,
        youtube_video_id: parsed.videoId,
        source_type: "youtube",
      })
      .select()
      .single();

    if (error || !data) {
      if (isTableMissingError(error)) {
        const newEntry: CustomAudioEntry = {
          id: `custom-audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user_id: user.id,
          title: cleanTitle.slice(0, 80),
          youtube_url: parsed.canonicalUrl,
          youtube_video_id: parsed.videoId,
          source_type: "youtube",
          created_at: now,
          updated_at: now,
        };
        const dbFallback = await getDbCustomAudioFallback(user.id);
        const updatedList = [newEntry, ...dbFallback.filter((e) => e.id !== newEntry.id)];
        await saveDbCustomAudioFallback(user.id, updatedList);
        localCustomAudioEntries.set(newEntry.id, newEntry);
        return { success: true, entry: newEntry };
      }
      return { success: false, error: error?.message || "Échec de l'enregistrement." };
    }

    const newEntry = data as CustomAudioEntry;
    localCustomAudioEntries.set(newEntry.id, newEntry);
    const dbFallback = await getDbCustomAudioFallback(user.id);
    const updatedList = [newEntry, ...dbFallback.filter((e) => e.id !== newEntry.id)];
    await saveDbCustomAudioFallback(user.id, updatedList);

    return { success: true, entry: newEntry };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de l'ajout du son." };
  }
}

/**
 * Edit a custom audio entry's title.
 * Does NOT consume quota slots.
 */
export async function updateCustomAudio(
  entryId: string,
  data: { title: string }
): Promise<{
  success: boolean;
  entry?: CustomAudioEntry;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user || !user.id) {
      return { success: false, error: "Authentification requise." };
    }

    const cleanTitle = (data.title || "").trim();
    if (!cleanTitle || cleanTitle.length < 2) {
      return { success: false, error: "Le titre doit comporter au moins 2 caractères." };
    }

    const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const entry = localCustomAudioEntries.get(entryId);
      if (!entry) {
        return { success: false, error: "Son introuvable." };
      }
      if (entry.user_id !== user.id && !isAdmin) {
        return { success: false, error: "Accès non autorisé à ce son." };
      }

      entry.title = cleanTitle.slice(0, 80);
      entry.updated_at = now;
      return { success: true, entry };
    }

    const serviceSupabase = getServiceSupabase();

    // Verify ownership
    const { data: existing, error: fetchErr } = await serviceSupabase
      .from("custom_audio_entries")
      .select("user_id")
      .eq("id", entryId)
      .maybeSingle();

    if (fetchErr && isTableMissingError(fetchErr)) {
      const fallbackList = await getDbCustomAudioFallback(user.id);
      const entry = fallbackList.find((e) => e.id === entryId) || localCustomAudioEntries.get(entryId);
      if (!entry) {
        return { success: false, error: "Son introuvable." };
      }
      if (entry.user_id !== user.id && !isAdmin) {
        return { success: false, error: "Accès non autorisé à ce son." };
      }
      entry.title = cleanTitle.slice(0, 80);
      entry.updated_at = now;
      localCustomAudioEntries.set(entry.id, entry);
      const updatedList = [entry, ...fallbackList.filter((e) => e.id !== entry.id)];
      await saveDbCustomAudioFallback(user.id, updatedList);
      return { success: true, entry };
    }

    if (!existing) {
      const fallbackList = await getDbCustomAudioFallback(user.id);
      const entry = fallbackList.find((e) => e.id === entryId) || localCustomAudioEntries.get(entryId);
      if (entry) {
        if (entry.user_id !== user.id && !isAdmin) {
          return { success: false, error: "Accès non autorisé à ce son." };
        }
        entry.title = cleanTitle.slice(0, 80);
        entry.updated_at = now;
        localCustomAudioEntries.set(entry.id, entry);
        const updatedList = [entry, ...fallbackList.filter((e) => e.id !== entry.id)];
        await saveDbCustomAudioFallback(user.id, updatedList);
        return { success: true, entry };
      }
      return { success: false, error: "Son introuvable." };
    }

    if (existing.user_id !== user.id && !isAdmin) {
      return { success: false, error: "Accès non autorisé à ce son." };
    }

    const { data: updated, error } = await serviceSupabase
      .from("custom_audio_entries")
      .update({
        title: cleanTitle.slice(0, 80),
        updated_at: now,
      })
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        const fallbackList = await getDbCustomAudioFallback(user.id);
        const entry = fallbackList.find((e) => e.id === entryId) || localCustomAudioEntries.get(entryId);
        if (entry) {
          entry.title = cleanTitle.slice(0, 80);
          entry.updated_at = now;
          localCustomAudioEntries.set(entry.id, entry);
          const updatedList = [entry, ...fallbackList.filter((e) => e.id !== entry.id)];
          await saveDbCustomAudioFallback(user.id, updatedList);
          return { success: true, entry };
        }
      }
      return { success: false, error: error.message };
    }

    const updatedEntry = updated as CustomAudioEntry;
    localCustomAudioEntries.set(updatedEntry.id, updatedEntry);
    const fallbackList = await getDbCustomAudioFallback(user.id);
    const updatedList = [updatedEntry, ...fallbackList.filter((e) => e.id !== updatedEntry.id)];
    await saveDbCustomAudioFallback(user.id, updatedList);

    return { success: true, entry: updatedEntry };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur de mise à jour." };
  }
}

/**
 * Delete a custom audio entry.
 * Explicit policy: Deleting an entry immediately frees up its quota slot.
 */
export async function deleteCustomAudio(entryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user || !user.id) {
      return { success: false, error: "Authentification requise." };
    }

    const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));

    if (!isSupabaseConfigured()) {
      const entry = localCustomAudioEntries.get(entryId);
      if (!entry) {
        return { success: false, error: "Son introuvable." };
      }
      if (entry.user_id !== user.id && !isAdmin) {
        return { success: false, error: "Accès non autorisé." };
      }
      localCustomAudioEntries.delete(entryId);
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();

    const { data: existing, error: fetchErr } = await serviceSupabase
      .from("custom_audio_entries")
      .select("user_id")
      .eq("id", entryId)
      .maybeSingle();

    if (fetchErr && isTableMissingError(fetchErr)) {
      localCustomAudioEntries.delete(entryId);
      const existingList = await getDbCustomAudioFallback(user.id);
      const filtered = existingList.filter((e) => e.id !== entryId);
      await saveDbCustomAudioFallback(user.id, filtered);
      return { success: true };
    }

    if (!existing) {
      const localEntry = localCustomAudioEntries.get(entryId);
      if (localEntry) {
        localCustomAudioEntries.delete(entryId);
        const existingList = await getDbCustomAudioFallback(user.id);
        const filtered = existingList.filter((e) => e.id !== entryId);
        await saveDbCustomAudioFallback(user.id, filtered);
        return { success: true };
      }
      return { success: false, error: "Son introuvable." };
    }

    if (existing.user_id !== user.id && !isAdmin) {
      return { success: false, error: "Accès non autorisé." };
    }

    const { error } = await serviceSupabase
      .from("custom_audio_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      if (isTableMissingError(error)) {
        localCustomAudioEntries.delete(entryId);
        const existingList = await getDbCustomAudioFallback(user.id);
        const filtered = existingList.filter((e) => e.id !== entryId);
        await saveDbCustomAudioFallback(user.id, filtered);
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la suppression." };
  }
}

/**
 * Get published catalog entries curated by administrators.
 * Public bonus tracks available to all students with zero quota consumption.
 */
export async function getSharedAudioCatalog(): Promise<{
  success: boolean;
  catalog: AudioCatalogEntry[];
  error?: string;
}> {
  try {
    const dbCatalog = await getDbCatalogFallback();
    const map = new Map<string, AudioCatalogEntry>();

    // 1. Initial seeds and memory entries
    for (const c of localCatalogEntries.values()) {
      if (c.is_published) map.set(c.id, c);
    }

    // 2. Fallback DB entries from notes table (__validily_audio_catalog__)
    for (const c of dbCatalog) {
      if (c.is_published) {
        map.set(c.id, c);
        localCatalogEntries.set(c.id, c);
      }
    }

    // 3. Supabase audio_catalog table (if available)
    if (isSupabaseConfigured()) {
      try {
        const serviceSupabase = getServiceSupabase();
        const { data, error } = await serviceSupabase
          .from("audio_catalog")
          .select("*")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          for (const c of data) {
            if (c.is_published) {
              map.set(c.id, c as AudioCatalogEntry);
              localCatalogEntries.set(c.id, c as AudioCatalogEntry);
            }
          }
        }
      } catch {}
    }

    const list = Array.from(map.values()).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    return { success: true, catalog: list };
  } catch (err: any) {
    return { success: false, catalog: [], error: err?.message };
  }
}
