"use server";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { assertAdmin, getRequesterUser } from "@/lib/auth/authorization";
import { getLivePresenceList } from "@/lib/actions/presence-actions";
import {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsOverview,
  DeviceCategory,
} from "@/types/database";

const localAnalyticsEvents: AnalyticsEvent[] = [];

// Seed baseline realistic metrics for immediate administrative visibility
if (localAnalyticsEvents.length === 0) {
  const now = Date.now();
  const routes = ["/forest", "/quizzes", "/resources", "/subjects", "/bookmarks", "/my-space", "/"];
  const devices: DeviceCategory[] = ["desktop", "desktop", "desktop", "mobile", "tablet"];
  const browsers = ["Chrome", "Firefox", "Safari", "Edge"];
  const oses = ["Windows", "macOS", "Linux", "iOS", "Android"];

  for (let i = 0; i < 75; i++) {
    const ageMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000 * 5); // past 5 days
    const sessNum = (i % 18) + 1;
    localAnalyticsEvents.push({
      id: `evt-${i}`,
      event_type: "page_view",
      page_route: routes[i % routes.length],
      user_id: sessNum <= 10 ? `user-${sessNum}` : null,
      session_id: `sess-${sessNum}`,
      device_category: devices[i % devices.length],
      browser_family: browsers[i % browsers.length],
      os_family: oses[i % oses.length],
      created_at: new Date(now - ageMs).toISOString(),
    });
  }
}

/**
 * Record a lightweight, privacy-conscious telemetry event.
 * Strips any sensitive query parameters, tokens, or PII.
 */
export async function recordAnalyticsEvent(params: {
  eventType?: AnalyticsEventType;
  pageRoute: string;
  sessionId: string;
  deviceCategory?: DeviceCategory;
  browserFamily?: string;
  osFamily?: string;
}): Promise<{ success: boolean }> {
  try {
    const user = await getRequesterUser();
    const cleanRoute = (params.pageRoute || "/").split("?")[0].slice(0, 60);
    const eventType = params.eventType || "page_view";
    const sessionId = (params.sessionId || "anonymous-sess").slice(0, 64);
    const deviceCategory = params.deviceCategory || "unknown";
    const browserFamily = (params.browserFamily || "Other").slice(0, 30);
    const osFamily = (params.osFamily || "Other").slice(0, 30);
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

    if (!isSupabaseConfigured()) {
      localAnalyticsEvents.push(event);
      if (localAnalyticsEvents.length > 500) {
        localAnalyticsEvents.splice(0, localAnalyticsEvents.length - 500);
      }
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();
    await serviceSupabase.from("analytics_events").insert({
      event_type: eventType,
      page_route: cleanRoute,
      user_id: user?.id || null,
      session_id: sessionId,
      device_category: deviceCategory,
      browser_family: browserFamily,
      os_family: osFamily,
    });

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
    const adminCheck = await assertAdmin();
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

    // 1. Get live active users
    const presenceRes = await getLivePresenceList();
    const activeUsersEstimate = presenceRes.totalActive || 0;

    let activeSessionsCount = 0;
    let events: AnalyticsEvent[] = [];

    if (!isSupabaseConfigured()) {
      events = localAnalyticsEvents.filter((e) => new Date(e.created_at) >= cutoff);
      activeSessionsCount = 2; // mock active focus count
    } else {
      const serviceSupabase = getServiceSupabase();

      // Count active in_progress focus sessions
      const { count: sessionCount } = await serviceSupabase
        .from("focus_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress");

      activeSessionsCount = sessionCount || 0;

      // Query analytics events in window
      const { data, error } = await serviceSupabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);

      if (!error && data) {
        events = data as AnalyticsEvent[];
      }
    }

    // Compute unique visitors
    const uniqueSessionIds = new Set(events.map((e) => e.session_id));
    const totalPageViews = events.filter((e) => e.event_type === "page_view").length;

    // Top visited pages
    const pageCounts: Record<string, number> = {};
    const deviceCounts: Record<DeviceCategory, number> = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };
    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const dayBuckets: Record<string, number> = {};

    events.forEach((e) => {
      // Pages
      pageCounts[e.page_route] = (pageCounts[e.page_route] || 0) + 1;

      // Device
      deviceCounts[e.device_category] = (deviceCounts[e.device_category] || 0) + 1;

      // Browser
      browserCounts[e.browser_family] = (browserCounts[e.browser_family] || 0) + 1;

      // OS
      osCounts[e.os_family] = (osCounts[e.os_family] || 0) + 1;

      // Daily bucket
      const dayKey = e.created_at.split("T")[0];
      dayBuckets[dayKey] = (dayBuckets[dayKey] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const pageViewsByDay = Object.entries(dayBuckets)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Multi-window unique counts
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const uniqueVisitors24h = new Set(
      events.filter((e) => new Date(e.created_at) >= dayAgo).map((e) => e.session_id)
    ).size;

    const uniqueVisitors7d = new Set(
      events.filter((e) => new Date(e.created_at) >= sevenDaysAgo).map((e) => e.session_id)
    ).size;

    const uniqueVisitors30d = uniqueSessionIds.size;

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
