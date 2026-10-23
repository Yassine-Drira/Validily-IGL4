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
  assert.ok(explorerCode.includes("updateUrl(category, type, sort, val, subjectId)"), "Must synchronize URL state seamlessly");
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
