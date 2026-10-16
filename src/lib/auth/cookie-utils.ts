/**
 * Production Cookie Management & HTTP 431 Elimination Utilities
 * 
 * Prevents cookie bloat, accumulation of orphaned Supabase SSR chunk cookies,
 * and broken domain specifiers (e.g. domain=localhost).
 */

export interface CookieItem {
  name: string;
  value: string;
}

/**
 * Prunes orphaned or obsolete Supabase chunk cookies from a collection.
 * 
 * When @supabase/ssr writes a session, it splits large JWTs into sb-<ref>-auth-token.0, .1, etc.
 * If a subsequent token requires fewer chunks (e.g. 2 instead of 4), the higher index chunks
 * (.2, .3) linger in the browser indefinitely, causing header bloat and HTTP 431.
 */
export function findOrphanAuthCookies(
  allCookies: { name: string; value?: string }[],
  activeCookiesToSet?: { name: string; value?: string }[]
): string[] {
  const orphansToDelete: string[] = [];

  // Case A: When activeCookiesToSet is provided during token refresh (in middleware or server client)
  if (activeCookiesToSet && activeCookiesToSet.length > 0) {
    const activeMaxIndices = new Map<string, number>();

    for (const c of activeCookiesToSet) {
      const match = c.name.match(/^(sb-[a-zA-Z0-9_-]+-auth-token)\.(\d+)$/);
      if (match) {
        const baseKey = match[1];
        const idx = parseInt(match[2], 10);
        const prev = activeMaxIndices.get(baseKey) ?? -1;
        if (idx > prev) {
          activeMaxIndices.set(baseKey, idx);
        }
      }
    }

    for (const cookie of allCookies) {
      const match = cookie.name.match(/^(sb-[a-zA-Z0-9_-]+-auth-token)\.(\d+)$/);
      if (match) {
        const baseKey = match[1];
        const index = parseInt(match[2], 10);
        const maxActive = activeMaxIndices.get(baseKey);
        if (maxActive !== undefined && index > maxActive) {
          orphansToDelete.push(cookie.name);
        }
      }
    }
  } else {
    // Case B: Passive request inspection - detect non-contiguous chunks or dangling indices
    const projectChunks = new Map<string, number[]>();

    for (const cookie of allCookies) {
      const match = cookie.name.match(/^(sb-[a-zA-Z0-9_-]+-auth-token)\.(\d+)$/);
      if (match) {
        const baseKey = match[1];
        const index = parseInt(match[2], 10);
        if (!projectChunks.has(baseKey)) {
          projectChunks.set(baseKey, []);
        }
        projectChunks.get(baseKey)!.push(index);
      }
    }

    for (const [baseKey, indices] of projectChunks.entries()) {
      indices.sort((a, b) => a - b);
      let maxContiguous = -1;
      for (let i = 0; i < indices.length; i++) {
        if (indices[i] === i) {
          maxContiguous = i;
        } else {
          break;
        }
      }

      for (const idx of indices) {
        if (idx > maxContiguous) {
          orphansToDelete.push(`${baseKey}.${idx}`);
        }
      }
    }
  }

  // Also flag legacy un-chunked token if active chunked tokens exist
  for (const cookie of allCookies) {
    if (cookie.name.match(/^sb-[a-zA-Z0-9_-]+-auth-token$/)) {
      const hasChunk0 = allCookies.some((c) => c.name === `${cookie.name}.0`);
      if (hasChunk0) {
        orphansToDelete.push(cookie.name);
      }
    }
  }

  return Array.from(new Set(orphansToDelete));
}

/**
 * Calculates total size of all cookies in bytes.
 * Standard proxy / CDN threshold is 8192 bytes (8KB).
 */
export function calculateCookieHeaderSize(
  allCookies: { name: string; value?: string }[]
): number {
  return allCookies.reduce((total, c) => {
    return total + (c.name.length || 0) + (c.value?.length || 0) + 2; // name=value; 
  }, 0);
}

/**
 * Client-side flush utility for logout and auth reset.
 * Cleans cookies reliably without illegal domain=localhost syntax.
 */
export function flushAuthCookiesClient(): void {
  if (typeof document === "undefined") return;

  const cookies = document.cookie.split(";");
  for (const c of cookies) {
    const name = c.split("=")[0].trim();
    if (name.startsWith("sb-") || name.includes("supabase")) {
      // 1. Clear standard host-only cookie
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

      // 2. Clear domain cookie if not on localhost / IP
      const hostname = window.location.hostname;
      if (
        hostname &&
        !hostname.includes("localhost") &&
        !hostname.includes("127.0.0.1") &&
        !hostname.startsWith("[")
      ) {
        document.cookie = `${name}=; path=/; domain=.${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    }
  }
}
