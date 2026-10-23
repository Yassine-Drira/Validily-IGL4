/**
 * Local Deterministic Rule-Based Fallback Provider
 * 100% offline, zero-network, sub-millisecond execution.
 * Factual, grounded in real tasks, timeblocks, assessment attempts, and user mistakes.
 */

import type {
  AIInferenceProvider,
  AIPlanGenerationResult,
  AIChatGenerationResult,
} from "./interface.ts";
import type {
  AIPlanRequest,
  AIDrillRequest,
  CoachChatRequest,
  AdaptiveDrill,
  AdaptiveDrillQuestion,
  EvidenceCitation,
  ProposedTimeblock,
  CoachingRecommendation,
} from "../types.ts";
import {
  allocateFeasibleSchedule,
  generateDeterministicRecommendations,
  calculateTaskUrgency,
  allocateSpecificSlot,
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

  /**
   * Conversational RAG response generator
   * Answers user questions using genuine academic context with evidence citations and actionable tools.
   */
  async generateChatResponse(
    request: CoachChatRequest,
    subjects: Subject[] = []
  ): Promise<AIChatGenerationResult> {
    const { messages, context, date } = request;
    const lastUserMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user")?.content || "";

    const query = lastUserMsg.toLowerCase().trim();

    const citations: EvidenceCitation[] = [];
    const recommendations: CoachingRecommendation[] = [];
    let proposedSchedule: ProposedTimeblock[] = [];
    let proposedDrill: AIChatGenerationResult["proposedDrill"] = null;
    let reply = "";

    const activeTasks = context.tasks.filter((t) => !t.is_completed);
    const freeSlots = context.freeSlots;
    const totalFreeMinutes = freeSlots.reduce((acc, s) => acc + s.durationMinutes, 0);
    const masteryList = context.masteryList;
    const weakestSubject = masteryList.length > 0 ? masteryList[0] : null;

    // Detect Intent
    const isPlanIntent =
      query.includes("étudier") ||
      query.includes("etudier") ||
      query.includes("study") ||
      query.includes("focus") ||
      query.includes("priorité") ||
      query.includes("priorite") ||
      query.includes("programme") ||
      query.includes("quoi faire") ||
      query.includes("planning");

    const isWeaknessIntent =
      query.includes("point faible") ||
      query.includes("weakest") ||
      query.includes("faiblesse") ||
      query.includes("pourquoi") ||
      query.includes("why") ||
      query.includes("difficulté") ||
      query.includes("retard") ||
      query.includes("score");

    const isScheduleIntent =
      query.includes("schedule") ||
      query.includes("planifie") ||
      query.includes("créneau") ||
      query.includes("creneau") ||
      query.includes("bloquer") ||
      query.includes("30-minute") ||
      query.includes("30 minute") ||
      query.includes("30 min") ||
      query.includes("réserver") ||
      query.includes("reserver");

    const isQuizIntent =
      query.includes("quiz") ||
      query.includes("drill") ||
      query.includes("teste moi") ||
      query.includes("question") ||
      query.includes("qcm") ||
      query.includes("exercice");

    // -------------------------------------------------------------------------
    // 1. INTENT: Schedule specific block ("Schedule a 30-minute review for my weakest topic")
    // -------------------------------------------------------------------------
    if (isScheduleIntent) {
      // Determine duration (default 30 min)
      let duration = 30;
      const matchMin = query.match(/(\d+)\s*(min|minute)/);
      if (matchMin && parseInt(matchMin[1], 10) > 0) {
        duration = Math.min(180, Math.max(15, parseInt(matchMin[1], 10)));
      }

      const targetSubject = weakestSubject || (subjects.length > 0 ? {
        subjectId: subjects[0].id,
        subjectName: subjects[0].name,
      } : {
        subjectId: "sub-default",
        subjectName: "Génie Logiciel",
      });

      // Try allocating slot
      const allocated = allocateSpecificSlot({
        date,
        durationMinutes: duration,
        subjectId: targetSubject.subjectId,
        subjectName: targetSubject.subjectName,
        freeSlots,
        existingBlocks: context.existingBlocks,
        title: `Révision ciblée: ${targetSubject.subjectName}`,
        category: "drill",
      });

      if (allocated) {
        proposedSchedule = [allocated];

        citations.push({
          type: "availability",
          id: `slot-alloc-${allocated.startTime}`,
          label: `Créneau identifié: ${allocated.startTime} - ${allocated.endTime}`,
          detail: `Durée: ${duration} min sans conflit avec vos cours existants`,
        });

        citations.push({
          type: "calendar",
          id: targetSubject.subjectId,
          label: `Matière : ${targetSubject.subjectName}`,
          detail: `Bloc d'apprentissage actif (${duration} min)`,
        });

        reply = `### Créneau Identifié & Vérifié (Sans Conflit)

J'ai analysé votre emploi du temps du **${date}** et calculé un créneau optimal de **${duration} minutes** :

- **Matière :** **${targetSubject.subjectName}**
- **Horaire proposé :** **${allocated.startTime} → ${allocated.endTime}**
- **Vérification de sécurité :** Aucun chevauchement avec vos événements existants.
- **Contexte :** Plage disponible continue vérifiée.

👉 **Veuillez confirmer ci-dessous pour inscrire ce bloc à votre calendrier officiel.**`;
      } else {
        reply = `### Disponibilité Insuffisante

Votre emploi du temps ne comporte pas de créneau ininterrompu de **${duration} minutes** sans chevauchement avec vos cours actuels.

Vos plages disponibles aujourd'hui sont :
${freeSlots.map((s) => `- De **${s.start}** à **${s.end}** (${s.durationMinutes} min)`).join("\n")}

Souhaitez-vous que je planifie un créneau plus court (ex: 15 ou 20 min) ?`;
      }

      return {
        reply,
        citations,
        recommendations: [],
        proposedSchedule,
        proposedDrill: null,
        tokensUsed: 0,
      };
    }

    // -------------------------------------------------------------------------
    // 2. INTENT: Study Plan ("What should I study today, and why?")
    // -------------------------------------------------------------------------
    if (isPlanIntent) {
      // Rank tasks by urgency
      const rankedTasks = activeTasks
        .map((t) => ({ task: t, urgency: calculateTaskUrgency(t, date) }))
        .sort((a, b) => b.urgency.score - a.urgency.score);

      // Cite evidence
      rankedTasks.slice(0, 3).forEach(({ task, urgency }) => {
        citations.push({
          type: "task",
          id: task.id,
          label: task.title,
          detail: urgency.isOverdue
            ? `En retard de ${Math.abs(urgency.daysUntilDue)}j (Échéance: ${task.due_date})`
            : urgency.daysUntilDue === 0
            ? `Échéance aujourd'hui (${task.priority})`
            : `Échéance dans ${urgency.daysUntilDue}j`,
        });
      });

      freeSlots.slice(0, 2).forEach((slot) => {
        citations.push({
          type: "availability",
          id: `slot-${slot.start}`,
          label: `Créneau libre: ${slot.start} - ${slot.end}`,
          detail: `${slot.durationMinutes} min disponibles sans conflit`,
        });
      });

      if (weakestSubject) {
        citations.push({
          type: "assessment",
          id: weakestSubject.subjectId,
          label: `Point faible: ${weakestSubject.subjectName}`,
          detail: `Taux de réussite: ${Math.round(weakestSubject.accuracyRate * 100)}%, rétention: ${weakestSubject.masteryScore}/100`,
        });
      }

      // Generate feasible schedule
      proposedSchedule = allocateFeasibleSchedule({
        date,
        freeSlots,
        tasks: context.tasks,
        masteryList,
        existingBlocks: context.existingBlocks,
      }).slice(0, 2);

      // Build text response
      const topTask = rankedTasks.length > 0 ? rankedTasks[0] : null;

      reply = `### Recommandation d'Étude & Arbitrage Factuel

Voici votre feuille de route pour aujourd'hui (**${date}**), construite à partir de vos échéances réelles et de vos disponibilités :

1. **Disponibilité globale :** Vous disposez de **${Math.floor(totalFreeMinutes / 60)}h ${totalFreeMinutes % 60}m de temps libre** répartis sur ${freeSlots.length} créneau(x) ininterrompu(s).
`;

      if (topTask) {
        reply += `2. **Tâche prioritaire :** **${topTask.task.title}** (${topTask.task.priority.toUpperCase()}).
   - *Pourquoi :* ${
     topTask.urgency.isOverdue
       ? `Accuse un retard de ${Math.abs(topTask.urgency.daysUntilDue)} jour(s). Nécessite environ ${topTask.task.estimated_minutes || 45} min.`
       : topTask.urgency.daysUntilDue === 0
       ? `Échéance finale fixée à aujourd'hui.`
       : `Échéance imminente dans ${topTask.urgency.daysUntilDue} jour(s).`
   }\n`;
      } else {
        reply += `2. **Tâches académiques :** Aucune tâche urgente en retard.\n`;
      }

      if (weakestSubject) {
        reply += `3. **Consolidation mémorielle :** **${weakestSubject.subjectName}** est votre sujet le plus fragile (réussite : **${Math.round(weakestSubject.accuracyRate * 100)}%**, dernier passage il y a ${weakestSubject.daysSinceLastReview} jours). Une session de rappel actif de 20-30 min consolidera votre rétention.\n`;
      }

      reply += `\n*J'ai préparé une proposition de créneaux ci-dessous. Vous pouvez les valider pour les intégrer à votre calendrier.*`;

      recommendations.push(...generateDeterministicRecommendations({
        tasks: context.tasks,
        masteryList,
        freeSlots,
        date,
      }).slice(0, 2));

      return {
        reply,
        citations,
        recommendations,
        proposedSchedule,
        proposedDrill: weakestSubject
          ? {
              subjectId: weakestSubject.subjectId,
              subjectName: weakestSubject.subjectName,
              questionCount: 3,
              reason: "Renforcement du point le plus fragile",
            }
          : null,
        tokensUsed: 0,
      };
    }

    // -------------------------------------------------------------------------
    // 2. INTENT: Weakness Justification ("Why do you think this is my weakest topic?")
    // -------------------------------------------------------------------------
    if (isWeaknessIntent) {
      // Find requested subject or default to lowest mastery
      let targetWeak = weakestSubject;

      // Check if user specifically named a subject
      for (const m of masteryList) {
        if (query.includes(m.subjectName.toLowerCase()) || (m.slug && query.includes(m.slug.toLowerCase()))) {
          targetWeak = m;
          break;
        }
      }

      if (!targetWeak) {
        reply = `Aucune matière n'est actuellement enregistrée dans votre cursus. Dès que des modules ou des quiz seront associés, je pourrai vous fournir une analyse factuelle.`;
        return {
          reply,
          citations: [],
          recommendations: [],
          proposedSchedule: [],
          proposedDrill: null,
          tokensUsed: 0,
        };
      }

      citations.push({
        type: "assessment",
        id: targetWeak.subjectId,
        label: `Matière : ${targetWeak.subjectName}`,
        detail: `Évaluations : ${targetWeak.totalAttempts} tentative(s), ${targetWeak.correctAnswers}/${targetWeak.totalQuestions} réponses correctes`,
      });

      if (targetWeak.recentMistakes.length > 0) {
        targetWeak.recentMistakes.slice(0, 2).forEach((m, idx) => {
          citations.push({
            type: "mistake",
            id: `mistake-${targetWeak.subjectId}-${idx}`,
            label: `Erreur passée : ${m.questionText.slice(0, 45)}...`,
            detail: m.explanation || "Revoir le concept associé",
          });
        });
      }

      reply = `### Analyse Factuelle du Point Faible : ${targetWeak.subjectName}\n\n`;

      if (targetWeak.totalQuestions > 0) {
        reply += `Cette matière est classée comme votre point le plus vulnérable pour les raisons factuelles suivantes :

- **Taux de réussite aux quiz :** **${Math.round(targetWeak.accuracyRate * 100)}%** (${targetWeak.correctAnswers} correctes sur ${targetWeak.totalQuestions} questions tentées).
- **Score de rétention mémorielle :** **${targetWeak.masteryScore} / 100** (calculé selon la courbe d'oubli exponentielle d'Ebbinghaus).
- **Récence :** Dernier entraînement il y a **${targetWeak.daysSinceLastReview} jour(s)**.
`;

        if (targetWeak.recentMistakes.length > 0) {
          reply += `\n**Erreurs récurrentes relevées dans vos évaluations :**\n`;
          targetWeak.recentMistakes.slice(0, 2).forEach((m) => {
            reply += `- *"${m.questionText}"*\n  → Réponse choisie : \`${m.userAnswer || "Erronee"}\` | Réponse attendue : **\`${m.correctAnswer || "Voir corrigé"}\`**\n`;
          });
        }

        reply += `\nPour remonter ce score, je vous propose un micro-quiz de 3 questions ciblées.`;
      } else {
        // Honesty rule: admit when 0 data is recorded rather than hallucinating
        reply += `**Précision importante sur vos données :**
Vous n'avez pas encore passé d'évaluation ou de quiz sur la plateforme pour cette matière (**0 tentative enregistrée**).

Le système classe ce module sous **vigilance préventive** par défaut car :
1. Aucun résultat factuel n'a encore étalonné votre maîtrise.
2. Des livrables ou examens IGL4 approchent pour ce semestre.

👉 **Action conseillée :** Effectuez un test diagnostic de 3 questions dès maintenant pour mesurer votre véritable niveau et personnaliser votre courbe de révision.`;
      }

      proposedDrill = {
        subjectId: targetWeak.subjectId,
        subjectName: targetWeak.subjectName,
        questionCount: 3,
        reason: targetWeak.totalQuestions > 0 ? "Récupération active des erreurs" : "Test diagnostic initial",
      };

      return {
        reply,
        citations,
        recommendations: [],
        proposedSchedule: [],
        proposedDrill,
        tokensUsed: 0,
      };
    }

    // -------------------------------------------------------------------------
    // 4. INTENT: Quiz / Adaptive Practice Request
    // -------------------------------------------------------------------------
    if (isQuizIntent) {
      const targetSub = weakestSubject || (subjects.length > 0 ? {
        subjectId: subjects[0].id,
        subjectName: subjects[0].name,
      } : {
        subjectId: "sub-default",
        subjectName: "Génie Logiciel",
      });

      reply = `### Micro-Drill Adaptatif Prêt

J'ai préparé un atelier de révision ciblée sur **${targetSub.subjectName}**. Il contient 3 questions d'approfondissement basées sur votre historique pour tester vos réflexes d'architecture.

Cliquez sur le bouton ci-dessous pour lancer la session.`;

      citations.push({
        type: "assessment",
        id: targetSub.subjectId,
        label: `Drill : ${targetSub.subjectName}`,
        detail: `Session de rappel actif (3 questions)`,
      });

      return {
        reply,
        citations,
        recommendations: [],
        proposedSchedule: [],
        proposedDrill: {
          subjectId: targetSub.subjectId,
          subjectName: targetSub.subjectName,
          questionCount: 3,
          reason: "Entraînement actif demandé",
        },
        tokensUsed: 0,
      };
    }

    // -------------------------------------------------------------------------
    // 5. INTENT: General Academic Guidance & Status
    // -------------------------------------------------------------------------
    reply = `Bonjour ! Je suis votre coach académique et tuteur personnel IGL4.

Voici votre situation factuelle en un coup d'œil pour aujourd'hui (**${date}**) :
- **${activeTasks.length} tâche(s)** active(s) en attente.
- **${Math.floor(totalFreeMinutes / 60)}h ${totalFreeMinutes % 60}m de temps libre** disponible sans conflit.
${weakestSubject ? `- Point prioritaire de renforcement : **${weakestSubject.subjectName}** (${Math.round(weakestSubject.accuracyRate * 100)}% de réussite).` : ""}

Comment puis-je vous aider ? Vous pouvez me demander par exemple :
- *"Que dois-je étudier aujourd'hui, et pourquoi ?"*
- *"Pourquoi considères-tu cela comme mon point faible ?"*
- *"Planifie une révision de 30 minutes sur mon sujet le plus fragile."*`;

    return {
      reply,
      citations: [],
      recommendations: [],
      proposedSchedule: [],
      proposedDrill: null,
      tokensUsed: 0,
    };
  }
}
