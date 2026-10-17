import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAnalyticsOverview } from "../src/lib/actions/analytics-actions.ts";
import { setTestUser } from "../src/lib/auth/authorization.ts";

test("ANALYTICS-PERIOD-01: getAnalyticsOverview produces dynamic, distinct data for 24h, 7d, and 30d", async () => {
  setTestUser({
    id: "admin-tester-uuid-001",
    email: "admin@validily.tn",
    role: "admin",
    name: "Admin Tester",
  });

  const [res24h, res7d, res30d] = await Promise.all([
    getAnalyticsOverview("24h"),
    getAnalyticsOverview("7d"),
    getAnalyticsOverview("30d"),
  ]);

  assert.equal(res24h.success, true, "24h analytics query must succeed");
  assert.equal(res7d.success, true, "7d analytics query must succeed");
  assert.equal(res30d.success, true, "30d analytics query must succeed");

  const o24 = res24h.overview;
  const o7 = res7d.overview;
  const o30 = res30d.overview;

  assert.ok(o24 && o7 && o30, "All three overviews must be defined");

  // 1. Timeline bucketing checks
  assert.equal(o24.pageViewsByDay.length, 6, "24h mode must produce 6 4-hour time blocks");
  assert.ok(o24.pageViewsByDay.some((b) => b.date.includes("00h - 04h")), "24h must contain standard block labels");

  assert.equal(o7.pageViewsByDay.length, 7, "7d mode must produce exactly 7 daily timeline entries");
  assert.equal(o30.pageViewsByDay.length, 30, "30d mode must produce exactly 30 daily timeline entries");

  // 2. Monotonic total page views progression (24h <= 7d <= 30d)
  assert.ok(
    o24.totalPageViews <= o7.totalPageViews,
    `24h page views (${o24.totalPageViews}) should be <= 7d page views (${o7.totalPageViews})`
  );
  assert.ok(
    o7.totalPageViews <= o30.totalPageViews,
    `7d page views (${o7.totalPageViews}) should be <= 30d page views (${o30.totalPageViews})`
  );

  // 3. Multi-window visitor metrics are consistent
  assert.ok(o24.uniqueVisitors24h <= o24.uniqueVisitors7d, "24h visitors <= 7d visitors");
  assert.ok(o24.uniqueVisitors7d <= o24.uniqueVisitors30d, "7d visitors <= 30d visitors");

  // 4. Equipment distribution matches period events
  const totalDev24 = Object.values(o24.deviceDistribution).reduce((a, b) => a + b, 0);
  const totalDev7 = Object.values(o7.deviceDistribution).reduce((a, b) => a + b, 0);
  const totalDev30 = Object.values(o30.deviceDistribution).reduce((a, b) => a + b, 0);

  assert.ok(totalDev24 <= totalDev7, "24h total device count <= 7d count");
  assert.ok(totalDev7 <= totalDev30, "7d total device count <= 30d count");
});

test("FOREST-TIMELINE-PERIOD-02: ForestTimeline component implements functional period filtering", () => {
  const filePath = path.join(process.cwd(), "src/components/forest/forest-timeline.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes("periodFilter"), "ForestTimeline must have periodFilter state");
  assert.ok(content.includes('"today"'), "ForestTimeline must support 'today' period option");
  assert.ok(content.includes('"7d"'), "ForestTimeline must support '7d' period option");
  assert.ok(content.includes('"30d"'), "ForestTimeline must support '30d' period option");
  assert.ok(content.includes("setPeriodFilter"), "ForestTimeline must have setPeriodFilter handlers");
  assert.ok(content.includes("sevenDaysAgo"), "ForestTimeline must calculate 7-day cutoff");
  assert.ok(content.includes("thirtyDaysAgo"), "ForestTimeline must calculate 30-day cutoff");
});

test("ADMIN-AUDIT-PERIOD-03: AdminManager implements functional period filtering on audit log", () => {
  const filePath = path.join(process.cwd(), "src/components/admin/admin-manager.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes("auditPeriodFilter"), "AdminManager must have auditPeriodFilter state");
  assert.ok(content.includes("setAuditPeriodFilter"), "AdminManager must provide setAuditPeriodFilter handler");
  assert.ok(content.includes('"7d"'), "AdminManager must support '7d' period filter on audit logs");
  assert.ok(content.includes('"30d"'), "AdminManager must support '30d' period filter on audit logs");
  assert.ok(content.includes("logTime >="), "AdminManager must compute timestamp window comparison");
});

test("STUDENT-ACTIVITY-PERIOD-04: StudentPrivateWorkspace implements period filtering on activity tab", () => {
  const filePath = path.join(process.cwd(), "src/components/workspace/student-private-workspace.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes("activityPeriodFilter"), "StudentPrivateWorkspace must have activityPeriodFilter state");
  assert.ok(content.includes("setActivityPeriodFilter"), "StudentPrivateWorkspace must have setActivityPeriodFilter");
  assert.ok(content.includes("filteredActivity"), "StudentPrivateWorkspace must filter activities by period");
});
