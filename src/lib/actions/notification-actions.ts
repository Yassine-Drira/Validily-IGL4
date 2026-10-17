"use server";

import type {
  SystemNotification,
  NotificationType,
  CheerType,
} from "../../types/database";

async function getAuthModule() {
  try {
    return await import("../auth/authorization");
  } catch {
    try {
      const p = "../auth/authorization.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

async function getSupabaseServerModule() {
  try {
    return await import("../supabase/server");
  } catch {
    try {
      const p = "../supabase/server.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

async function getAdminClient() {
  try {
    const adminMod = await import("../supabase/admin");
    return adminMod.getServiceSupabase();
  } catch {
    try {
      const p = "../supabase/admin.ts";
      const adminMod = await import(/* @vite-ignore */ p);
      return adminMod.getServiceSupabase();
    } catch {
      return null;
    }
  }
}

async function isDbConfigured(): Promise<boolean> {
  const serverMod = await getSupabaseServerModule();
  return serverMod?.isSupabaseConfigured() ?? false;
}

async function safeRevalidate(path: string) {
  try {
    const cacheMod = await import("next/cache");
    cacheMod.revalidatePath?.(path);
  } catch {
    // Outside active Next.js request context or running in isolated test runner
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

// In-memory notifications store for zero-latency instant updates & offline/schema-cache fallback
const globalNotifState = globalThis as unknown as {
  __localNotifications?: Map<string, SystemNotification>;
};
if (!globalNotifState.__localNotifications) {
  globalNotifState.__localNotifications = new Map();
}
const localNotifications = globalNotifState.__localNotifications;

export interface GlobalAnnouncement {
  id: string;
  type: "announcement";
  title: string;
  content: string;
  link?: string;
  created_at: string;
  release_version?: string;
  is_active: boolean;
}

// Active published global announcements registry
const ACTIVE_GLOBAL_ANNOUNCEMENTS: GlobalAnnouncement[] = [
  {
    id: "announcement-v1-1-release",
    type: "announcement",
    release_version: "v1.1",
    title: "VALIDILY-IGL4 v1.1 — A New Chapter in Your Learning Experience",
    content: `We're excited to introduce VALIDILY-IGL4 v1.1! This update brings improvements designed to make studying, organizing resources, and staying focused easier and more enjoyable.

What's new:
- 📚 Better Resource Sharing & Organization: Organize study materials more easily with improved folders and customization options.
- 📄 More Ways to Learn: Add and manage PDFs, interactive HTML quizzes, URLs, and other study resources through existing resource workflows.
- 👍 Community Resource Voting: Upvote or downvote resources to help students discover the most useful revision materials.
- 🎯 Focus Hub Improvements: A more coherent focus-session experience with improved audio persistence and session workflows.
- 🌳 Focus Forest & Bosquet: A more meaningful record of your focus journey, with persistent trees and session outcomes.
- ⚡ Performance & Reliability: Under-the-hood optimizations aimed at smoother navigation, fewer unnecessary requests, and a more reliable experience.

Thank you for being part of VALIDILY-IGL4. Your contributions and feedback help make our shared learning space better for everyone.

Keep learning. Keep growing. Build your Bosquet. 🌱`,
    link: "/my-space",
    created_at: "2026-10-17T12:00:00.000Z",
    is_active: true,
  },
];

export async function getActiveGlobalAnnouncements(): Promise<GlobalAnnouncement[]> {
  return [...ACTIVE_GLOBAL_ANNOUNCEMENTS];
}

// In-memory per-user announcement state store (tracks which users read or dismissed which announcement)
const globalAnnouncementState = globalThis as unknown as {
  __userAnnouncementState?: Map<string, { read: Set<string>; dismissed: Set<string> }>;
};
if (!globalAnnouncementState.__userAnnouncementState) {
  globalAnnouncementState.__userAnnouncementState = new Map();
}
const userAnnouncementState = globalAnnouncementState.__userAnnouncementState;

import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".validily-cache");

function readDiskNotificationJson(filename: string): any {
  try {
    const file = path.join(CACHE_DIR, filename);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return null;
}

function writeDiskNotificationJson(filename: string, data: any): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const file = path.join(CACHE_DIR, filename);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

export async function getUserAnnouncementState(
  userId: string
): Promise<{ read: Set<string>; dismissed: Set<string> }> {
  let state = userAnnouncementState.get(userId);
  if (!state) {
    state = { read: new Set<string>(), dismissed: new Set<string>() };
    userAnnouncementState.set(userId, state);

    // 1. Try Upstash Redis distributed store
    try {
      const { getDistributedJson } = await import("@/lib/kv/redis");
      const kvData = await getDistributedJson<{ readIds: string[]; dismissedIds: string[] }>(`announcements:${userId}`);
      if (kvData) {
        if (Array.isArray(kvData.readIds)) {
          kvData.readIds.forEach((id: string) => state?.read.add(id));
        }
        if (Array.isArray(kvData.dismissedIds)) {
          kvData.dismissedIds.forEach((id: string) => state?.dismissed.add(id));
        }
      }
    } catch {}

    const diskData = readDiskNotificationJson(`announcements_${userId}.json`);
    if (diskData) {
      if (Array.isArray(diskData.readIds)) {
        diskData.readIds.forEach((id: string) => state?.read.add(id));
      }
      if (Array.isArray(diskData.dismissedIds)) {
        diskData.dismissedIds.forEach((id: string) => state?.dismissed.add(id));
      }
    }
  }
  return state;
}

export async function saveUserAnnouncementState(
  userId: string,
  state: { read: Set<string>; dismissed: Set<string> }
): Promise<void> {
  userAnnouncementState.set(userId, state);
  const payload = {
    readIds: Array.from(state.read),
    dismissedIds: Array.from(state.dismissed),
  };

  // 1. Persist to Upstash Redis
  try {
    const { setDistributedJson } = await import("@/lib/kv/redis");
    await setDistributedJson(`announcements:${userId}`, payload);
  } catch {}

  writeDiskNotificationJson(`announcements_${userId}.json`, payload);
}

export async function resetUserAnnouncementState(userId?: string): Promise<void> {
  if (userId) {
    userAnnouncementState.delete(userId);
    try {
      const file = path.join(CACHE_DIR, `announcements_${userId}.json`);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch {}
  } else {
    userAnnouncementState.clear();
  }
}

/**
 * DB Fallback: Read notifications from disk cache (Never touches notes table)
 */
export async function getDbNotificationsFallback(userId: string): Promise<SystemNotification[]> {
  const disk = readDiskNotificationJson(`notifications_${userId}.json`);
  if (Array.isArray(disk)) return disk as SystemNotification[];
  return [];
}

/**
 * DB Fallback: Persist notifications to disk cache (Never touches notes table)
 */
export async function saveDbNotificationsFallback(
  userId: string,
  entries: SystemNotification[]
): Promise<void> {
  const trimmed = entries.slice(0, 60);
  writeDiskNotificationJson(`notifications_${userId}.json`, trimmed);
}

/**
 * Fetch all notifications for the authenticated user
 */
export async function getMyNotifications(): Promise<SystemNotification[]> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return [];
    }

    const userId = requester.id;
    let list: SystemNotification[] = [];

    // 1. Check dedicated notifications table if DB configured
    if (await isDbConfigured()) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          const { data, error } = await serviceSupabase
            .from("notifications")
            .select("*")
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && data && data.length > 0) {
            list = data as SystemNotification[];
          } else if (error && isTableMissingError(error)) {
            // Fall back to notes storage
            list = await getDbNotificationsFallback(userId);
          } else {
            // Table exists but maybe empty, check notes storage as well
            const notesFallback = await getDbNotificationsFallback(userId);
            if (notesFallback.length > 0) {
              list = notesFallback;
            }
          }
        } catch {
          list = await getDbNotificationsFallback(userId);
        }
      }
    }

    // 2. Fetch user announcement state & inject active announcements
    const annState = await getUserAnnouncementState(userId);
    const announcementNotifs: SystemNotification[] = ACTIVE_GLOBAL_ANNOUNCEMENTS
      .filter((ann) => ann.is_active && !annState.dismissed.has(ann.id))
      .map((ann) => ({
        id: ann.id,
        recipient_id: userId,
        sender_id: "validily-core",
        sender_name: "VALIDILY Team",
        sender_avatar_url: null,
        type: "announcement" as NotificationType,
        title: ann.title,
        content: ann.content,
        is_read: annState.read.has(ann.id),
        link: ann.link || "/my-space",
        created_at: ann.created_at,
      }));

    // 3. Merge with in-memory store and announcements
    const localMatches = Array.from(localNotifications.values()).filter(
      (n) => n.recipient_id === userId
    );

    const mergedMap = new Map<string, SystemNotification>();
    for (const item of list) {
      mergedMap.set(item.id, item);
    }
    for (const ann of announcementNotifs) {
      mergedMap.set(ann.id, ann);
    }
    for (const item of localMatches) {
      // Memory state is latest for read status
      mergedMap.set(item.id, item);
    }

    const result = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return result.slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * Create and dispatch a system notification to a target user
 */
export async function createNotification(input: {
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  type: NotificationType;
  cheerType?: CheerType;
  title: string;
  content: string;
  link?: string;
}): Promise<{
  success: boolean;
  notification?: SystemNotification;
  error?: string;
}> {
  try {
    if (!input.recipientId) {
      return { success: false, error: "Recipient ID required" };
    }

    const notif: SystemNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      recipient_id: input.recipientId,
      sender_id: input.senderId,
      sender_name: input.senderName,
      sender_avatar_url: input.senderAvatarUrl,
      type: input.type,
      cheer_type: input.cheerType,
      title: input.title,
      content: input.content,
      is_read: false,
      link: input.link || "/forest",
      created_at: new Date().toISOString(),
    };

    // 1. Store in memory
    localNotifications.set(notif.id, notif);

    // 2. Persist to DB
    if (await isDbConfigured()) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        let inserted = false;
        try {
          const { error } = await serviceSupabase.from("notifications").insert({
            id: notif.id,
            recipient_id: notif.recipient_id,
            sender_id: notif.sender_id || null,
            sender_name: notif.sender_name || null,
            sender_avatar_url: notif.sender_avatar_url || null,
            type: notif.type,
            cheer_type: notif.cheer_type || null,
            title: notif.title,
            content: notif.content,
            is_read: false,
            link: notif.link || null,
            created_at: notif.created_at,
          });

          if (!error) {
            inserted = true;
          }
        } catch {
          // Table missing
        }

        if (!inserted) {
          const existing = await getDbNotificationsFallback(input.recipientId);
          const updated = [notif, ...existing.filter((n) => n.id !== notif.id)].slice(0, 50);
          await saveDbNotificationsFallback(input.recipientId, updated);
        }
      }
    }

    await safeRevalidate("/forest");
    await safeRevalidate("/forest/community");

    return {
      success: true,
      notification: notif,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erreur lors de la création de la notification.",
    };
  }
}

/**
 * Mark a specific notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Non authentifié" };
    }

    // Check if this is an announcement
    if (
      notificationId.startsWith("announcement-") ||
      ACTIVE_GLOBAL_ANNOUNCEMENTS.some((a) => a.id === notificationId)
    ) {
      const annState = await getUserAnnouncementState(requester.id);
      annState.read.add(notificationId);
      await saveUserAnnouncementState(requester.id, annState);
      return { success: true };
    }

    // 1. Update memory
    const local = localNotifications.get(notificationId);
    if (local && local.recipient_id === requester.id) {
      local.is_read = true;
      localNotifications.set(notificationId, local);
    }

    // 2. Update DB
    if (await isDbConfigured()) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          await serviceSupabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId)
            .eq("recipient_id", requester.id);
        } catch {}

        // Fallback in notes
        const existing = await getDbNotificationsFallback(requester.id);
        const updated = existing.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        await saveDbNotificationsFallback(requester.id, updated);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, count: 0, error: "Non authentifié" };
    }

    const userId = requester.id;
    let count = 0;

    // Check announcements
    const annState = await getUserAnnouncementState(userId);
    let annUpdated = false;
    for (const ann of ACTIVE_GLOBAL_ANNOUNCEMENTS) {
      if (ann.is_active && !annState.dismissed.has(ann.id) && !annState.read.has(ann.id)) {
        annState.read.add(ann.id);
        annUpdated = true;
        count++;
      }
    }
    if (annUpdated) {
      await saveUserAnnouncementState(userId, annState);
    }

    // 1. Memory update
    for (const [id, notif] of localNotifications.entries()) {
      if (notif.recipient_id === userId && !notif.is_read) {
        notif.is_read = true;
        localNotifications.set(id, notif);
        count++;
      }
    }

    // 2. DB update
    if (await isDbConfigured()) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          await serviceSupabase
            .from("notifications")
            .update({ is_read: true })
            .eq("recipient_id", userId)
            .eq("is_read", false);
        } catch {}

        const existing = await getDbNotificationsFallback(userId);
        const updated = existing.map((n) => ({ ...n, is_read: true }));
        await saveDbNotificationsFallback(userId, updated);
      }
    }

    return { success: true, count };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || "Erreur" };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Non authentifié" };
    }

    // Check if announcement
    if (
      notificationId.startsWith("announcement-") ||
      ACTIVE_GLOBAL_ANNOUNCEMENTS.some((a) => a.id === notificationId)
    ) {
      const annState = await getUserAnnouncementState(requester.id);
      annState.dismissed.add(notificationId);
      await saveUserAnnouncementState(requester.id, annState);
      return { success: true };
    }

    // 1. Memory delete
    localNotifications.delete(notificationId);

    // 2. DB delete
    if (await isDbConfigured()) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          await serviceSupabase
            .from("notifications")
            .delete()
            .eq("id", notificationId)
            .eq("recipient_id", requester.id);
        } catch {}

        const existing = await getDbNotificationsFallback(requester.id);
        const filtered = existing.filter((n) => n.id !== notificationId);
        await saveDbNotificationsFallback(requester.id, filtered);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

/**
 * Fast unread count helper
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const notifs = await getMyNotifications();
    return notifs.filter((n) => !n.is_read).length;
  } catch {
    return 0;
  }
}

/**
 * Publish or update a global announcement
 */
export async function publishGlobalAnnouncement(input: {
  id: string;
  title: string;
  content: string;
  release_version?: string;
  link?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Non authentifié" };
    }

    const existingIdx = ACTIVE_GLOBAL_ANNOUNCEMENTS.findIndex((a) => a.id === input.id);
    const item: GlobalAnnouncement = {
      id: input.id,
      type: "announcement",
      title: input.title,
      content: input.content,
      release_version: input.release_version || "v1.1",
      link: input.link || "/my-space",
      created_at: new Date().toISOString(),
      is_active: true,
    };

    if (existingIdx >= 0) {
      ACTIVE_GLOBAL_ANNOUNCEMENTS[existingIdx] = item;
    } else {
      ACTIVE_GLOBAL_ANNOUNCEMENTS.unshift(item);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

