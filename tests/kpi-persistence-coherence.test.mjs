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
