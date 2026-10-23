import test from "node:test";
import assert from "node:assert/strict";
import {
  setTestUser,
  getRequesterUser,
} from "../src/lib/auth/authorization.ts";
import {
  timeToMinutes,
  minutesToTime,
  calculateFreeSlots,
  detectConflicts,
  calculateTaskUrgency,
  calculateSubjectMastery,
  allocateFeasibleSchedule,
  generateDeterministicRecommendations,
} from "../src/lib/ai/planning-engine.ts";
import {
  sanitizeAndValidatePlan,
  validateBlockApplication,
} from "../src/lib/ai/action-validator.ts";
import {
  computeStateHash,
  getCachedPlan,
  setCachedPlan,
  invalidateCoachCache,
} from "../src/lib/ai/cache.ts";
import { ProviderRegistry } from "../src/lib/ai/providers/registry.ts";
import { MockFallbackProvider } from "../src/lib/ai/providers/mock-fallback-provider.ts";
import {
  getCoachingPlanAction,
  applyProposedTimeblockAction,
  generateAdaptiveDrillAction,
} from "../src/lib/actions/coach-actions.ts";
import {
  _resetLocalPlannerStore,
  _injectLocalTask,
  _injectLocalTimeblock,
  getCalendarTimeblocksAction,
} from "../src/lib/actions/planner-actions.ts";

const USER_ALICE = {
  id: "user-alice-1111-1111-1111-111111111111",
  email: "alice@insat.u-carthage.tn",
  role: "student",
  name: "Alice IGL4",
  avatarUrl: null,
};

const USER_BOB = {
  id: "user-bob-2222-2222-2222-222222222222",
  email: "bob@insat.u-carthage.tn",
  role: "student",
  name: "Bob IGL4",
  avatarUrl: null,
};

test.beforeEach(async () => {
  await _resetLocalPlannerStore();
  invalidateCoachCache();
  setTestUser(USER_ALICE);
});

// -----------------------------------------------------------------------------
// 1. DETERMINISTIC TIME CALCULATIONS & CONFLICT DETECTION
// -----------------------------------------------------------------------------

test("AI-DETERMINISTIC-01: Time conversion accurately converts HH:MM to minutes and back", () => {
  assert.equal(timeToMinutes("00:00"), 0);
  assert.equal(timeToMinutes("08:30"), 510);
  assert.equal(timeToMinutes("14:45"), 885);
  assert.equal(timeToMinutes("23:59"), 1439);

  assert.equal(minutesToTime(0), "00:00");
  assert.equal(minutesToTime(510), "08:30");
  assert.equal(minutesToTime(885), "14:45");
});

test("AI-DETERMINISTIC-02: calculateFreeSlots properly carves out existing events from working hours", () => {
  const workingHours = { start: "08:00", end: "18:00" };
  const existingBlocks = [
    {
      id: "b1",
      user_id: USER_ALICE.id,
      title: "Cours Systèmes Répartis",
      block_date: "2026-10-23",
      start_time: "10:00",
      end_time: "12:00",
      duration_minutes: 120,
      is_completed: false,
      completed_at: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_id: null,
      subject_id: null,
    },
    {
      id: "b2",
      user_id: USER_ALICE.id,
      title: "TP DevOps",
      block_date: "2026-10-23",
      start_time: "14:00",
      end_time: "16:00",
      duration_minutes: 120,
      is_completed: false,
      completed_at: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_id: null,
      subject_id: null,
    },
  ];

  const slots = calculateFreeSlots(workingHours, existingBlocks);

  // Expect 3 free slots: 08:00-10:00 (120m), 12:00-14:00 (120m), 16:00-18:00 (120m)
  assert.equal(slots.length, 3);
  assert.equal(slots[0].start, "08:00");
  assert.equal(slots[0].end, "10:00");
  assert.equal(slots[0].durationMinutes, 120);

  assert.equal(slots[1].start, "12:00");
  assert.equal(slots[1].end, "14:00");
  assert.equal(slots[1].durationMinutes, 120);

  assert.equal(slots[2].start, "16:00");
  assert.equal(slots[2].end, "18:00");
  assert.equal(slots[2].durationMinutes, 120);
});

test("AI-DETERMINISTIC-03: detectConflicts detects direct and partial overlaps", () => {
  const existingBlocks = [
    {
      id: "b1",
      user_id: USER_ALICE.id,
      title: "Réunion Projet",
      block_date: "2026-10-23",
      start_time: "10:00",
      end_time: "11:30",
      duration_minutes: 90,
      is_completed: false,
      completed_at: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_id: null,
      subject_id: null,
    },
  ];

  // Direct conflict
  const direct = detectConflicts("10:00", "11:30", existingBlocks);
  assert.equal(direct.length, 1);
  assert.equal(direct[0].conflictType, "direct_overlap");

  // Partial overlap (starts during event)
  const partial = detectConflicts("11:00", "12:00", existingBlocks);
  assert.equal(partial.length, 1);
  assert.equal(partial[0].conflictType, "partial_overlap");

  // Non-overlapping block (starts exactly when previous ends)
  const nonOverlap = detectConflicts("11:30", "12:30", existingBlocks);
  assert.equal(nonOverlap.length, 0);
});

// -----------------------------------------------------------------------------
// 2. DEADLINE URGENCY & SPACED REPETITION MASTERY
// -----------------------------------------------------------------------------

test("AI-MASTERY-01: calculateTaskUrgency ranks overdue tasks higher than distant tasks", () => {
  const overdueTask = {
    id: "t1",
    user_id: USER_ALICE.id,
    title: "Projet Cloud",
    due_date: "2026-10-20",
    priority: "high",
    is_completed: false,
    subtasks: [],
  };

  const futureTask = {
    id: "t2",
    user_id: USER_ALICE.id,
    title: "Lecture chap 4",
    due_date: "2026-10-30",
    priority: "low",
    is_completed: false,
    subtasks: [],
  };

  const urgencyOverdue = calculateTaskUrgency(overdueTask, "2026-10-23");
  const urgencyFuture = calculateTaskUrgency(futureTask, "2026-10-23");

  assert.equal(urgencyOverdue.isOverdue, true);
  assert.ok(urgencyOverdue.score > urgencyFuture.score);
  assert.ok(urgencyOverdue.score >= 100);
});

test("AI-MASTERY-02: calculateSubjectMastery implements exponential memory retention decay", () => {
  const freshReview = calculateSubjectMastery({
    subjectId: "sub-1",
    subjectName: "Architecture Logicielle",
    totalAttempts: 5,
    correctAnswers: 18,
    totalQuestions: 20, // 90% accuracy
    lastPracticedAt: "2026-10-22T10:00:00Z",
    targetDateStr: "2026-10-23",
    halfLifeDays: 7,
  });

  const staleReview = calculateSubjectMastery({
    subjectId: "sub-2",
    subjectName: "Compilateurs",
    totalAttempts: 5,
    correctAnswers: 18,
    totalQuestions: 20, // 90% accuracy but practiced 21 days ago
    lastPracticedAt: "2026-10-02T10:00:00Z",
    targetDateStr: "2026-10-23",
    halfLifeDays: 7,
  });

  assert.equal(freshReview.urgencyLevel, "mastered");
  assert.ok(freshReview.masteryScore > staleReview.masteryScore);
  assert.ok(staleReview.urgencyLevel === "warning" || staleReview.urgencyLevel === "critical");
});

// -----------------------------------------------------------------------------
// 3. ACTION & ENTITY VALIDATION LAYER
// -----------------------------------------------------------------------------

test("AI-SECURITY-01: sanitizeAndValidatePlan discards hallucinations and non-existent IDs", () => {
  const validTask = {
    id: "real-task-1",
    user_id: USER_ALICE.id,
    title: "TP Docker",
    category: "td_tp",
    priority: "high",
    due_date: "2026-10-24",
    due_time: "12:00",
    estimated_minutes: 60,
    actual_minutes: 0,
    is_completed: false,
    completed_at: null,
    subtasks: [],
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subject_id: "real-sub-1",
  };

  const rawRecommendations = [
    {
      id: "rec-valid",
      type: "urgent_task",
      title: "Travailler sur TP Docker",
      description: "À rendre bientôt",
      reasoning: "Échéance demain",
      priority: "high",
      relatedTaskId: "real-task-1",
      action: { label: "Planifier", actionType: "schedule_block" },
    },
    {
      id: "rec-hallucinated",
      type: "urgent_task",
      title: "Tâche imaginaire inventée par le LLM",
      description: "Ghost task",
      reasoning: "Hallucination",
      priority: "high",
      relatedTaskId: "ghost-task-999", // DOES NOT EXIST
      action: { label: "Planifier", actionType: "schedule_block" },
    },
  ];

  const rawProposedSchedule = [
    {
      tempId: "prop-valid",
      taskId: "real-task-1",
      subjectId: "real-sub-1",
      title: "Session TP Docker",
      date: "2026-10-23",
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 60,
      rationale: "Créneau libre",
      category: "deep_work",
    },
    {
      tempId: "prop-outside",
      taskId: "real-task-1",
      title: "Session hors créneau libre",
      date: "2026-10-23",
      startTime: "12:00",
      endTime: "13:00", // Free slots are only 08:30-10:30
      durationMinutes: 60,
      rationale: "Invalid",
      category: "deep_work",
    },
  ];

  const freeSlots = [{ start: "08:30", end: "10:30", durationMinutes: 120 }];
  const validSubjectIds = new Set(["real-sub-1"]);

  const validated = sanitizeAndValidatePlan(rawRecommendations, rawProposedSchedule, {
    validTasks: [validTask],
    validSubjectIds,
    freeSlots,
  });

  // Exactly 1 recommendation should survive, hallucinated one rejected
  assert.equal(validated.validRecommendations.length, 1);
  assert.equal(validated.validRecommendations[0].id, "rec-valid");

  // Exactly 1 timeblock should survive, the one outside free slots rejected
  assert.equal(validated.validSchedule.length, 1);
  assert.equal(validated.validSchedule[0].tempId, "prop-valid");
  assert.equal(validated.discardedCount, 2);
});

// -----------------------------------------------------------------------------
// 4. CACHING & STATE HASHING
// -----------------------------------------------------------------------------

test("AI-CACHE-01: State hashing invalidates when tasks or blocks mutate", () => {
  const task1 = { id: "t1", is_completed: false, due_date: "2026-10-23", priority: "high" };
  const task2 = { id: "t2", is_completed: false, due_date: "2026-10-24", priority: "medium" };
  const block1 = { id: "b1", start_time: "09:00", end_time: "10:00" };

  const hash1 = computeStateHash({
    userId: USER_ALICE.id,
    date: "2026-10-23",
    tasks: [task1, task2],
    existingBlocks: [block1],
    providerId: "mock",
  });

  // Same state should produce identical hash
  const hash2 = computeStateHash({
    userId: USER_ALICE.id,
    date: "2026-10-23",
    tasks: [task1, task2],
    existingBlocks: [block1],
    providerId: "mock",
  });
  assert.equal(hash1, hash2);

  // Completed task mutates hash
  const mutatedTask1 = { ...task1, is_completed: true };
  const hashMutated = computeStateHash({
    userId: USER_ALICE.id,
    date: "2026-10-23",
    tasks: [mutatedTask1, task2],
    existingBlocks: [block1],
    providerId: "mock",
  });
  assert.notEqual(hash1, hashMutated);
});

// -----------------------------------------------------------------------------
// 5. SERVER ACTIONS & TWO-PHASE SCHEDULE APPLICATION
// -----------------------------------------------------------------------------

test("AI-ACTION-01: Unauthenticated requests are rejected across all coach actions", async () => {
  setTestUser(null);

  const planRes = await getCoachingPlanAction("2026-10-23");
  assert.equal(planRes.success, false);
  assert.match(planRes.error, /Authentification requise/);

  const applyRes = await applyProposedTimeblockAction({
    tempId: "tmp-1",
    taskId: null,
    subjectId: null,
    title: "Ghost",
    date: "2026-10-23",
    startTime: "09:00",
    endTime: "10:00",
    durationMinutes: 60,
    rationale: "None",
    category: "revision",
  });
  assert.equal(applyRes.success, false);

  const drillRes = await generateAdaptiveDrillAction();
  assert.equal(drillRes.success, false);
});

test("AI-ACTION-02: Authenticated coaching plan generates feasible schedule and caches result", async () => {
  setTestUser(USER_ALICE);

  // Inject a real task
  await _injectLocalTask({
    id: "task-cloud-1",
    user_id: USER_ALICE.id,
    subject_id: "sub-cloud",
    title: "Architecture Microservices",
    description: "Projet à rendre",
    category: "project",
    priority: "urgent",
    due_date: "2026-10-23", // Due today
    due_time: "18:00",
    estimated_minutes: 60,
    actual_minutes: 0,
    is_completed: false,
    completed_at: null,
    subtasks: [],
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const planRes = await getCoachingPlanAction("2026-10-23");
  assert.equal(planRes.success, true);
  assert.ok(planRes.data);
  assert.ok(planRes.data.recommendations.length > 0);
  assert.equal(planRes.data.telemetry.isFallback, true); // Deterministic local provider

  // Immediate second call should hit memory cache (< 5ms)
  const cachedCall = await getCoachingPlanAction("2026-10-23");
  assert.equal(cachedCall.success, true);
  assert.equal(cachedCall.data.telemetry.cacheHit, true);
});

test("AI-ACTION-03: Two-phase schedule application executes confirmed timeblock atomically", async () => {
  setTestUser(USER_ALICE);

  const proposal = {
    tempId: "prop-test-1",
    taskId: null,
    subjectId: null,
    title: "Séance Révision Concurrence",
    date: "2026-10-23",
    startTime: "14:00",
    endTime: "15:00",
    durationMinutes: 60,
    rationale: "Créneau disponible sans conflit",
    category: "revision",
  };

  const applyRes = await applyProposedTimeblockAction(proposal);
  assert.equal(applyRes.success, true);
  assert.ok(applyRes.blockId);

  // Verify the block is now confirmed in the user's calendar
  const blocksRes = await getCalendarTimeblocksAction("2026-10-23", "2026-10-23");
  assert.equal(blocksRes.success, true);
  const found = blocksRes.data.find((b) => b.id === applyRes.blockId);
  assert.ok(found);
  assert.equal(found.title, "Séance Révision Concurrence");
  assert.equal(found.start_time, "14:00");
  assert.equal(found.end_time, "15:00");

  // Attempting to apply the exact same time block again should be blocked by conflict detection
  const duplicateRes = await applyProposedTimeblockAction(proposal);
  assert.equal(duplicateRes.success, false);
  assert.match(duplicateRes.error, /Conflit d'horaire/);
});

test("AI-ACTION-04: generateAdaptiveDrillAction returns structured adaptive drill", async () => {
  setTestUser(USER_ALICE);

  const drillRes = await generateAdaptiveDrillAction(undefined, 3);
  assert.equal(drillRes.success, true);
  assert.ok(drillRes.data);
  assert.equal(drillRes.data.questions.length, 3);

  // Each question must have valid options with exactly one correct answer
  for (const q of drillRes.data.questions) {
    assert.ok(q.questionText.length > 5);
    assert.ok(q.options.length >= 2);
    const correctOptions = q.options.filter((o) => o.isCorrect);
    assert.equal(correctOptions.length, 1);
  }
});
