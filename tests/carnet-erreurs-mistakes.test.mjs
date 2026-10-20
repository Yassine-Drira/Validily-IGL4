import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("Carnet d'Erreurs Engine: Server Actions Contracts", () => {
  const quizActionsFile = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "actions", "quiz-actions.ts"),
    "utf-8"
  );

  // 1. Must export getStudentMistakes
  assert.ok(
    quizActionsFile.includes("export async function getStudentMistakes"),
    "quiz-actions must export getStudentMistakes"
  );

  // 2. Must export markMistakeAsResolved
  assert.ok(
    quizActionsFile.includes("export async function markMistakeAsResolved"),
    "quiz-actions must export markMistakeAsResolved"
  );

  // 3. Must export clearAllStudentMistakes
  assert.ok(
    quizActionsFile.includes("export async function clearAllStudentMistakes"),
    "quiz-actions must export clearAllStudentMistakes"
  );

  // 4. Must save mistakes to persistent store
  assert.ok(
    quizActionsFile.includes("__validily_mistakes_v1__"),
    "quiz-actions must persist mistakes to system note store"
  );

  // 5. Must query quiz_attempt_answers for backward compatibility
  assert.ok(
    quizActionsFile.includes("quiz_attempt_answers"),
    "quiz-actions must query attempt answers for DB-linked mistakes"
  );
});

test("Carnet d'Erreurs: Interactive HTML Runner Contracts", () => {
  const runnerFile = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "quizzes", "interactive-html-runner.tsx"),
    "utf-8"
  );

  // 1. Must capture mistakes from iframe messages
  assert.ok(
    runnerFile.includes("setCapturedMistakes"),
    "InteractiveHtmlRunner must store captured mistakes in state"
  );

  // 2. Must forward captured mistakes in submitQuizAttempt
  assert.ok(
    runnerFile.includes("mistakes: capturedMistakes"),
    "InteractiveHtmlRunner must forward captured mistakes to submitQuizAttempt"
  );
});

test("Carnet d'Erreurs: Student Private Workspace UI Presentation", () => {
  const workspaceFile = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "workspace", "student-private-workspace.tsx"),
    "utf-8"
  );

  // 1. Must render question text and explanation
  assert.ok(
    workspaceFile.includes("Carnet d&apos;Erreurs") || workspaceFile.includes("Carnet d'Erreurs"),
    "Workspace must render Carnet d'Erreurs section"
  );

  // 2. Must include mark as resolved action
  assert.ok(
    workspaceFile.includes("handleResolveMistake"),
    "Workspace must support resolving mistakes"
  );

  assert.ok(
    workspaceFile.includes("markMistakeAsResolved"),
    "Workspace must import markMistakeAsResolved server action"
  );
});
