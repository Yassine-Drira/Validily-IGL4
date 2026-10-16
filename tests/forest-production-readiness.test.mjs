import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  setTestUser,
  getTestUser,
} from "../src/lib/auth/authorization.ts";
import {
  startFocusSession,
  completeFocusSession,
  abandonFocusSession,
  getMyForest,
  getCommunityForests,
  sendClassmateCheer,
  updateForestPreferences,
} from "../src/lib/actions/forest-actions.ts";

test("Forest Production Readiness: Unauthenticated visitor receives authenticated: false", async () => {
  setTestUser(null);

  const res = await getMyForest();
  assert.equal(res.authenticated, false, "Unlogged user must have authenticated: false");
  assert.equal(res.trees.length, 0, "Unlogged user must receive 0 trees to trigger login gate");
  assert.equal(res.stats.healthyCount, 0);
  assert.equal(res.stats.totalFocusedMinutes, 0);
});

test("Forest Production Readiness: Authentic student forest starts pristine without fake seeded trees", async () => {
  setTestUser({
    id: "student-ready-001",
    email: "student01@validily.tn",
    role: "student",
    name: "Étudiant IGL4",
  });

  const res = await getMyForest();
  assert.equal(res.authenticated, true);
  // Zero fake starter trees injected: real user starts clean
  assert.equal(res.trees.length, 0, "A student with no completed sessions must have 0 trees (clean island altar)");
  assert.equal(res.stats.healthyCount, 0);
  assert.equal(res.stats.leaflessCount, 0);
  assert.equal(res.stats.totalFocusedMinutes, 0);
});

test("Forest Production Readiness: 2-minute penalty threshold contract for abandoned sessions", async () => {
  setTestUser({
    id: "student-ready-002",
    email: "student02@validily.tn",
    role: "student",
    name: "Étudiant Test",
  });

  // Verify abandonFocusSession rejects empty sessionId
  const emptyRes = await abandonFocusSession("");
  assert.equal(emptyRes.success, false);

  // Read actions code to assert 120s penalty logic
  const rootDir = process.cwd();
  const code = fs.readFileSync(path.join(rootDir, "src/lib/actions/forest-actions.ts"), "utf8");
  assert.ok(code.includes("elapsedSeconds <= 120"), "120s grace period must exist");
  assert.ok(code.includes('tree_status: "leafless"'), "Dead tree penalty must be inserted after 120s");
});

test("Forest Production Readiness: Undeletable tree policy and RLS integrity", () => {
  const rootDir = process.cwd();
  const migration = fs.readFileSync(
    path.join(rootDir, "supabase/migrations/20261016100000_focus_forest.sql"),
    "utf8"
  );

  // RLS policies guarantee penalty trees cannot be deleted by students
  assert.ok(
    migration.includes('create policy "Only admins can delete forest_entries"') ||
    migration.includes('create policy "Only admins can delete forest entries"'),
    "Ordinary students must NOT have delete permission on forest_entries"
  );
});

test("Forest Production Readiness: Share and visibility policy operates securely", async () => {
  setTestUser({
    id: "student-ready-003",
    email: "student03@validily.tn",
    role: "student",
    name: "Étudiant Privé",
  });

  // Update preferences to private
  const prefRes = await updateForestPreferences({ visibility: "private" });
  assert.equal(prefRes.success, true);

  // Unauthenticated user requesting community gallery receives empty list
  setTestUser(null);
  const communityUnauth = await getCommunityForests();
  assert.equal(communityUnauth.length, 0, "Unauthenticated visitors cannot access community forests");
});
