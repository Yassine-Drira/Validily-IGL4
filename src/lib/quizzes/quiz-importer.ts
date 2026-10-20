/**
 * quiz-importer.ts
 * Intelligent multi-format parser for instant quiz and interactive workshop imports.
 * Supports:
 * 1. Interactive HTML documents (auto-extracts title, meta description, and embeds safely)
 * 2. JSON structured QCM formats (OpenAI, Claude, EduFocus, or custom schemas)
 * 3. Markdown / Plain Text QCM formats
 */

export interface ParsedOption {
  option_text: string;
  is_correct: boolean;
}

export interface ParsedQuestion {
  question_text: string;
  explanation?: string;
  options: ParsedOption[];
}

export interface ParsedQuizPackage {
  format: "html" | "json" | "markdown_qcm";
  title: string;
  description?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  htmlContent?: string;
  questions?: ParsedQuestion[];
  rawCount?: number;
}

/**
 * Extracts title from HTML content (<title>...</title>)
 */
export function extractHtmlMetadata(html: string): {
  title: string;
  description?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  subject?: string;
  totalQuestions?: number;
  targetDurationMinutes?: number;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Atelier de Révision Interactif";

  function getMeta(name: string): string | undefined {
    const pattern = new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=(?:"([^"]*)"|'([^']*)')|<meta[^>]*content=(?:"([^"]*)"|'([^']*)')[^>]*name=["']${name}["']`,
      "i"
    );
    const m = html.match(pattern);
    if (!m) return undefined;
    const val = m[1] || m[2] || m[3] || m[4];
    return val ? val.trim() : undefined;
  }

  const description = getMeta("description");

  const rawDiff = getMeta("difficulty")?.toLowerCase();
  let difficulty: "beginner" | "intermediate" | "advanced" | undefined;
  if (rawDiff) {
    if (rawDiff === "beginner" || rawDiff === "facile" || rawDiff === "debutant") difficulty = "beginner";
    else if (rawDiff === "advanced" || rawDiff === "difficile" || rawDiff === "avance") difficulty = "advanced";
    else difficulty = "intermediate";
  }

  const subject = getMeta("subject");

  const rawCount = getMeta("total-questions");
  const totalQuestions = rawCount ? parseInt(rawCount, 10) : undefined;

  const rawDur = getMeta("target-duration");
  const targetDurationMinutes = rawDur ? parseInt(rawDur, 10) : undefined;

  return { title, description, difficulty, subject, totalQuestions, targetDurationMinutes };
}

/**
 * Safe in-memory Storage polyfill script to inject into sandboxed iframes.
 * Prevents DOMException SecurityError when the sandbox has null origin.
 */
export const SANDBOX_STORAGE_SHIM = `
<script id="validily-sandbox-shim">
(function() {
  if (window.__validily_shim_installed) return;
  window.__validily_shim_installed = true;
  var memoryStore = {};
  var createShim = function() {
    return {
      getItem: function(key) {
        return memoryStore.hasOwnProperty(key) ? memoryStore[key] : null;
      },
      setItem: function(key, val) {
        memoryStore[key] = String(val);
      },
      removeItem: function(key) {
        delete memoryStore[key];
      },
      clear: function() {
        memoryStore = {};
      },
      get length() {
        return Object.keys(memoryStore).length;
      },
      key: function(index) {
        var keys = Object.keys(memoryStore);
        return keys[index] || null;
      }
    };
  };

  // Safely shim localStorage
  try {
    var testLS = window.localStorage;
    if (!testLS || typeof testLS.getItem !== 'function') throw new Error('invalid');
    testLS.getItem('__validily_probe');
  } catch(e) {
    try {
      window.localStorage = createShim();
    } catch(err1) {
      try {
        Object.defineProperty(window, 'localStorage', {
          value: createShim(),
          writable: true,
          configurable: true
        });
      } catch(err2) {}
    }
  }

  // Safely shim sessionStorage
  try {
    var testSS = window.sessionStorage;
    if (!testSS || typeof testSS.getItem !== 'function') throw new Error('invalid');
    testSS.getItem('__validily_probe');
  } catch(e) {
    try {
      window.sessionStorage = createShim();
    } catch(err1) {
      try {
        Object.defineProperty(window, 'sessionStorage', {
          value: createShim(),
          writable: true,
          configurable: true
        });
      } catch(err2) {}
    }
  }

  // Provide a bridge helper for completion events with rich telemetry
  var reportScore = function(score, total, extra) {
    if (window.parent && window.parent !== window) {
      var payload = {
        type: 'VALIDILY_QUIZ_COMPLETED',
        score: Number(score),
        total: Number(total || 20),
        percentage: Math.round((Number(score) / (Number(total) || 1)) * 100)
      };
      if (extra && typeof extra === 'object') {
        if (extra.timeSpentSeconds) payload.timeSpentSeconds = Number(extra.timeSpentSeconds);
        if (extra.mistakesCount !== undefined) payload.mistakesCount = Number(extra.mistakesCount);
        if (extra.flashcardsReviewed !== undefined) payload.flashcardsReviewed = Number(extra.flashcardsReviewed);
        if (extra.mistakes && Array.isArray(extra.mistakes)) payload.mistakes = extra.mistakes;
        if (extra.answers && Array.isArray(extra.answers)) payload.answers = extra.answers;
        if (extra.details) payload.details = extra.details;
      }
      window.parent.postMessage(payload, '*');
    }
  };

  window.reportValidilyScore = reportScore;
  window.reportEduFocusScore = reportScore;
})();
</script>
`;

/**
 * Injects the in-memory storage shim into an HTML document.
 */
export function injectSandboxShim(html: string): string {
  if (html.includes("validily-sandbox-shim")) {
    return html;
  }

  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n${SANDBOX_STORAGE_SHIM}`);
  }

  if (html.includes("<html")) {
    return html.replace(/<html[^>]*>/, `$&<head>${SANDBOX_STORAGE_SHIM}</head>`);
  }

  return `${SANDBOX_STORAGE_SHIM}\n${html}`;
}

/**
 * Parses JSON structured QCM questions.
 * Tolerant to multiple AI formats:
 * - questions array or top-level array
 * - options as strings or objects
 * - answer as index, letter ('A', 'B'), or text match
 */
export function parseJsonQuiz(jsonStr: string): { title?: string; questions: ParsedQuestion[] } {
  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    // If wrapped in markdown ```json ... ```, strip it
    const clean = jsonStr.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    data = JSON.parse(clean);
  }

  let items: any[] = [];
  let title: string | undefined;

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    title = data.title || data.quizTitle || data.name;
    if (Array.isArray(data.questions)) {
      items = data.questions;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data.qcm)) {
      items = data.qcm;
    }
  }

  const questions: ParsedQuestion[] = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    if (!raw || typeof raw !== "object") continue;

    const questionText = raw.question || raw.question_text || raw.prompt || raw.title || `Question ${i + 1}`;
    const explanation = raw.explanation || raw.rationale || raw.detail || undefined;

    let rawOptions: any[] = [];
    if (Array.isArray(raw.options)) {
      rawOptions = raw.options;
    } else if (Array.isArray(raw.choices)) {
      rawOptions = raw.choices;
    } else if (raw.choices && typeof raw.choices === "object") {
      rawOptions = Object.entries(raw.choices).map(([k, v]) => ({ key: k, text: String(v) }));
    }

    const correctIndicator = raw.answer ?? raw.correct_answer ?? raw.correctAnswer ?? raw.correct ?? raw.solution;

    const options: ParsedOption[] = [];

    for (let oIdx = 0; oIdx < rawOptions.length; oIdx++) {
      const opt = rawOptions[oIdx];
      let optText = "";
      let isCorrect = false;

      if (typeof opt === "string") {
        optText = opt.trim();
        if (typeof correctIndicator === "number") {
          isCorrect = correctIndicator === oIdx || correctIndicator === oIdx + 1; // supports 0-based or 1-based
        } else if (typeof correctIndicator === "string") {
          const letterIndex = "abcd".indexOf(correctIndicator.trim().toLowerCase());
          if (letterIndex !== -1 && letterIndex === oIdx) {
            isCorrect = true;
          } else if (correctIndicator.trim().toLowerCase() === optText.toLowerCase()) {
            isCorrect = true;
          }
        }
      } else if (opt && typeof opt === "object") {
        optText = opt.text || opt.option_text || opt.value || String(opt.label || `Option ${oIdx + 1}`);
        if (typeof opt.is_correct === "boolean") {
          isCorrect = opt.is_correct;
        } else if (opt.key && typeof correctIndicator === "string") {
          isCorrect = String(opt.key).toLowerCase() === correctIndicator.toLowerCase();
        } else if (typeof correctIndicator === "number") {
          isCorrect = correctIndicator === oIdx;
        }
      }

      if (optText) {
        options.push({
          option_text: optText,
          is_correct: isCorrect,
        });
      }
    }

    // Safety: if no option marked correct, mark the first one as a sensible fallback
    if (options.length > 0 && !options.some((o) => o.is_correct)) {
      options[0].is_correct = true;
    }

    if (options.length >= 2) {
      questions.push({
        question_text: questionText,
        explanation,
        options,
      });
    }
  }

  return { title, questions };
}

/**
 * Parses Markdown / Plain Text QCM formats:
 * Q: Question text
 * A) Option 1
 * B) Option 2 [x] (or *)
 * C) Option 3
 * Explication: ...
 */
export function parseMarkdownQcm(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const blocks = text.split(/\n\s*(?:(?:Q|Question)\s*[:\d.]+|##+\s*Question|\d+[\).]\s+)/i).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const questionText = lines[0].replace(/^(?:Q\s*[:.-]|\d+[\).])\s*/i, "");
    let explanation: string | undefined;
    const options: ParsedOption[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:Explication|Explanation|Note)\s*:/i.test(line)) {
        explanation = line.replace(/^(?:Explication|Explanation|Note)\s*:\s*/i, "");
        continue;
      }

      const optMatch = line.match(/^(?:[-*]|\([a-zA-Z\d]\)|[a-zA-Z\d][\).])\s*(.*)$/);
      if (optMatch) {
        let content = optMatch[1].trim();
        let isCorrect = false;

        if (/\[x\]|\(correct\)|\*$/i.test(content)) {
          isCorrect = true;
          content = content.replace(/\s*(?:\[x\]|\(correct\)|\*)$/i, "").trim();
        }

        if (content) {
          options.push({ option_text: content, is_correct: isCorrect });
        }
      }
    }

    if (options.length >= 2) {
      if (!options.some((o) => o.is_correct)) {
        options[0].is_correct = true;
      }
      questions.push({
        question_text: questionText,
        explanation,
        options,
      });
    }
  }

  return questions;
}

/**
 * Universal auto-detection and import entrypoint
 */
export function detectAndParseQuizImport(rawContent: string, filename?: string): ParsedQuizPackage {
  const trimmed = rawContent.trim();
  const lowerFile = (filename || "").toLowerCase();

  // 1. Check if HTML
  if (
    lowerFile.endsWith(".html") ||
    lowerFile.endsWith(".htm") ||
    trimmed.startsWith("<!DOCTYPE html") ||
    /<html[\s>]/i.test(trimmed)
  ) {
    const meta = extractHtmlMetadata(trimmed);
    return {
      format: "html",
      title: meta.title,
      description: meta.description || "Atelier interactif complet importé (flashcards, QCM avec minuteur, guides).",
      htmlContent: injectSandboxShim(trimmed),
      difficulty: meta.difficulty || "intermediate",
    };
  }

  // 2. Check if JSON
  if (
    lowerFile.endsWith(".json") ||
    trimmed.startsWith("[") ||
    (trimmed.startsWith("{") && !trimmed.startsWith("<!"))
  ) {
    try {
      const parsed = parseJsonQuiz(trimmed);
      return {
        format: "json",
        title: parsed.title || "Série de QCM Importée",
        questions: parsed.questions,
        rawCount: parsed.questions.length,
        difficulty: "intermediate",
      };
    } catch {
      // Fall through to markdown
    }
  }

  // 3. Fallback to Markdown / Text QCM
  const mdQuestions = parseMarkdownQcm(trimmed);
  return {
    format: "markdown_qcm",
    title: filename?.replace(/\.[^/.]+$/, "") || "Série de Questions QCM",
    questions: mdQuestions,
    rawCount: mdQuestions.length,
    difficulty: "intermediate",
  };
}
