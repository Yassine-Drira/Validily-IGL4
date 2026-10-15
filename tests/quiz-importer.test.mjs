import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  extractHtmlMetadata,
  injectSandboxShim,
  parseJsonQuiz,
  parseMarkdownQcm,
  detectAndParseQuizImport,
  SANDBOX_STORAGE_SHIM,
} from "../src/lib/quizzes/quiz-importer.ts";

test("HTML Import: Extracts title and meta description accurately", () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Systèmes Répartis — Examen Blanc</title>
  <meta name="description" content="Plateforme de révision interactive RMI et RPC.">
</head>
<body><h1>Test</h1></body>
</html>`;

  const meta = extractHtmlMetadata(sampleHtml);
  assert.equal(meta.title, "Systèmes Répartis — Examen Blanc");
  assert.equal(meta.description, "Plateforme de révision interactive RMI et RPC.");
});

test("HTML Import: Injects safe localStorage shim to prevent sandbox SecurityError", () => {
  const sampleHtml = `<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>`;
  const injected = injectSandboxShim(sampleHtml);

  assert.ok(injected.includes("validily-sandbox-shim"));
  assert.ok(injected.includes("window.localStorage = createShim()"));
  assert.ok(injected.includes("window.reportValidilyScore"));
});

test("HTML Import: Accurately identifies SAR-revision.html if present", () => {
  const sarPath = path.resolve(process.cwd(), "SAR-revision.html");
  if (fs.existsSync(sarPath)) {
    const sarHtml = fs.readFileSync(sarPath, "utf-8");
    const parsed = detectAndParseQuizImport(sarHtml, "SAR-revision.html");

    assert.equal(parsed.format, "html");
    assert.equal(parsed.title, "SAR — Révision Interactive");
    assert.ok(parsed.htmlContent.includes("validily-sandbox-shim"));
    assert.ok(parsed.description?.includes("RMI, REST, Kafka, RPC"));
  }
});

test("JSON Import: Parses standard array of questions with letters, indexes, and explanations", () => {
  const sampleJson = JSON.stringify([
    {
      question: "Quel protocole utilise Java RMI par défaut ?",
      options: ["JRMP", "HTTP/2", "SMTP", "SOAP"],
      answer: 0,
      explanation: "Java RMI utilise le protocole Java Remote Method Protocol (JRMP).",
    },
    {
      prompt: "Quel composant côté client effectue le marshalling en RPC ?",
      choices: ["Stub serveur", "Stub client", "Transport TCP", "Dispatcher"],
      correct_answer: "b",
      rationale: "Le stub client empaquette les arguments d'appel.",
    },
  ]);

  const result = parseJsonQuiz(sampleJson);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].question_text, "Quel protocole utilise Java RMI par défaut ?");
  assert.equal(result.questions[0].options[0].is_correct, true);
  assert.equal(result.questions[0].options[1].is_correct, false);

  assert.equal(result.questions[1].options[1].option_text, "Stub client");
  assert.equal(result.questions[1].options[1].is_correct, true);
  assert.equal(result.questions[1].explanation, "Le stub client empaquette les arguments d'appel.");
});

test("Markdown / Text QCM Import: Parses multiple choice questions with [x] markers", () => {
  const sampleMd = `
Question 1: Quelle est la fonction principale du registre RMI (rmiregistry) ?
a) Compiler les stubs
b) Associer un nom logique à une référence d'objet distant [x]
c) Chiffrer les communications TCP
Explication: Le rmiregistry fait office de serveur d'annuaire (Naming.bind/lookup).

Question 2: En Kafka, après consommation d'un message :
- Le message est immédiatement supprimé
- Le message reste jusqu'à expiration de la période de rétention [x]
- Le topic est réinitialisé
Explication: La rétention est par défaut de 7 jours.
`;

  const questions = parseMarkdownQcm(sampleMd);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].options.length, 3);
  assert.equal(questions[0].options[1].is_correct, true);
  assert.equal(questions[1].options[1].is_correct, true);
});
