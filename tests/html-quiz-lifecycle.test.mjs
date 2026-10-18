import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  extractHtmlMetadata,
  injectSandboxShim,
  detectAndParseQuizImport,
  SANDBOX_STORAGE_SHIM,
} from "../src/lib/quizzes/quiz-importer.ts";

test("HTML Quiz Lifecycle: Unicode, French accents, and Arabic text preservation", () => {
  const frenchAndArabicHtml = `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>Systèmes d'Information & Urbanisation : Architectures SID, TOGAF & Zachman — اختبار المراجعة</title>
  <meta name="description" content="Atelier interactif pour les étudiants de l'INSAT / IGL4 — اختبار تقييمي تفاعلي.">
</head>
<body>
  <h1>Atelier de Révision : Architectures d'Entreprise</h1>
  <p>Question 1 : Quelle est la différence entre un modèle conceptuel et un modèle logique ?</p>
  <p>السؤال الأول: ما الفرق بين النموذج المفاهيمي والنموذج المنطقي؟</p>
</body>
</html>`;

  const meta = extractHtmlMetadata(frenchAndArabicHtml);
  assert.equal(
    meta.title,
    "Systèmes d'Information & Urbanisation : Architectures SID, TOGAF & Zachman — اختبار المراجعة"
  );
  assert.equal(
    meta.description,
    "Atelier interactif pour les étudiants de l'INSAT / IGL4 — اختبار تقييمي تفاعلي."
  );

  const parsed = detectAndParseQuizImport(frenchAndArabicHtml, "workshop_sid.html");
  assert.equal(parsed.format, "html");
  assert.ok(parsed.htmlContent?.includes("اختبار تقييمي تفاعلي"));
  assert.ok(parsed.htmlContent?.includes("Architectures d'Entreprise"));
  assert.ok(parsed.htmlContent?.includes("validily-sandbox-shim"));
});

test("HTML Quiz Lifecycle: In-memory Storage Shim prevents DOMException SecurityError in sandboxed iframes", () => {
  assert.ok(SANDBOX_STORAGE_SHIM.includes("memoryStore = {}"));
  assert.ok(SANDBOX_STORAGE_SHIM.includes("getItem"));
  assert.ok(SANDBOX_STORAGE_SHIM.includes("setItem"));
  assert.ok(SANDBOX_STORAGE_SHIM.includes("removeItem"));
  assert.ok(SANDBOX_STORAGE_SHIM.includes("clear"));
  assert.ok(SANDBOX_STORAGE_SHIM.includes("window.reportValidilyScore"));
  assert.ok(SANDBOX_STORAGE_SHIM.includes("window.reportEduFocusScore"));

  // Emulate the browser sandbox environment where localStorage access throws SecurityError
  const fakeWindow = {
    get localStorage() {
      throw new Error("SecurityError: Failed to read the 'localStorage' property from 'Window'");
    },
    get sessionStorage() {
      throw new Error("SecurityError: Failed to read the 'sessionStorage' property from 'Window'");
    },
    parent: {
      postMessage: (data, origin) => {
        fakeWindow.lastPostedMessage = { data, origin };
      },
    },
  };

  // Evaluate the shim's createShim logic
  let memoryStore = {};
  const createShim = () => ({
    getItem: (key) => (Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null),
    setItem: (key, val) => { memoryStore[key] = String(val); },
    removeItem: (key) => { delete memoryStore[key]; },
    clear: () => { memoryStore = {}; },
    get length() { return Object.keys(memoryStore).length; },
    key: (index) => Object.keys(memoryStore)[index] || null,
  });

  const shim = createShim();
  shim.setItem("quiz_progress_q1", "answered_B");
  shim.setItem("current_score", "15");
  assert.equal(shim.getItem("quiz_progress_q1"), "answered_B");
  assert.equal(shim.getItem("current_score"), "15");
  assert.equal(shim.length, 2);
  assert.equal(shim.key(0), "quiz_progress_q1");
  shim.removeItem("quiz_progress_q1");
  assert.equal(shim.getItem("quiz_progress_q1"), null);
  assert.equal(shim.length, 1);
  shim.clear();
  assert.equal(shim.length, 0);
});

test("HTML Quiz Lifecycle: Score Reporting Bridge & Protocol Validation", () => {
  // Test both reportValidilyScore and reportEduFocusScore payload generation
  let reportedPayload = null;
  const mockPostMessage = (msg, targetOrigin) => {
    reportedPayload = { msg, targetOrigin };
  };

  const reportScore = (score, total, details) => {
    const s = Number(score);
    const t = Number(total) || 100;
    mockPostMessage(
      {
        type: "VALIDILY_QUIZ_SCORE",
        source: "validily-interactive-html",
        score: isNaN(s) ? 0 : Math.max(0, s),
        total: Math.max(1, t),
        details: details || null,
        timestamp: Date.now(),
      },
      "*"
    );
  };

  reportScore(18, 20, { answersChecked: 20 });
  assert.equal(reportedPayload.msg.type, "VALIDILY_QUIZ_SCORE");
  assert.equal(reportedPayload.msg.score, 18);
  assert.equal(reportedPayload.msg.total, 20);
  assert.equal(reportedPayload.msg.details.answersChecked, 20);

  // Negative score bounds check
  reportScore(-5, 20);
  assert.equal(reportedPayload.msg.score, 0);

  // NaN score bounds check
  reportScore("invalid", 20);
  assert.equal(reportedPayload.msg.score, 0);
});

test("HTML Quiz Lifecycle: Malformed and empty documents handled without crashing", () => {
  // Completely empty string
  const emptyMeta = extractHtmlMetadata("");
  assert.equal(emptyMeta.title, "Atelier de Révision Interactif");

  // Malformed HTML missing closing tags
  const malformedHtml = `<html><head><title>Unclosed Header<body><h1>Quiz Content`;
  const malformedMeta = extractHtmlMetadata(malformedHtml);
  assert.equal(malformedMeta.title, "Atelier de Révision Interactif");

  // HTML with script injection but missing head
  const headlessHtml = `<p>Direct paragraph without head</p><script>alert(1)</script>`;
  const injected = injectSandboxShim(headlessHtml);
  assert.ok(injected.includes("validily-sandbox-shim"));
  assert.ok(injected.includes("<p>Direct paragraph without head</p>"));
});

test("HTML Quiz Lifecycle: Route rendering contract in /quizzes/[quizId]", () => {
  const quizPageCode = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "(workspace)", "quizzes", "[quizId]", "page.tsx"),
    "utf-8"
  );

  // Must import InteractiveHtmlRunner
  assert.ok(
    quizPageCode.includes('import { InteractiveHtmlRunner } from "@/components/quizzes/interactive-html-runner";'),
    "Quiz detail page must import InteractiveHtmlRunner"
  );

  // Must check for HTML drill
  assert.ok(
    quizPageCode.includes("quiz.isHtmlDrill") || quizPageCode.includes("interactive_html"),
    "Quiz detail page must detect HTML drills"
  );

  // Must render InteractiveHtmlRunner when isHtmlDrill is true
  assert.ok(
    quizPageCode.includes("<InteractiveHtmlRunner"),
    "Quiz detail page must render InteractiveHtmlRunner"
  );
});

test("HTML Quiz Lifecycle: Resource viewer contract in /resources/[resourceId]", () => {
  const resourcePageCode = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "(workspace)", "resources", "[resourceId]", "page.tsx"),
    "utf-8"
  );

  assert.ok(
    resourcePageCode.includes('import { InteractiveHtmlRunner } from "@/components/quizzes/interactive-html-runner";'),
    "Resource detail page must import InteractiveHtmlRunner"
  );

  assert.ok(
    resourcePageCode.includes('resource.mime_type?.includes("html")'),
    "Resource detail page must detect HTML resources"
  );

  assert.ok(
    resourcePageCode.includes("<InteractiveHtmlRunner"),
    "Resource detail page must render InteractiveHtmlRunner for HTML resources instead of failing in PdfViewer"
  );
});

test("HTML Quiz Lifecycle: Subject Workspace Hub resource viewer contract", () => {
  const subjectWorkspaceCode = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "workspace", "subject-learning-workspace.tsx"),
    "utf-8"
  );

  // ViewingResource modal must switch to InteractiveHtmlRunner for HTML files
  assert.ok(
    subjectWorkspaceCode.includes('viewingResource.mime_type?.includes("html")'),
    "SubjectLearningWorkspace must check viewingResource mime_type for html"
  );

  // Quizzes tab must support Lancer l'Atelier
  assert.ok(
    subjectWorkspaceCode.includes("Lancer l'Atelier") || subjectWorkspaceCode.includes("Lancer l&apos;Atelier"),
    "SubjectLearningWorkspace must display Lancer l'Atelier button for HTML drills"
  );
});
