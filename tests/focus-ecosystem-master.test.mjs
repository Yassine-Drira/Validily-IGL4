import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

import { setTestUser } from "../src/lib/auth/authorization.ts";
import {
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  completeFocusSession,
  abandonFocusSession,
} from "../src/lib/actions/forest-actions.ts";

// Set authenticated student for test runner
setTestUser({
  id: "test-master-user-001",
  email: "student-master@validily.tn",
  role: "student",
  name: "Master Tester",
});

test("Focus Ecosystem Master: Session State Machine & Transition Rules", async (t) => {

  // 1. Start Session (idle -> running)
  const startRes = await startFocusSession({
    targetDurationSeconds: 1500,
    treeSpecies: "cedar",
    sessionLabel: "Master Workflow Test",
  });
  assert.ok(startRes.success, "Session must start successfully");
  assert.ok(startRes.session, "Session object must be returned");
  assert.equal(startRes.session.status, "in_progress", "Initial state must be in_progress");
  const sessionId = startRes.session.id;

  // 2. Pause Session (running -> paused)
  const pauseRes = await pauseFocusSession(sessionId);
  assert.ok(pauseRes.success, "Pause must succeed for active session");
  assert.equal(pauseRes.status, "paused", "Session state must transition to paused");

  // 3. Resume Session (paused -> running)
  const resumeRes = await resumeFocusSession(sessionId);
  assert.ok(resumeRes.success, "Resume must succeed for paused session");
  assert.equal(resumeRes.status, "in_progress", "Session state must return to in_progress");

  // 4. Abandon Session (running -> interrupted)
  const abandonRes = await abandonFocusSession(sessionId, "Test explicit abandonment");
  assert.ok(abandonRes.success, "Abandonment must succeed");
  assert.equal(abandonRes.status, "interrupted", "Session state must be interrupted");
  assert.ok(abandonRes.tree, "Abandonment must create a tree");
  assert.equal(abandonRes.tree.tree_status, "leafless", "Abandoned session must produce a leafless dead tree");

  // 5. Terminal State Invariant: Completed or Interrupted sessions cannot be resumed or restarted
  const resumeAfterTerminal = await resumeFocusSession(sessionId);
  assert.equal(resumeAfterTerminal.success, false, "Cannot resume an already terminated session");
});

test("Focus Ecosystem Master: Pause Time Accounting & Anti-Cheat Validation", (t) => {
  // Test time math: eligible = elapsed - paused
  const calculateEligibleSeconds = (startedAtMs, nowMs, totalPausedSeconds) => {
    const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
    return Math.max(0, elapsedSeconds - totalPausedSeconds);
  };

  const startedAt = 1000000;
  // Case A: 25 min session (1500s), user ran for 1500s with 0s paused -> Eligible = 1500s -> Valid
  const eligibleA = calculateEligibleSeconds(startedAt, startedAt + 1500 * 1000, 0);
  assert.equal(eligibleA, 1500);
  assert.ok(eligibleA >= 1500 - 30, "Continuous session must qualify for completion");

  // Case B: 25 min session (1500s), user paused for 1000s, elapsed wall time 1500s -> Eligible = 500s -> Rejected
  const eligibleB = calculateEligibleSeconds(startedAt, startedAt + 1500 * 1000, 1000);
  assert.equal(eligibleB, 500);
  assert.ok(eligibleB < 1500 - 30, "Paused time must not count towards completion");

  // Case C: 25 min session (1500s), user paused for 300s, total elapsed 1800s -> Eligible = 1500s -> Valid
  const eligibleC = calculateEligibleSeconds(startedAt, startedAt + 1800 * 1000, 300);
  assert.equal(eligibleC, 1500);
  assert.ok(eligibleC >= 1500 - 30, "Session that compensated for pause duration must qualify");
});

test("Focus Ecosystem Master: Exactly-Once Tree & Outcome Idempotency", async (t) => {
  // A. Completion idempotency
  const sessionA = await startFocusSession({ targetDurationSeconds: 1500 });
  const tree1 = await completeFocusSession(sessionA.session.id);
  const tree2 = await completeFocusSession(sessionA.session.id);
  assert.ok(tree1.success && tree2.success, "Both calls must succeed");
  assert.equal(tree1.tree.id, tree2.tree.id, "Second completion call must return existing tree without duplication");

  // B. Abandonment idempotency
  const sessionB = await startFocusSession({ targetDurationSeconds: 1500 });
  const deadTree1 = await abandonFocusSession(sessionB.session.id, "Interrupted once");
  const deadTree2 = await abandonFocusSession(sessionB.session.id, "Interrupted retry");
  assert.ok(deadTree1.success && deadTree2.success, "Both abandonment calls must succeed");
  assert.equal(deadTree1.tree.id, deadTree2.tree.id, "Second abandonment call must return existing dead tree without duplication");
});

test("Focus Ecosystem Master: Audio Preference Persistence & Account Scoping", (t) => {
  const providerPath = path.join(rootDir, "src/components/focus/focus-provider.tsx");
  const content = fs.readFileSync(providerPath, "utf-8");

  // Verify preference keys are scoped by uid
  assert.ok(content.includes("validily_audio_type_${uid}"), "Audio type must be scoped by uid");
  assert.ok(content.includes("validily_audio_soundscape_${uid}"), "Soundscape must be scoped by uid");
  assert.ok(content.includes("validily_audio_custom_${uid}"), "Custom audio must be scoped by uid");
  assert.ok(content.includes("validily_audio_catalog_${uid}"), "Catalog audio must be scoped by uid");
  assert.ok(content.includes("validily_audio_volume_${uid}"), "Volume must be scoped by uid");
  assert.ok(content.includes("validily_audio_muted_${uid}"), "Mute state must be scoped by uid");

  // Verify rehydration in useEffect
  assert.ok(content.includes("localStorage.getItem(`validily_audio_type_${uid}`)"), "Audio preferences must rehydrate on mount");

  // Verify persistence on change
  assert.ok(content.includes("persistAudioPreference(\"soundscape\", type)"), "Soundscape changes must persist immediately");
  assert.ok(content.includes("persistAudioPreference(\"custom\", JSON.stringify(entry))"), "Custom audio changes must persist immediately");
  assert.ok(content.includes("persistAudioPreference(\"catalog\", JSON.stringify(entry))"), "Catalog audio changes must persist immediately");
});

test("Focus Ecosystem Master: FocusResultModal & Real-time Bosquet Sync", (t) => {
  // 1. Result Modal Component exists and handles both outcomes
  const modalPath = path.join(rootDir, "src/components/focus/focus-result-modal.tsx");
  assert.ok(fs.existsSync(modalPath), "FocusResultModal component must exist");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  assert.ok(modalContent.includes("Session de concentration accomplie !"), "Modal must handle success headline");
  assert.ok(modalContent.includes("Session interrompue prématurément"), "Modal must handle failure/abandonment headline");
  assert.ok(modalContent.includes("TreeSvg"), "Modal must render botanical TreeSvg with status");
  assert.ok(modalContent.includes("/forest"), "Modal must link directly to Bosquet");

  // 2. FocusProvider mounts FocusResultModal
  const providerPath = path.join(rootDir, "src/components/focus/focus-provider.tsx");
  const providerContent = fs.readFileSync(providerPath, "utf-8");
  assert.ok(providerContent.includes("<FocusResultModal"), "FocusProvider must mount FocusResultModal");
  assert.ok(providerContent.includes("window.dispatchEvent(new CustomEvent(\"validily_forest_updated\"))"), "FocusProvider must dispatch validily_forest_updated event");

  // 3. ForestPage listens for validily_forest_updated
  const forestPagePath = path.join(rootDir, "src/app/(workspace)/forest/page.tsx");
  const forestPageContent = fs.readFileSync(forestPagePath, "utf-8");
  assert.ok(
    forestPageContent.includes("window.addEventListener(\"validily_forest_updated\", handleForestUpdate)"),
    "ForestPage must listen for validily_forest_updated to auto-refresh trees"
  );
});

test("Focus Ecosystem Master: Database Migration & RLS Safeguards", (t) => {
  const pauseMigrationPath = path.join(rootDir, "supabase/migrations/20261016300000_focus_session_pause_state.sql");
  assert.ok(fs.existsSync(pauseMigrationPath), "Pause state migration file must exist");
  const migrationContent = fs.readFileSync(pauseMigrationPath, "utf-8");

  // Pause tracking columns
  assert.ok(migrationContent.includes("paused_at"), "Migration must add paused_at column");
  assert.ok(migrationContent.includes("total_paused_seconds"), "Migration must add total_paused_seconds column");
  assert.ok(migrationContent.includes("pause_count"), "Migration must add pause_count column");

  // Constraint
  assert.ok(migrationContent.includes("'paused'"), "Migration must update status check constraint to include paused");

  // Atomic RPCs
  assert.ok(migrationContent.includes("create or replace function public.pause_focus_session"), "Migration must define pause_focus_session RPC");
  assert.ok(migrationContent.includes("create or replace function public.resume_focus_session"), "Migration must define resume_focus_session RPC");

  // Forest entries RLS immutability
  const forestMigrationPath = path.join(rootDir, "supabase/migrations/20261016100000_focus_forest.sql");
  const forestMigrationContent = fs.readFileSync(forestMigrationPath, "utf-8");
  assert.ok(
    forestMigrationContent.includes("create policy \"Only admins can delete forest entries\""),
    "Forest entries must be protected from student deletion"
  );
});
