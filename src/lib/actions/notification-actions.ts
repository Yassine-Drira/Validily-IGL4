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

/**
 * DB Fallback: Read notifications stored in public.notes JSON payload
 */
export async function getDbNotificationsFallback(userId: string): Promise<SystemNotification[]> {
  try {
    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) return [];

    const { data, error } = await serviceSupabase
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .eq("title", "__validily_notifications__")
      .maybeSingle();

    if (!error && data?.content) {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed)) {
        return parsed as SystemNotification[];
      }
    }
  } catch {
    // Fallback to empty
  }
  return [];
}

/**
 * DB Fallback: Persist notifications to public.notes JSON payload
 */
export async function saveDbNotificationsFallback(
  userId: string,
  entries: SystemNotification[]
): Promise<void> {
  try {
    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) return;

    const trimmed = entries.slice(0, 60);

    const { data: existing } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "__validily_notifications__")
      .maybeSingle();

    if (existing?.id) {
      await serviceSupabase
        .from("notes")
        .update({
          content: JSON.stringify(trimmed),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await serviceSupabase.from("notes").insert({
        user_id: userId,
        title: "__validily_notifications__",
        content: JSON.stringify(trimmed),
        tags: ["system_notifications"],
        visibility: "private",
      });
    }
  } catch {
    // Silently continue
  }
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

    // 2. Merge with in-memory store
    const localMatches = Array.from(localNotifications.values()).filter(
      (n) => n.recipient_id === userId
    );

    const mergedMap = new Map<string, SystemNotification>();
    for (const item of list) {
      mergedMap.set(item.id, item);
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
