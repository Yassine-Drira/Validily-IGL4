"use server";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { assertAdmin, getRequesterUser } from "@/lib/auth/authorization";
import { UserPresence, DeviceCategory } from "@/types/database";

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    err.code === "PGRST204" ||
    err.code === "42P01"
  );
}

const localPresenceMap: Map<string, UserPresence> = new Map();

function getLocalPresenceList(now: number, activeThresholdMs: number, recentThresholdMs: number) {
  const activeList: Array<UserPresence & { isRecent: boolean; timeAgoSeconds: number }> = [];

  for (const [uid, p] of localPresenceMap.entries()) {
    const diffMs = now - new Date(p.last_seen_at).getTime();
    if (diffMs > 60 * 60 * 1000) {
      localPresenceMap.delete(uid); // Purge stale records > 1h
      continue;
    }
    if (diffMs <= recentThresholdMs) {
      activeList.push({
        ...p,
        isRecent: diffMs > activeThresholdMs,
        timeAgoSeconds: Math.round(diffMs / 1000),
      });
    }
  }

  activeList.sort((a, b) => a.timeAgoSeconds - b.timeAgoSeconds);
  const totalActive = activeList.filter((u) => !u.isRecent).length;

  return {
    success: true,
    totalActive,
    users: activeList,
  };
}

/**
 * Client heartbeat to update user presence.
 * Server-authoritative: user ID is strictly extracted from verified session credentials.
 */
export async function pingPresence(params: {
  coarseRoute?: string;
  deviceCategory?: DeviceCategory;
}): Promise<{ success: boolean }> {
  try {
    const user = await getRequesterUser();
    if (!user || !user.id) {
      // Anonymous visitors are not stored in presence table (only telemetry)
      return { success: true };
    }

    const displayName = user.name || user.email?.split("@")[0] || "Étudiant";
    const deviceCategory = params.deviceCategory || "unknown";
    const currentRoute = (params.coarseRoute || "/").slice(0, 50);
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      localPresenceMap.set(user.id, {
        user_id: user.id,
        display_name: displayName,
        device_category: deviceCategory,
        current_route: currentRoute,
        last_seen_at: now,
      });
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase.from("user_presence").upsert(
      {
        user_id: user.id,
        display_name: displayName,
        device_category: deviceCategory,
        current_route: currentRoute,
        last_seen_at: now,
      },
      { onConflict: "user_id" }
    );

    if (error && isTableMissingError(error)) {
      localPresenceMap.set(user.id, {
        user_id: user.id,
        display_name: displayName,
        device_category: deviceCategory,
        current_route: currentRoute,
        last_seen_at: now,
      });
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Get active users currently online (Admin only).
 * Considers users active if last seen within 3 minutes; recent within 10 minutes.
 */
export async function getLivePresenceList(): Promise<{
  success: boolean;
  totalActive: number;
  users: Array<UserPresence & { isRecent: boolean; timeAgoSeconds: number }>;
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { success: false, totalActive: 0, users: [], error: adminCheck.error };
    }

    const now = Date.now();
    const activeThresholdMs = 3 * 60 * 1000; // 3 min
    const recentThresholdMs = 15 * 60 * 1000; // 15 min

    if (!isSupabaseConfigured()) {
      return getLocalPresenceList(now, activeThresholdMs, recentThresholdMs);
    }

    const serviceSupabase = getServiceSupabase();
    const cutoffDate = new Date(now - recentThresholdMs).toISOString();

    const { data, error } = await serviceSupabase
      .from("user_presence")
      .select("*")
      .gte("last_seen_at", cutoffDate)
      .order("last_seen_at", { ascending: false })
      .limit(50);

    if (error) {
      if (isTableMissingError(error)) {
        return getLocalPresenceList(now, activeThresholdMs, recentThresholdMs);
      }
      return { success: false, totalActive: 0, users: [], error: error.message };
    }

    const users = (data || []).map((p: any) => {
      const diffMs = now - new Date(p.last_seen_at).getTime();
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        device_category: p.device_category,
        current_route: p.current_route,
        last_seen_at: p.last_seen_at,
        isRecent: diffMs > activeThresholdMs,
        timeAgoSeconds: Math.round(diffMs / 1000),
      };
    });

    const totalActive = users.filter((u: any) => !u.isRecent).length;

    // Purge stale records (> 30m) periodically in background
    serviceSupabase
      .from("user_presence")
      .delete()
      .lt("last_seen_at", new Date(now - 30 * 60 * 1000).toISOString())
      .then(() => {})
      .catch(() => {});

    return { success: true, totalActive, users };
  } catch (err: any) {
    return { success: false, totalActive: 0, users: [], error: err?.message };
  }
}
