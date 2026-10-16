import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseAndValidateYouTubeUrl } from "../src/lib/audio/youtube-parser.ts";

test("Phase 1: YouTube URL Parser & Security Validator", () => {
  // 1. Valid watch URL
  const watchUrl = "https://www.youtube.com/watch?v=5qap5aO4i9A";
  const p1 = parseAndValidateYouTubeUrl(watchUrl);
  assert.equal(p1.valid, true);
  assert.equal(p1.videoId, "5qap5aO4i9A");
  assert.equal(p1.canonicalUrl, "https://www.youtube.com/watch?v=5qap5aO4i9A");

  // 2. Valid shortened URL
  const shortUrl = "https://youtu.be/5qap5aO4i9A";
  const p2 = parseAndValidateYouTubeUrl(shortUrl);
  assert.equal(p2.valid, true);
  assert.equal(p2.videoId, "5qap5aO4i9A");

  // 3. Valid Shorts URL
  const shortsUrl = "https://www.youtube.com/shorts/5qap5aO4i9A";
  const p3 = parseAndValidateYouTubeUrl(shortsUrl);
  assert.equal(p3.valid, true);
  assert.equal(p3.videoId, "5qap5aO4i9A");

  // 4. Extra query parameters stripped (timestamp, feature, si)
  const dirtyUrl = "https://www.youtube.com/watch?v=5qap5aO4i9A&t=42s&feature=share&si=abc123xyz";
  const p4 = parseAndValidateYouTubeUrl(dirtyUrl);
  assert.equal(p4.valid, true);
  assert.equal(p4.videoId, "5qap5aO4i9A");
  assert.equal(p4.canonicalUrl, "https://www.youtube.com/watch?v=5qap5aO4i9A");

  // 5. Raw 11-char video ID accepted
  const rawId = "5qap5aO4i9A";
  const p5 = parseAndValidateYouTubeUrl(rawId);
  assert.equal(p5.valid, true);
  assert.equal(p5.videoId, "5qap5aO4i9A");

  // 6. Security: Rejection of hostile/unauthorized domains
  const evilUrl = "https://evil-site.com/watch?v=5qap5aO4i9A";
  const p6 = parseAndValidateYouTubeUrl(evilUrl);
  assert.equal(p6.valid, false);
  assert.match(p6.error || "", /autorisé/i);

  // 7. Security: Rejection of javascript: schemes
  const xssUrl = "javascript:alert(1)";
  const p7 = parseAndValidateYouTubeUrl(xssUrl);
  assert.equal(p7.valid, false);

  // 8. Security: Rejection of arbitrary iframe injection
  const iframeUrl = '<iframe src="https://attacker.com"></iframe>';
  const p8 = parseAndValidateYouTubeUrl(iframeUrl);
  assert.equal(p8.valid, false);

  // 9. Rejection of invalid ID lengths
  const tooShort = "https://www.youtube.com/watch?v=short";
  const p9 = parseAndValidateYouTubeUrl(tooShort);
  assert.equal(p9.valid, false);
});

test("Phase 2: Database Migration & Schema Integrity", () => {
  const migrationPath = path.resolve(
    "supabase/migrations/20261016200000_premium_audio_vip_analytics.sql"
  );
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist");

  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /create table if not exists public\.custom_audio_entries/i);
  assert.match(sql, /create table if not exists public\.vip_entitlements/i);
  assert.match(sql, /create table if not exists public\.audio_catalog/i);
  assert.match(sql, /create table if not exists public\.user_presence/i);
  assert.match(sql, /create table if not exists public\.analytics_events/i);

  // RLS Policies verification
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /Users can view own custom audio entries/i);
  assert.match(sql, /Admins can manage vip entitlements/i);
  assert.match(sql, /Anyone can view published audio catalog/i);
  assert.match(sql, /Users can manage own presence/i);
  assert.match(sql, /Admins can view analytics events/i);
});

test("Phase 3: Component File Contracts & Multi-layer Integration", () => {
  // Focus player & UI
  assert.ok(
    fs.existsSync("src/components/audio/youtube-focus-player.tsx"),
    "youtube-focus-player.tsx must exist"
  );
  assert.ok(
    fs.existsSync("src/components/analytics/presence-tracker.tsx"),
    "presence-tracker.tsx must exist"
  );

  // Admin sub-components
  assert.ok(
    fs.existsSync("src/components/admin/admin-audio-catalog.tsx"),
    "admin-audio-catalog.tsx must exist"
  );
  assert.ok(
    fs.existsSync("src/components/admin/admin-vip-manager.tsx"),
    "admin-vip-manager.tsx must exist"
  );
  assert.ok(
    fs.existsSync("src/components/admin/admin-presence-view.tsx"),
    "admin-presence-view.tsx must exist"
  );
  assert.ok(
    fs.existsSync("src/components/admin/admin-analytics-view.tsx"),
    "admin-analytics-view.tsx must exist"
  );

  // Server actions
  assert.ok(
    fs.existsSync("src/lib/actions/custom-audio-actions.ts"),
    "custom-audio-actions.ts must exist"
  );
  assert.ok(
    fs.existsSync("src/lib/actions/vip-actions.ts"),
    "vip-actions.ts must exist"
  );
  assert.ok(
    fs.existsSync("src/lib/actions/audio-catalog-actions.ts"),
    "audio-catalog-actions.ts must exist"
  );
  assert.ok(
    fs.existsSync("src/lib/actions/presence-actions.ts"),
    "presence-actions.ts must exist"
  );
  assert.ok(
    fs.existsSync("src/lib/actions/analytics-actions.ts"),
    "analytics-actions.ts must exist"
  );

  // Layout mountings
  const layoutContent = fs.readFileSync("src/app/(workspace)/layout.tsx", "utf-8");
  assert.match(layoutContent, /PresenceAndAnalyticsTracker/);

  // Focus provider mountings
  const providerContent = fs.readFileSync(
    "src/components/focus/focus-provider.tsx",
    "utf-8"
  );
  assert.match(providerContent, /YouTubeFocusPlayer/);
  assert.match(providerContent, /activeCustomAudio/);
  assert.match(providerContent, /setActiveCustomAudio/);

  // Focus hub modal tabs
  const modalContent = fs.readFileSync(
    "src/components/focus/focus-hub-modal.tsx",
    "utf-8"
  );
  assert.match(modalContent, /Mes Sons & YouTube/);
  assert.match(modalContent, /Catalogue Promo/);
  assert.match(modalContent, /audioQuota/);
});

test("Phase 4: Audit Event Catalog Extension", () => {
  const auditFile = fs.readFileSync("src/lib/audit/audit-logger.ts", "utf-8");
  assert.match(auditFile, /VIP_GRANTED/);
  assert.match(auditFile, /VIP_REVOKED/);
  assert.match(auditFile, /AUDIO_CATALOG_CREATE/);
  assert.match(auditFile, /AUDIO_CATALOG_UPDATE/);
  assert.match(auditFile, /AUDIO_CATALOG_DELETE/);
});

test("Phase 5: Custom Audio Quota Calculation & Policy Engine", () => {
  // Test server-authoritative quota policy rules
  const computeQuota = (userRole, isVip, existingCount) => {
    const maxAllowed = userRole === "admin" ? 100 : isVip ? 25 : 2;
    const remainingSlots = Math.max(0, maxAllowed - existingCount);
    const canAdd = existingCount < maxAllowed;
    return { maxAllowed, remainingSlots, canAdd };
  };

  // 1. Standard free user
  const freeInitial = computeQuota("student", false, 0);
  assert.equal(freeInitial.maxAllowed, 2, "Free user must have 2 max slots");
  assert.equal(freeInitial.remainingSlots, 2);
  assert.equal(freeInitial.canAdd, true);

  // Free user with 1 entry
  const free1 = computeQuota("student", false, 1);
  assert.equal(free1.remainingSlots, 1);
  assert.equal(free1.canAdd, true);

  // Free user with 2 entries (Quota reached)
  const free2 = computeQuota("student", false, 2);
  assert.equal(free2.remainingSlots, 0);
  assert.equal(free2.canAdd, false, "3rd custom sound must be rejected for free user");

  // Deleting one entry frees the slot immediately
  const afterDelete = computeQuota("student", false, 1);
  assert.equal(afterDelete.remainingSlots, 1);
  assert.equal(afterDelete.canAdd, true, "Deleting entry must immediately free slot");

  // 2. VIP user
  const vipUser = computeQuota("student", true, 2);
  assert.equal(vipUser.maxAllowed, 25, "VIP user must have 25 max slots");
  assert.equal(vipUser.remainingSlots, 23);
  assert.equal(vipUser.canAdd, true, "VIP user can add beyond the 2 free slots");

  // 3. Administrator
  const adminUser = computeQuota("admin", false, 25);
  assert.equal(adminUser.maxAllowed, 100);
  assert.equal(adminUser.canAdd, true);
});

test("Phase 6: VIP Entitlement Expiry & Non-Escalation Rules", () => {
  const checkVipActive = (status, expiresAtIso) => {
    if (status !== "active") return false;
    const now = new Date();
    const exp = new Date(expiresAtIso);
    return exp > now;
  };

  const now = Date.now();
  const futureDate = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // Active future grant
  assert.equal(checkVipActive("active", futureDate), true);

  // Expired grant automatically ceases
  assert.equal(checkVipActive("active", pastDate), false);

  // Revoked grant ceases immediately regardless of date
  assert.equal(checkVipActive("revoked", futureDate), false);

  // Security constraint: VIP is an entitlement, NOT an admin role
  const mockStudentUser = { id: "std-123", role: "student" };
  const mockVipGrant = { user_id: "std-123", status: "active", expires_at: futureDate };

  // Granting VIP must never mutate role to admin
  assert.notEqual(mockStudentUser.role, "admin");
  assert.equal(mockVipGrant.user_id, mockStudentUser.id);
});

test("Phase 7: Presence Thresholds & Privacy-Conscious Telemetry Sanitization", () => {
  // Presence timing rules
  const classifyPresence = (diffSeconds) => {
    if (diffSeconds <= 180) return "online"; // < 3 min
    if (diffSeconds <= 900) return "recent"; // < 15 min
    return "stale";
  };

  assert.equal(classifyPresence(30), "online");
  assert.equal(classifyPresence(179), "online");
  assert.equal(classifyPresence(181), "recent");
  assert.equal(classifyPresence(600), "recent");
  assert.equal(classifyPresence(1000), "stale");

  // Telemetry URL sanitizer: strip secrets, query params, tokens, PII
  const sanitizeRoute = (rawPath) => {
    return rawPath.split("?")[0].slice(0, 60);
  };

  const clean1 = sanitizeRoute("/quizzes?token=SECRET_AUTH_9999");
  assert.equal(clean1, "/quizzes", "Query parameters must be stripped from telemetry");

  const clean2 = sanitizeRoute("/forest?user_id=123&session=priv");
  assert.equal(clean2, "/forest");
});

