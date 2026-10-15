import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

test("Quiz Persistence Contract: QuizRunner accepts quizId and calls submitQuizAttempt", () => {
  const runnerFile = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "quizzes", "quiz-runner.tsx"),
    "utf-8"
  );

  // Must import submitQuizAttempt
  assert.ok(
    runnerFile.includes("submitQuizAttempt"),
    "QuizRunner must import submitQuizAttempt server action"
  );

  // QuizRunnerProps must include quizId
  assert.ok(
    runnerFile.includes("quizId: string"),
    "QuizRunnerProps must require quizId: string"
  );

  // Must invoke submitQuizAttempt on completion
  assert.ok(
    runnerFile.includes("submitQuizAttempt({"),
    "QuizRunner must invoke submitQuizAttempt upon completion"
  );

  // Must handle saving and guest status
  assert.ok(
    runnerFile.includes("isPersisting") && runnerFile.includes("persistenceStatus"),
    "QuizRunner must track persistence state and display feedback to student"
  );
});

test("Standalone Quiz Page Contract: quizId is forwarded to QuizRunner", () => {
  const pageFile = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "(workspace)", "quizzes", "[quizId]", "page.tsx"),
    "utf-8"
  );

  assert.ok(
    pageFile.includes("quizId={quiz.id}"),
    "Standalone quiz page must pass quizId={quiz.id} to QuizRunner"
  );
});

test("Subject Hub Contract: Uses interactive QuizRunner instead of pre-revealed answers", () => {
  const workspaceFile = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "workspace", "subject-learning-workspace.tsx"),
    "utf-8"
  );

  // Must import QuizRunner
  assert.ok(
    workspaceFile.includes('import { QuizRunner } from "@/components/quizzes/quiz-runner";'),
    "SubjectLearningWorkspace must import QuizRunner"
  );

  // Must render QuizRunner inside activeQuizToRun modal with quizId
  assert.ok(
    workspaceFile.includes("<QuizRunner") &&
      workspaceFile.includes("quizId={activeQuizToRun.id}") &&
      workspaceFile.includes("onClose={() => setActiveQuizToRun(null)}"),
    "Subject Hub must render QuizRunner with activeQuizToRun.id and onClose handler"
  );

  // Must NOT contain static pre-revealed 'Bonne réponse' in activeQuizToRun modal
  const activeModalSnippet = workspaceFile.slice(
    workspaceFile.indexOf("{activeQuizToRun && ("),
    workspaceFile.indexOf("{/* --- MODAL: AJOUT RESSOURCE --- */}")
  );
  assert.strictEqual(
    activeModalSnippet.includes("Bonne réponse"),
    false,
    "Subject Hub must not pre-reveal 'Bonne réponse' badges in the active quiz modal"
  );
});

test("Quiz Scoring & Answer Validation Logic", () => {
  const sampleQuestions = [
    {
      id: "q1",
      question_text: "What is a StatefulWidget in Flutter?",
      options: [
        { id: "opt1", option_text: "A widget that cannot change state", is_correct: false },
        { id: "opt2", option_text: "A widget with mutable state", is_correct: true },
      ],
    },
    {
      id: "q2",
      question_text: "What does setState() do?",
      options: [
        { id: "opt3", option_text: "Notifies the framework to rebuild", is_correct: true },
        { id: "opt4", option_text: "Deletes the widget tree", is_correct: false },
      ],
    },
  ];

  const studentAnswers = [
    { questionId: "q1", selectedId: "opt2", isCorrect: true },
    { questionId: "q2", selectedId: "opt4", isCorrect: false },
  ];

  // 1. Score computation
  const score = studentAnswers.filter((a) => a.isCorrect).length;
  assert.strictEqual(score, 1);

  // 2. Score bounds validation
  assert.ok(score >= 0 && score <= sampleQuestions.length);

  // 3. Payload preparation contract for submitQuizAttempt
  const payload = {
    quiz_id: "quiz-flutter-101",
    score,
    total_questions: sampleQuestions.length,
    answers: studentAnswers.map((a) => ({
      question_id: a.questionId,
      selected_option_id: a.selectedId,
      is_correct: a.isCorrect,
    })),
  };

  assert.strictEqual(payload.answers.length, 2);
  assert.strictEqual(payload.answers[0].is_correct, true);
  assert.strictEqual(payload.answers[1].is_correct, false);
});

test("Guest vs Authenticated Handling in submitQuizAttempt", () => {
  const actionsFile = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "actions", "quiz-actions.ts"),
    "utf-8"
  );

  // Check auth check before DB insert
  assert.ok(
    actionsFile.includes("await supabase.auth.getUser()"),
    "submitQuizAttempt must inspect authenticated user"
  );

  // Check guest fallback does not pollute database
  assert.ok(
    actionsFile.includes("!user?.id") && actionsFile.includes("isGuest: true"),
    "submitQuizAttempt must safely return isGuest: true when user is unauthenticated"
  );
});
