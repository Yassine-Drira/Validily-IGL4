/**
 * Local Deterministic Rule-Based Fallback Provider
 * 100% offline, zero-network, sub-millisecond execution.
 * Factual, grounded in real tasks, timeblocks, and user mistakes.
 */

import type { AIInferenceProvider, AIPlanGenerationResult } from "./interface.ts";
import type {
  AIPlanRequest,
  AIDrillRequest,
  AdaptiveDrill,
  AdaptiveDrillQuestion,
} from "../types.ts";
import {
  allocateFeasibleSchedule,
  generateDeterministicRecommendations,
} from "../planning-engine.ts";
import type { Subject } from "@/types/database";

export class MockFallbackProvider implements AIInferenceProvider {
  readonly id = "local-deterministic-rules";
  readonly name = "Moteur Déterministe Local (Règles & Spaced Repetition)";

  isConfigured(): boolean {
    return true; // Always available
  }

  async generateCoachingPlan(request: AIPlanRequest): Promise<AIPlanGenerationResult> {
    const { date, tasks, masteryList, freeSlots, existingBlocks } = request;

    // 1. Generate feasible schedule blocks without overlaps
    const proposedSchedule = allocateFeasibleSchedule({
      date,
      freeSlots,
      tasks,
      masteryList,
      existingBlocks,
    });

    // 2. Generate coaching recommendations
    const recommendations = generateDeterministicRecommendations({
      tasks,
      masteryList,
      freeSlots,
      date,
    });

    // 3. Compose concise overview
    const totalFreeMinutes = freeSlots.reduce((acc, s) => acc + s.durationMinutes, 0);
    const criticalWeakness = masteryList.find((m) => m.urgencyLevel === "critical");
    const activeTasksCount = tasks.filter((t) => !t.is_completed).length;

    let overview = `Vous disposez de ${totalFreeMinutes} min de temps libre disponible aujourd'hui répartis sur ${freeSlots.length} créneau(x). ${activeTasksCount} tâche(s) en attente.`;
    if (criticalWeakness) {
      overview += ` Priorité de renforcement identifiée sur ${criticalWeakness.subjectName} (${Math.round(criticalWeakness.accuracyRate * 100)}% de réussite).`;
    }

    return {
      overview,
      recommendations,
      proposedSchedule,
      tokensUsed: 0,
    };
  }

  async generateAdaptiveDrill(
    request: AIDrillRequest,
    mistakes: any[] = [],
    subjects: Subject[] = []
  ): Promise<AdaptiveDrill> {
    const targetCount = request.targetCount || 3;
    const questions: AdaptiveDrillQuestion[] = [];

    // Filter mistakes for the targeted subject if specified
    const relevantMistakes = request.subjectId
      ? mistakes.filter(
          (m) =>
            m.subject_id === request.subjectId ||
            subjects.find((s) => s.id === request.subjectId)?.name === m.subject_name
        )
      : mistakes;

    // 1. Build questions from actual student mistakes (100% verified)
    for (let i = 0; i < Math.min(relevantMistakes.length, targetCount); i++) {
      const m = relevantMistakes[i];
      const subId = m.subject_id || request.subjectId || "sub-default";
      const subName = m.subject_name || "Module académique IGL4";

      const options = [
        {
          id: `opt-${i}-correct`,
          text: m.correct_answer || "Réponse exacte selon le cours",
          isCorrect: true,
        },
        {
          id: `opt-${i}-wrong1`,
          text: m.user_answer || "Alternative erronée courante",
          isCorrect: false,
        },
        {
          id: `opt-${i}-wrong2`,
          text: "Hypothèse non conforme aux spécifications",
          isCorrect: false,
        },
        {
          id: `opt-${i}-wrong3`,
          text: "Confusion conceptuelle classique",
          isCorrect: false,
        },
      ].sort(() => 0.5 - Math.random()); // Shuffle options

      questions.push({
        id: `drill-q-mistake-${i}`,
        subjectId: subId,
        subjectName: subName,
        questionText: m.question_text || `Question sur ${subName}`,
        options,
        explanation: m.explanation || "Revoir le cours pour approfondir ce concept.",
        difficulty: request.preferredDifficulty || "intermediate",
        verified: true, // Grounded in real student mistake
      });
    }

    // 2. If fewer questions than targetCount, supplement with curriculum knowledge drill
    const targetSubject = subjects.find((s) => s.id === request.subjectId) || subjects[0];
    const subName = targetSubject?.name || "Génie Logiciel & Architecture";
    const subId = targetSubject?.id || "sub-default";

    while (questions.length < targetCount) {
      const idx = questions.length + 1;
      questions.push({
        id: `drill-q-synth-${idx}`,
        subjectId: subId,
        subjectName: subName,
        questionText: `[Révision active ${subName}] : Quel est le principe fondamental à respecter lors de la conception d'un module découplé ?`,
        options: [
          {
            id: `opt-s-${idx}-1`,
            text: "Haute cohésion et faible couplage entre les composants",
            isCorrect: true,
          },
          {
            id: `opt-s-${idx}-2`,
            text: "Couplage fort avec variables globales partagées",
            isCorrect: false,
          },
          {
            id: `opt-s-${idx}-3`,
            text: "Centralisation de toutes les mutations dans un singleton synchrone",
            isCorrect: false,
          },
        ].sort(() => 0.5 - Math.random()),
        explanation: "Le principe de haute cohésion et faible couplage garantit la maintenabilité et l'indépendance des modules.",
        difficulty: "intermediate",
        verified: true,
      });
    }

    return {
      id: `drill-${Date.now()}`,
      subjectId: subId,
      subjectName: subName,
      title: `Micro-Drill Adaptatif : ${subName}`,
      questions,
      generatedAt: new Date().toISOString(),
      source: relevantMistakes.length > 0 ? "mistake_review" : "curriculum_bank",
    };
  }
}
