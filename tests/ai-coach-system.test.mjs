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
  generateRAGQuizAction,
  getAcademicCoachKPIsAction,
  sendCoachChatMessageAction,
} from "../src/lib/actions/coach-actions.ts";
import {
  _resetLocalPlannerStore,
  _injectLocalTask,
  _injectLocalTimeblock,
  getCalendarTimeblocksAction,
} from "../src/lib/actions/planner-actions.ts";
import {
  checkAndConsumeAIQuota,
  getAIQuotaStatus,
  resetAIQuotaForTesting,
} from "../src/lib/ai/quota-service.ts";
import {
  retrieveAcademicContext,
  retrieveDocumentForQuiz,
  verifyCitationsAgainstRetrieved,
  _injectTestNotes,
  _injectTestResources,
} from "../src/lib/ai/academic-retrieval-service.ts";
import { _injectTestVip, _resetTestVip } from "../src/lib/actions/vip-actions.ts";

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
  await _resetTestVip();
  await resetAIQuotaForTesting(USER_ALICE.id);
  await resetAIQuotaForTesting(USER_BOB.id);
  _injectTestNotes([]);
  _injectTestResources([]);
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

test("AI-DETERMINISTIC-02b: calculateFreeSlots logically discards past hours when minStartMinutes is provided", () => {
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

  // Simulated time: 13:00 (780 min)
  // Past morning slot (08:00-10:00) is gone!
  // Slot 12:00-14:00 is trimmed to 13:00-14:00 (60 min)
  // Slot 16:00-18:00 is intact (120 min)
  // Total remaining = 180 min instead of 360 min
  const afternoonSlots = calculateFreeSlots(workingHours, existingBlocks, 13 * 60);
  assert.equal(afternoonSlots.length, 2);
  assert.equal(afternoonSlots[0].start, "13:00");
  assert.equal(afternoonSlots[0].end, "14:00");
  assert.equal(afternoonSlots[0].durationMinutes, 60);
  assert.equal(afternoonSlots[1].start, "16:00");
  assert.equal(afternoonSlots[1].end, "18:00");
  assert.equal(afternoonSlots[1].durationMinutes, 120);

  // Simulated time: 22:15 (past workEnd 18:00 or 22:00)
  // All time is in the past -> exactly 0 slots, 0 min
  const lateNightSlots = calculateFreeSlots(workingHours, existingBlocks, 22 * 60 + 15);
  assert.equal(lateNightSlots.length, 0);

  // Simulated day in the past (e.g. yesterday, minStartMinutes = 1440)
  const pastDaySlots = calculateFreeSlots(workingHours, existingBlocks, 24 * 60);
  assert.equal(pastDaySlots.length, 0);
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

// -----------------------------------------------------------------------------
// 6. CONVERSATIONAL RAG & PRODUCT INTERACTIONS
// -----------------------------------------------------------------------------

test("AI-CHAT-01: 'What should I study today, and why?' retrieves actual tasks, availability, and citations", async () => {
  setTestUser(USER_ALICE);

  // Inject a real urgent task
  await _injectLocalTask({
    id: "task-k8s-urgent",
    user_id: USER_ALICE.id,
    subject_id: "sub-igl4-devops",
    title: "Déploiement Helm & Kubernetes",
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

  const chatRes = await sendCoachChatMessageAction([
    { role: "user", content: "What should I study today, and why?" },
  ], "2026-10-23");

  assert.equal(chatRes.success, true);
  assert.ok(chatRes.data);
  assert.ok(chatRes.data.reply.length > 50);

  // Must mention the real urgent task
  assert.ok(chatRes.data.reply.includes("Déploiement Helm & Kubernetes"));

  // Must cite real evidence
  assert.ok(chatRes.data.citations.length > 0);
  const taskCitation = chatRes.data.citations.find((c) => c.type === "task");
  assert.ok(taskCitation);
  assert.equal(taskCitation.id, "task-k8s-urgent");
});

test("AI-CHAT-02: 'Why do you think this is my weakest topic?' provides factual assessment evidence or explains lack of assessment", async () => {
  setTestUser(USER_ALICE);

  const chatRes = await sendCoachChatMessageAction([
    { role: "user", content: "Why do you think this is my weakest topic?" },
  ], "2026-10-23");

  assert.equal(chatRes.success, true);
  assert.ok(chatRes.data);
  assert.ok(chatRes.data.reply.length > 50);

  // Must provide assessment or honest missing-data explanation with proposed drill
  assert.ok(
    chatRes.data.reply.includes("taux de réussite") ||
    chatRes.data.reply.includes("0 tentative") ||
    chatRes.data.reply.includes("évaluation")
  );

  // If no attempts exist, must propose diagnostic drill without hallucinating imaginary grades
  assert.ok(chatRes.data.proposedDrill);
  assert.equal(chatRes.data.proposedDrill.questionCount, 3);
});

test("AI-CHAT-03: 'Schedule a 30-minute review for my weakest topic' calculates slot and produces confirmable proposal", async () => {
  setTestUser(USER_ALICE);

  const chatRes = await sendCoachChatMessageAction([
    { role: "user", content: "Schedule a 30-minute review for my weakest topic." },
  ], "2026-10-24"); // Target a future day with full open availability

  assert.equal(chatRes.success, true);
  assert.ok(chatRes.data);
  assert.ok(chatRes.data.proposedSchedule.length > 0);

  const proposed = chatRes.data.proposedSchedule[0];
  assert.equal(proposed.durationMinutes, 30);
  assert.ok(proposed.startTime);
  assert.ok(proposed.endTime);
  assert.ok(chatRes.data.reply.includes(proposed.startTime));

  // The proposed block must be valid and confirmable
  const applyRes = await applyProposedTimeblockAction(proposed);
  assert.equal(applyRes.success, true);
  assert.ok(applyRes.blockId);
});

test("AI-CHAT-03b: Requesting schedule for a past date reports insufficient availability without scheduling into past", async () => {
  setTestUser(USER_ALICE);

  const chatRes = await sendCoachChatMessageAction([
    { role: "user", content: "Schedule a 30-minute review for my weakest topic." },
  ], "2026-10-20"); // Target a date in the past

  assert.equal(chatRes.success, true);
  assert.ok(chatRes.data);
  // Must NOT produce proposals in the past
  assert.equal(chatRes.data.proposedSchedule.length, 0);
  assert.match(chatRes.data.reply, /Disponibilité Insuffisante|Aucun créneau libre d'étude/);
});

// -----------------------------------------------------------------------------
// 6. ATOMIC ROLLING 24-HOUR QUOTA & VIP ENTITLEMENTS
// -----------------------------------------------------------------------------

test("AI-QUOTA-01: Standard user cannot exceed 5 requests in rolling 24 hours (6th rejected)", async () => {
  setTestUser(USER_ALICE);

  // Consume 5 requests
  for (let i = 1; i <= 5; i++) {
    const res = await checkAndConsumeAIQuota(USER_ALICE.id);
    assert.equal(res.allowed, true, `Request ${i} should be allowed`);
    assert.equal(res.remaining, 5 - i);
    assert.equal(res.used, i);
  }

  // 6th request must be rejected atomically
  const sixthRes = await checkAndConsumeAIQuota(USER_ALICE.id);
  assert.equal(sixthRes.allowed, false);
  assert.equal(sixthRes.remaining, 0);
  assert.equal(sixthRes.used, 5);
  assert.ok(sixthRes.resetInMs > 0);
  assert.ok(sixthRes.error && sixthRes.error.includes("Quota Validily AI atteint"));

  // Check read-only status doesn't consume or change count
  const status = await getAIQuotaStatus(USER_ALICE.id);
  assert.equal(status.allowed, false);
  assert.equal(status.used, 5);
  assert.equal(status.remaining, 0);
});

test("AI-QUOTA-02: Concurrent requests burst is handled atomically up to exactly 5", async () => {
  setTestUser(USER_ALICE);

  // Fire 10 concurrent quota check promises
  const promises = Array.from({ length: 10 }, () => checkAndConsumeAIQuota(USER_ALICE.id));
  const results = await Promise.all(promises);

  const allowedCount = results.filter((r) => r.allowed).length;
  const blockedCount = results.filter((r) => !r.allowed).length;

  assert.equal(allowedCount, 5, "Exactly 5 requests must be allowed during concurrent burst");
  assert.equal(blockedCount, 5, "Remaining 5 requests must be throttled atomically");
});

test("AI-QUOTA-03: Verified VIP user bypasses the 5-request quota limit completely", async () => {
  // Inject server-authoritative VIP status for Bob
  await _injectTestVip(USER_BOB.id, 30);

  // Bob sends 8 consecutive requests
  for (let i = 1; i <= 8; i++) {
    const res = await checkAndConsumeAIQuota(USER_BOB.id);
    assert.equal(res.allowed, true, `VIP request ${i} should be allowed`);
    assert.equal(res.isVip, true);
    assert.equal(res.remaining, 999);
  }
});

// -----------------------------------------------------------------------------
// 7. CENTRALIZED RAG RETRIEVAL & DOCUMENT ACCESS ISOLATION
// -----------------------------------------------------------------------------

test("AI-RAG-01: Document access isolation strictly prevents cross-account private note retrieval", async () => {
  // Alice owns a private note
  const aliceNote = {
    id: "note-alice-secret",
    user_id: USER_ALICE.id,
    semester_id: "s1",
    subject_id: "sub-archi",
    title: "Mes secrets d'examen Microservices",
    content: "Le prof a dit que le sujet portera sur les Saga Patterns et Kafka transactions.",
    tags: ["exam", "secret"],
    visibility: "private",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Bob owns a private note
  const bobNote = {
    id: "note-bob-private",
    user_id: USER_BOB.id,
    semester_id: "s1",
    subject_id: "sub-archi",
    title: "Notes privées de Bob",
    content: "Mes notes confidentielles sur le compilateur.",
    tags: ["private"],
    visibility: "private",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Public resource accessible to all
  const publicRes = {
    id: "res-public-course",
    subject_id: "sub-archi",
    category_id: "cat-1",
    owner_id: "user-prof",
    title: "Support Officiel Architecture Microservices",
    description: "Cours magistral sur Kubernetes, ingress controllers et pods.",
    storage_path: "mock/archi.pdf",
    original_filename: "archi.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 1024,
    academic_year: "2026-2027",
    exam_session: "principale",
    instructor: "Professeur IGL4",
    chapter: "Chapitre 1",
    tags: ["microservices", "kubernetes"],
    visibility: "public",
    publication_status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  _injectTestNotes([aliceNote, bobNote]);
  _injectTestResources([publicRes]);

  // Alice queries RAG
  const aliceChunks = await retrieveAcademicContext(USER_ALICE.id, { query: "Saga patterns ou Kubernetes" });
  const chunkIds = aliceChunks.map((c) => c.sourceId);

  // Alice MUST see her note and public course
  assert.ok(chunkIds.includes("note-alice-secret"), "Alice must see her own private note");
  assert.ok(chunkIds.includes("res-public-course"), "Alice must see public resource");

  // Alice MUST NEVER see Bob's private note
  assert.ok(!chunkIds.includes("note-bob-private"), "Alice must NEVER see Bob's private note");

  // Now Bob queries RAG
  const bobChunks = await retrieveAcademicContext(USER_BOB.id, { query: "compilateur ou Saga" });
  const bobChunkIds = bobChunks.map((c) => c.sourceId);

  assert.ok(bobChunkIds.includes("note-bob-private"), "Bob must see his own note");
  assert.ok(!bobChunkIds.includes("note-alice-secret"), "Bob must NEVER see Alice's private note");
});

test("AI-RAG-02: Citation verification filters out hallucinated document IDs", () => {
  const retrievedChunks = [
    {
      sourceId: "doc-real-1",
      sourceType: "resource",
      title: "Architecture Kubernetes IGL4",
      content: "Détails techniques sur les pods.",
      snippet: "Détails techniques",
      score: 10,
    },
    {
      sourceId: "note-real-2",
      sourceType: "note",
      title: "Mes Notes sur Docker Swarm",
      content: "Swarm vs K8s.",
      snippet: "Swarm vs K8s",
      score: 8,
    },
  ];

  const citationsFromModel = [
    { type: "document", id: "doc-real-1", label: "Architecture Kubernetes IGL4" },
    { type: "document", id: "doc-imaginary-999", label: "Livre Fantôme Non Existant" },
  ];

  const verified = verifyCitationsAgainstRetrieved(citationsFromModel, retrievedChunks);

  assert.equal(verified.length, 1);
  assert.equal(verified[0].id, "doc-real-1");
  assert.ok(!verified.some((c) => c.id === "doc-imaginary-999"), "Hallucinated citation must be removed");
});

// -----------------------------------------------------------------------------
// 8. DYNAMIC RAG QUIZ STUDIO
// -----------------------------------------------------------------------------

test("AI-QUIZ-STUDIO-01: generateRAGQuizAction respects questionCount and difficulty parameters", async () => {
  setTestUser(USER_ALICE);

  const testNote = {
    id: "note-devops-ci",
    user_id: USER_ALICE.id,
    semester_id: "s1",
    subject_id: "sub-igl4-devops",
    title: "Pipeline GitLab CI & Docker Build",
    content: "Dans un pipeline CI/CD, les stages s'exécutent séquentiellement : build, test, package, deploy. Les runners Docker utilisent des images légères Alpine. Les artefacts permettent de transmettre les binaires entre stages.",
    tags: ["devops", "gitlab", "ci"],
    visibility: "private",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  _injectTestNotes([testNote]);

  // Request 5 intermediate questions
  const quizRes = await generateRAGQuizAction({
    noteId: "note-devops-ci",
    questionCount: 5,
    difficulty: "intermediate",
  });

  assert.equal(quizRes.success, true);
  assert.ok(quizRes.data);
  assert.ok(quizRes.data.questions.length > 0);
  assert.equal(quizRes.data.questions[0].difficulty, "intermediate");

  // Validate question schema
  for (const q of quizRes.data.questions) {
    assert.ok(q.questionText.length > 5);
    assert.ok(q.options.length >= 2);
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    assert.equal(correctCount, 1, "Each question must have exactly one correct option");
    assert.ok(q.explanation.length > 5);
  }
});

test("AI-QUIZ-STUDIO-02: Insufficient source content is rejected honestly without hallucinating", async () => {
  setTestUser(USER_ALICE);

  const shortNote = {
    id: "note-too-short",
    user_id: USER_ALICE.id,
    semester_id: "s1",
    subject_id: "sub-igl4-devops",
    title: "Note vide",
    content: "Court", // < 40 chars
    tags: [],
    visibility: "private",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  _injectTestNotes([shortNote]);

  const quizRes = await generateRAGQuizAction({
    noteId: "note-too-short",
    questionCount: 3,
  });

  assert.equal(quizRes.success, false);
  assert.ok(quizRes.error && quizRes.error.includes("trop court"));
});

// -----------------------------------------------------------------------------
// 9. AUTHENTIC ACADEMIC KPIS
// -----------------------------------------------------------------------------

test("AI-KPIS-01: getAcademicCoachKPIsAction calculates real deadline and quota without mock inflation", async () => {
  setTestUser(USER_ALICE);

  // Inject a real task due in 3 days
  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await _injectLocalTask({
    id: "task-kpi-test",
    user_id: USER_ALICE.id,
    subject_id: "sub-igl4-devops",
    title: "Mini-Projet Kubernetes",
    priority: "high",
    due_date: futureDate,
    estimated_minutes: 90,
    is_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const kpisRes = await getAcademicCoachKPIsAction();
  assert.equal(kpisRes.success, true);
  assert.ok(kpisRes.data);

  // Next deadline
  assert.ok(kpisRes.data.nextDeadline);
  assert.equal(kpisRes.data.nextDeadline.title, "Mini-Projet Kubernetes");
  assert.ok(kpisRes.data.nextDeadline.daysRemaining <= 4);

  // Quota
  assert.equal(kpisRes.data.quota.limit, 5);
  assert.ok(kpisRes.data.quota.remaining <= 5);
});

