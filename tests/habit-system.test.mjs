/**
 * VALIDILY-IGL4 — Habit Tracker & Consistency Engine Test Suite
 * Automated verification of calculations, streaks, quantitative tracking,
 * server actions, duplicate protection, and diagnostics.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { setTestUser } from "../src/lib/auth/authorization.ts";

import {
  isHabitEligibleOnDate,
  getDayCompletionStatus,
  calculateHabitStreaks,
  calculateHabitAnalytics,
  addDaysToDateString,
  getWeekKey,
} from "../src/lib/habits/habit-engine.ts";

import {
  getHabitsAction,
  createHabitAction,
  recordCheckinAction,
  undoCheckinAction,
  archiveHabitAction,
  getHabitAnalyticsAction,
  applyDiagnosticAdjustmentAction,
  _resetLocalHabitsStore,
} from "../src/lib/actions/habit-actions.ts";

const USER_ALICE = {
  id: "user-alice-1111-1111-1111-111111111111",
  email: "alice@insat.u-carthage.tn",
  role: "student",
  name: "Alice IGL4",
  avatarUrl: null,
};

test.beforeEach(async () => {
  setTestUser(USER_ALICE);
  await _resetLocalHabitsStore();
});

test("HABIT-CALC-01: isHabitEligibleOnDate correctly handles start_date, archive_date, and specific weekdays", () => {
  const habit = {
    id: "h1",
    user_id: "u1",
    name: "Math Workout",
    icon: "Brain",
    category: "study",
    habit_type: "binary",
    target_value: 1,
    unit: "fois",
    frequency_type: "specific_days",
    scheduled_days: [1, 3, 5], // Mon, Wed, Fri
    preferred_time: "morning",
    start_date: "2026-10-01",
    status: "active",
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  };

  // Before start date
  assert.equal(isHabitEligibleOnDate(habit, "2026-09-30", "2026-10-23"), false);

  // Monday 2026-10-05: eligible
  assert.equal(isHabitEligibleOnDate(habit, "2026-10-05", "2026-10-23"), true);

  // Tuesday 2026-10-06: not scheduled
  assert.equal(isHabitEligibleOnDate(habit, "2026-10-06", "2026-10-23"), false);

  // Wednesday 2026-10-07: eligible
  assert.equal(isHabitEligibleOnDate(habit, "2026-10-07", "2026-10-23"), true);

  // Archived habit check
  const archivedHabit = {
    ...habit,
    status: "archived",
    archived_at: "2026-10-10T12:00:00Z",
  };
  assert.equal(isHabitEligibleOnDate(archivedHabit, "2026-10-09", "2026-10-23"), true);
  assert.equal(isHabitEligibleOnDate(archivedHabit, "2026-10-12", "2026-10-23"), false);
});

test("HABIT-CALC-02: getDayCompletionStatus accurately distinguishes completed, partial, skipped, missed, pending, and future", () => {
  const habit = {
    id: "h2",
    user_id: "u1",
    name: "Reading Poly",
    icon: "BookOpen",
    category: "study",
    habit_type: "quantitative",
    target_value: 20,
    unit: "pages",
    frequency_type: "daily",
    scheduled_days: [0, 1, 2, 3, 4, 5, 6],
    preferred_time: "morning",
    start_date: "2026-10-01",
    status: "active",
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  };

  const todayStr = "2026-10-15";

  // 1. Full quantitative completion (value >= 20)
  const fullCheckin = { id: "c1", habit_id: "h2", user_id: "u1", date: "2026-10-10", value: 25, status: "completed", created_at: "", updated_at: "" };
  assert.equal(getDayCompletionStatus(habit, fullCheckin, "2026-10-10", todayStr), "completed");

  // 2. Partial quantitative completion (0 < value < 20)
  const partialCheckin = { id: "c2", habit_id: "h2", user_id: "u1", date: "2026-10-11", value: 12, status: "partial", created_at: "", updated_at: "" };
  assert.equal(getDayCompletionStatus(habit, partialCheckin, "2026-10-11", todayStr), "partial");

  // 3. Explicitly skipped day
  const skippedCheckin = { id: "c3", habit_id: "h2", user_id: "u1", date: "2026-10-12", value: 0, status: "skipped", created_at: "", updated_at: "" };
  assert.equal(getDayCompletionStatus(habit, skippedCheckin, "2026-10-12", todayStr), "skipped");

  // 4. Past day with no checkin -> missed
  assert.equal(getDayCompletionStatus(habit, undefined, "2026-10-13", todayStr), "missed");

  // 5. Today with no checkin -> pending
  assert.equal(getDayCompletionStatus(habit, undefined, todayStr, todayStr), "pending");

  // 6. Future day -> future
  assert.equal(getDayCompletionStatus(habit, undefined, "2026-10-16", todayStr), "future");
});

test("HABIT-CALC-03: calculateHabitStreaks handles daily streaks, skipped grace, and longest streaks", () => {
  const habit = {
    id: "h3",
    user_id: "u1",
    name: "Meditation",
    icon: "Sparkles",
    category: "mindfulness",
    habit_type: "binary",
    target_value: 1,
    unit: "fois",
    frequency_type: "daily",
    scheduled_days: [0, 1, 2, 3, 4, 5, 6],
    preferred_time: "morning",
    start_date: "2026-10-01",
    status: "active",
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  };

  const todayStr = "2026-10-07";

  // 5 consecutive completed days: Oct 1, 2, 3, 4, 5. Then skipped on Oct 6. Oct 7 is pending.
  const checkins = [
    { id: "1", habit_id: "h3", user_id: "u1", date: "2026-10-01", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "2", habit_id: "h3", user_id: "u1", date: "2026-10-02", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "3", habit_id: "h3", user_id: "u1", date: "2026-10-03", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "4", habit_id: "h3", user_id: "u1", date: "2026-10-04", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "5", habit_id: "h3", user_id: "u1", date: "2026-10-05", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "6", habit_id: "h3", user_id: "u1", date: "2026-10-06", value: 0, status: "skipped", created_at: "", updated_at: "" },
  ];

  const streaks = calculateHabitStreaks(habit, checkins, todayStr);
  // Skipped on Oct 6 is neutral grace, does not reset streak. Today Oct 7 is pending.
  assert.equal(streaks.currentStreak, 5);
  assert.equal(streaks.longestStreak, 5);
});

test("HABIT-CALC-04: calculateHabitStreaks correctly calculates weekly target habits (e.g. 3x/week)", () => {
  const habit = {
    id: "h-week",
    user_id: "u1",
    name: "Sport Workout",
    icon: "Dumbbell",
    category: "health",
    habit_type: "binary",
    target_value: 1,
    unit: "fois",
    frequency_type: "weekly_count",
    target_days_per_week: 3,
    scheduled_days: [0, 1, 2, 3, 4, 5, 6],
    preferred_time: "afternoon",
    start_date: "2026-10-05", // Monday
    status: "active",
    created_at: "2026-10-05T08:00:00Z",
    updated_at: "2026-10-05T08:00:00Z",
  };

  // Week 1 (Oct 5-11): 3 sessions (Mon, Wed, Fri) -> Met target!
  // Week 2 (Oct 12-18): 3 sessions (Tue, Thu, Sat) -> Met target!
  // Current Week 3 (Oct 19-25): 1 session on Oct 20 (still in progress)
  const checkins = [
    { id: "1", habit_id: "h-week", user_id: "u1", date: "2026-10-05", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "2", habit_id: "h-week", user_id: "u1", date: "2026-10-07", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "3", habit_id: "h-week", user_id: "u1", date: "2026-10-09", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "4", habit_id: "h-week", user_id: "u1", date: "2026-10-13", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "5", habit_id: "h-week", user_id: "u1", date: "2026-10-15", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "6", habit_id: "h-week", user_id: "u1", date: "2026-10-17", value: 1, status: "completed", created_at: "", updated_at: "" },
    { id: "7", habit_id: "h-week", user_id: "u1", date: "2026-10-20", value: 1, status: "completed", created_at: "", updated_at: "" },
  ];

  const streaks = calculateHabitStreaks(habit, checkins, "2026-10-21");
  assert.equal(streaks.currentStreak, 2); // 2 full weeks completed
  assert.equal(streaks.longestStreak, 2);
});

test("HABIT-CALC-05: calculateHabitAnalytics computes recoveryRate, weekday rates, and grounded diagnostics", () => {
  const habit = {
    id: "h-diag",
    user_id: "u1",
    name: "Study Session",
    icon: "Brain",
    category: "study",
    habit_type: "quantitative",
    target_value: 60,
    unit: "minutes",
    frequency_type: "daily",
    scheduled_days: [0, 1, 2, 3, 4, 5, 6],
    preferred_time: "evening",
    start_date: "2026-10-01",
    status: "active",
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  };

  // 10 eligible days (Oct 1 to Oct 10)
  // Completed 7 days, missed Oct 3, Oct 6, Oct 9.
  // After Oct 3 (missed), completed Oct 4 (recovered).
  // After Oct 6 (missed), completed Oct 7 (recovered).
  // Recovery rate = 2/2 = 100%.
  const checkins = [
    { id: "1", habit_id: "h-diag", user_id: "u1", date: "2026-10-01", value: 60, status: "completed", created_at: "", updated_at: "" },
    { id: "2", habit_id: "h-diag", user_id: "u1", date: "2026-10-02", value: 60, status: "completed", created_at: "", updated_at: "" },
    { id: "4", habit_id: "h-diag", user_id: "u1", date: "2026-10-04", value: 60, status: "completed", created_at: "", updated_at: "" },
    { id: "5", habit_id: "h-diag", user_id: "u1", date: "2026-10-05", value: 60, status: "completed", created_at: "", updated_at: "" },
    { id: "7", habit_id: "h-diag", user_id: "u1", date: "2026-10-07", value: 60, status: "completed", created_at: "", updated_at: "" },
    { id: "8", habit_id: "h-diag", user_id: "u1", date: "2026-10-08", value: 60, status: "completed", created_at: "", updated_at: "" },
    { id: "10", habit_id: "h-diag", user_id: "u1", date: "2026-10-10", value: 60, status: "completed", created_at: "", updated_at: "" },
  ];

  const analytics = calculateHabitAnalytics(habit, checkins, 10, "2026-10-10");
  assert.equal(analytics.totalEligibleDays, 10);
  assert.equal(analytics.completedDays, 7);
  assert.equal(analytics.missedDays, 3);
  assert.equal(analytics.completionRate, 70);
  assert.equal(analytics.recoveryRate, 100);

  // Diagnostics must contain data-grounded observations
  assert(analytics.diagnostics.length > 0);
  const observedDiags = analytics.diagnostics.filter((d) => d.type === "observed");
  assert(observedDiags.length >= 1);
});

test("HABIT-ACTION-01: createHabitAction enforces validation, persists habit, and supports retrieval", async () => {
  // Empty title rejected
  const invalidRes = await createHabitAction({ name: "   " });
  assert.equal(invalidRes.success, false);

  const created = await createHabitAction({
    name: "Lecture Philo",
    description: "Lire 15 pages par jour",
    icon: "BookOpen",
    category: "study",
    habit_type: "quantitative",
    target_value: 15,
    unit: "pages",
    frequency_type: "daily",
    preferred_time: "morning",
  });

  assert.equal(created.success, true);
  assert.equal(created.data?.name, "Lecture Philo");
  assert.equal(created.data?.target_value, 15);

  const listRes = await getHabitsAction();
  assert.equal(listRes.success, true);
  const found = listRes.data?.find((h) => h.id === created.data?.id);
  assert(found);
  assert.equal(found?.name, "Lecture Philo");
  assert.equal(found?.todayStatus, "pending");
});

test("HABIT-ACTION-02: recordCheckinAction upserts idempotently and undoCheckinAction safely removes checkin", async () => {
  const created = await createHabitAction({
    name: "Hydratation",
    habit_type: "quantitative",
    target_value: 2000,
    unit: "ml",
    preferred_time: "anytime",
  });

  const habitId = created.data?.id;
  const todayStr = "2026-10-23";

  // 1. Partial check-in (500 ml)
  const c1 = await recordCheckinAction({
    habitId,
    date: todayStr,
    value: 500,
  });
  assert.equal(c1.success, true);
  assert.equal(c1.data?.status, "partial");
  assert.equal(c1.data?.value, 500);

  // 2. Incremental update (reaching 2000 ml)
  const c2 = await recordCheckinAction({
    habitId,
    date: todayStr,
    value: 2000,
  });
  assert.equal(c2.success, true);
  assert.equal(c2.data?.status, "completed");
  assert.equal(c2.data?.value, 2000);

  // 3. Verify in habit list
  const list = await getHabitsAction({ targetDate: todayStr });
  const habitInList = list.data?.find((h) => h.id === habitId);
  assert.equal(habitInList?.todayStatus, "completed");
  assert.equal(habitInList?.currentStreak, 1);

  // 4. Undo checkin
  const undoRes = await undoCheckinAction({ habitId, date: todayStr });
  assert.equal(undoRes.success, true);

  const listAfterUndo = await getHabitsAction({ targetDate: todayStr });
  const undoneHabit = listAfterUndo.data?.find((h) => h.id === habitId);
  assert.equal(undoneHabit?.todayStatus, "pending");
});

test("HABIT-ACTION-03: archiveHabitAction retains historical records without destroying history", async () => {
  const created = await createHabitAction({
    name: "Routine Été",
    habit_type: "binary",
    target_value: 1,
    start_date: "2026-10-01",
  });
  const habitId = created.data?.id;

  // Add historical checkin
  await recordCheckinAction({ habitId, date: "2026-10-20" });

  // Archive habit
  const archiveRes = await archiveHabitAction(habitId);
  assert.equal(archiveRes.success, true);

  // Active list should not include it
  const activeList = await getHabitsAction({ status: "active" });
  assert(!activeList.data?.some((h) => h.id === habitId));

  // "all" list should still contain it with status archived
  const allList = await getHabitsAction({ status: "all" });
  const archived = allList.data?.find((h) => h.id === habitId);
  assert(archived);
  assert.equal(archived?.status, "archived");

  // Analytics should still calculate based on historical checkin
  const analyticsRes = await getHabitAnalyticsAction(habitId);
  assert.equal(analyticsRes.success, true);
  assert(analyticsRes.data.completedDays >= 1);
});

test("HABIT-ACTION-04: Cross-account isolation strictly prevents User Bob from mutating or reading User Alice's habit", async () => {
  const created = await createHabitAction({
    name: "Habitude Confidentielle Alice",
    habit_type: "binary",
  });
  const aliceHabitId = created.data?.id;

  // Switch session to Bob
  const USER_BOB = {
    id: "user-bob-2222-2222-2222-222222222222",
    email: "bob@insat.u-carthage.tn",
    role: "student",
    name: "Bob IGL4",
    avatarUrl: null,
  };
  setTestUser(USER_BOB);

  // Bob tries to record check-in on Alice's habit -> must fail
  const bobCheckin = await recordCheckinAction({
    habitId: aliceHabitId,
    value: 1,
  });
  assert.equal(bobCheckin.success, false);
  assert.match(bobCheckin.error || "", /non autorisée|introuvable/i);

  // Bob's list must not contain Alice's habit
  const bobList = await getHabitsAction();
  assert(!bobList.data?.some((h) => h.id === aliceHabitId));
});

test("HABIT-ACTION-05: applyDiagnosticAdjustmentAction updates habit configuration safely upon user confirmation", async () => {
  const created = await createHabitAction({
    name: "Routine du Soir",
    habit_type: "quantitative",
    target_value: 60,
    unit: "minutes",
    preferred_time: "evening",
  });
  const habitId = created.data?.id;

  // Apply shift_time adjustment to "morning"
  const shiftRes = await applyDiagnosticAdjustmentAction(habitId, "shift_time", {
    preferredTime: "morning",
  });
  assert.equal(shiftRes.success, true);

  // Apply reduce_target adjustment to 30 minutes
  const reduceRes = await applyDiagnosticAdjustmentAction(habitId, "reduce_target", {
    targetValue: 30,
  });
  assert.equal(reduceRes.success, true);

  // Verify updated state
  const list = await getHabitsAction();
  const updated = list.data?.find((h) => h.id === habitId);
  assert.equal(updated?.preferred_time, "morning");
  assert.equal(updated?.target_value, 30);
});
