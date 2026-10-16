import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("Guard & Cache Isolation Contract: serverLogoutAction clears cookies and server caches", async (t) => {
  const logoutActionPath = path.join(rootDir, "src/lib/auth/logout-action.ts");
  assert.ok(fs.existsSync(logoutActionPath), "logout-action.ts must exist");

  const content = fs.readFileSync(logoutActionPath, "utf-8");
  assert.ok(content.includes("export async function serverLogoutAction"), "Must export serverLogoutAction");
  assert.ok(content.includes("invalidateRepositoryCache"), "Must invalidate repo memory cache on logout");
  assert.ok(content.includes("invalidateProfileCache"), "Must invalidate profile cache on logout");
  assert.ok(content.includes("cookieStore.delete"), "Must delete server-side session cookies on logout");
});

test("Guard & Cache Isolation Contract: AppHeader thoroughly purges client & server state on logout", (t) => {
  const appHeaderPath = path.join(rootDir, "src/components/layout/app-header.tsx");
  const content = fs.readFileSync(appHeaderPath, "utf-8");

  assert.ok(content.includes("serverLogoutAction()"), "handleLogout must call serverLogoutAction");
  assert.ok(content.includes("flushAuthCookiesClient()"), "handleLogout must call flushAuthCookiesClient");
  assert.ok(content.includes("localStorage.clear()"), "handleLogout must wipe localStorage to prevent cross-account leak");
  assert.ok(content.includes("sessionStorage.clear()"), "handleLogout must wipe sessionStorage");
  assert.ok(content.includes("user ? \"/library?action=upload\" : \"/login?next=/library?action=upload\""), "Upload button must redirect visitors to login");
});

test("Guard & Cache Isolation Contract: FocusProvider scopes stats strictly to user.id", (t) => {
  const focusProviderPath = path.join(rootDir, "src/components/focus/focus-provider.tsx");
  const content = fs.readFileSync(focusProviderPath, "utf-8");

  assert.ok(content.includes("validily_focus_${user.id}_${today}"), "Daily focus stats must be scoped by user.id");
  assert.ok(content.includes("validily_work_duration_${user.id}"), "Work duration must be scoped by user.id");
  assert.ok(content.includes("validily_tree_species_${user.id}"), "Tree species must be scoped by user.id");
  assert.ok(content.includes("if (!user?.id) {"), "Must guard unauthenticated stats loading");
  assert.ok(content.includes("setCompletedPomodoros(0)"), "Must reset completed pomodoros to 0 if not logged in");
  assert.ok(content.includes("setTotalFocusSecondsToday(0)"), "Must reset total focus seconds to 0 if not logged in");
});

test("Guard & Cache Isolation Contract: PersonalAnalyticsDashboard scopes goals & 7-day focus to user.id", (t) => {
  const dashboardPath = path.join(rootDir, "src/components/workspace/personal-analytics-dashboard.tsx");
  const content = fs.readFileSync(dashboardPath, "utf-8");

  assert.ok(content.includes("validily_focus_${user.id}_${d.dateStr}"), "7-day focus must read user-scoped key");
  assert.ok(content.includes("validily_goals_${user.id}"), "Goals must be saved under user-scoped key");
  assert.ok(!content.includes("validily_goals_${user?.id || \"guest\"}"), "Must eliminate shared guest goal key");
  assert.ok(content.includes("window.location.href = `/login?next="), "Attempting to save goals while unauthenticated must redirect to login");
});

test("Guard & Cache Isolation Contract: Unauthenticated visitors redirected on private pages", (t) => {
  // 1. /bookmarks
  const bookmarksPath = path.join(rootDir, "src/app/(workspace)/bookmarks/page.tsx");
  const bookmarksContent = fs.readFileSync(bookmarksPath, "utf-8");
  assert.ok(bookmarksContent.includes("redirect(\"/login?next=/bookmarks\")"), "/bookmarks must redirect unauthenticated visitors");

  // 2. /my-space
  const mySpacePath = path.join(rootDir, "src/app/(workspace)/my-space/page.tsx");
  const mySpaceContent = fs.readFileSync(mySpacePath, "utf-8");
  assert.ok(mySpaceContent.includes("redirect(\"/login?next=/my-space\")"), "/my-space must redirect unauthenticated visitors");

  // 3. /forest
  const forestPath = path.join(rootDir, "src/app/(workspace)/forest/page.tsx");
  const forestContent = fs.readFileSync(forestPath, "utf-8");
  assert.ok(forestContent.includes("window.location.href = \"/login?next=/forest\""), "/forest must redirect unauthenticated visitors");

  // 4. /notes?action=new
  const notesPath = path.join(rootDir, "src/app/(workspace)/notes/page.tsx");
  const notesContent = fs.readFileSync(notesPath, "utf-8");
  assert.ok(notesContent.includes("redirect(\"/login?next=/notes?action=new\")"), "action=new on /notes must redirect unauthenticated visitors");

  // 5. /library?action=upload
  const libraryPath = path.join(rootDir, "src/app/(workspace)/library/page.tsx");
  const libraryContent = fs.readFileSync(libraryPath, "utf-8");
  assert.ok(libraryContent.includes("action === \"upload\" && !requester"), "action=upload on /library must check requester");
  assert.ok(libraryContent.includes("redirect("), "action=upload must redirect unauthenticated visitors to login");
});

test("Guard & Cache Isolation Contract: Interactive action buttons redirect passive visitors", (t) => {
  // 1. CardBookmarkButton
  const cardBookmarkPath = path.join(rootDir, "src/components/academic/card-bookmark-button.tsx");
  const cardBookmarkContent = fs.readFileSync(cardBookmarkPath, "utf-8");
  assert.ok(cardBookmarkContent.includes("window.location.href = `/login?next="), "CardBookmarkButton must redirect on auth required");

  // 2. ResourceActionsBar
  const resActionsPath = path.join(rootDir, "src/components/resources/resource-actions-bar.tsx");
  const resActionsContent = fs.readFileSync(resActionsPath, "utf-8");
  assert.ok(resActionsContent.includes("router.push(`/login?next="), "ResourceActionsBar must redirect on auth required");

  // 3. FocusHubModal custom audio
  const focusHubPath = path.join(rootDir, "src/components/focus/focus-hub-modal.tsx");
  const focusHubContent = fs.readFileSync(focusHubPath, "utf-8");
  assert.ok(focusHubContent.includes("window.location.href = `/login?next="), "FocusHubModal must redirect on auth required");

  // 4. CommunityForestPage cheer
  const communityPath = path.join(rootDir, "src/app/(workspace)/forest/community/page.tsx");
  const communityContent = fs.readFileSync(communityPath, "utf-8");
  assert.ok(communityContent.includes("window.location.href = \"/login?next=/forest/community\""), "Community cheering must redirect visitors to login");
});
