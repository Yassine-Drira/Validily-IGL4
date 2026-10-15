import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { logAuditEvent, getRecentAuditLogs } from "../src/lib/audit/audit-logger.ts";

test("Multi-Question Quiz Authoring Contract: CreateQuizModal supports multi-question state", () => {
  const fileContent = fs.readFileSync(
    path.resolve("src/components/workspace/subject-learning-workspace.tsx"),
    "utf8"
  );

  assert.ok(fileContent.includes("interface AuthoringQuestion"), "Defines AuthoringQuestion interface");
  assert.ok(fileContent.includes("handleAddQuestion"), "Has add question handler");
  assert.ok(fileContent.includes("handleRemoveQuestion"), "Has remove question handler");
  assert.ok(fileContent.includes("activeQIndex"), "Manages active question tab navigation");
  assert.ok(fileContent.includes("payloadQuestions = questions.map"), "Maps all questions into createQuiz payload");
});

test("Continuity & Mistake Tracking: Query functions exported in quiz-actions.ts", () => {
  const quizActions = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");

  assert.ok(quizActions.includes("export async function getStudentQuizAttempts"), "Exports getStudentQuizAttempts");
  assert.ok(quizActions.includes("export async function getStudentMistakes"), "Exports getStudentMistakes");
  assert.ok(quizActions.includes("quiz_attempt_answers"), "Queries attempt answers for mistake tracking");
});

test("Audit Logger Security: Strips sensitive credentials and records action metadata", async () => {
  await logAuditEvent({
    actor_id: "test-user-123",
    action: "RESOURCE_UPLOAD",
    target_id: "res-456",
    target_type: "resource",
    metadata: {
      filename: "cours_dart.pdf",
      password_attempt: "super_secret_pw",
      bearer_token: "jwt.token.here",
      file_size_bytes: 1048576,
    },
  });

  const logs = getRecentAuditLogs(5);
  const matched = logs.find((l) => l.target_id === "res-456");

  assert.ok(matched, "Audit event logged in memory buffer");
  assert.equal(matched.actor_id, "test-user-123");
  assert.equal(matched.action, "RESOURCE_UPLOAD");
  assert.equal(matched.metadata.filename, "cours_dart.pdf");
  assert.equal(matched.metadata.password_attempt, undefined, "Passwords must be stripped");
  assert.equal(matched.metadata.bearer_token, undefined, "Tokens must be stripped");
  assert.equal(matched.metadata.file_size_bytes, 1048576);
});

test("Private Student Workspace: Page and components exist with clear isolation", () => {
  assert.ok(fs.existsSync(path.resolve("src/app/(workspace)/my-space/page.tsx")), "my-space route exists");
  assert.ok(fs.existsSync(path.resolve("src/components/workspace/student-private-workspace.tsx")), "workspace component exists");

  const componentCode = fs.readFileSync(path.resolve("src/components/workspace/student-private-workspace.tsx"), "utf8");
  assert.ok(componentCode.includes("Carnet d'Erreurs"), "Features mistake tracker");
  assert.ok(componentCode.includes("updateResourceVisibility"), "Features controlled sharing");
  assert.ok(componentCode.includes("isGuest"), "Handles guest continuity banner");
});

test("Saved Items Hub: Dedicated component with filters and bookmark removal", () => {
  assert.ok(fs.existsSync(path.resolve("src/components/bookmarks/saved-items-manager.tsx")), "SavedItemsManager component exists");
  
  const code = fs.readFileSync(path.resolve("src/components/bookmarks/saved-items-manager.tsx"), "utf8");
  assert.ok(code.includes("handleRemoveBookmark"), "Has bookmark removal action");
  assert.ok(code.includes("selectedType"), "Supports type filtering (PDF, Google Drive, Exams, Courses)");
  assert.ok(code.includes("selectedSubject"), "Supports subject filtering");
});

test("Homepage Architecture: Features 6-module command launchpad and real metrics", () => {
  const homeCode = fs.readFileSync(path.resolve("src/app/(workspace)/page.tsx"), "utf8");

  assert.ok(homeCode.includes("/subjects"), "Has Subjects link");
  assert.ok(homeCode.includes("/library"), "Has Library link");
  assert.ok(homeCode.includes("/quizzes"), "Has Quizzes link");
  assert.ok(homeCode.includes("/notes"), "Has Notes link");
  assert.ok(homeCode.includes("/bookmarks"), "Has Saved Items link");
  assert.ok(homeCode.includes("/my-space"), "Has Personal Workspace link");
  assert.ok(homeCode.includes("recentAttempt"), "Features Resume Last Activity widget");
});
