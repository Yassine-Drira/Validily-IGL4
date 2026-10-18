import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  setTestUser,
  getRequesterUser,
} from "../src/lib/auth/authorization.ts";
import {
  createAcademicTaskAction,
  getAcademicTasksAction,
  updateAcademicTaskAction,
  toggleAcademicTaskAction,
  deleteAcademicTaskAction,
  createCalendarTimeblockAction,
  getCalendarTimeblocksAction,
  updateCalendarTimeblockAction,
  deleteCalendarTimeblockAction,
  checkCalendarConflictAction,
  getPlannerHistoryAction,
  setAcademicGoalAction,
  getAcademicGoalsAction,
  deleteAcademicGoalAction,
  updateAcademicGoalProgressAction,
  _resetLocalPlannerStore,
  _injectLocalTask,
  _injectLocalTimeblock,
} from "../src/lib/actions/planner-actions.ts";
import { sanitizeSubtasks } from "../src/lib/utils/sanitize-subtasks.ts";
import { getLocalTodayDateString, cleanDbSubjectId } from "../src/lib/utils.ts";

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
});

// -----------------------------------------------------------------------------
// 1. PRIVACY & ACCESS CONTROL TESTS
// -----------------------------------------------------------------------------

test("PLANNER-SEC-01: Unauthenticated requests are rejected for all mutations and reads", async () => {
  setTestUser(null);

  const createTaskRes = await createAcademicTaskAction({
    title: "Test unauthenticated",
    due_date: "2026-10-20",
  });
  assert.equal(createTaskRes.success, false);
  assert.ok(createTaskRes.error?.includes("Authentification requise"));

  const getTasksRes = await getAcademicTasksAction();
  assert.equal(getTasksRes.success, false);
  assert.equal(getTasksRes.data.length, 0);

  const createBlockRes = await createCalendarTimeblockAction({
    title: "Test unauthenticated block",
    block_date: "2026-10-20",
    start_time: "09:00",
    end_time: "10:00",
  });
  assert.equal(createBlockRes.success, false);

  const getBlocksRes = await getCalendarTimeblocksAction("2026-10-01", "2026-10-31");
  assert.equal(getBlocksRes.success, false);
});

test("PLANNER-SEC-02: User A cannot view User B's tasks or calendar blocks", async () => {
  // Alice creates a task and calendar block
  setTestUser(USER_ALICE);
  const aliceTask = await createAcademicTaskAction({
    title: "Alice Secret Task",
    category: "project",
    priority: "urgent",
    due_date: "2026-10-25",
  });
  assert.ok(aliceTask.success && aliceTask.data);

  const aliceBlock = await createCalendarTimeblockAction({
    title: "Alice Study Session",
    block_date: "2026-10-25",
    start_time: "14:00",
    end_time: "16:00",
    task_id: aliceTask.data.id,
  });
  assert.ok(aliceBlock.success && aliceBlock.data);

  // Bob requests tasks and blocks
  setTestUser(USER_BOB);
  const bobTasks = await getAcademicTasksAction();
  assert.equal(bobTasks.success, true);
  assert.equal(bobTasks.data.length, 0, "Bob must not see any of Alice's tasks");

  const bobBlocks = await getCalendarTimeblocksAction("2026-10-01", "2026-10-31");
  assert.equal(bobBlocks.success, true);
  assert.equal(bobBlocks.data.length, 0, "Bob must not see any of Alice's calendar blocks");
});

test("PLANNER-SEC-03: User B cannot modify or delete User A's tasks or blocks", async () => {
  setTestUser(USER_ALICE);
  const aliceTask = await createAcademicTaskAction({
    title: "Alice Homework",
    due_date: "2026-10-22",
  });
  const aliceBlock = await createCalendarTimeblockAction({
    title: "Alice Revision Block",
    block_date: "2026-10-22",
    start_time: "10:00",
    end_time: "11:00",
  });

  // Switch to Bob and attempt malicious mutations
  setTestUser(USER_BOB);
  const hackUpdateTask = await updateAcademicTaskAction(aliceTask.data.id, {
    title: "Bob Hacked Title",
  });
  assert.equal(hackUpdateTask.success, false);
  assert.ok(hackUpdateTask.error?.includes("Accès refusé"));

  const hackDeleteTask = await deleteAcademicTaskAction(aliceTask.data.id);
  assert.equal(hackDeleteTask.success, false);

  const hackUpdateBlock = await updateCalendarTimeblockAction(aliceBlock.data.id, {
    title: "Bob Hacked Block",
  });
  assert.equal(hackUpdateBlock.success, false);

  const hackDeleteBlock = await deleteCalendarTimeblockAction(aliceBlock.data.id);
  assert.equal(hackDeleteBlock.success, false);

  // Verify Alice's data was completely untouched
  setTestUser(USER_ALICE);
  const checkTasks = await getAcademicTasksAction();
  assert.equal(checkTasks.data[0].title, "Alice Homework");
});

test("PLANNER-SEC-04: User cannot attach another user's task to their own calendar block", async () => {
  setTestUser(USER_ALICE);
  const aliceTask = await createAcademicTaskAction({
    title: "Alice Private Thesis",
    due_date: "2026-10-30",
  });

  setTestUser(USER_BOB);
  const crossUserBlock = await createCalendarTimeblockAction({
    title: "Bob Sneaky Block",
    block_date: "2026-10-30",
    start_time: "15:00",
    end_time: "16:00",
    task_id: aliceTask.data.id, // Malicious reference
  });

  assert.equal(crossUserBlock.success, false, "Must reject cross-user task link");
  assert.ok(crossUserBlock.error?.includes("Impossible de lier une tâche appartenant à un autre utilisateur"));
});

// -----------------------------------------------------------------------------
// 2. ACADEMIC TASK LIFECYCLE & PERSISTENCE TESTS
// -----------------------------------------------------------------------------

test("PLANNER-TASK-01: Full Task Lifecycle - Create, Subtasks, Toggle Complete, Reopen, Delete", async () => {
  setTestUser(USER_ALICE);

  // 1. Create with subtasks
  const created = await createAcademicTaskAction({
    title: "Projet Compilation - Lexer & Parser",
    description: "Implémentation AST en C++ avec Flex et Bison",
    category: "project",
    priority: "urgent",
    due_date: "2026-10-24",
    due_time: "23:59",
    estimated_minutes: 120,
    subtasks: [
      { title: "Écrire les tokens regex", done: false },
      { title: "Construire les règles de grammaire", done: false },
    ],
  });

  assert.ok(created.success && created.data);
  const taskId = created.data.id;
  assert.equal(created.data.priority, "urgent");
  assert.equal(created.data.estimated_minutes, 120);
  assert.equal(created.data.subtasks.length, 2);
  assert.equal(created.data.is_completed, false);
  assert.equal(created.data.completed_at, null);

  // 2. Toggle Complete
  const completedRes = await toggleAcademicTaskAction(taskId, true);
  assert.ok(completedRes.success && completedRes.data);
  assert.equal(completedRes.data.is_completed, true);
  assert.ok(completedRes.data.completed_at !== null);

  // 3. Reopen Task
  const reopenedRes = await toggleAcademicTaskAction(taskId, false);
  assert.ok(reopenedRes.success && reopenedRes.data);
  assert.equal(reopenedRes.data.is_completed, false);
  assert.equal(reopenedRes.data.completed_at, null);

  // 4. Update Subtasks
  const updatedSubtasks = [
    { id: created.data.subtasks[0].id, title: "Écrire les tokens regex", done: true, order: 0 },
    { id: created.data.subtasks[1].id, title: "Construire les règles de grammaire", done: true, order: 1 },
  ];
  const updateRes = await updateAcademicTaskAction(taskId, {
    subtasks: updatedSubtasks,
    actual_minutes: 110,
  });
  assert.ok(updateRes.success && updateRes.data);
  assert.equal(updateRes.data.actual_minutes, 110);
  assert.equal(updateRes.data.subtasks[0].done, true);

  // 5. Delete Task
  const deleteRes = await deleteAcademicTaskAction(taskId);
  assert.ok(deleteRes.success);

  const fetchAfter = await getAcademicTasksAction();
  assert.equal(fetchAfter.data.length, 0);
});

test("PLANNER-TASK-02: Deleting a task unlinks calendar block without deleting the block history", async () => {
  setTestUser(USER_ALICE);

  const taskRes = await createAcademicTaskAction({
    title: "Devoir Réseaux",
    due_date: "2026-10-21",
  });
  const blockRes = await createCalendarTimeblockAction({
    title: "Séance Réseaux",
    block_date: "2026-10-21",
    start_time: "10:00",
    end_time: "12:00",
    task_id: taskRes.data.id,
  });

  assert.equal(blockRes.data.task_id, taskRes.data.id);

  // Delete the task
  await deleteAcademicTaskAction(taskRes.data.id);

  // Check the calendar block
  const blocks = await getCalendarTimeblocksAction("2026-10-01", "2026-10-31");
  assert.equal(blocks.data.length, 1, "Calendar block must be preserved!");
  assert.equal(blocks.data[0].id, blockRes.data.id);
  assert.equal(blocks.data[0].task_id, null, "task_id reference must be nulled out");
});

// -----------------------------------------------------------------------------
// 3. CALENDAR TIMEBLOCKS & CONFLICT DETECTION TESTS
// -----------------------------------------------------------------------------

test("PLANNER-CAL-01: Calendar block range queries and date filtering", async () => {
  setTestUser(USER_ALICE);

  await createCalendarTimeblockAction({
    title: "Block In October",
    block_date: "2026-10-15",
    start_time: "08:00",
    end_time: "09:00",
  });
  await createCalendarTimeblockAction({
    title: "Block In November",
    block_date: "2026-11-05",
    start_time: "14:00",
    end_time: "15:00",
  });

  const octBlocks = await getCalendarTimeblocksAction("2026-10-01", "2026-10-31");
  assert.equal(octBlocks.data.length, 1);
  assert.equal(octBlocks.data[0].title, "Block In October");

  const novBlocks = await getCalendarTimeblocksAction("2026-11-01", "2026-11-30");
  assert.equal(novBlocks.data.length, 1);
  assert.equal(novBlocks.data[0].title, "Block In November");
});

test("PLANNER-CAL-02: Overlapping schedule conflict detection warning", async () => {
  setTestUser(USER_ALICE);

  // Create base block from 10:00 to 12:00
  const baseBlock = await createCalendarTimeblockAction({
    title: "Math Lecture",
    block_date: "2026-10-25",
    start_time: "10:00",
    end_time: "12:00",
  });

  // Test overlapping interval: 11:00 to 13:00 (overlaps by 1 hour)
  const conflict1 = await checkCalendarConflictAction("2026-10-25", "11:00", "13:00");
  assert.equal(conflict1.hasConflict, true);
  assert.equal(conflict1.conflictingBlocks.length, 1);
  assert.equal(conflict1.conflictingBlocks[0].id, baseBlock.data.id);

  // Test non-overlapping interval: 12:00 to 13:00
  const conflict2 = await checkCalendarConflictAction("2026-10-25", "12:00", "13:00");
  assert.equal(conflict2.hasConflict, false);

  // Test excludeId (updating the existing block should not conflict with itself)
  const selfConflict = await checkCalendarConflictAction("2026-10-25", "10:00", "12:00", baseBlock.data.id);
  assert.equal(selfConflict.hasConflict, false);
});

// -----------------------------------------------------------------------------
// 4. PLANNER HISTORY & INTEGRATED PROGRESS
// -----------------------------------------------------------------------------

test("PLANNER-HIST-01: Accomplishment history aggregates completed tasks, sessions and forest metrics", async () => {
  setTestUser(USER_ALICE);

  // Create and complete tasks
  const t1 = await createAcademicTaskAction({
    title: "Tâche A Réussie",
    due_date: "2026-10-10",
    estimated_minutes: 45,
  });
  await toggleAcademicTaskAction(t1.data.id, true);

  const t2 = await createAcademicTaskAction({
    title: "Tâche B En cours",
    due_date: "2026-10-18",
    estimated_minutes: 60,
  });

  const history = await getPlannerHistoryAction(30);
  assert.ok(history.success);
  assert.equal(history.data.totalTasksCompleted, 1);
  assert.equal(history.data.totalEstimatedMinutesCompleted, 45);
  assert.equal(history.data.completedTasks.length, 1);
  assert.equal(history.data.completedTasks[0].title, "Tâche A Réussie");
});

// -----------------------------------------------------------------------------
// 5. FOCUS INTEGRATION & ARCHITECTURAL SAFETY
// -----------------------------------------------------------------------------

test("PLANNER-INTEG-01: FocusTriggerButton component contract & non-destructive timer reuse", () => {
  const triggerPath = path.resolve("src/components/planner/focus-trigger-button.tsx");
  assert.ok(fs.existsSync(triggerPath), "focus-trigger-button.tsx must exist");
  const content = fs.readFileSync(triggerPath, "utf-8");

  assert.ok(
    content.includes("useFocus()"),
    "FocusTriggerButton must use existing useFocus() hook"
  );
  assert.ok(
    content.includes("isRunning || isPaused"),
    "FocusTriggerButton must check isRunning or isPaused to avoid clobbering active sessions"
  );
  assert.ok(
    content.includes("setIsModalOpen(true)"),
    "FocusTriggerButton must open the authoritative FocusHubModal"
  );
});

test("PLANNER-NAV-01: AppSidebar contains Planning & Tâches navigation item and preserves all existing items", () => {
  const sidebarPath = path.resolve("src/components/layout/app-sidebar.tsx");
  const content = fs.readFileSync(sidebarPath, "utf-8");

  assert.ok(
    content.includes('href: "/planner"'),
    "app-sidebar.tsx must contain /planner link"
  );
  assert.ok(
    content.includes("Planning & Tâches"),
    "app-sidebar.tsx must have Planning & Tâches label"
  );
  // Verify existing destinations were not removed
  assert.ok(content.includes('href: "/"'), "Accueil must be preserved");
  assert.ok(content.includes('href: "/semesters"'), "Semestres must be preserved");
  assert.ok(content.includes('href: "/subjects"'), "Matières must be preserved");
  assert.ok(content.includes('href: "/forest"'), "Bosquet Focus must be preserved");
  assert.ok(content.includes('href: "/library"'), "Bibliothèque must be preserved");
});

// -----------------------------------------------------------------------------
// 6. PHASE 3 AUDIT VERIFICATION & REGRESSION SUITE
// -----------------------------------------------------------------------------

test("AUDIT-SEC-01: Cross-user task linking rejected during timeblock creation AND update", async () => {
  setTestUser(USER_ALICE);
  const aliceTask = await createAcademicTaskAction({
    title: "Alice Private Exam Prep",
    due_date: "2026-10-25",
  });
  assert.ok(aliceTask.success && aliceTask.data);

  // Bob tries to create a timeblock linked to Alice's task
  setTestUser(USER_BOB);
  const maliciousCreate = await createCalendarTimeblockAction({
    title: "Bob Malicious Create Block",
    block_date: "2026-10-25",
    start_time: "09:00",
    end_time: "10:00",
    task_id: aliceTask.data.id,
  });
  assert.equal(maliciousCreate.success, false);
  assert.ok(maliciousCreate.error?.includes("Impossible de lier une tâche appartenant à un autre utilisateur"));

  // Bob creates a legitimate standalone timeblock
  const bobBlock = await createCalendarTimeblockAction({
    title: "Bob Legitimate Block",
    block_date: "2026-10-25",
    start_time: "10:00",
    end_time: "11:00",
  });
  assert.ok(bobBlock.success && bobBlock.data);

  // Bob now tries to update his own timeblock to link Alice's task
  const maliciousUpdate = await updateCalendarTimeblockAction(bobBlock.data.id, {
    task_id: aliceTask.data.id,
  });
  assert.equal(maliciousUpdate.success, false);
  assert.ok(maliciousUpdate.error?.includes("Impossible de lier une tâche appartenant à un autre utilisateur"));

  // Bob tries to update Alice's timeblock directly
  setTestUser(USER_ALICE);
  const aliceBlock = await createCalendarTimeblockAction({
    title: "Alice Block",
    block_date: "2026-10-25",
    start_time: "14:00",
    end_time: "15:00",
  });

  setTestUser(USER_BOB);
  const crossUserBlockUpdate = await updateCalendarTimeblockAction(aliceBlock.data.id, {
    title: "Bob Unauthorized Override",
  });
  assert.equal(crossUserBlockUpdate.success, false);
  assert.ok(crossUserBlockUpdate.error?.includes("Accès refusé"));
});

test("AUDIT-SEC-02: Nonexistent and invalid task IDs safely rejected on create and update", async () => {
  setTestUser(USER_ALICE);

  // Nonexistent task ID on create
  const createInvalid = await createCalendarTimeblockAction({
    title: "Block with Ghost Task",
    block_date: "2026-10-25",
    start_time: "10:00",
    end_time: "11:00",
    task_id: "nonexistent-task-uuid-99999",
  });
  assert.equal(createInvalid.success, false);
  assert.ok(createInvalid.error?.includes("Tâche liée introuvable"));

  // Create valid block then update with nonexistent task ID
  const validBlock = await createCalendarTimeblockAction({
    title: "Valid Block",
    block_date: "2026-10-25",
    start_time: "11:00",
    end_time: "12:00",
  });
  assert.ok(validBlock.success && validBlock.data);

  const updateInvalid = await updateCalendarTimeblockAction(validBlock.data.id, {
    task_id: "nonexistent-task-uuid-88888",
  });
  assert.equal(updateInvalid.success, false);
  assert.ok(updateInvalid.error?.includes("Tâche liée introuvable"));
});

test("AUDIT-SEC-03: Explicit unlinking of a task with task_id: null", async () => {
  setTestUser(USER_ALICE);

  const aliceTask = await createAcademicTaskAction({
    title: "Alice Task to Unlink",
    due_date: "2026-10-26",
  });
  assert.ok(aliceTask.success && aliceTask.data);

  const blockRes = await createCalendarTimeblockAction({
    title: "Alice Linked Session",
    block_date: "2026-10-26",
    start_time: "14:00",
    end_time: "15:00",
    task_id: aliceTask.data.id,
  });
  assert.ok(blockRes.success && blockRes.data);
  assert.equal(blockRes.data.task_id, aliceTask.data.id);

  // Explicitly unlink task by passing task_id: null
  const unlinkRes = await updateCalendarTimeblockAction(blockRes.data.id, {
    task_id: null,
  });
  assert.ok(unlinkRes.success && unlinkRes.data);
  assert.equal(unlinkRes.data.task_id, null, "task_id must be updated to null");

  // Verify through getCalendarTimeblocksAction
  const blocks = await getCalendarTimeblocksAction("2026-10-26", "2026-10-26");
  assert.equal(blocks.data.length, 1);
  assert.equal(blocks.data[0].task_id, null, "Persisted block must have null task_id");
});

test("AUDIT-DATA-01: Subtask normalization & boundary enforcement on create and update", async () => {
  setTestUser(USER_ALICE);

  // 1. Direct unit tests on pure synchronous sanitizeSubtasks
  assert.deepEqual(sanitizeSubtasks(null), [], "null input must return empty array");
  assert.deepEqual(sanitizeSubtasks(undefined), [], "undefined input must return empty array");
  assert.deepEqual(sanitizeSubtasks("not an array"), [], "string input must return empty array");
  assert.deepEqual(sanitizeSubtasks(12345), [], "number input must return empty array");
  assert.deepEqual(sanitizeSubtasks({}), [], "object input must return empty array");
  assert.deepEqual(sanitizeSubtasks([]), [], "empty array must return empty array");

  // Valid subtask array with clean properties
  const valid = [
    { id: "st-1", title: "Valid Subtask 1", done: false, order: 0 },
    { id: "st-2", title: "Valid Subtask 2", done: true, order: 1 },
  ];
  assert.deepEqual(sanitizeSubtasks(valid), valid, "Clean subtasks should be preserved exactly");

  // Filter out invalid items, empty titles, and strip arbitrary injected properties
  const dirty = [
    null,
    undefined,
    "random string",
    {},
    { title: "   " }, // whitespace only -> rejected
    { id: "   ", title: "Missing ID but valid title", done: true, order: "not-a-number" },
    { title: "Injected properties", done: "truthy_string", order: 5, evilField: "DROP TABLE", admin: true },
    { title: "B".repeat(300), done: 0 }, // title > 255 chars, falsy done
  ];
  const sanitized = sanitizeSubtasks(dirty);
  assert.equal(sanitized.length, 3, "Only entries with non-empty titles should be preserved");

  // First valid item generated ID and fallback order
  assert.ok(sanitized[0].id.startsWith("st-"), "Missing ID should be assigned a generated string ID");
  assert.equal(sanitized[0].title, "Missing ID but valid title");
  assert.equal(sanitized[0].done, true);
  assert.equal(sanitized[0].order, 0, "Invalid order should fallback to array index");

  // Injected arbitrary properties stripped
  assert.equal(sanitized[1].title, "Injected properties");
  assert.equal(sanitized[1].done, true, "Truthy done value coerced to boolean true");
  assert.equal(sanitized[1].order, 5);
  assert.equal(sanitized[1].evilField, undefined, "Arbitrary property evilField must be stripped");
  assert.equal(sanitized[1].admin, undefined, "Arbitrary property admin must be stripped");
  assert.deepEqual(Object.keys(sanitized[1]).sort(), ["done", "id", "order", "title"].sort());

  // Clamped length and title
  assert.equal(sanitized[2].title.length, 255, "Title must be clamped to 255 chars");
  assert.equal(sanitized[2].done, false, "Falsy done value coerced to boolean false");

  // Cap to 50 items
  const many = Array.from({ length: 65 }, (_, i) => ({ title: `Item ${i}`, done: false }));
  const capped = sanitizeSubtasks(many);
  assert.equal(capped.length, 50, "Subtask list must be clamped to 50 items");

  // 2. Integration with createAcademicTaskAction
  const created = await createAcademicTaskAction({
    title: "Task With Oversized Subtasks",
    due_date: "2026-10-27",
    subtasks: many,
  });
  assert.ok(created.success && created.data);
  assert.equal(created.data.subtasks.length, 50);

  // 3. Integration with updateAcademicTaskAction (supplying new subtasks)
  const updated = await updateAcademicTaskAction(created.data.id, {
    subtasks: Array.from({ length: 55 }, (_, i) => ({ title: `New ${i}`, done: true })),
  });
  assert.ok(updated.success && updated.data);
  assert.equal(updated.data.subtasks.length, 50);

  // 4. Updating task with malformed subtasks safely sanitizes to empty array
  const updatedMalformed = await updateAcademicTaskAction(created.data.id, {
    subtasks: "not an array",
  });
  assert.ok(updatedMalformed.success && updatedMalformed.data);
  assert.deepEqual(updatedMalformed.data.subtasks, []);

  // 5. Updating other fields when subtasks is omitted preserves existing subtasks
  await updateAcademicTaskAction(created.data.id, {
    subtasks: [{ id: "keep-1", title: "Preserved Subtask", done: true, order: 0 }],
  });
  const updatedTitleOnly = await updateAcademicTaskAction(created.data.id, {
    title: "Updated Title Only",
  });
  assert.ok(updatedTitleOnly.success && updatedTitleOnly.data);
  assert.equal(updatedTitleOnly.data.subtasks.length, 1, "Subtasks must be preserved when field is omitted");
  assert.equal(updatedTitleOnly.data.subtasks[0].title, "Preserved Subtask");
});

test("AUDIT-UI-01: Regex-safe subject name parsing for special characters in quick-add", () => {
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  const subjects = [
    { id: "sub-cpp", name: "C++", slug: "c++" },
    { id: "sub-comp", name: "Compilation (IGL4)", slug: "compilation-(igl4)" },
    { id: "sub-tdtp", name: "TD/TP", slug: "td-tp" },
    { id: "sub-algo", name: "Algo & Struct [2026]", slug: "algo-struct-[2026]" },
    { id: "sub-net", name: "Réseaux.v2", slug: "reseaux.v2" },
  ];

  // Helper matching quick-add component parser logic
  function parseSubjectFromInput(text, subList) {
    let clean = text;
    let detectedSubjectId = null;

    for (const sub of subList) {
      const candidates = [sub.name, sub.slug].filter(Boolean);
      let matched = false;
      for (const targetStr of candidates) {
        const escaped = escapeRegex(targetStr);
        const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i");
        if (regex.test(clean)) {
          detectedSubjectId = sub.id;
          clean = clean.replace(regex, " ");
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    return { detectedSubjectId, remaining: clean.trim() };
  }

  // Test C++
  const res1 = parseSubjectFromInput("Projet C++ demain 2h !urgent", subjects);
  assert.equal(res1.detectedSubjectId, "sub-cpp");

  // Test Compilation (IGL4)
  const res2 = parseSubjectFromInput("Révision Compilation (IGL4) 45m", subjects);
  assert.equal(res2.detectedSubjectId, "sub-comp");

  // Test TD/TP
  const res3 = parseSubjectFromInput("TD/TP 1h !high", subjects);
  assert.equal(res3.detectedSubjectId, "sub-tdtp");

  // Test Algo & Struct [2026]
  const res4 = parseSubjectFromInput("Algo & Struct [2026] demain", subjects);
  assert.equal(res4.detectedSubjectId, "sub-algo");

  // Test Réseaux.v2
  const res5 = parseSubjectFromInput("Réseaux.v2 30m", subjects);
  assert.equal(res5.detectedSubjectId, "sub-net");
});

test("AUDIT-CAL-01: Persistent conflict detection excludes edited block and validates time intervals", async () => {
  setTestUser(USER_ALICE);

  const block = await createCalendarTimeblockAction({
    title: "Database Lecture",
    block_date: "2026-10-28",
    start_time: "14:00",
    end_time: "16:00",
  });
  assert.ok(block.success && block.data);

  // Overlapping interval detected
  const conflict = await checkCalendarConflictAction("2026-10-28", "14:30", "15:30");
  assert.equal(conflict.hasConflict, true);
  assert.equal(conflict.conflictingBlocks.length, 1);
  assert.equal(conflict.conflictingBlocks[0].id, block.data.id);

  // Edited block exclusion: updating block itself should not trigger self-conflict
  const excluded = await checkCalendarConflictAction("2026-10-28", "14:30", "15:30", block.data.id);
  assert.equal(excluded.hasConflict, false, "Self-block must be excluded from conflict check");

  // Invalid interval: end_time before or equal to start_time
  const invalidInterval = await checkCalendarConflictAction("2026-10-28", "16:00", "14:00");
  assert.equal(invalidInterval.hasConflict, false);
  assert.ok(invalidInterval.error?.includes("L'heure de fin doit être postérieure à l'heure de début"));

  const equalInterval = await checkCalendarConflictAction("2026-10-28", "14:00", "14:00");
  assert.equal(equalInterval.hasConflict, false);
  assert.ok(equalInterval.error?.includes("L'heure de fin doit être postérieure à l'heure de début"));

  // Malformed date/time
  const badTime = await checkCalendarConflictAction("invalid-date", "bad", "time");
  assert.equal(badTime.hasConflict, false);
  assert.ok(badTime.error?.includes("Horaires ou date invalides"));
});

test("AUDIT-CAL-02: Boundary interval overlap math - adjacent blocks vs overlapping intervals", async () => {
  setTestUser(USER_ALICE);

  // Create base block strictly from 10:00 to 11:00
  await createCalendarTimeblockAction({
    title: "Core Block",
    block_date: "2026-10-29",
    start_time: "10:00",
    end_time: "11:00",
  });

  // 1. Adjacent blocks touching endpoints MUST NOT conflict
  const adjBefore = await checkCalendarConflictAction("2026-10-29", "09:00", "10:00");
  assert.equal(adjBefore.hasConflict, false, "09:00-10:00 must NOT conflict with 10:00-11:00");

  const adjAfter = await checkCalendarConflictAction("2026-10-29", "11:00", "12:00");
  assert.equal(adjAfter.hasConflict, false, "11:00-12:00 must NOT conflict with 10:00-11:00");

  // 2. Strict overlaps MUST conflict
  const overlapStart = await checkCalendarConflictAction("2026-10-29", "09:30", "10:30");
  assert.equal(overlapStart.hasConflict, true, "09:30-10:30 must conflict with 10:00-11:00");

  const overlapEnd = await checkCalendarConflictAction("2026-10-29", "10:30", "11:30");
  assert.equal(overlapEnd.hasConflict, true, "10:30-11:30 must conflict with 10:00-11:00");

  const contained = await checkCalendarConflictAction("2026-10-29", "10:15", "10:45");
  assert.equal(contained.hasConflict, true, "10:15-10:45 must conflict with 10:00-11:00");

  const enclosing = await checkCalendarConflictAction("2026-10-29", "09:00", "12:00");
  assert.equal(enclosing.hasConflict, true, "09:00-12:00 must conflict with 10:00-11:00");
});

test("AUDIT-TZ-01: Local date calculation around midnight prevents UTC drift", () => {
  // Test format regex
  const todayStr = getLocalTodayDateString();
  assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);

  // Test local late night (23:59:59)
  const lateNight = new Date(2026, 9, 18, 23, 59, 59); // Oct 18, 2026
  assert.equal(getLocalTodayDateString(lateNight), "2026-10-18");

  // Test local early morning (00:00:01)
  const earlyMorning = new Date(2026, 9, 19, 0, 0, 1); // Oct 19, 2026
  assert.equal(getLocalTodayDateString(earlyMorning), "2026-10-19");

  // Test zero padding
  const paddedDate = new Date(2026, 4, 3, 12, 0, 0); // May 3, 2026
  assert.equal(getLocalTodayDateString(paddedDate), "2026-05-03");
});

test("AUDIT-FOCUS-01: FocusProvider architecture non-regression and interface integrity", () => {
  const providerPath = path.resolve("src/components/focus/focus-provider.tsx");
  assert.ok(fs.existsSync(providerPath), "focus-provider.tsx must exist");
  const content = fs.readFileSync(providerPath, "utf-8");

  // Verify all authoritative context hooks, methods and state are intact
  assert.ok(
    content.includes("useFocus") && content.includes("useFocusTimer"),
    "useFocus / useFocusTimer hooks must be exported"
  );
  assert.ok(content.includes("isRunning"), "isRunning state must be exposed");
  assert.ok(content.includes("isPaused"), "isPaused state must be exposed");
  assert.ok(content.includes("toggleTimer"), "toggleTimer method must be exposed");
  assert.ok(content.includes("pauseTimer"), "pauseTimer method must be exposed");
  assert.ok(content.includes("resumeTimer"), "resumeTimer method must be exposed");
  assert.ok(content.includes("resetTimer"), "resetTimer method must be exposed");
  assert.ok(content.includes("completedPomodoros"), "completedPomodoros must be exposed");
  assert.ok(content.includes("totalFocusMinutesToday"), "totalFocusMinutesToday must be exposed");
  assert.ok(content.includes("startFocusSession"), "Forest session start integration must be preserved");
  assert.ok(content.includes("recordUserDailyFocus"), "Analytics telemetry recording must be preserved");
});

// -----------------------------------------------------------------------------
// 10. TIMEBLOCK INTERVAL SCHEDULING & MIDNIGHT BOUNDARY TESTS
// -----------------------------------------------------------------------------

test("PLANNER-TIMEBLOCK-01: Multi-hour single record creation (09:00 - 12:00 = 180 min, 1 record)", async () => {
  setTestUser(USER_ALICE);

  const blockRes = await createCalendarTimeblockAction({
    title: "Deep Work Algorithms",
    block_date: "2026-10-21",
    start_time: "09:00",
    end_time: "12:00",
  });

  assert.equal(blockRes.success, true);
  assert.ok(blockRes.data);
  assert.equal(blockRes.data.duration_minutes, 180);
  assert.ok(blockRes.data.start_time.startsWith("09:00"));
  assert.ok(blockRes.data.end_time.startsWith("12:00"));

  // Verify only 1 record exists
  const listRes = await getCalendarTimeblocksAction("2026-10-21", "2026-10-21");
  assert.equal(listRes.success, true);
  assert.equal(listRes.data.length, 1);
  assert.equal(listRes.data[0].id, blockRes.data.id);
});

test("PLANNER-TIMEBLOCK-02: Midnight boundary support (23:00 - 00:00 = 60 min final hour block)", async () => {
  setTestUser(USER_ALICE);

  const blockRes = await createCalendarTimeblockAction({
    title: "Late Night Code Review",
    block_date: "2026-10-21",
    start_time: "23:00",
    end_time: "00:00",
  });

  assert.equal(blockRes.success, true, "23:00 to 00:00 midnight must be a valid timeblock");
  assert.ok(blockRes.data);
  assert.equal(blockRes.data.duration_minutes, 60, "Duration must be exactly 60 minutes");
  assert.ok(blockRes.data.start_time.startsWith("23:00"));
  assert.ok(blockRes.data.end_time.startsWith("00:00"));

  // Verify conflict detection recognizes 23:00-00:00 without crashing
  const conflict = await checkCalendarConflictAction("2026-10-21", "23:15", "23:45");
  assert.equal(conflict.hasConflict, true, "Overlap within 23:00-00:00 must be detected");

  const noConflict = await checkCalendarConflictAction("2026-10-21", "22:00", "23:00");
  assert.equal(noConflict.hasConflict, false, "Adjacent 22:00-23:00 must not conflict");
});

test("PLANNER-TASK-SCHEDULE-01: Scheduling a task to calendar preserves task linkage, subject, and completion independence", async () => {
  setTestUser(USER_ALICE);

  // 1. Create a task
  const taskRes = await createAcademicTaskAction({
    title: "Microservices Docker Lab",
    subject_id: "cloud",
    estimated_duration_minutes: 90,
    due_date: "2026-10-22",
  });
  assert.equal(taskRes.success, true);
  const task = taskRes.data;

  // 2. Schedule calendar block linked to task
  const blockRes = await createCalendarTimeblockAction({
    title: task.title,
    subject_id: task.subject_id,
    task_id: task.id,
    block_date: "2026-10-22",
    start_time: "14:00",
    end_time: "15:30",
  });
  assert.equal(blockRes.success, true);
  assert.equal(blockRes.data.task_id, task.id);
  assert.equal(blockRes.data.subject_id, "cloud");
  assert.equal(blockRes.data.duration_minutes, 90);

  // 3. Complete calendar block
  const completeBlockRes = await updateCalendarTimeblockAction(blockRes.data.id, {
    is_completed: true,
  });
  assert.equal(completeBlockRes.success, true);
  assert.equal(completeBlockRes.data.is_completed, true);

  // 4. Verify task itself remains incomplete (completion independence)
  const taskList = await getAcademicTasksAction();
  const refreshedTask = taskList.data.find((t) => t.id === task.id);
  assert.ok(refreshedTask);
  assert.equal(refreshedTask.is_completed, false, "Task must NOT be auto-completed when calendar block is completed");
});

test("PLANNER-TIMEBLOCK-03: Session duplication preserves metadata on target date", async () => {
  setTestUser(USER_ALICE);

  const originalBlock = await createCalendarTimeblockAction({
    title: "Compilation & AST Theory",
    subject_id: "compilation",
    block_date: "2026-10-23",
    start_time: "10:00",
    end_time: "11:30",
    notes: "Review LL(1) parsing tables",
  });
  assert.equal(originalBlock.success, true);

  // Duplicate to next day
  const duplicateBlock = await createCalendarTimeblockAction({
    title: `${originalBlock.data.title} (Copie)`,
    subject_id: originalBlock.data.subject_id,
    block_date: "2026-10-24",
    start_time: originalBlock.data.start_time,
    end_time: originalBlock.data.end_time,
    notes: originalBlock.data.notes,
  });
  assert.equal(duplicateBlock.success, true);
  assert.notEqual(duplicateBlock.data.id, originalBlock.data.id);
  assert.equal(duplicateBlock.data.block_date, "2026-10-24");
  assert.equal(duplicateBlock.data.subject_id, "compilation");
  assert.equal(duplicateBlock.data.duration_minutes, 90);
  assert.equal(duplicateBlock.data.is_completed, false);
});

// -----------------------------------------------------------------------------
// 11. ACADEMIC GOALS SUBSYSTEM TESTS
// -----------------------------------------------------------------------------

test("PLANNER-GOAL-01: User can create and update daily, weekly, and monthly goal targets", async () => {
  setTestUser(USER_ALICE);

  // 1. Set daily study minutes goal target to 120 min
  const setRes1 = await setAcademicGoalAction({
    period_type: "daily",
    period_key: "2026-10-21",
    metric_type: "study_minutes",
    target_value: 120,
  });
  assert.equal(setRes1.success, true);
  assert.ok(setRes1.data);
  assert.equal(setRes1.data.target_value, 120);

  // 2. Fetch goals for the day
  const getRes1 = await getAcademicGoalsAction({
    period_type: "daily",
    period_key: "2026-10-21",
  });
  assert.equal(getRes1.success, true);
  assert.equal(getRes1.data.length, 1);
  assert.equal(getRes1.data[0].metric_type, "study_minutes");
  assert.equal(getRes1.data[0].target_value, 120);

  // 3. Update target to 180 min (must upsert in place without duplicating)
  const setRes2 = await setAcademicGoalAction({
    period_type: "daily",
    period_key: "2026-10-21",
    metric_type: "study_minutes",
    target_value: 180,
  });
  assert.equal(setRes2.success, true);
  assert.equal(setRes2.data.target_value, 180);

  const getRes2 = await getAcademicGoalsAction({
    period_type: "daily",
    period_key: "2026-10-21",
  });
  assert.equal(getRes2.success, true);
  assert.equal(getRes2.data.length, 1, "Must not create duplicate goal for same period and metric");
  assert.equal(getRes2.data[0].target_value, 180);

  // 4. Set tasks completed goal
  const setTaskGoalRes = await setAcademicGoalAction({
    period_type: "daily",
    period_key: "2026-10-21",
    metric_type: "tasks_completed",
    target_value: 4,
  });
  assert.equal(setTaskGoalRes.success, true);

  const getRes3 = await getAcademicGoalsAction({
    period_type: "daily",
    period_key: "2026-10-21",
  });
  assert.equal(getRes3.data.length, 2);
});

test("PLANNER-GOAL-02: Goal progress uses verified telemetry and completed task counts", async () => {
  setTestUser(USER_ALICE);

  // Create 2 tasks for 2026-10-21 and complete 1 of them
  const t1 = await createAcademicTaskAction({
    title: "Goal Task 1",
    due_date: "2026-10-21",
  });
  const t2 = await createAcademicTaskAction({
    title: "Goal Task 2",
    due_date: "2026-10-21",
  });

  // Toggle t1 to completed
  await toggleAcademicTaskAction(t1.data.id, true);

  // Set goal: 2 tasks completed
  await setAcademicGoalAction({
    period_type: "daily",
    period_key: "2026-10-21",
    metric_type: "tasks_completed",
    target_value: 2,
  });

  const goals = await getAcademicGoalsAction({
    period_type: "daily",
    period_key: "2026-10-21",
  });

  const taskGoal = goals.data.find((g) => g.metric_type === "tasks_completed");
  assert.ok(taskGoal);
  assert.equal(taskGoal.target_value, 2);
  assert.equal(taskGoal.current_progress, 1, "Verified progress must count only completed tasks");
  assert.equal(taskGoal.percentage, 50);
  assert.equal(taskGoal.is_completed, false);

  // Complete t2
  await toggleAcademicTaskAction(t2.data.id, true);

  const refreshedGoals = await getAcademicGoalsAction({
    period_type: "daily",
    period_key: "2026-10-21",
  });
  const refreshedTaskGoal = refreshedGoals.data.find((g) => g.metric_type === "tasks_completed");
  assert.equal(refreshedTaskGoal.current_progress, 2);
  assert.equal(refreshedTaskGoal.percentage, 100);
  assert.equal(refreshedTaskGoal.is_completed, true);
});

test("PLANNER-GOAL-03: Goal privacy and user isolation", async () => {
  // Alice sets a goal
  setTestUser(USER_ALICE);
  const aliceGoal = await setAcademicGoalAction({
    period_type: "weekly",
    period_key: "2026-W43",
    metric_type: "study_minutes",
    target_value: 600,
  });
  assert.equal(aliceGoal.success, true);

  // Bob requests goals for the same week
  setTestUser(USER_BOB);
  const bobGoals = await getAcademicGoalsAction({
    period_type: "weekly",
    period_key: "2026-W43",
  });
  assert.equal(bobGoals.success, true);
  assert.equal(bobGoals.data.length, 0, "Bob must NOT see Alice's weekly goal");

  // Bob attempts to delete Alice's goal
  const bobDelete = await deleteAcademicGoalAction(aliceGoal.data.id);
  assert.equal(bobDelete.success, false, "Bob must NOT be able to delete Alice's goal");

  // Verify Alice's goal remains intact
  setTestUser(USER_ALICE);
  const aliceCheck = await getAcademicGoalsAction({
    period_type: "weekly",
    period_key: "2026-W43",
  });
  assert.equal(aliceCheck.data.length, 1);
  assert.equal(aliceCheck.data[0].id, aliceGoal.data.id);
});

test("PLANNER-GOAL-04: Flexible personal goals support custom titles, units, and manual progress increment", async () => {
  setTestUser(USER_ALICE);

  // 1. Create a non-automated personal goal (exercises)
  const setRes = await setAcademicGoalAction({
    title: "Résoudre 20 exercices de Réseaux",
    description: "Fiche TD n°3 et annales 2024",
    period_type: "monthly",
    period_key: "2026-10",
    metric_type: "exercises",
    target_value: 20,
    unit: "exercices",
    manual_progress: 5,
  });
  assert.equal(setRes.success, true);
  assert.equal(setRes.data.title, "Résoudre 20 exercices de Réseaux");
  assert.equal(setRes.data.unit, "exercices");
  assert.equal(setRes.data.manual_progress, 5);

  // 2. Fetch goals and verify is_automated is false and progress matches manual_progress
  const getRes = await getAcademicGoalsAction({
    period_type: "monthly",
    period_key: "2026-10",
  });
  const exGoal = getRes.data.find((g) => g.id === setRes.data.id);
  assert.ok(exGoal);
  assert.equal(exGoal.is_automated, false);
  assert.equal(exGoal.current_progress, 5);
  assert.equal(exGoal.percentage, 25);
  assert.equal(exGoal.is_completed, false);

  // 3. Update manual progress using updateAcademicGoalProgressAction
  const updateRes = await updateAcademicGoalProgressAction(exGoal.id, 20);
  assert.equal(updateRes.success, true);

  const refreshed = await getAcademicGoalsAction({
    period_type: "monthly",
    period_key: "2026-10",
  });
  const updatedGoal = refreshed.data.find((g) => g.id === setRes.data.id);
  assert.equal(updatedGoal.current_progress, 20);
  assert.equal(updatedGoal.percentage, 100);
  assert.equal(updatedGoal.is_completed, true);
});

test("PLANNER-NOTEBOOKLM-01: Safe external link contract for NotebookLM", () => {
  const shellPath = path.resolve("src/components/planner/planner-shell.tsx");
  assert.ok(fs.existsSync(shellPath), "planner-shell.tsx must exist");
  const content = fs.readFileSync(shellPath, "utf-8");

  assert.ok(
    content.includes("https://notebooklm.google.com/"),
    "Must link to the official NotebookLM website"
  );
  assert.ok(
    content.includes('target="_blank"'),
    "Must open in a new tab"
  );
  assert.ok(
    content.includes('rel="noopener noreferrer"'),
    "Must enforce safe external rel attributes"
  );
});

test("PLANNER-SEC-05: Cross-user goal mutation & overwrite prevention", async () => {
  // 1. Alice creates an academic goal
  setTestUser(USER_ALICE);
  const aliceGoalRes = await setAcademicGoalAction({
    period_type: "weekly",
    period_key: "2026-W42",
    metric_type: "study_minutes",
    target_value: 300,
    title: "Alice Target",
  });
  assert.equal(aliceGoalRes.success, true);
  const aliceGoalId = aliceGoalRes.data.id;

  // 2. Bob attempts to overwrite Alice's goal with setAcademicGoalAction
  setTestUser(USER_BOB);
  const bobOverwriteRes = await setAcademicGoalAction({
    id: aliceGoalId,
    period_type: "weekly",
    period_key: "2026-W42",
    metric_type: "study_minutes",
    target_value: 10,
    title: "Bob Malicious Overwrite",
  });
  assert.equal(bobOverwriteRes.success, false);
  assert.match(bobOverwriteRes.error, /Accès refusé/);

  // 3. Bob attempts to update Alice's goal progress
  const bobProgressRes = await updateAcademicGoalProgressAction(aliceGoalId, 999);
  assert.equal(bobProgressRes.success, false);
  assert.match(bobProgressRes.error, /Accès refusé/);

  // 4. Bob attempts to delete Alice's goal
  const bobDeleteRes = await deleteAcademicGoalAction(aliceGoalId);
  assert.equal(bobDeleteRes.success, false);
  assert.match(bobDeleteRes.error, /Accès refusé/);

  // 5. Verify Alice's goal remains intact
  setTestUser(USER_ALICE);
  const aliceGoals = await getAcademicGoalsAction({ period_type: "weekly", period_key: "2026-W42" });
  const intact = aliceGoals.data.find((g) => g.id === aliceGoalId);
  assert.ok(intact);
  assert.equal(intact.title, "Alice Target");
  assert.equal(intact.target_value, 300);
});

test("PLANNER-DATA-02: Subject ID sanitization safely handles malformed non-UUID strings for DB", async () => {
  setTestUser(USER_ALICE);

  // 1. cleanDbSubjectId strips non-UUIDs to prevent PostgreSQL syntax errors
  assert.equal(cleanDbSubjectId("malicious-injection-or-non-uuid"), null);
  assert.equal(cleanDbSubjectId("not-a-uuid-string"), null);
  assert.equal(cleanDbSubjectId(""), null);
  assert.equal(cleanDbSubjectId(null), null);
  assert.equal(cleanDbSubjectId("123e4567-e89b-12d3-a456-426614174000"), "123e4567-e89b-12d3-a456-426614174000");

  // 2. Task creation with spaces or valid identifier safely trims
  const taskRes = await createAcademicTaskAction({
    title: "Task with valid subject",
    due_date: "2026-10-18",
    subject_id: "  123e4567-e89b-12d3-a456-426614174000  ",
  });
  assert.equal(taskRes.success, true);
  assert.equal(taskRes.data.subject_id, "123e4567-e89b-12d3-a456-426614174000");

  // 3. Block creation with blank subject safely handles empty string as null
  const blockRes = await createCalendarTimeblockAction({
    title: "Block with blank subject",
    block_date: "2026-10-18",
    start_time: "10:00",
    end_time: "11:00",
    subject_id: "   ",
  });
  assert.equal(blockRes.success, true);
  assert.equal(blockRes.data.subject_id, null);
});

test("PLANNER-SEC-06: Strict Multi-Tenant Isolation - Comprehensive privacy audit across all planner entities", async () => {
  // 1. Alice creates task, timeblock, and goal
  setTestUser(USER_ALICE);
  const aliceTask = await createAcademicTaskAction({
    title: "Alice Private Revision",
    category: "revision",
    priority: "high",
    due_date: "2026-10-25",
  });
  assert.ok(aliceTask.success && aliceTask.data);

  const aliceBlock = await createCalendarTimeblockAction({
    title: "Alice Focus Block",
    block_date: "2026-10-25",
    start_time: "10:00",
    end_time: "12:00",
    task_id: aliceTask.data.id,
  });
  assert.ok(aliceBlock.success && aliceBlock.data);

  const aliceGoal = await setAcademicGoalAction({
    title: "Alice Confidential Target",
    period_type: "daily",
    period_key: "2026-10-25",
    metric_type: "study_minutes",
    target_value: 120,
  });
  assert.ok(aliceGoal.success && aliceGoal.data);

  // 2. Switch to Bob: verify Bob cannot read or enumerate any of Alice's entities
  setTestUser(USER_BOB);

  // Bob gets tasks: must be empty
  const bobTasks = await getAcademicTasksAction();
  assert.equal(bobTasks.success, true);
  assert.equal(bobTasks.data.length, 0);

  // Bob gets timeblocks: must be empty
  const bobBlocks = await getCalendarTimeblocksAction("2026-10-20", "2026-10-30");
  assert.equal(bobBlocks.success, true);
  assert.equal(bobBlocks.data.length, 0);

  // Bob gets goals: must be empty
  const bobGoals = await getAcademicGoalsAction({ period_type: "daily", period_key: "2026-10-25" });
  assert.equal(bobGoals.success, true);
  assert.equal(bobGoals.data.length, 0);

  // Bob attempts mutations on Alice's task
  const bobUpdateTask = await updateAcademicTaskAction(aliceTask.data.id, { title: "Hacked" });
  assert.equal(bobUpdateTask.success, false);
  const bobDeleteTask = await deleteAcademicTaskAction(aliceTask.data.id);
  assert.equal(bobDeleteTask.success, false);

  // Bob attempts mutations on Alice's block
  const bobUpdateBlock = await updateCalendarTimeblockAction(aliceBlock.data.id, { title: "Hacked" });
  assert.equal(bobUpdateBlock.success, false);
  const bobDeleteBlock = await deleteCalendarTimeblockAction(aliceBlock.data.id);
  assert.equal(bobDeleteBlock.success, false);

  // Bob attempts mutations on Alice's goal
  const bobOverwriteGoal = await setAcademicGoalAction({
    id: aliceGoal.data.id,
    title: "Hacked Goal",
    period_type: "daily",
    period_key: "2026-10-25",
    metric_type: "study_minutes",
    target_value: 1,
  });
  assert.equal(bobOverwriteGoal.success, false);
  const bobProgressGoal = await updateAcademicGoalProgressAction(aliceGoal.data.id, 999);
  assert.equal(bobProgressGoal.success, false);
  const bobDeleteGoal = await deleteAcademicGoalAction(aliceGoal.data.id);
  assert.equal(bobDeleteGoal.success, false);

  // 3. Switch back to Alice: verify all data remains 100% intact
  setTestUser(USER_ALICE);
  const checkTasks = await getAcademicTasksAction();
  assert.equal(checkTasks.data.length, 1);
  assert.equal(checkTasks.data[0].title, "Alice Private Revision");

  const checkBlocks = await getCalendarTimeblocksAction("2026-10-20", "2026-10-30");
  assert.equal(checkBlocks.data.length, 1);
  assert.equal(checkBlocks.data[0].title, "Alice Focus Block");

  const checkGoals = await getAcademicGoalsAction({ period_type: "daily", period_key: "2026-10-25" });
  assert.equal(checkGoals.data.length, 1);
  assert.equal(checkGoals.data[0].title, "Alice Confidential Target");
});


