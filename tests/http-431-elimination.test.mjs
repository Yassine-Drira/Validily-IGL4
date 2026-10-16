import test from "node:test";
import assert from "node:assert/strict";
import {
  findOrphanAuthCookies,
  calculateCookieHeaderSize,
} from "../src/lib/auth/cookie-utils.ts";

test("HTTP 431 Root Cause: Accurately calculates total cookie header size", () => {
  const cookies = [
    { name: "theme", value: "light" },
    { name: "sb-mockproject-auth-token.0", value: "a".repeat(1200) },
    { name: "sb-mockproject-auth-token.1", value: "b".repeat(800) },
  ];

  const totalSize = calculateCookieHeaderSize(cookies);
  assert.ok(totalSize > 2000, "Header size calculation must reflect full name + value length");
  assert.ok(totalSize < 4096, "Valid session size must remain under 4KB");
});

test("HTTP 431 Root Cause: Detects and prunes orphaned higher-index chunk cookies on session renewal", () => {
  // Scenario: Browser stored 4 chunks from earlier session (.0, .1, .2, .3).
  // Fresh renewed session only needs 2 chunks (.0, .1).
  const accumulatedCookiesInBrowser = [
    { name: "sb-mockref-auth-token.0", value: "active-token-chunk-0" },
    { name: "sb-mockref-auth-token.1", value: "active-token-chunk-1" },
    { name: "sb-mockref-auth-token.2", value: "stale-orphan-chunk-2" },
    { name: "sb-mockref-auth-token.3", value: "stale-orphan-chunk-3" },
    { name: "user_pref", value: "compact" },
  ];

  const activeCookiesToSet = [
    { name: "sb-mockref-auth-token.0", value: "active-token-chunk-0" },
    { name: "sb-mockref-auth-token.1", value: "active-token-chunk-1" },
  ];

  const orphans = findOrphanAuthCookies(accumulatedCookiesInBrowser, activeCookiesToSet);

  assert.ok(orphans.includes("sb-mockref-auth-token.2"), "Must detect orphan chunk .2");
  assert.ok(orphans.includes("sb-mockref-auth-token.3"), "Must detect orphan chunk .3");
  assert.ok(!orphans.includes("sb-mockref-auth-token.0"), "Must NOT delete active chunk .0");
  assert.ok(!orphans.includes("sb-mockref-auth-token.1"), "Must NOT delete active chunk .1");
  assert.ok(!orphans.includes("user_pref"), "Must NOT delete unrelated application cookies");
});

test("HTTP 431 Root Cause: Prunes non-contiguous dangling chunk cookies on passive inspection", () => {
  // Scenario: Chunk .1 was lost/deleted or expired, leaving .0 and dangling .3
  const brokenChunks = [
    { name: "sb-mockref-auth-token.0", value: "chunk-0" },
    { name: "sb-mockref-auth-token.3", value: "dangling-chunk-3" },
  ];

  const orphans = findOrphanAuthCookies(brokenChunks);
  assert.ok(orphans.includes("sb-mockref-auth-token.3"), "Dangling chunk .3 must be flagged as orphan");
  assert.ok(!orphans.includes("sb-mockref-auth-token.0"), "Base chunk .0 is preserved");
});

test("HTTP 431 Root Cause: Prunes conflicting legacy un-chunked auth cookies", () => {
  const mixedCookies = [
    { name: "sb-mockref-auth-token.0", value: "chunk-0" },
    { name: "sb-mockref-auth-token.1", value: "chunk-1" },
    { name: "sb-mockref-auth-token", value: "old-legacy-unchunked" },
  ];

  const orphans = findOrphanAuthCookies(mixedCookies);
  assert.ok(
    orphans.includes("sb-mockref-auth-token"),
    "Must prune legacy un-chunked cookie when active chunks exist"
  );
});

test("HTTP 431 Invariant: Auth cookie header size strictly bounded under 8KB limit", () => {
  // Typical compact base64url Supabase session token (~1800 chars)
  const simulatedActiveSession = [
    { name: "sb-validily-auth-token.0", value: "x".repeat(1200) },
    { name: "sb-validily-auth-token.1", value: "y".repeat(600) },
  ];

  const size = calculateCookieHeaderSize(simulatedActiveSession);
  const PROXY_LIMIT = 8192; // 8KB reverse proxy limit (Vercel / Cloudflare default)
  
  assert.ok(
    size < PROXY_LIMIT / 2,
    `Active cookie header size (${size} bytes) must be less than 50% of proxy limit (${PROXY_LIMIT / 2} bytes)`
  );
});
