/**
 * In-Memory Plan Caching & State Fingerprinting
 * Eliminates redundant LLM calls and preserves free-tier quotas.
 */

import type { AIPlanResponse } from "./types.ts";
import type { AcademicTask, CalendarTimeblock } from "@/types/database";

const PROMPT_VERSION = "v1.2.0";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  response: AIPlanResponse;
  stateHash: string;
  timestamp: number;
  ttl: number;
}

// In-memory global store to survive hot-reloads during dev
const globalCacheStore = globalThis as unknown as {
  __aiCoachCache?: Map<string, CacheEntry>;
};

if (!globalCacheStore.__aiCoachCache) {
  globalCacheStore.__aiCoachCache = new Map();
}

const planCache = globalCacheStore.__aiCoachCache;

/**
 * Generate a deterministic state fingerprint
 */
export function computeStateHash(params: {
  userId: string;
  date: string;
  tasks: AcademicTask[];
  existingBlocks: CalendarTimeblock[];
  providerId: string;
}): string {
  const { userId, date, tasks, existingBlocks, providerId } = params;

  // Compact representation of tasks that affect planning
  const tasksSummary = tasks
    .map((t) => `${t.id}:${t.is_completed}:${t.due_date}:${t.priority}`)
    .sort()
    .join("|");

  // Compact representation of confirmed calendar blocks
  const blocksSummary = existingBlocks
    .map((b) => `${b.id}:${b.start_time}-${b.end_time}`)
    .sort()
    .join("|");

  const raw = `${PROMPT_VERSION}_${userId}_${date}_${providerId}_[${tasksSummary}]_[${blocksSummary}]`;

  // Simple string hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Get cached plan if valid and state has not changed
 */
export function getCachedPlan(
  userId: string,
  date: string,
  currentStateHash: string
): AIPlanResponse | null {
  const key = `${userId}_${date}`;
  const entry = planCache.get(key);

  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    planCache.delete(key);
    return null;
  }

  if (entry.stateHash !== currentStateHash) {
    // Meaningful state change occurred (task added, timeblock moved, etc.)
    planCache.delete(key);
    return null;
  }

  // Return copy with updated cacheHit flag
  return {
    ...entry.response,
    telemetry: {
      ...entry.response.telemetry,
      cacheHit: true,
      latencyMs: 1, // <1ms memory retrieval
    },
  };
}

/**
 * Store plan in cache
 */
export function setCachedPlan(
  userId: string,
  date: string,
  currentStateHash: string,
  response: AIPlanResponse,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const key = `${userId}_${date}`;
  planCache.set(key, {
    response,
    stateHash: currentStateHash,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Invalidate cache for a user or globally
 */
export function invalidateCoachCache(userId?: string): void {
  if (userId) {
    for (const key of planCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        planCache.delete(key);
      }
    }
  } else {
    planCache.clear();
  }
}
