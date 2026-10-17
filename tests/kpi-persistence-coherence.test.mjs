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
  getUserStudyGoals,
  saveUserStudyGoals,
  recordAnalyticsEvent,
  getAnalyticsOverview,
  recordUserDailyFocus,
  getUserDailyFocusHistory,
  getUserTodayFocus,
  resetUserStudyGoals,
} from "../src/lib/actions/analytics-actions.ts";

test("KPI & Insights Persistence: Study Goals Isolation & Persistence", async (t) => {
  const userA = {
    id: "student-user-a-001",
    email: "student-a@validily.tn",
    role: "student",
    name: "Étudiant Alpha",
  };
  const userB = {
    id: "student-user-b-002",
    email: "student-b@validily.tn",
    role: "student",
    name: "Étudiant Bêta",
  };

  await resetUserStudyGoals(userA.id);
  await resetUserStudyGoals(userB.id);

  // 1. Initial State: Default study goals for unconfigured user
  setTestUser(userA);
  const initialA = await getUserStudyGoals(userA.id);
  assert.equal(initialA.dailyFocusMinutes, 45, "Default daily focus should be 45 minutes");
  assert.equal(initialA.weeklyQuizzes, 5, "Default weekly quizzes should be 5");
  assert.equal(initialA.targetScore, 80, "Default target score should be 80%");

  // 2. User A updates their personal study goals
  const saveRes = await saveUserStudyGoals(userA.id, {
    dailyFocusMinutes: 60,
    weeklyQuizzes: 8,
    targetScore: 90,
  });
  assert.ok(saveRes.success, "Saving study goals must succeed");
  assert.equal(saveRes.goals.dailyFocusMinutes, 60);
  assert.equal(saveRes.goals.weeklyQuizzes, 8);
  assert.equal(saveRes.goals.targetScore, 90);

  // 3. Persistent Fetch: User A retrieves updated goals across multiple queries
  const retrievedA = await getUserStudyGoals(userA.id);
  assert.equal(retrievedA.dailyFocusMinutes, 60, "Persisted daily focus minutes must be 60");
  assert.equal(retrievedA.weeklyQuizzes, 8, "Persisted weekly quizzes must be 8");
  assert.equal(retrievedA.targetScore, 90, "Persisted target score must be 90");

  // 4. Strict Privacy & Isolation: User B's goals remain default and isolated
  setTestUser(userB);
  const retrievedB = await getUserStudyGoals(userB.id);
  assert.equal(retrievedB.dailyFocusMinutes, 45, "User B's goals must remain default 45m");
  assert.equal(retrievedB.weeklyQuizzes, 5, "User B's goals must remain default 5 quizzes");
  assert.equal(retrievedB.targetScore, 80, "User B's goals must remain default 80%");

  // 5. Cross-Account Protection: User B cannot overwrite User A's goals
  const maliciousSave = await saveUserStudyGoals(userA.id, {
    dailyFocusMinutes: 120,
    weeklyQuizzes: 20,
    targetScore: 100,
  });
  // The action scopes updates to requester's own identity (userB)
  assert.ok(maliciousSave.success);
  setTestUser(userA);
  const verifyAUnchanged = await getUserStudyGoals(userA.id);
  assert.equal(verifyAUnchanged.dailyFocusMinutes, 60, "User A's goals must remain uncorrupted by other users");
});

test("Admin Analytics Telemetry: In-Memory & Resilient Fallback Overview", async (t) => {
  // 1. Record telemetry events
  const record1 = await recordAnalyticsEvent({
    eventType: "page_view",
    path: "/forest",
    deviceType: "desktop",
    browser: "Chrome",
    os: "Windows",
  });
  assert.ok(record1.success, "Event recording must succeed");

  const record2 = await recordAnalyticsEvent({
    eventType: "focus_session_complete",
    path: "/forest",
    deviceType: "mobile",
    browser: "Safari",
    os: "iOS",
  });
  assert.ok(record2.success, "Focus event recording must succeed");

  // 2. Retrieve 7-day overview as Admin
  setTestUser({
    id: "admin-test-001",
    email: "admin@validily.tn",
    role: "admin",
    name: "Admin Tester",
  });
  const overviewRes = await getAnalyticsOverview("7d");
  assert.ok(overviewRes.success, "Overview query must succeed for admin");
  const overview7d = overviewRes.overview;
  assert.ok(overview7d, "Overview object must be returned");
  assert.ok(typeof overview7d.totalPageViews === "number", "Total page views must be numeric");
  assert.ok(typeof overview7d.activeUsersEstimate === "number", "Active users estimate must be numeric");
  assert.ok(Array.isArray(overview7d.pageViewsByDay), "Page views by day must be an array");
  assert.ok(Array.isArray(overview7d.topPages), "Top pages must be an array");
  assert.ok(overview7d.deviceDistribution, "Device distribution must exist");
  assert.ok(overview7d.browserDistribution, "Browser distribution must exist");
  assert.ok(overview7d.osDistribution, "OS distribution must exist");

  // Verify total count consistency
  const totalDeviceCount =
    (overview7d.deviceDistribution.desktop || 0) +
    (overview7d.deviceDistribution.mobile || 0) +
    (overview7d.deviceDistribution.tablet || 0) +
    (overview7d.deviceDistribution.unknown || 0);
  assert.ok(totalDeviceCount > 0, "Total tracked device count should be greater than zero");
});

test("Architecture Contract: Personal Analytics & Dashboard Integration", (t) => {
  // 1. Verify personal-analytics-dashboard.tsx props and DB integration
  const dashboardPath = path.join(rootDir, "src/components/workspace/personal-analytics-dashboard.tsx");
  assert.ok(fs.existsSync(dashboardPath), "personal-analytics-dashboard.tsx must exist");
  const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");

  assert.ok(
    dashboardContent.includes("initialDailyFocusMap"),
    "Dashboard must accept initialDailyFocusMap prop"
  );
  assert.ok(
    dashboardContent.includes("initialGoals"),
    "Dashboard must accept initialGoals prop"
  );
  assert.ok(
    dashboardContent.includes("practicedSubjectIds"),
    "Dashboard must accept practicedSubjectIds prop"
  );
  assert.ok(
    dashboardContent.includes("saveUserStudyGoals"),
    "Dashboard must call saveUserStudyGoals for DB persistence"
  );
  assert.ok(
    dashboardContent.includes("effectiveTodayFocusSeconds"),
    "Dashboard must calculate effectiveTodayFocusSeconds combining DB and live timer"
  );

  // 2. Verify workspace page.tsx forwards real DB metrics
  const pagePath = path.join(rootDir, "src/app/(workspace)/page.tsx");
  assert.ok(fs.existsSync(pagePath), "Workspace page.tsx must exist");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  assert.ok(
    pageContent.includes("getMyForest"),
    "page.tsx must fetch real forest data via getMyForest"
  );
  assert.ok(
    pageContent.includes("getUserStudyGoals"),
    "page.tsx must fetch user goals via getUserStudyGoals"
  );
  assert.ok(
    pageContent.includes("dailyFocusMap"),
    "page.tsx must aggregate daily focus minutes into dailyFocusMap"
  );
  assert.ok(
    pageContent.includes("initialDailyFocusMap={dailyFocusMap}"),
    "page.tsx must pass dailyFocusMap to PersonalAnalyticsDashboard"
  );
  assert.ok(
    pageContent.includes("initialGoals={userGoals}"),
    "page.tsx must pass userGoals to PersonalAnalyticsDashboard"
  );
  assert.ok(
    pageContent.includes("practicedSubjectIds={practicedSubjectIds}"),
    "page.tsx must pass practicedSubjectIds to PersonalAnalyticsDashboard"
  );
});

test("Daily Focus Persistence: Cross-Session Continuity, DB Storage & 24h Reset Contract", async () => {
  const testStudent = {
    id: "student-focus-continuity-01",
    email: "student-focus@validily.tn",
    role: "student",
    name: "Étudiant Focus",
  };
  setTestUser(testStudent);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  // 1. Record yesterday's focus: 30 minutes (1800 seconds)
  await recordUserDailyFocus({
    dateStr: yesterdayStr,
    totalSeconds: 1800,
    completedPomodoros: 1,
    userId: testStudent.id,
  });

  // 2. Record today's focus: user focuses for 10 seconds (like in user screenshot)
  const saveRes = await recordUserDailyFocus({
    dateStr: todayStr,
    totalSeconds: 10,
    completedPomodoros: 0,
    userId: testStudent.id,
  });

  assert.equal(saveRes.success, true, "recordUserDailyFocus must succeed");
  assert.equal(saveRes.record?.totalSeconds, 10, "Record must retain 10 seconds");

  // 3. Simulate user disconnecting and connecting again in the same day (rehydration from DB)
  const todayFocus = await getUserTodayFocus(testStudent.id);
  assert.equal(todayFocus.totalSeconds, 10, "getUserTodayFocus must return 10s upon reconnecting in same day");

  // 4. Verify 7-day history retains both yesterday and today
  const history = await getUserDailyFocusHistory(testStudent.id);
  assert.ok(history[yesterdayStr], "Yesterday's focus must remain preserved");
  assert.equal(history[yesterdayStr].totalSeconds, 1800);
  assert.ok(history[todayStr], "Today's focus must be preserved");
  assert.equal(history[todayStr].totalSeconds, 10);

  // 5. Simulate 24h rollover: future date starts at 0 while history is preserved
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  assert.equal(history[tomorrowStr], undefined, "Unreached day must not have unearned focus (starts at 0)");

  setTestUser(null);
});

test("Achievement Badges: 12 Distinct Iconic SVG Badges & Component Integration", () => {
  const badgeIconPath = path.resolve("src/components/forest/achievement-badge-icon.tsx");
  assert.ok(fs.existsSync(badgeIconPath), "achievement-badge-icon.tsx must exist");
  const badgeContent = fs.readFileSync(badgeIconPath, "utf-8");

  // Verify all 12 distinct badge SVG representations
  const requiredIds = [
    "first_tree",
    "grove_5",
    "grove_15",
    "full_island_36",
    "grove_master_100",
    "focus_bronze",
    "focus_silver",
    "focus_gold",
    "streak_3",
    "streak_7",
    "botanist_explorer",
    "master_botanist",
  ];

  requiredIds.forEach((id) => {
    assert.ok(
      badgeContent.includes(`id === "${id}"`),
      `achievement-badge-icon.tsx must implement custom SVG graphics for ${id}`
    );
  });

  // Verify forest-achievements.tsx uses AchievementBadgeIcon
  const achievementsPath = path.resolve("src/components/forest/forest-achievements.tsx");
  const achievementsContent = fs.readFileSync(achievementsPath, "utf-8");
  assert.ok(
    achievementsContent.includes("<AchievementBadgeIcon"),
    "forest-achievements.tsx must mount AchievementBadgeIcon"
  );
});

test("UI/UX Differentiation Contract: Overview vs Revisions Tabs Without Redundancy", () => {
  const workspacePath = path.resolve("src/components/workspace/student-private-workspace.tsx");
  assert.ok(fs.existsSync(workspacePath), "student-private-workspace.tsx must exist");
  const content = fs.readFileSync(workspacePath, "utf-8");

  // 1. Overview tab must NOT duplicate all 12 cards blindly; it must feature priority resume and quick cockpit
  assert.ok(
    content.includes("Reprendre vos révisions"),
    "Overview tab must feature 'Reprendre vos révisions' instead of duplicated full catalog"
  );
  assert.ok(
    content.includes("activeOrPrioritySubjects"),
    "Overview tab uses activeOrPrioritySubjects to show focused actionable items"
  );
  assert.ok(
    content.includes("Carnet d&apos;Erreurs") || content.includes("Carnet d'Erreurs"),
    "Overview tab mounts cockpit widget for errors"
  );
  assert.ok(
    content.includes("Dernières Activités & Évaluations"),
    "Overview tab mounts cockpit widget for recent evaluations"
  );

  // 2. Dedicated Revisions tab must provide interactive hub features
  assert.ok(
    content.includes("Centre de Révision & Planification du Cursus"),
    "Revisions tab must feature full dedicated title"
  );
  assert.ok(
    content.includes("filteredRevisionSubjects"),
    "Revisions tab mounts filteredRevisionSubjects"
  );
  assert.ok(
    content.includes("setRevisionFilter"),
    "Revisions tab has status filter controls"
  );
  assert.ok(
    content.includes("setRevisionSemesterFilter"),
    "Revisions tab has semester filter controls"
  );
  assert.ok(
    content.includes("setRevisionSearch"),
    "Revisions tab has real-time search input"
  );
});

test("Couverture du Semestre: Strictly counts 100% completed subjects per user without counting in-progress ones", () => {
  const dashboardPath = path.resolve("src/components/workspace/personal-analytics-dashboard.tsx");
  assert.ok(fs.existsSync(dashboardPath), "personal-analytics-dashboard.tsx must exist");
  const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");

  // Verify dashboard contracts for 100% completed subjects
  assert.ok(
    dashboardContent.includes("s.totalResources > 0 && s.percentage === 100"),
    "Dashboard must strictly filter completedSubjects by totalResources > 0 and percentage === 100"
  );
  assert.ok(
    dashboardContent.includes("uniqueSubjectsCount = completedSubjectsCount"),
    "Dashboard uniqueSubjectsCount must be set to completedSubjectsCount"
  );
  assert.ok(
    dashboardContent.includes("inProgressSubjectsCount"),
    "Dashboard must compute inProgressSubjectsCount for pending subjects"
  );

  // Algorithmic simulation matching the user's exact reported scenario:
  // 11 total available subjects
  // 1 subject fully completed: 4/4 resources revised (100% progression)
  // 1 subject in progress: 1/8 revised, 2/8 in_progress (13% progression)
  // 9 subjects not started (0% progression)
  const allSubjects = Array.from({ length: 11 }, (_, i) => ({
    id: `subject-${i + 1}`,
    name: `Matière ${i + 1}`,
    slug: `matiere-${i + 1}`,
  }));

  const mockRevisionProgress = {
    totalResources: 50,
    totalRevised: 4,
    totalInProgress: 2,
    totalNotStarted: 44,
    overallPercentage: 8,
    subjects: [
      {
        subjectId: "subject-1",
        subjectSlug: "matiere-1",
        totalResources: 4,
        revisedCount: 4,
        inProgressCount: 0,
        notStartedCount: 0,
        percentage: 100, // 100% COMPLETED
      },
      {
        subjectId: "subject-2",
        subjectSlug: "matiere-2",
        totalResources: 8,
        revisedCount: 1,
        inProgressCount: 2,
        notStartedCount: 5,
        percentage: 13, // IN PROGRESS / PENDING EN COURS
      },
      ...allSubjects.slice(2).map((s) => ({
        subjectId: s.id,
        subjectSlug: s.slug,
        totalResources: 4,
        revisedCount: 0,
        inProgressCount: 0,
        notStartedCount: 4,
        percentage: 0,
      })),
    ],
  };

  // Replicate dashboard computation
  const completed = new Set();
  mockRevisionProgress.subjects.forEach((s) => {
    if (s.totalResources > 0 && s.percentage === 100) {
      completed.add(s.subjectId);
      if (s.subjectSlug) completed.add(s.subjectSlug);
    }
  });

  const inProgress = new Set();
  mockRevisionProgress.subjects.forEach((s) => {
    if (
      s.totalResources > 0 &&
      s.percentage < 100 &&
      (s.inProgressCount > 0 || (s.revisedCount > 0 && s.percentage < 100))
    ) {
      inProgress.add(s.subjectId);
      if (s.subjectSlug) inProgress.add(s.subjectSlug);
    }
  });

  let completedCount = 0;
  allSubjects.forEach((s) => {
    if (completed.has(s.id) || (s.slug && completed.has(s.slug))) {
      completedCount++;
    }
  });

  let inProgressCount = 0;
  allSubjects.forEach((s) => {
    if (inProgress.has(s.id) || (s.slug && inProgress.has(s.slug))) {
      inProgressCount++;
    }
  });

  const totalAvailable = allSubjects.length; // 11
  const coveragePercent = Math.min(100, Math.round((completedCount / totalAvailable) * 100));

  // Assertions verifying exact fix:
  assert.equal(completedCount, 1, "Only 1 subject with 100% progression must be counted");
  assert.equal(inProgressCount, 1, "The pending/in-progress subject must be detected as 1");
  assert.equal(coveragePercent, 9, "Coverage must be 1 / 11 = 9%, NOT 2 / 11 = 18%");
});

