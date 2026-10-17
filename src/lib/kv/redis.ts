/**
 * VALIDILY-IGL4 — Distributed Atomic Key-Value & Rate Limiting Engine
 * 
 * Uses Upstash Redis REST API over HTTPS (zero dependencies, serverless & edge ready).
 * Provides graceful fallback to local memory when running offline or without credentials.
 */

interface UpstashResponse<T = any> {
  result?: T;
  error?: string;
}

const localFallbackMap = new Map<string, number>();

function getKvCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

/**
 * Atomically acquires a cooldown lock for a specified duration in seconds.
 * Returns true if the lock was acquired (caller allowed to proceed),
 * or false if already on cooldown (caller throttled).
 */
export async function acquireDistributedLock(
  key: string,
  ttlSeconds: number
): Promise<{ acquired: boolean; remainingSeconds?: number }> {
  const creds = getKvCredentials();

  if (creds) {
    try {
      // SET key 1 EX ttlSeconds NX (only set if Not eXists)
      const res = await fetch(
        `${creds.url}/set/${encodeURIComponent(key)}/1?ex=${ttlSeconds}&nx=true`,
        {
          headers: { Authorization: `Bearer ${creds.token}` },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = (await res.json()) as UpstashResponse<string | null>;
        if (data.result === "OK") {
          return { acquired: true };
        }
        // If not acquired, fetch remaining TTL
        const ttlRes = await fetch(`${creds.url}/ttl/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${creds.token}` },
          cache: "no-store",
        });
        if (ttlRes.ok) {
          const ttlData = (await ttlRes.json()) as UpstashResponse<number>;
          return { acquired: false, remainingSeconds: Math.max(1, ttlData.result || ttlSeconds) };
        }
        return { acquired: false, remainingSeconds: ttlSeconds };
      }
    } catch {
      // Fall through to memory fallback on network glitch
    }
  }

  // Local fallback
  const now = Date.now();
  const existingExpiry = localFallbackMap.get(key);
  if (existingExpiry && existingExpiry > now) {
    const remaining = Math.ceil((existingExpiry - now) / 1000);
    return { acquired: false, remainingSeconds: remaining };
  }

  localFallbackMap.set(key, now + ttlSeconds * 1000);
  return { acquired: true };
}

/**
 * Checks if a key is currently on cooldown without modifying it.
 */
export async function isDistributedLocked(key: string): Promise<boolean> {
  const creds = getKvCredentials();
  if (creds) {
    try {
      const res = await fetch(`${creds.url}/exists/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${creds.token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as UpstashResponse<number>;
        return (data.result || 0) > 0;
      }
    } catch {
      // Fall through
    }
  }

  const expiry = localFallbackMap.get(key);
  return Boolean(expiry && expiry > Date.now());
}

/**
 * Resets a cooldown lock (useful for testing).
 */
export async function releaseDistributedLock(key: string): Promise<void> {
  localFallbackMap.delete(key);
  const creds = getKvCredentials();
  if (creds) {
    try {
      await fetch(`${creds.url}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${creds.token}` },
        cache: "no-store",
      });
    } catch {
      // Ignore cleanup error
    }
  }
}
