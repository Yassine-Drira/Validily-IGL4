import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("MOBILE-UX-01: globals.css supports prefers-reduced-motion and touch momentum scrolling", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf-8");
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "Must support prefers-reduced-motion");
  assert.ok(css.includes("animation-duration: 0.01ms"), "Must shorten animations for reduced motion users");
  assert.ok(css.includes(".touch-scroll"), "Must define touch-scroll momentum utility");
  assert.ok(css.includes("-webkit-overflow-scrolling: touch"), "Must enable native iOS momentum scrolling");
});

test("MOBILE-UX-02: app-header.tsx provides ergonomic touch targets and uncluttered mobile header", () => {
  const headerCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/app-header.tsx"), "utf-8");
  assert.ok(headerCode.includes("min-w-[40px] min-h-[40px]"), "Menu button must meet 40px+ touch target standard");
  assert.ok(headerCode.includes("hidden sm:inline-flex"), "Upload button must hide on small screens to prevent header crowding");
  assert.ok(headerCode.includes("min-h-[40px]"), "User profile button must have ergonomic tap target");
});

test("MOBILE-UX-03: app-sidebar.tsx offers fast 1-tap document upload in mobile drawer", () => {
  const sidebarCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/app-sidebar.tsx"), "utf-8");
  assert.ok(sidebarCode.includes("Mobile Fast Action"), "Drawer must include fast mobile action bar");
  assert.ok(sidebarCode.includes("/library?action=upload"), "Must provide direct upload route access");
  assert.ok(sidebarCode.includes("Ajouter un document"), "Must display clear upload call-to-action");
});

test("MOBILE-UX-04: library-explorer.tsx features instant 0ms in-memory search bar", () => {
  const explorerCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/resources/library-explorer.tsx"), "utf-8");
  assert.ok(explorerCode.includes("Instant Search Bar (0ms In-Memory Filter)"), "Must include instant search bar");
  assert.ok(explorerCode.includes("handleClearSearch"), "Must support 1-tap clear button");
  assert.ok(explorerCode.includes("updateUrlDebounced(category, type, sort, val, subjectId"), "Must synchronize URL state seamlessly with debouncing");
});

test("MOBILE-UX-05: planner/page.tsx eliminates redundant nested container padding", () => {
  const plannerCode = fs.readFileSync(path.resolve(process.cwd(), "src/app/(workspace)/planner/page.tsx"), "utf-8");
  assert.ok(!plannerCode.includes("container max-w-7xl mx-auto px-4"), "Must not duplicate WorkspaceShell container padding");
  assert.ok(plannerCode.includes('<div className="space-y-6">'), "Must use clean un-nested space-y-6 layout");
});

test("MOBILE-UX-06: academic-calendar-view.tsx session modal is scrollable and mobile-safe", () => {
  const calCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/planner/academic-calendar-view.tsx"), "utf-8");
  assert.ok(calCode.includes("overflow-y-auto"), "Modal backdrop must support overflow-y-auto");
  assert.ok(calCode.includes("max-h-[92vh] overflow-y-auto"), "Modal body must be scrollable within 92vh on mobile viewports");
});

test("MOBILE-UX-07: resource cards and bookmark buttons satisfy mobile tap ergonomics", () => {
  const cardCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/academic/resource-card.tsx"), "utf-8");
  const bookmarkCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/academic/card-bookmark-button.tsx"), "utf-8");
  assert.ok(cardCode.includes("min-h-[36px]"), "Consulter and download buttons must have minimum 36px tap height");
  assert.ok(bookmarkCode.includes("min-h-[36px] min-w-[36px]"), "Bookmark button must have minimum 36px square tap target");
});

test("MOBILE-UX-08: tree-detail-modal.tsx is scrollable and mobile-safe with tactile close", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/forest/tree-detail-modal.tsx"), "utf-8");
  assert.ok(code.includes("max-h-[92vh] overflow-y-auto"), "Tree detail modal must have max-h-[92vh] scrollable body");
  assert.ok(code.includes("min-w-[36px] min-h-[36px]"), "Close button must meet 36px minimum touch target");
  assert.ok(code.includes("min-h-[40px]"), "Footer close button must have 40px touch height");
});

test("MOBILE-UX-09: focus-hub-modal.tsx has scrollable overlay and touch-scroll momentum", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/focus/focus-hub-modal.tsx"), "utf-8");
  assert.ok(code.includes("overflow-y-auto"), "Focus modal overlay must have overflow-y-auto");
  assert.ok(code.includes("touch-scroll"), "Focus modal body must include touch-scroll");
  assert.ok(code.includes("min-w-[36px] min-h-[36px]"), "Close button must meet 36px touch target");
});

test("MOBILE-UX-10: quiz-runner.tsx provides 44px touch targets and tactile feedback", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/quizzes/quiz-runner.tsx"), "utf-8");
  assert.ok(code.includes("min-h-[44px]"), "Quiz options must meet 44px mobile touch target standard");
  assert.ok(code.includes("min-h-[40px] px-5 active:scale-95"), "Submit and Next buttons must have 40px height with tactile feedback");
});

test("MOBILE-UX-11: quiz-import-modal.tsx prevents viewport overflow on narrow screens", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/quizzes/quiz-import-modal.tsx"), "utf-8");
  assert.ok(code.includes("max-h-[92vh] overflow-y-auto"), "Quiz import modal must have max-h-[92vh] scrollable body");
  assert.ok(code.includes("min-w-[36px] min-h-[36px]"), "Close button must meet 36px touch target");
});

test("MOBILE-UX-12: admin tables enforce touch-scroll for iOS momentum scrolling", () => {
  const adminManager = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/admin-manager.tsx"), "utf-8");
  const adminVip = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/admin-vip-manager.tsx"), "utf-8");
  const adminStudents = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/admin-students-view.tsx"), "utf-8");
  assert.ok(adminManager.includes("overflow-x-auto touch-scroll"), "Admin manager must use touch-scroll on tables");
  assert.ok(adminVip.includes("overflow-x-auto touch-scroll"), "Admin VIP manager must use touch-scroll on tables");
  assert.ok(adminStudents.includes("overflow-x-auto touch-scroll"), "Admin students view must use touch-scroll on tables");
});

test("MOBILE-UX-13: library-explorer.tsx debounces URL updates and synchronizes props", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/resources/library-explorer.tsx"), "utf-8");
  assert.ok(code.includes("updateUrlDebounced"), "Must debounce URL history replacement");
  assert.ok(code.includes("setCategory(initialCategory)"), "Must synchronize category prop on navigation");
  assert.ok(code.includes("setSubjectId(initialSubjectId)"), "Must synchronize subjectId prop on navigation");
});

test("MOBILE-UX-14: timeblock-event-card.tsx completion checkbox and action buttons have safe touch bounds", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/planner/timeblock-event-card.tsx"), "utf-8");
  assert.ok(code.includes("min-w-[26px] min-h-[26px]"), "Checkbox and action buttons must have minimum 26px touch box");
  assert.ok(code.includes("active:scale-90"), "Must have tactile feedback on tap");
});

test("MOBILE-UX-15: library-explorer.tsx renders pagination with page size selector and touch targets", () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), "src/components/resources/library-explorer.tsx"), "utf-8");
  assert.ok(code.includes("pagedResources"), "Must slice filteredResources into pagedResources");
  assert.ok(code.includes("Pagination des ressources"), "Must render accessible pagination navigation");
  assert.ok(code.includes("handlePageChange"), "Must support direct and incremental page navigation");
  assert.ok(code.includes("handlePageSizeChange"), "Must support configurable page size selector");
  assert.ok(code.includes("min-h-[36px]"), "Pagination buttons must meet 36px touch target");
});

test("MOBILE-UX-16: repository.ts exports getPaginatedResources with range slicing and pagination metadata", async () => {
  const repo = await import("../src/lib/supabase/repository.ts");
  assert.ok(typeof repo.getPaginatedResources === "function", "Must export getPaginatedResources function");
  const result = await repo.getPaginatedResources({ page: 1, pageSize: 6 });
  assert.ok(Array.isArray(result.resources), "Must return resources array");
  assert.strictEqual(typeof result.totalCount, "number", "Must return numeric totalCount");
  assert.strictEqual(typeof result.totalPages, "number", "Must return numeric totalPages");
  assert.strictEqual(typeof result.hasMore, "boolean", "Must return boolean hasMore");
  assert.ok(result.resources.length <= 6, "Must respect pageSize boundary");
});



