/**
 * Groq Cloud Inference Provider (High-Throughput Neural Inference)
 *
 * Models: openai/gpt-oss-120b (primary) -> qwen/qwen3.8-27b (failover).
 * Features:
 * - In-flight concurrency limiting (prevents provider 429 throttling)
 * - Exponential backoff retry on transient 429 / 503 errors
 * - Grounding with real academic chunks retrieved via AcademicRetrievalService
 * - Server-side citation verification against authoritative sources
 * - Schema validation for generated drills and multiple choice quizzes
 */

import type { AIInferenceProvider, AIPlanGenerationResult } from "./interface.ts";
import type {
  AIPlanRequest,
  AIDrillRequest,
  AdaptiveDrill,
  AdaptiveDrillQuestion,
} from "../types.ts";
import type { Subject } from "@/types/database";
import { verifyCitationsAgainstRetrieved, type AcademicChunk } from "../academic-retrieval-service.ts";

// Concurrency gate to respect Groq rate limits
let activeGroqRequests = 0;
const MAX_CONCURRENT_GROQ = 2;

async function acquireGroqSlot(maxWaitMs = 6000): Promise<() => void> {
  const start = Date.now();
  while (activeGroqRequests >= MAX_CONCURRENT_GROQ) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error("Délai d'attente d'accès au modèle dépassé (concurrence saturée).");
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  activeGroqRequests++;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      activeGroqRequests = Math.max(0, activeGroqRequests - 1);
    }
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2
): Promise<Response> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status === 503) {
        if (attempt < retries) {
          const waitMs = 1000 * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise((r) => setTimeout(r, waitMs));
          attempt++;
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Nombre maximal de tentatives dépassé vers le fournisseur d'IA.");
}

export class GroqProvider implements AIInferenceProvider {
  readonly id = "groq-llama";
  readonly name = "Groq Cloud (GPT-OSS 120B)";

  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    this.model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateCoachingPlan(request: AIPlanRequest): Promise<AIPlanGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error("GROQ_API_KEY non configurée.");
    }

    const releaseSlot = await acquireGroqSlot();

    try {
      const { date, tasks, masteryList, freeSlots, workingHours } = request;

      const minimalTasks = tasks.slice(0, 10).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
        estimated_minutes: t.estimated_minutes,
        is_completed: t.is_completed,
      }));

      const minimalMastery = masteryList.slice(0, 5).map((m) => ({
        subject_id: m.subjectId,
        name: m.subjectName,
        accuracy: m.accuracyRate,
        urgency: m.urgencyLevel,
        days_since_review: m.daysSinceLastReview,
      }));

      const systemPrompt = `You are Validily AI, an expert academic coach and scheduler for INSAT software engineering students (IGL4).
You receive student availability windows (freeSlots), active tasks with deadlines, and academic mastery metrics.
Respond ONLY with a valid JSON object matching this schema:
{
  "overview": "Short 1-2 sentence executive summary of the day in French",
  "recommendations": [
    {
      "id": "rec-1",
      "type": "urgent_task" | "weak_point_drill" | "schedule_adjustment" | "break_recovery" | "spaced_review",
      "title": "Actionable title in French",
      "description": "Clear guidance in French",
      "reasoning": "Grounding reason based on factual deadline or mastery score",
      "priority": "high" | "medium" | "low",
      "relatedTaskId": "exact id from tasks or null",
      "relatedSubjectId": "exact id from subjects or null",
      "action": {
        "label": "Button text in French",
        "actionType": "schedule_block" | "start_drill" | "start_focus" | "view_task",
        "payload": {}
      }
    }
  ],
  "proposedSchedule": [
    {
      "tempId": "prop-1",
      "taskId": "exact taskId from tasks or null",
      "subjectId": "exact subjectId from subjects or null",
      "title": "Block title in French",
      "date": "${date}",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "durationMinutes": 45,
      "rationale": "Reason for this slot",
      "category": "revision" | "practice" | "deep_work" | "drill"
    }
  ]
}
IMPORTANT:
- Every proposed block MUST fit inside the provided freeSlots. NEVER schedule outside them.
- Reference ONLY real task IDs and subject IDs provided. NEVER invent IDs.`;

      const userPrompt = JSON.stringify({
        target_date: date,
        working_hours: workingHours,
        free_slots: freeSlots,
        tasks: minimalTasks,
        weak_points: minimalMastery,
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 1500,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 150)}`);
        }

        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("Réponse vide de Groq Cloud.");
        }

        const parsed = JSON.parse(content);
        return {
          overview: parsed.overview || "Planning d'étude généré par Validily AI",
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          proposedSchedule: Array.isArray(parsed.proposedSchedule) ? parsed.proposedSchedule : [],
          tokensUsed: json.usage?.total_tokens || 0,
        };
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      releaseSlot();
    }
  }

  async generateAdaptiveDrill(
    request: AIDrillRequest,
    mistakes: any[] = [],
    subjects: Subject[] = []
  ): Promise<AdaptiveDrill> {
    if (!this.isConfigured()) {
      throw new Error("GROQ_API_KEY non configurée.");
    }

    const releaseSlot = await acquireGroqSlot();

    try {
      const targetCount = Math.min(10, Math.max(1, request.targetCount || 3));
      const targetSub = subjects.find((s) => s.id === request.subjectId) || subjects[0];
      const subName = targetSub?.name || "Génie Logiciel & Architecture";
      const subId = targetSub?.id || "sub-default";
      const difficulty = request.preferredDifficulty || "intermediate";
      const targetDocTitle = request.targetDocTitle;

      const systemPrompt = `You are a university professor creating rigorous, grounded multiple-choice assessment questions for software engineering students (INSAT IGL4).
Subject: "${subName}"
${targetDocTitle ? `Target Document / Topic: "${targetDocTitle}"` : ""}
Target Difficulty: ${difficulty}
Generate exactly ${targetCount} multiple-choice questions.

Respond ONLY with a valid JSON object matching this schema:
{
  "questions": [
    {
      "id": "q1",
      "questionText": "Precise technical question in French",
      "options": [
        { "id": "opt1", "text": "Correct answer in French", "isCorrect": true },
        { "id": "opt2", "text": "Plausible wrong answer in French", "isCorrect": false },
        { "id": "opt3", "text": "Plausible wrong answer in French", "isCorrect": false },
        { "id": "opt4", "text": "Plausible wrong answer in French", "isCorrect": false }
      ],
      "explanation": "Precise explanation in French why the correct option is right"
    }
  ]
}
RULES:
1. Each question must have between 3 and 4 options, with EXACTLY ONE isCorrect = true.
2. Ground questions strictly in academic syllabus concepts. Never ask trivia or vague questions.`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "system", content: systemPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.25,
            max_tokens: 2000,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Groq API error ${res.status}`);
        }

        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content || "{}");

        // Schema validation & sanitization
        const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
        const validatedQuestions: AdaptiveDrillQuestion[] = [];

        for (let i = 0; i < rawQuestions.length && validatedQuestions.length < targetCount; i++) {
          const q = rawQuestions[i];
          if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) continue;

          // Ensure exactly one correct option
          const correctOpts = q.options.filter((o: any) => Boolean(o.isCorrect));
          if (correctOpts.length !== 1) continue;

          validatedQuestions.push({
            id: `rag-drill-q-${Date.now()}-${i}`,
            subjectId: subId,
            subjectName: subName,
            questionText: q.questionText.trim(),
            options: q.options.map((opt: any, optIdx: number) => ({
              id: opt.id || `opt-${optIdx + 1}`,
              text: (opt.text || "").trim(),
              isCorrect: Boolean(opt.isCorrect),
            })),
            explanation: q.explanation || "Explication technique fondée sur le cours.",
            difficulty,
            verified: true,
          });
        }

        if (validatedQuestions.length === 0) {
          throw new Error("Échec de validation du schéma des questions générées par l'IA.");
        }

        return {
          id: `drill-rag-${Date.now()}`,
          subjectId: subId,
          subjectName: subName,
          title: `Quiz Validily AI : ${targetDocTitle || subName}`,
          questions: validatedQuestions,
          generatedAt: new Date().toISOString(),
          source: "curriculum_bank",
        };
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      releaseSlot();
    }
  }

  async generateChatResponse(
    request: any,
    subjects: Subject[] = []
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error("GROQ_API_KEY non configurée.");
    }

    const releaseSlot = await acquireGroqSlot();

    try {
      const { messages, context, date, retrievedChunks = [] } = request;

      // Format retrieved academic chunks for strict grounding
      const formattedChunks = (retrievedChunks as AcademicChunk[])
        .slice(0, 6)
        .map(
          (c) =>
            `[DOCUMENT ID: ${c.sourceId}] (${c.sourceType.toUpperCase()} - ${c.title})\n${c.content.slice(0, 800)}`
        )
        .join("\n\n---\n\n");

      const systemPrompt = `You are Validily AI, an elite academic strategist and software engineering tutor for INSAT IGL4 students.
You respond with pedagogical depth, technical rigor, and supportive authority in French.

REAL-TIME ACADEMIC STATE:
- Date: ${date}
- Active tasks: ${JSON.stringify(context.tasks.slice(0, 8).map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, due_date: t.due_date, estimated_minutes: t.estimated_minutes })))}
- Available free slots today (${date}): ${JSON.stringify(context.freeSlots)}
- Weak subjects & accuracy: ${JSON.stringify(context.masteryList.slice(0, 6).map((m: any) => ({ id: m.subjectId, name: m.subjectName, accuracy: m.accuracyRate, score: m.masteryScore, attempts: m.totalAttempts })))}

AUTHORITATIVE ACADEMIC SOURCES RETRIEVED (RAG):
${formattedChunks || "Aucun document spécifique trouvé pour cette requête."}

BEHAVIORAL DIRECTIVES:
1. Grounding: Answer technical or academic questions using concepts from the retrieved documents and IGL4 software engineering curriculum. Cite real document IDs in 'citations'.
2. Honest Guidance: Never invent non-existent course notes or exams. If data is missing, recommend creating a task or note.
3. Action Proposals:
   - Schedule block: Pick an exact free slot from freeSlots and add to 'proposedSchedule'.
   - Quiz/Drill: If student wants to practice or test themselves, populate 'proposedDrill' with { "subjectId": "...", "subjectName": "...", "questionCount": 3, "reason": "..." }.

Respond ONLY with a valid JSON object:
{
  "reply": "Rich markdown response in French (headers ###, bullet points, bold key terms)",
  "citations": [ { "type": "document"|"note"|"task"|"calendar"|"assessment", "id": "exact-id-from-retrieved-or-context", "label": "Title", "detail": "Short context" } ],
  "recommendations": [],
  "proposedSchedule": [],
  "proposedDrill": null
}`;

      const modelsToTry = [this.model, "qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

      for (const currentModel of modelsToTry) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        try {
          const res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
              ],
              response_format: { type: "json_object" },
              temperature: 0.3,
              max_tokens: 2200,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            console.warn(`Groq model ${currentModel} returned ${res.status}. Tentative sur modèle alternatif...`);
            continue;
          }

          const json = await res.json();
          const content = json.choices?.[0]?.message?.content;
          const parsed = JSON.parse(content || "{}");

          // Ground citations: verify every citation against retrieved chunks + tasks
          const rawCitations = Array.isArray(parsed.citations) ? parsed.citations : [];
          const verifiedCitations = verifyCitationsAgainstRetrieved(rawCitations, retrievedChunks);

          return {
            reply: parsed.reply || "Analyse terminée.",
            citations: verifiedCitations,
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            proposedSchedule: Array.isArray(parsed.proposedSchedule) ? parsed.proposedSchedule : [],
            proposedDrill: parsed.proposedDrill || null,
            tokensUsed: json.usage?.total_tokens || 0,
          };
        } catch (err: any) {
          console.warn(`Groq model ${currentModel} attempt failed: ${err.message}`);
        } finally {
          clearTimeout(timeout);
        }
      }

      throw new Error("Tous les modèles Groq ont échoué ou sont actuellement saturés.");
    } finally {
      releaseSlot();
    }
  }
}
