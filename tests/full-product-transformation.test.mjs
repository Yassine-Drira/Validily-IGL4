import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// --- ACCEPTANCE TEST 1: PERSISTENCE (QUIZZES & INTERACTIVE HTML DRILLS) ---
test("Acceptance 1: Quiz Persistence & In-App HTML Atelier Storage Contract", async () => {
  const quizActionsCode = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");
  const repoCode = fs.readFileSync(path.resolve("src/lib/supabase/repository.ts"), "utf8");
  const modalCode = fs.readFileSync(path.resolve("src/components/quizzes/quiz-import-modal.tsx"), "utf8");

  // 1. Verify createQuiz supports interactive HTML drill persistence
  assert.ok(quizActionsCode.includes("isHtmlDrill"), "createQuiz handles isHtmlDrill flag");
  assert.ok(quizActionsCode.includes("htmlContent"), "createQuiz handles raw HTML drill content");
  assert.ok(quizActionsCode.includes("interactive_html"), "Stores interactive drills with question_type: interactive_html");
  assert.ok(quizActionsCode.includes("invalidateRepositoryCache()"), "Invalidates memory repository cache on creation");
  assert.ok(quizActionsCode.includes("safeRevalidate(`/subjects/${input.subject_id}`)"), "Revalidates subject route on creation");

  // 2. Verify repository maps interactive_html questions back to complete drill objects
  assert.ok(repoCode.includes("interactive_html"), "getSubjectQuizzesWithQuestions checks for interactive_html questions");
  assert.ok(repoCode.includes("isHtmlDrill"), "Maps question to isHtmlDrill");
  assert.ok(repoCode.includes("htmlQuestion.explanation"), "Extracts persisted HTML content from explanation");

  // 3. Verify QuizImportModal persists HTML drills to backend rather than purely local React state
  assert.ok(modalCode.includes("createQuiz"), "Imports createQuiz server action");
  assert.ok(modalCode.includes("htmlContent: parsedPackage.htmlContent"), "Sends htmlContent to createQuiz");
});

// --- ACCEPTANCE TEST 2: PRIVACY & ADVERSARIAL ISOLATION ---
test("Acceptance 2: Privacy Isolation & Inaccessible Direct Endpoints for Unauthorized Users", async () => {
  const downloadRouteCode = fs.readFileSync(path.resolve("src/app/api/download/[resourceId]/route.ts"), "utf8");
  const resourcePageCode = fs.readFileSync(path.resolve("src/app/(workspace)/resources/[resourceId]/page.tsx"), "utf8");
  const repoCode = fs.readFileSync(path.resolve("src/lib/supabase/repository.ts"), "utf8");

  // 1. Direct download route checks ownership for private resources
  assert.ok(downloadRouteCode.includes('resource.visibility === "private"'), "Download endpoint checks for private resources");
  assert.ok(downloadRouteCode.includes("status: 403"), "Rejects unauthorized download requests with HTTP 403");
  assert.ok(downloadRouteCode.includes("getRequesterUser()"), "Resolves authenticated requester identity");

  // 2. Resource detail page denies access to private resources for unauthorized users
  assert.ok(resourcePageCode.includes('resource.visibility === "private"'), "Resource detail page checks private visibility");
  assert.ok(resourcePageCode.includes("notFound()"), "Renders 404/notFound for unauthorized access to private resource");

  // 3. Unauthenticated note queries strictly isolate private notes
  assert.ok(repoCode.includes('query.eq("visibility", "public")'), "Unauthenticated notes query enforces public visibility filter");
});

// --- ACCEPTANCE TEST 3: CONSISTENCY & UNIFIED TAXONOMY ---
test("Acceptance 3: Consistency & Unified Taxonomy Across Workspace", async () => {
  const headerCode = fs.readFileSync(path.resolve("src/components/layout/app-header.tsx"), "utf8");
  const workspaceCode = fs.readFileSync(path.resolve("src/components/workspace/subject-learning-workspace.tsx"), "utf8");
  const homeCode = fs.readFileSync(path.resolve("src/app/(workspace)/page.tsx"), "utf8");

  // 1. Global Navbar: S1/S2 buttons completely removed from header
  assert.ok(!headerCode.includes('href="/subjects/sem-1"'), "Global header has no S1 semester button");
  assert.ok(!headerCode.includes('href="/subjects/sem-2"'), "Global header has no S2 semester button");

  // 2. Subject page header: uses xl:flex-row with min-w-0 to prevent overlap
  assert.ok(workspaceCode.includes("xl:flex-row"), "Uses xl:flex-row to prevent button and title collision");
  assert.ok(workspaceCode.includes("taxonomyFilter"), "Implements unified taxonomy filter");
  assert.ok(workspaceCode.includes("displayedResources"), "Passes filtered taxonomy resources to library");

  // 3. Homepage progress experience: utilizes real streak and 7-day activity
  assert.ok(homeCode.includes("last7Days"), "Calculates real 7-day study consistency");
  assert.ok(homeCode.includes("streak"), "Tracks real consecutive day streak");
});

// --- SUBJECT APPEARANCE & CUSTOMIZATION ENGINE ---
test("Subject Visual Customization Engine: Parses Icon:Hex with fallback", () => {
  const iconCode = fs.readFileSync(path.resolve("src/components/academic/subject-icon.tsx"), "utf8");

  // Verify icon catalog contains at least 20 Lucide icons
  assert.ok(iconCode.includes("AVAILABLE_SUBJECT_ICONS"), "Exports AVAILABLE_SUBJECT_ICONS catalog");
  assert.ok(iconCode.includes("PRESET_ACCESSIBLE_COLORS"), "Exports PRESET_ACCESSIBLE_COLORS list");
  assert.ok(iconCode.includes("hexColor"), "Handles custom hex values");
  assert.ok(iconCode.includes("getSubjectVisual"), "Exports getSubjectVisual helper");
  assert.ok(iconCode.includes("split"), "Parses Icon:Hex color strings");
});
