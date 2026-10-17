"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pingPresence } from "@/lib/actions/presence-actions";
import { recordAnalyticsEvent } from "@/lib/actions/analytics-actions";
import { DeviceCategory } from "@/types/database";

function detectDeviceCategory(): DeviceCategory {
  if (typeof window === "undefined" || !navigator.userAgent) return "desktop";
  const ua = navigator.userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(
      ua
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

function detectBrowserFamily(): string {
  if (typeof window === "undefined" || !navigator.userAgent) return "Other";
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Opera|OPR\//i.test(ua)) return "Opera";
  return "Other";
}

function detectOsFamily(): string {
  if (typeof window === "undefined" || !navigator.userAgent) return "Other";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "Linux";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  return "Other";
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-sess";
  try {
    const key = "validily_telemetry_session";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return `s_fallback_${Date.now()}`;
  }
}

export function PresenceAndAnalyticsTracker() {
  const pathname = usePathname();
  const lastPathnameRef = useRef<string | null>(null);
  const lastHeartbeatRef = useRef<number>(0);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // 1. Record Page Views on route transitions
  useEffect(() => {
    if (pathname === lastPathnameRef.current) return;
    lastPathnameRef.current = pathname;

    const device = detectDeviceCategory();
    const browser = detectBrowserFamily();
    const os = detectOsFamily();
    const sessionId = getOrCreateSessionId();

    recordAnalyticsEvent({
      eventType: "page_view",
      pageRoute: pathname,
      sessionId,
      deviceCategory: device,
      browserFamily: browser,
      osFamily: os,
    }).catch(() => {});
  }, [pathname]);

  // 2. Periodic Live Presence Heartbeat (Throttled to at most once per 55-60s, tab-visibility aware)
  useEffect(() => {
    const device = detectDeviceCategory();

    const sendHeartbeat = (force = false) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // Don't ping if user minimized or switched tab
      }
      const now = Date.now();
      if (!force && now - lastHeartbeatRef.current < 55000) {
        return; // Throttle: don't ping more than once every ~55 seconds
      }
      lastHeartbeatRef.current = now;
      pingPresence({
        coarseRoute: pathnameRef.current,
        deviceCategory: device,
      }).catch(() => {});
    };

    // Initial ping on mount or if >55s since last ping
    sendHeartbeat(false);

    // 60-second periodic heartbeat
    const interval = setInterval(() => sendHeartbeat(true), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
