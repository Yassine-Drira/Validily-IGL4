/**
 * VALIDILY-IGL4 — Server-Side Atomic Rolling 24-Hour AI Quota Engine
 *
 * Enforces strict rolling 24-hour window quotas (NOT calendar day resets).
 * Standard Users: Max 5 AI queries per 24 hours.
 * Verified VIP Users: Bypass application quota limit completely (verified server-side).
 *
 * Concurrency Safe: Uses Redis Sorted Sets (ZREMRANGEBYSCORE + ZCARD + ZADD) via Lua script
 * or synchronized local sliding window memory fallback.
 */

import { getUserVipStatus } from "../actions/vip-actions.ts";

export const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // Exactly 86,400,000 ms (24 hours)
export const MAX_STANDARD_REQUESTS = 5;

export interface AIQuotaResult {
  allowed: boolean;
  isVip: boolean;
  remaining: number;
  limit: number;
  used: number;
  resetInMs: number;
  error?: string;
}

// Global in-memory hot store for test environments and offline failover
const globalQuotaState = globalThis as unknown as {
  __localAIQuotaWindows?: Map<string, number[]>;
};
if (!globalQuotaState.__localAIQuotaWindows) {
  globalQuotaState.__localAIQuotaWindows = new Map<string, number[]>();
}
const localQuotaWindows = globalQuotaState.__localAIQuotaWindows;

function getKvCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

function formatRemainingDuration(ms: number): string {
  if (ms <= 0) return "quelques instants";
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes} minute(s)`;
}

/**
 * Server-authoritative atomic check and consumption of the user's AI quota.
 * Rejects concurrent requests exceeding the 5-request limit over the last 24 rolling hours.
 */
export async function checkAndConsumeAIQuota(userId: string): Promise<AIQuotaResult> {
  if (!userId) {
    return {
      allowed: false,
      isVip: false,
      remaining: 0,
      limit: MAX_STANDARD_REQUESTS,
      used: MAX_STANDARD_REQUESTS,
      resetInMs: 0,
      error: "Identifiant utilisateur manquant pour la vérification du quota.",
    };
  }

  // 1. Check verified server-side VIP status (bypasses quota limits)
  const vipCheck = await getUserVipStatus(userId);
  if (vipCheck.isVip) {
    return {
      allowed: true,
      isVip: true,
      remaining: 999,
      limit: 999,
      used: 0,
      resetInMs: 0,
    };
  }

  const now = Date.now();
  const windowStart = now - ROLLING_WINDOW_MS;
  const creds = getKvCredentials();
  const redisKey = `validily:ai_quota:sliding:${userId}`;

  // 2. Distributed Atomic Redis Execution (if configured)
  if (creds) {
    try {
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowStart = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local reqId = ARGV[4]
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
        local current = redis.call('ZCARD', key)
        if current >= limit then
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local oldestScore = (oldest and #oldest >= 2) and tonumber(oldest[2]) or windowStart
          return {0, current, oldestScore}
        end
        redis.call('ZADD', key, now, reqId)
        redis.call('EXPIRE', key, 86400)
        return {1, current + 1, now}
      `;

      const res = await fetch(`${creds.url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          script,
          1,
          redisKey,
          now.toString(),
          windowStart.toString(),
          MAX_STANDARD_REQUESTS.toString(),
          `${now}-${Math.random().toString(36).slice(2, 8)}`,
        ]),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const [allowedNum, countNum, oldestScoreNum] = (json.result as [number, number, number]) || [0, 0, 0];
        const allowed = allowedNum === 1;
        const used = countNum;
        const remaining = Math.max(0, MAX_STANDARD_REQUESTS - used);
        const oldestTs = oldestScoreNum || windowStart;
        const resetInMs = Math.max(0, oldestTs + ROLLING_WINDOW_MS - now);

        if (!allowed) {
          return {
            allowed: false,
            isVip: false,
            remaining: 0,
            limit: MAX_STANDARD_REQUESTS,
            used,
            resetInMs,
            error: `Quota Validily AI atteint (${used}/${MAX_STANDARD_REQUESTS} requêtes sur 24h glissantes). Prochaine recharge dans ${formatRemainingDuration(resetInMs)}. Activez votre Pass VIP pour un accès illimité.`,
          };
        }

        return {
          allowed: true,
          isVip: false,
          remaining,
          limit: MAX_STANDARD_REQUESTS,
          used,
          resetInMs,
        };
      }
    } catch {
      // Fall through to local atomic sliding memory
    }
  }

  // 3. Local In-Memory Sliding Window (resilient fallback for local testing & network drops)
  const timestamps = (localQuotaWindows.get(userId) || []).filter((ts) => ts > windowStart);
  if (timestamps.length >= MAX_STANDARD_REQUESTS) {
    const oldest = timestamps[0];
    const resetInMs = Math.max(0, oldest + ROLLING_WINDOW_MS - now);
    localQuotaWindows.set(userId, timestamps);
    return {
      allowed: false,
      isVip: false,
      remaining: 0,
      limit: MAX_STANDARD_REQUESTS,
      used: timestamps.length,
      resetInMs,
      error: `Quota Validily AI atteint (${timestamps.length}/${MAX_STANDARD_REQUESTS} requêtes sur 24h glissantes). Prochaine recharge dans ${formatRemainingDuration(resetInMs)}. Activez votre Pass VIP pour un accès illimité.`,
    };
  }

  timestamps.push(now);
  localQuotaWindows.set(userId, timestamps);
  const remaining = Math.max(0, MAX_STANDARD_REQUESTS - timestamps.length);
  const oldest = timestamps[0];
  const resetInMs = Math.max(0, oldest + ROLLING_WINDOW_MS - now);

  return {
    allowed: true,
    isVip: false,
    remaining,
    limit: MAX_STANDARD_REQUESTS,
    used: timestamps.length,
    resetInMs,
  };
}

/**
 * Read current AI quota status without consuming a request slot (for UI dashboard display).
 */
export async function getAIQuotaStatus(userId: string): Promise<AIQuotaResult> {
  if (!userId) {
    return {
      allowed: false,
      isVip: false,
      remaining: 0,
      limit: MAX_STANDARD_REQUESTS,
      used: 0,
      resetInMs: 0,
    };
  }

  const vipCheck = await getUserVipStatus(userId);
  if (vipCheck.isVip) {
    return {
      allowed: true,
      isVip: true,
      remaining: 999,
      limit: 999,
      used: 0,
      resetInMs: 0,
    };
  }

  const now = Date.now();
  const windowStart = now - ROLLING_WINDOW_MS;
  const creds = getKvCredentials();
  const redisKey = `validily:ai_quota:sliding:${userId}`;

  if (creds) {
    try {
      const script = `
        local key = KEYS[1]
        local windowStart = tonumber(ARGV[1])
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
        local current = redis.call('ZCARD', key)
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local oldestScore = (oldest and #oldest >= 2) and tonumber(oldest[2]) or 0
        return {current, oldestScore}
      `;

      const res = await fetch(`${creds.url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["EVAL", script, 1, redisKey, windowStart.toString()]),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const [currentNum, oldestScoreNum] = (json.result as [number, number]) || [0, 0];
        const used = currentNum;
        const remaining = Math.max(0, MAX_STANDARD_REQUESTS - used);
        const oldestTs = oldestScoreNum || windowStart;
        const resetInMs = used > 0 ? Math.max(0, oldestTs + ROLLING_WINDOW_MS - now) : 0;

        return {
          allowed: remaining > 0,
          isVip: false,
          remaining,
          limit: MAX_STANDARD_REQUESTS,
          used,
          resetInMs,
        };
      }
    } catch {
      // Fall through to memory
    }
  }

  const timestamps = (localQuotaWindows.get(userId) || []).filter((ts) => ts > windowStart);
  localQuotaWindows.set(userId, timestamps);
  const used = timestamps.length;
  const remaining = Math.max(0, MAX_STANDARD_REQUESTS - used);
  const resetInMs = used > 0 ? Math.max(0, timestamps[0] + ROLLING_WINDOW_MS - now) : 0;

  return {
    allowed: remaining > 0,
    isVip: false,
    remaining,
    limit: MAX_STANDARD_REQUESTS,
    used,
    resetInMs,
  };
}

/**
 * Reset quota for testing or administrative replenishment
 */
export async function resetAIQuotaForTesting(userId: string): Promise<void> {
  await resetUserAIQuota(userId);
}

export async function resetUserAIQuota(userId: string): Promise<boolean> {
  if (!userId) return false;
  localQuotaWindows.delete(userId);
  const creds = getKvCredentials();
  if (creds) {
    try {
      await fetch(`${creds.url}/del/${encodeURIComponent(`validily:ai_quota:sliding:${userId}`)}`, {
        headers: { Authorization: `Bearer ${creds.token}` },
        cache: "no-store",
      });
    } catch {}
  }
  return true;
}
