/**
 * Groq Cloud Inference Provider (Free-Tier High-Speed Llama 3.1)
 * High token throughput (~500+ tok/s), JSON structured output, strict rate-limit protection.
 */

import type { AIInferenceProvider, AIPlanGenerationResult } from "./interface.ts";
import type {
  AIPlanRequest,
  AIDrillRequest,
  AdaptiveDrill,
  CoachingRecommendation,
  ProposedTimeblock,
} from "../types.ts";
import type { Subject } from "@/types/database";

export class GroqProvider implements AIInferenceProvider {
  readonly id = "groq-llama";
  readonly name = "Groq Cloud (Llama 3.1 Instant)";

  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    this.model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateCoachingPlan(request: AIPlanRequest): Promise<AIPlanGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error("GROQ_API_KEY not configured.");
    }

    const { date, tasks, masteryList, freeSlots, workingHours } = request;

    // Minimize payload to preserve privacy and token budget
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

    const systemPrompt = `You are an expert academic coach and scheduler for university software engineering students (IGL4).
You receive student availability windows (freeSlots), active tasks with deadlines, and academic mastery metrics.
Respond ONLY with a valid JSON object matching this schema:
{
  "overview": "Short 1-2 sentence executive summary of the day",
  "recommendations": [
    {
      "id": "rec-1",
      "type": "urgent_task" | "weak_point_drill" | "schedule_adjustment" | "break_recovery" | "spaced_review",
      "title": "Actionable title",
      "description": "Clear guidance",
      "reasoning": "Grounding reason based on factual deadline or mastery score",
      "priority": "high" | "medium" | "low",
      "relatedTaskId": "exact id from tasks or null",
      "relatedSubjectId": "exact id from subjects or null",
      "action": {
        "label": "Button text",
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
      "title": "Block title",
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
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
          temperature: 0.2, // Low temperature for deterministic adherence
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty completion response from Groq.");
      }

      const parsed = JSON.parse(content);
      return {
        overview: parsed.overview || "Planning d'étude généré par Groq Llama 3.1",
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        proposedSchedule: Array.isArray(parsed.proposedSchedule) ? parsed.proposedSchedule : [],
        tokensUsed: json.usage?.total_tokens || 0,
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
      throw new Error("GROQ_API_KEY not configured.");
    }

    const targetCount = request.targetCount || 3;
    const targetSub = subjects.find((s) => s.id === request.subjectId) || subjects[0];
    const subName = targetSub?.name || "Génie Logiciel & Architecture";
    const subId = targetSub?.id || "sub-default";

    const systemPrompt = `You are a university professor creating targeted assessment questions for software engineering students.
Generate ${targetCount} multiple choice questions for subject "${subName}".
Respond ONLY with a JSON object of this format:
{
  "questions": [
    {
      "id": "q1",
      "questionText": "Clear question",
      "options": [
        { "id": "opt1", "text": "Correct answer", "isCorrect": true },
        { "id": "opt2", "text": "Wrong answer 1", "isCorrect": false },
        { "id": "opt3", "text": "Wrong answer 2", "isCorrect": false }
      ],
      "explanation": "Precise explanation of why the correct option is right"
    }
  ]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Groq API error ${res.status}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || "{}");

      const questions = (parsed.questions || []).map((q: any, i: number) => ({
        id: `groq-drill-q-${i}`,
        subjectId: subId,
        subjectName: subName,
        questionText: q.questionText,
        options: q.options || [],
        explanation: q.explanation || "Explication conceptuelle du cours.",
        difficulty: request.preferredDifficulty || "intermediate",
        verified: false, // Label as unverified because it was synthesized by model
      }));

      return {
        id: `drill-groq-${Date.now()}`,
        subjectId: subId,
        subjectName: subName,
        title: `Micro-Drill IA : ${subName}`,
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
      throw new Error("GROQ_API_KEY not configured.");
    }

    const { messages, context, date } = request;
    const systemPrompt = `You are an expert academic coach and tutor for INSAT IGL4 software engineering students.
You have access to the student's REAL academic state:
- Active tasks: ${JSON.stringify(context.tasks.slice(0, 10).map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, due_date: t.due_date })))}
- Available free slots today (${date}): ${JSON.stringify(context.freeSlots)}
- Weak subjects & mastery scores: ${JSON.stringify(context.masteryList.slice(0, 5).map((m: any) => ({ name: m.subjectName, accuracy: m.accuracyRate, score: m.masteryScore, attempts: m.totalAttempts })))}

CRITICAL GROUNDING RULES:
1. ONLY refer to the student's real tasks and subjects above. NEVER invent tasks or deadlines.
2. If asked about weak topics, cite their real quiz accuracy and attempts. If 0 attempts exist, honestly state that no quiz has been taken yet.
3. If asked to schedule a slot, select an available free slot from freeSlots and propose it.
4. Respond ONLY with a JSON object:
{
  "reply": "Clear, grounded markdown answer with bullet points and evidence",
  "citations": [ { "type": "task"|"calendar"|"assessment", "id": "id", "label": "label", "detail": "detail" } ],
  "recommendations": [],
  "proposedSchedule": [],
  "proposedDrill": null
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Groq API error ${res.status}`);

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || "{}");

      return {
        reply: parsed.reply || "Analyse terminée.",
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        proposedSchedule: Array.isArray(parsed.proposedSchedule) ? parsed.proposedSchedule : [],
        proposedDrill: parsed.proposedDrill || null,
        tokensUsed: json.usage?.total_tokens || 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

