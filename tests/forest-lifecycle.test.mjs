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
} from "../src/lib/actions/forest-actions.ts";

test("Forest Lifecycle: Database migration file exists with complete schema and security policies", () => {
  const migrationPath = path.resolve(
    "supabase/migrations/20261016100000_focus_forest.sql"
  );
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist");

  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /create table if not exists public\.focus_sessions/);
  assert.match(sql, /create table if not exists public\.forest_entries/);
  assert.match(sql, /create table if not exists public\.forest_preferences/);
  assert.match(sql, /alter table public\.focus_sessions enable row level security/);
  assert.match(sql, /alter table public\.forest_entries enable row level security/);
  assert.match(sql, /create or replace function public\.complete_focus_session/);
  assert.match(sql, /create or replace function public\.abandon_focus_session/);
});

test("Forest Lifecycle: Unauthenticated caller cannot start or complete a session", async () => {
  setTestUser(null);

  const startRes = await startFocusSession({ targetDurationSeconds: 1500 });
  assert.equal(startRes.success, false);
  assert.match(startRes.error || "", /Authentification requise/);

  const completeRes = await completeFocusSession("any-session-id");
  assert.equal(completeRes.success, false);
  assert.match(completeRes.error || "", /Authentification requise/);
});

test("Forest Lifecycle: Duration boundaries enforced (5 min to 180 min)", async () => {
  setTestUser({
    id: "test-user-001",
    email: "student@validily.tn",
    role: "student",
    name: "Étudiant Test",
  });

  const tooShort = await startFocusSession({ targetDurationSeconds: 120 });
  assert.equal(tooShort.success, false);
  assert.match(tooShort.error || "", /comprise entre 5 et 180 minutes/);

  const tooLong = await startFocusSession({ targetDurationSeconds: 20000 });
  assert.equal(tooLong.success, false);
  assert.match(tooLong.error || "", /comprise entre 5 et 180 minutes/);

  const valid = await startFocusSession({ targetDurationSeconds: 1500, treeSpecies: "cedar" });
  assert.equal(valid.success, true);
  assert.ok(valid.session);
  assert.equal(valid.session.target_duration_seconds, 1500);
  assert.equal(valid.session.tree_species, "cedar");
});

test("Forest Lifecycle: Grace period cancellation (<= 120s) plants no tree", async () => {
  setTestUser({
    id: "test-user-001",
    role: "student",
    name: "Étudiant Test",
  });

  // Local fallback session
  const res = await abandonFocusSession("local-12345", "Faute de frappe");
  assert.equal(res.success, true);
  assert.equal(res.status, "cancelled");
  assert.equal(res.tree, null);
});

test("Forest Lifecycle: Privacy allowlist in community forests excludes sensitive user data", async () => {
  setTestUser({
    id: "test-viewer-001",
    role: "student",
    name: "Observateur",
  });

  const community = await getCommunityForests();
  assert.ok(Array.isArray(community));

  // Verify none of the items expose email, passwords, internal notes, or tokens
  for (const member of community) {
    assert.equal(typeof member.displayName, "string");
    assert.equal("email" in member, false, "Email must never be exposed in social view");
    assert.equal("session_label" in member, false, "Session notes must never be exposed");
    assert.ok(typeof member.healthyTreeCount === "number");
  }
});
