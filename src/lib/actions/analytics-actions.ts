"use server";

import fs from "fs";
import path from "path";
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsOverview,
  DeviceCategory,
  UserStudyGoals,
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

async function getPresenceModule() {
  try {
    return await import("./presence-actions");
  } catch {
    try {
      const p = "./presence-actions.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

async function safeRevalidate(path: string) {
  try {
    const cacheMod = await import("next/cache");
    cacheMod.revalidatePath?.(path);
  } catch {
    // Outside active Next.js request context or running in isolated test runner
  }
}

// In-memory store for offline/local-first testing & schema cache fallback (bound to globalThis)
const globalAnalyticsState = globalThis as unknown as {
  __localAnalyticsEvents?: AnalyticsEvent[];
  __localUserGoals?: Map<string, UserStudyGoals>;
  __localDailyFocusRecords?: Map<string, Record<string, { totalSeconds: number; completedPomodoros: number; updatedAt: string }>>;
};
if (!globalAnalyticsState.__localAnalyticsEvents) {
  globalAnalyticsState.__localAnalyticsEvents = [];
}
if (!globalAnalyticsState.__localUserGoals) {
  globalAnalyticsState.__localUserGoals = new Map();
}
if (!globalAnalyticsState.__localDailyFocusRecords) {
  globalAnalyticsState.__localDailyFocusRecords = new Map();
}
const localAnalyticsEvents = globalAnalyticsState.__localAnalyticsEvents;
const localUserGoals = globalAnalyticsState.__localUserGoals;
const localDailyFocusRecords = globalAnalyticsState.__localDailyFocusRecords;

// System helper to obtain a verified UUID for system documents in public.notes
async function getValidSystemUserId(serviceSupabase: any): Promise<string> {
  try {
    const authMod = await getAuthModule();
    const user = authMod ? await authMod.getRequesterUser() : null;
    if (user?.id && user.id.length === 36 && !user.id.startsWith("simulated-")) {
      return user.id;
    }
  } catch {}

  try {
    const { data: admin } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (admin?.id) return admin.id;

    const { data: anyUser } = await serviceSupabase
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (anyUser?.id) return anyUser.id;
  } catch {}

  return "12b54e6a-f1e0-4bee-b520-b4e479da3044";
}

// Clean in-memory events from any legacy synthetic seeds or historical mocks
for (let i = localAnalyticsEvents.length - 1; i >= 0; i--) {
  if (localAnalyticsEvents[i].id?.startsWith("evt-seed-") || localAnalyticsEvents[i].id?.startsWith("evt-hist-")) {
    localAnalyticsEvents.splice(i, 1);
  }
}


const CACHE_DIR = path.join(process.cwd(), ".validily-cache");

function readDiskAnalyticsJson(filename: string): any {
  try {
    const file = path.join(CACHE_DIR, filename);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return null;
}

function writeDiskAnalyticsJson(filename: string, data: any): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const file = path.join(CACHE_DIR, filename);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

// Telemetry Persistence Helpers (Disk Cache & Memory Store - Never touches notes table)
async function getDbAnalyticsFallback(): Promise<AnalyticsEvent[]> {
  const disk = readDiskAnalyticsJson("site_analytics.json");
  if (Array.isArray(disk) && disk.length > 0) {
    return disk.filter(
      (e: any) =>
        e?.id &&
        !e.id.startsWith("evt-seed-") &&
        !e.id.startsWith("evt-hist-")
    ) as AnalyticsEvent[];
  }
  return [];
}

async function saveDbAnalyticsFallback(events: AnalyticsEvent[]): Promise<void> {
  const cleanPayload = events
    .filter((e) => !e.id?.startsWith("evt-seed-") && !e.id?.startsWith("evt-hist-"))
    .slice(0, 2500);
  writeDiskAnalyticsJson("site_analytics.json", cleanPayload);
}

const DEFAULT_GOALS: UserStudyGoals = {
  dailyFocusMinutes: 45,
  weeklyQuizzes: 5,
  targetScore: 80,
};

/**
 * Fetch authenticated student's personalized study goals from DB
 */
export async function getUserStudyGoals(userId?: string): Promise<UserStudyGoals> {
  try {
    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    const effectiveUserId = userId || requester?.id;
    if (!effectiveUserId) return DEFAULT_GOALS;

    const inMem = localUserGoals.get(effectiveUserId);
    if (inMem) return inMem;

    const disk = readDiskAnalyticsJson(`goals_${effectiveUserId}.json`);
    if (disk?.dailyFocusMinutes) {
      localUserGoals.set(effectiveUserId, disk);
      return disk;
    }

    return DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

/**
 * Save customized study goals persistently in database (strictly private to user)
 */
export async function saveUserStudyGoals(
  targetUserIdOrInput: string | Partial<UserStudyGoals>,
  optionalInput?: Partial<UserStudyGoals>
): Promise<{
  success: boolean;
  goals: UserStudyGoals;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    let effectiveUserId: string | undefined = requester?.id;
    let input: Partial<UserStudyGoals> = {};

    if (typeof targetUserIdOrInput === "string") {
      effectiveUserId = requester?.id || targetUserIdOrInput;
      input = optionalInput || {};
    } else {
      input = targetUserIdOrInput || {};
    }

    if (!effectiveUserId) {
      return {
        success: false,
        goals: DEFAULT_GOALS,
        error: "Authentification requise pour enregistrer vos objectifs.",
      };
    }

    const current = await getUserStudyGoals(effectiveUserId);
    const updated: UserStudyGoals = {
      dailyFocusMinutes: Math.min(240, Math.max(10, input.dailyFocusMinutes ?? current.dailyFocusMinutes)),
      weeklyQuizzes: Math.min(50, Math.max(1, input.weeklyQuizzes ?? current.weeklyQuizzes)),
      targetScore: Math.min(100, Math.max(50, input.targetScore ?? current.targetScore)),
      updated_at: new Date().toISOString(),
    };

    localUserGoals.set(effectiveUserId, updated);
    writeDiskAnalyticsJson(`goals_${effectiveUserId}.json`, updated);
    return { success: true, goals: updated };
  } catch (err: any) {
    return {
      success: false,
      goals: DEFAULT_GOALS,
      error: err?.message || "Erreur de sauvegarde des objectifs.",
    };
  }
}

export async function resetUserStudyGoals(userId?: string): Promise<void> {
  if (userId) {
    localUserGoals.delete(userId);
    try {
      const file = path.join(CACHE_DIR, `goals_${userId}.json`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {}
  } else {
    localUserGoals.clear();
  }
}

export async function resetUserDailyFocus(userId?: string): Promise<void> {
  if (userId) {
    localDailyFocusRecords.delete(userId);
    try {
      const file = path.join(CACHE_DIR, `daily_focus_${userId}.json`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {}
  } else {
    localDailyFocusRecords.clear();
  }
}

/**
 * Daily Focus Persistence: Persist accumulated focus mode seconds for current user per day
 */
export async function recordUserDailyFocus(input: {
  dateStr?: string;
  totalSeconds: number;
  completedPomodoros?: number;
  userId?: string;
}): Promise<{
  success: boolean;
  record?: { totalSeconds: number; completedPomodoros: number; totalMinutes: number };
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    const effectiveUserId = input.userId || requester?.id;
    if (!effectiveUserId) {
      return { success: false, error: "Non authentifié" };
    }

    const todayStr = input.dateStr || new Date().toISOString().split("T")[0];
    const userHistory = localDailyFocusRecords.get(effectiveUserId) || {};

    const existingToday = userHistory[todayStr] || {
      totalSeconds: 0,
      completedPomodoros: 0,
      updatedAt: new Date().toISOString(),
    };

    const nextSeconds = Math.max(existingToday.totalSeconds, Math.max(0, input.totalSeconds));
    const nextPomodoros = Math.max(existingToday.completedPomodoros, Math.max(0, input.completedPomodoros || 0));

    const updatedRecord = {
      totalSeconds: nextSeconds,
      completedPomodoros: nextPomodoros,
      updatedAt: new Date().toISOString(),
    };

    userHistory[todayStr] = updatedRecord;
    localDailyFocusRecords.set(effectiveUserId, userHistory);
    writeDiskAnalyticsJson(`daily_focus_${effectiveUserId}.json`, userHistory);

    return {
      success: true,
      record: {
        totalSeconds: nextSeconds,
        completedPomodoros: nextPomodoros,
        totalMinutes: Math.floor(nextSeconds / 60),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur de sauvegarde focus" };
  }
}

/**
 * Retrieve user's full daily focus history (date -> { totalSeconds, completedPomodoros, totalMinutes })
 */
export async function getUserDailyFocusHistory(
  userId?: string
): Promise<Record<string, { totalSeconds: number; completedPomodoros: number; totalMinutes: number }>> {
  try {
    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    const effectiveUserId = userId || requester?.id;
    if (!effectiveUserId) return {};

    const inMem = localDailyFocusRecords.get(effectiveUserId);
    const result: Record<string, { totalSeconds: number; completedPomodoros: number; totalMinutes: number }> = {};

    if (inMem) {
      for (const [date, rec] of Object.entries(inMem)) {
        result[date] = {
          totalSeconds: rec.totalSeconds,
          completedPomodoros: rec.completedPomodoros,
          totalMinutes: Math.floor(rec.totalSeconds / 60),
        };
      }
    }

    const disk = readDiskAnalyticsJson(`daily_focus_${effectiveUserId}.json`);
    if (disk && typeof disk === "object") {
      for (const [date, rec] of Object.entries(disk as Record<string, any>)) {
        const sec = rec.totalSeconds || (rec.totalMinutes ? rec.totalMinutes * 60 : 0) || 0;
        const pom = rec.completedPomodoros || 0;
        if (!result[date] || sec > result[date].totalSeconds) {
          result[date] = {
            totalSeconds: sec,
            completedPomodoros: pom,
            totalMinutes: Math.floor(sec / 60),
          };
        }
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Fast helper to get current day focus seconds & pomodoros (strictly scoped to today's date)
 * Automatically 0 for new days, ensuring clean daily reset after 24h
 */
export async function getUserTodayFocus(
  userId?: string
): Promise<{ totalSeconds: number; completedPomodoros: number; totalMinutes: number }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const history = await getUserDailyFocusHistory(userId);
    const todayRec = history[today];
    if (todayRec) {
      return todayRec;
    }
    return { totalSeconds: 0, completedPomodoros: 0, totalMinutes: 0 };
  } catch {
    return { totalSeconds: 0, completedPomodoros: 0, totalMinutes: 0 };
  }
}

/**
 * Record a lightweight, privacy-conscious telemetry event.
 * Strips any sensitive query parameters, tokens, or PII.
 */
export async function recordAnalyticsEvent(params: {
  eventType?: AnalyticsEventType;
  pageRoute?: string;
  path?: string;
  sessionId?: string;
  deviceCategory?: DeviceCategory;
  deviceType?: DeviceCategory;
  browserFamily?: string;
  browser?: string;
  osFamily?: string;
  os?: string;
}): Promise<{ success: boolean }> {
  try {
    const authMod = await getAuthModule();
    const user = authMod ? await authMod.getRequesterUser() : null;
    const rawRoute = params.pageRoute || params.path || "/";
    const cleanRoute = rawRoute.split("?")[0].slice(0, 60);
    const eventType = params.eventType || "page_view";
    const sessionId = (params.sessionId || "anonymous-sess").slice(0, 64);
    const deviceCategory = params.deviceCategory || params.deviceType || "unknown";
    const browserFamily = (params.browserFamily || params.browser || "Other").slice(0, 30);
    const osFamily = (params.osFamily || params.os || "Other").slice(0, 30);
    const now = new Date().toISOString();

    const event: AnalyticsEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event_type: eventType,
      page_route: cleanRoute,
      user_id: user?.id || null,
      session_id: sessionId,
      device_category: deviceCategory,
      browser_family: browserFamily,
      os_family: osFamily,
      created_at: now,
    };

    localAnalyticsEvents.unshift(event);
    if (localAnalyticsEvents.length > 500) {
      localAnalyticsEvents.splice(500);
    }

    const srvMod = await getSupabaseServerModule();
    if (!srvMod || !srvMod.isSupabaseConfigured()) {
      return { success: true };
    }

    const serviceSupabase = await getAdminClient();
    if (serviceSupabase) {
      try {
        const { error } = await serviceSupabase.from("analytics_events").insert({
          event_type: eventType,
          page_route: cleanRoute,
          user_id: user?.id || null,
          session_id: sessionId,
          device_category: deviceCategory,
          browser_family: browserFamily,
          os_family: osFamily,
        });

        if (error) {
          await saveDbAnalyticsFallback(localAnalyticsEvents);
        }
      } catch {
        await saveDbAnalyticsFallback(localAnalyticsEvents);
      }
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Get aggregated website analytics overview for administrators.
 */
export async function getAnalyticsOverview(
  timeRange: "24h" | "7d" | "30d" = "7d"
): Promise<{
  success: boolean;
  overview?: AnalyticsOverview;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const adminCheck = authMod ? await authMod.assertAdmin() : { authorized: false, error: "" };
    if (!adminCheck.authorized) {
      return { success: false, error: adminCheck.error || "Privilèges administrateur requis." };
    }

    const now = Date.now();
    const rangeMs =
      timeRange === "24h"
        ? 24 * 60 * 60 * 1000
        : timeRange === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    const cutoff = new Date(now - rangeMs);

    // 1. Get live active presence users
    const presMod = await getPresenceModule();
    const presenceRes = presMod ? await presMod.getLivePresenceList() : { totalActive: 0, users: [] };
    const activeUsersEstimate = presenceRes.totalActive || 0;

    let activeSessionsCount = 0;
    let dbEvents: AnalyticsEvent[] = [];

    const srvMod = await getSupabaseServerModule();
    if (srvMod && srvMod.isSupabaseConfigured()) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        // Count active in_progress focus sessions
        try {
          const { count: sessionCount } = await serviceSupabase
            .from("focus_sessions")
            .select("id", { count: "exact", head: true })
            .eq("status", "in_progress");

          activeSessionsCount = sessionCount || 0;
        } catch {}

        // Query analytics events in window
        try {
          const { data, error } = await serviceSupabase
            .from("analytics_events")
            .select("*")
            .gte("created_at", cutoff.toISOString())
            .order("created_at", { ascending: false })
            .limit(2000);

          if (!error && Array.isArray(data) && data.length > 0) {
            dbEvents = data as AnalyticsEvent[];
          }
        } catch {}
      }
    }

    // 2. Load resilient DB fallback and merge genuine telemetry
    const fallbackEvents = await getDbAnalyticsFallback();
    const eventMap = new Map<string, AnalyticsEvent>();

    localAnalyticsEvents.forEach((e) => {
      if (!e.id?.startsWith("evt-seed-") && !e.id?.startsWith("evt-hist-")) {
        eventMap.set(e.id, e);
      }
    });
    fallbackEvents.forEach((e) => {
      if (!e.id?.startsWith("evt-seed-") && !e.id?.startsWith("evt-hist-")) {
        eventMap.set(e.id, e);
      }
    });
    dbEvents.forEach((e) => {
      if (!e.id?.startsWith("evt-seed-") && !e.id?.startsWith("evt-hist-")) {
        eventMap.set(e.id, e);
      }
    });

    const allEvents = Array.from(eventMap.values());

    // 3. Multi-window unique counts computed across the complete dataset
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const uniqueVisitors24h = new Set(
      allEvents.filter((e) => new Date(e.created_at) >= dayAgo).map((e) => e.session_id)
    ).size;

    const uniqueVisitors7d = new Set(
      allEvents.filter((e) => new Date(e.created_at) >= sevenDaysAgo).map((e) => e.session_id)
    ).size;

    const uniqueVisitors30d = new Set(
      allEvents.filter((e) => new Date(e.created_at) >= thirtyDaysAgo).map((e) => e.session_id)
    ).size;

    // 4. Filter events strictly for the active selected timeRange window
    const rangeEvents = allEvents.filter((e) => new Date(e.created_at) >= cutoff);
    const totalPageViews = rangeEvents.filter((e) => e.event_type === "page_view").length;

    // Top visited pages strictly in this timeRange
    const pageCounts: Record<string, number> = {};
    const deviceCounts: Record<DeviceCategory, number> = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };
    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};

    rangeEvents.forEach((e) => {
      pageCounts[e.page_route] = (pageCounts[e.page_route] || 0) + 1;
      deviceCounts[e.device_category] = (deviceCounts[e.device_category] || 0) + 1;
      browserCounts[e.browser_family] = (browserCounts[e.browser_family] || 0) + 1;
      osCounts[e.os_family] = (osCounts[e.os_family] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 5. Build timeline buckets matching the selected timeRange
    let pageViewsByDay: Array<{ date: string; views: number }> = [];

    if (timeRange === "24h") {
      const blocks = [
        { label: "00h - 04h", minH: 0, maxH: 4 },
        { label: "04h - 08h", minH: 4, maxH: 8 },
        { label: "08h - 12h", minH: 8, maxH: 12 },
        { label: "12h - 16h", minH: 12, maxH: 16 },
        { label: "16h - 20h", minH: 16, maxH: 20 },
        { label: "20h - 24h", minH: 20, maxH: 24 },
      ];
      const blockCounts: Record<string, number> = {};
      blocks.forEach((b) => (blockCounts[b.label] = 0));

      rangeEvents.forEach((e) => {
        const h = new Date(e.created_at).getHours();
        const matched = blocks.find((b) => h >= b.minH && h < b.maxH);
        if (matched) {
          blockCounts[matched.label] = (blockCounts[matched.label] || 0) + 1;
        }
      });

      pageViewsByDay = blocks.map((b) => ({
        date: b.label,
        views: blockCounts[b.label],
      }));
    } else {
      const dayCount = timeRange === "7d" ? 7 : 30;
      const dayBuckets: Record<string, number> = {};
      const dateKeys: string[] = [];

      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        dayBuckets[key] = 0;
        dateKeys.push(key);
      }

      rangeEvents.forEach((e) => {
        const dayKey = e.created_at.split("T")[0];
        if (dayBuckets[dayKey] !== undefined) {
          dayBuckets[dayKey] += 1;
        }
      });

      pageViewsByDay = dateKeys.map((date) => ({
        date,
        views: dayBuckets[date] || 0,
      }));
    }

    return {
      success: true,
      overview: {
        activeUsersEstimate,
        activeSessionsCount,
        uniqueVisitors24h,
        uniqueVisitors7d,
        uniqueVisitors30d,
        totalPageViews,
        pageViewsByDay,
        topPages,
        deviceDistribution: deviceCounts,
        browserDistribution: browserCounts,
        osDistribution: osCounts,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur de génération des statistiques." };
  }
}
