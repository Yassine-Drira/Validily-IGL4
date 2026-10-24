/**
 * Google Gemini Flash Provider (Free Tier API)
 * Low latency, generous free tier (15 RPM / 1M TPM), native JSON mode.
 */

import type { AIInferenceProvider, AIPlanGenerationResult } from "./interface.ts";
import type {
  AIPlanRequest,
  AIDrillRequest,
  AdaptiveDrill,
} from "../types.ts";
import type { Subject } from "@/types/database";

export class GeminiProvider implements AIInferenceProvider {
  readonly id = "gemini-flash";
  readonly name = "Google Gemini Flash";

  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "";
    this.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY !== undefined ? process.env.GEMINI_API_KEY : this.apiKey;
    return Boolean(key && key.trim().length > 0);
  }

  async generateCoachingPlan(request: AIPlanRequest): Promise<AIPlanGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error("GEMINI_API_KEY not configured.");
    }

    const { date, tasks, masteryList, freeSlots, workingHours } = request;

    const systemPrompt = `You are an academic coach and scheduler for university students.
Generate a cohesive daily study plan adhering strictly to the provided free slots.
Return JSON with this structure:
{
  "overview": "Short summary",
  "recommendations": [
    {
      "id": "rec-1",
      "type": "urgent_task" | "weak_point_drill" | "schedule_adjustment",
      "title": "Action title",
      "description": "Short explanation",
      "reasoning": "Factual why",
      "priority": "high" | "medium" | "low",
      "relatedTaskId": "task id from input or null",
      "relatedSubjectId": "subject id from input or null",
      "action": { "label": "Button", "actionType": "schedule_block" }
    }
  ],
  "proposedSchedule": [
    {
      "tempId": "prop-1",
      "taskId": "task id or null",
      "subjectId": "subject id or null",
      "title": "Title",
      "date": "${date}",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "durationMinutes": 45,
      "rationale": "Why",
      "category": "deep_work"
    }
  ]
}`;

    const promptPayload = {
      target_date: date,
      working_hours: workingHours,
      free_slots: freeSlots,
      tasks: tasks.slice(0, 10).map((t) => ({ id: t.id, title: t.title, priority: t.priority, due_date: t.due_date })),
      weak_points: masteryList.slice(0, 5).map((m) => ({ id: m.subjectId, name: m.subjectName, accuracy: m.accuracyRate })),
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: JSON.stringify(promptPayload) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 1500,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini Flash");

      const parsed = JSON.parse(rawText);
      return {
        overview: parsed.overview || "Planning académique Gemini Flash",
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        proposedSchedule: Array.isArray(parsed.proposedSchedule) ? parsed.proposedSchedule : [],
        tokensUsed: json.usageMetadata?.totalTokenCount || 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateAdaptiveDrill(
    request: AIDrillRequest,
    mistakes: any[] = [],
    subjects: Subject[] = []
  ): Promise<AdaptiveDrill> {
    if (!this.isConfigured()) {
      throw new Error("GEMINI_API_KEY not configured.");
    }

    const targetSub = subjects.find((s) => s.id === request.subjectId) || subjects[0];
    const subName = targetSub?.name || "Génie Logiciel";
    const subId = targetSub?.id || "sub-default";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate 3 multiple choice questions for computer engineering subject "${subName}".
Format JSON: { "questions": [ { "questionText": "...", "options": [ { "id": "1", "text": "...", "isCorrect": true } ], "explanation": "..." } ] }`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Gemini error ${res.status}`);

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText || "{}");

      const questions = (parsed.questions || []).map((q: any, i: number) => ({
        id: `gemini-drill-${i}`,
        subjectId: subId,
        subjectName: subName,
        questionText: q.questionText,
        options: q.options || [],
        explanation: q.explanation || "Corrigé académique.",
        difficulty: "intermediate",
        verified: false,
      }));

      return {
        id: `drill-gemini-${Date.now()}`,
        subjectId: subId,
        subjectName: subName,
        title: `Micro-Drill IA Gemini : ${subName}`,
        questions,
        generatedAt: new Date().toISOString(),
        source: "weakness_drill",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateChatResponse(
    request: any,
    subjects: Subject[] = []
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error("GEMINI_API_KEY not configured.");
    }

    const { messages, context, date } = request;
    const systemPrompt = `You are an academic coach and tutor for INSAT IGL4 software engineering students.
Context:
- Active tasks: ${JSON.stringify(context.tasks.slice(0, 8).map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, due_date: t.due_date })))}
- Available free slots today (${date}): ${JSON.stringify(context.freeSlots)}
- Weak subjects & mastery: ${JSON.stringify(context.masteryList.slice(0, 5).map((m: any) => ({ name: m.subjectName, accuracy: m.accuracyRate, score: m.masteryScore, attempts: m.totalAttempts })))}

Respond with JSON:
{
  "reply": "Grounded answer with markdown and citations",
  "citations": [],
  "recommendations": [],
  "proposedSchedule": [],
  "proposedDrill": null
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.slice(-5).map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1500,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Gemini error ${res.status}`);

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText || "{}");

      return {
        reply: parsed.reply || "Analyse Gemini effectuée.",
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        proposedSchedule: Array.isArray(parsed.proposedSchedule) ? parsed.proposedSchedule : [],
        proposedDrill: parsed.proposedDrill || null,
        tokensUsed: json.usageMetadata?.totalTokenCount || 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

