/**
 * Deterministic Planning & Mastery Engine
 * Factual authority for calendar math, availability calculation, deadline urgency,
 * conflict detection, and spaced-repetition mastery decay.
 */

import type {
  AcademicTask,
  CalendarTimeblock,
  Subject,
} from "@/types/database";
import type {
  TimeSlot,
  TimeConflict,
  ProposedTimeblock,
  SubjectMasterySummary,
  UrgencyLevel,
  CoachingRecommendation,
} from "./types.ts";

/**
 * Convert HH:MM string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to HH:MM string
 */
export function minutesToTime(totalMinutes: number): string {
  const bounded = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Calculate available free slots for a day given working hours and existing timeblocks
 */
export function calculateFreeSlots(
  workingHours: { start: string; end: string },
  existingBlocks: CalendarTimeblock[]
): TimeSlot[] {
  const workStart = timeToMinutes(workingHours.start || "08:00");
  const workEnd = timeToMinutes(workingHours.end || "22:00");

  if (workEnd <= workStart) {
    return [];
  }

  // Sort existing blocks by start time
  const sortedBlocks = [...existingBlocks]
    .map((b) => ({
      start: timeToMinutes(b.start_time),
      end: timeToMinutes(b.end_time),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const freeSlots: TimeSlot[] = [];
  let cursor = workStart;

  for (const block of sortedBlocks) {
    // If block starts after working hours or ended before cursor, skip or adjust
    if (block.end <= cursor) continue;
    if (block.start >= workEnd) break;

    const effectiveBlockStart = Math.max(block.start, cursor);
    if (effectiveBlockStart > cursor) {
      const duration = effectiveBlockStart - cursor;
      if (duration >= 15) { // Minimum meaningful block: 15 minutes
        freeSlots.push({
          start: minutesToTime(cursor),
          end: minutesToTime(effectiveBlockStart),
          durationMinutes: duration,
        });
      }
    }
    cursor = Math.max(cursor, Math.min(block.end, workEnd));
  }

  // Remaining window after last block until workEnd
  if (cursor < workEnd) {
    const duration = workEnd - cursor;
    if (duration >= 15) {
      freeSlots.push({
        start: minutesToTime(cursor),
        end: minutesToTime(workEnd),
        durationMinutes: duration,
      });
    }
  }

  return freeSlots;
}

/**
 * Detect scheduling conflicts between proposed blocks and existing calendar blocks
 */
export function detectConflicts(
  proposedStart: string,
  proposedEnd: string,
  existingBlocks: CalendarTimeblock[]
): TimeConflict[] {
  const pStart = timeToMinutes(proposedStart);
  const pEnd = timeToMinutes(proposedEnd);

  if (pEnd <= pStart) return [];

  const conflicts: TimeConflict[] = [];

  for (const block of existingBlocks) {
    const bStart = timeToMinutes(block.start_time);
    const bEnd = timeToMinutes(block.end_time);

    // Overlap condition: max(start1, start2) < min(end1, end2)
    const overlapStart = Math.max(pStart, bStart);
    const overlapEnd = Math.min(pEnd, bEnd);

    if (overlapStart < overlapEnd) {
      const isDirect = (pStart === bStart && pEnd === bEnd) || (pStart <= bStart && pEnd >= bEnd);
      conflicts.push({
        existingBlockId: block.id,
        title: block.title,
        startTime: block.start_time,
        endTime: block.end_time,
        conflictType: isDirect ? "direct_overlap" : "partial_overlap",
        proposedStartTime: proposedStart,
        proposedEndTime: proposedEnd,
      });
    }
  }

  return conflicts;
}

/**
 * Calculate deterministic deadline urgency score for an academic task
 */
export function calculateTaskUrgency(
  task: AcademicTask,
  targetDateStr: string = new Date().toISOString().slice(0, 10)
): { score: number; daysUntilDue: number; isOverdue: boolean } {
  if (task.is_completed) {
    return { score: 0, daysUntilDue: 999, isOverdue: false };
  }

  const targetDate = new Date(targetDateStr + "T00:00:00");
  const dueDate = new Date(task.due_date + "T00:00:00");
  const diffDays = Math.round((dueDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;

  // Base score from days remaining
  let baseScore = 0;
  if (isOverdue) {
    baseScore = 100 + Math.min(Math.abs(diffDays) * 10, 50); // Overdue tasks get highest priority
  } else if (diffDays === 0) {
    baseScore = 90; // Due today
  } else if (diffDays === 1) {
    baseScore = 75; // Due tomorrow
  } else if (diffDays <= 3) {
    baseScore = 60; // Due in 3 days
  } else if (diffDays <= 7) {
    baseScore = 40; // Due this week
  } else {
    baseScore = 20; // Due later
  }

  // Priority multiplier
  const priorityMultipliers: Record<string, number> = {
    urgent: 1.4,
    high: 1.25,
    medium: 1.0,
    low: 0.8,
  };
  const multiplier = priorityMultipliers[task.priority] ?? 1.0;

  // Subtask progress factor: tasks with incomplete subtasks get slight boost
  const subtasks = task.subtasks || [];
  const incompleteSubtasks = subtasks.filter((s) => !s.done).length;
  const subtaskBoost = Math.min(incompleteSubtasks * 2, 10);

  const finalScore = Math.round(baseScore * multiplier + subtaskBoost);

  return {
    score: Math.min(200, finalScore),
    daysUntilDue: diffDays,
    isOverdue,
  };
}

/**
 * Calculate Spaced Repetition Topic Mastery and Decay
 * Models human memory decay over time: Retention = Accuracy * e^(-days / halfLife)
 */
export function calculateSubjectMastery(params: {
  subjectId: string;
  subjectName: string;
  slug?: string;
  totalAttempts: number;
  correctAnswers: number;
  totalQuestions: number;
  lastPracticedAt: string | null;
  targetDateStr?: string;
  halfLifeDays?: number; // Configurable memory retention half-life
  recentMistakes?: Array<{
    questionText: string;
    explanation?: string;
    userAnswer?: string;
    correctAnswer?: string;
  }>;
}): SubjectMasterySummary {
  const {
    subjectId,
    subjectName,
    slug,
    totalAttempts,
    correctAnswers,
    totalQuestions,
    lastPracticedAt,
    targetDateStr = new Date().toISOString().slice(0, 10),
    halfLifeDays = 7, // Default half-life of 7 days
    recentMistakes = [],
  } = params;

  // Raw accuracy (fallback to 0.5 if no questions attempted yet)
  const accuracyRate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0.5;

  let daysSinceReview = 14; // Default assumption if never reviewed
  if (lastPracticedAt) {
    const lastDate = new Date(lastPracticedAt);
    const targetDate = new Date(targetDateStr + "T00:00:00");
    const diffMs = targetDate.getTime() - lastDate.getTime();
    daysSinceReview = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Retention score according to Ebbinghaus exponential decay
  const decayFactor = Math.exp(-daysSinceReview / Math.max(1, halfLifeDays));
  const effectiveRetention = accuracyRate * decayFactor;
  const masteryScore = Math.round(effectiveRetention * 100);

  // Categorize urgency
  let urgencyLevel: UrgencyLevel = "moderate";
  if (accuracyRate < 0.45 || (daysSinceReview > 10 && accuracyRate < 0.6)) {
    urgencyLevel = "critical";
  } else if (accuracyRate < 0.65 || daysSinceReview > 7) {
    urgencyLevel = "warning";
  } else if (accuracyRate >= 0.85 && daysSinceReview <= 5) {
    urgencyLevel = "mastered";
  }

  return {
    subjectId,
    subjectName,
    slug,
    totalAttempts,
    correctAnswers,
    totalQuestions,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    lastPracticedAt,
    daysSinceLastReview: daysSinceReview,
    masteryScore,
    urgencyLevel,
    recentMistakes,
  };
}

/**
 * Deterministic schedule allocation
 * Fits prioritized tasks and revision blocks into available free slots without overlap
 */
export function allocateFeasibleSchedule(params: {
  date: string;
  freeSlots: TimeSlot[];
  tasks: AcademicTask[];
  masteryList: SubjectMasterySummary[];
  existingBlocks: CalendarTimeblock[];
}): ProposedTimeblock[] {
  const { date, freeSlots, tasks, masteryList, existingBlocks } = params;

  if (freeSlots.length === 0) return [];

  // 1. Rank tasks by urgency
  const rankedTasks = tasks
    .filter((t) => !t.is_completed)
    .map((task) => ({
      task,
      urgency: calculateTaskUrgency(task, date),
    }))
    .sort((a, b) => b.urgency.score - a.urgency.score);

  // 2. Identify critical weak subjects
  const weakSubjects = masteryList
    .filter((m) => m.urgencyLevel === "critical" || m.urgencyLevel === "warning")
    .sort((a, b) => a.masteryScore - b.masteryScore);

  const proposedBlocks: ProposedTimeblock[] = [];
  let slotIndex = 0;
  let taskIndex = 0;
  let weakSubIndex = 0;

  // Copy of available slots that will be consumed
  const availableSlots = freeSlots.map((s) => ({ ...s }));

  for (const slot of availableSlots) {
    let currentSlotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    while (currentSlotStart + 20 <= slotEnd) { // Minimum 20 mins for a block
      const remainingMinutesInSlot = slotEnd - currentSlotStart;

      // Decide whether to schedule a task or a targeted weak-point review
      if (taskIndex < rankedTasks.length) {
        const item = rankedTasks[taskIndex];
        const taskDuration = Math.min(
          Math.max(25, item.task.estimated_minutes || 45),
          Math.min(90, remainingMinutesInSlot) // Cap single block at 90m
        );

        if (remainingMinutesInSlot >= 25) {
          const blockStart = minutesToTime(currentSlotStart);
          const blockEnd = minutesToTime(currentSlotStart + taskDuration);

          // Check against existing blocks just in case
          const conflicts = detectConflicts(blockStart, blockEnd, existingBlocks);
          if (conflicts.length === 0) {
            proposedBlocks.push({
              tempId: `prop-task-${item.task.id}-${blockStart}`,
              taskId: item.task.id,
              subjectId: item.task.subject_id,
              title: item.task.title,
              date,
              startTime: blockStart,
              endTime: blockEnd,
              durationMinutes: taskDuration,
              rationale: item.urgency.isOverdue
                ? `Tâche en retard de ${Math.abs(item.urgency.daysUntilDue)} jour(s) - Priorité absolue`
                : item.urgency.daysUntilDue === 0
                ? "Échéance aujourd'hui - À finaliser en priorité"
                : `Échéance dans ${item.urgency.daysUntilDue} jour(s) (Priorité ${item.task.priority})`,
              category: item.task.category === "revision" ? "revision" : "deep_work",
            });

            currentSlotStart += taskDuration;
          } else {
            currentSlotStart += 15;
          }
        }
        taskIndex++;
      } else if (weakSubIndex < weakSubjects.length) {
        // Schedule a micro-drill / weak point review
        const weak = weakSubjects[weakSubIndex];
        const drillDuration = Math.min(30, remainingMinutesInSlot);

        if (drillDuration >= 20) {
          const blockStart = minutesToTime(currentSlotStart);
          const blockEnd = minutesToTime(currentSlotStart + drillDuration);

          const conflicts = detectConflicts(blockStart, blockEnd, existingBlocks);
          if (conflicts.length === 0) {
            proposedBlocks.push({
              tempId: `prop-weak-${weak.subjectId}-${blockStart}`,
              taskId: null,
              subjectId: weak.subjectId,
              title: `Révision ciblée: ${weak.subjectName}`,
              date,
              startTime: blockStart,
              endTime: blockEnd,
              durationMinutes: drillDuration,
              rationale: `Point faible détecté (Précision: ${Math.round(weak.accuracyRate * 100)}%, dernier entraînement il y a ${weak.daysSinceLastReview} jours)`,
              category: "drill",
            });

            currentSlotStart += drillDuration;
          } else {
            currentSlotStart += 15;
          }
        }
        weakSubIndex++;
      } else {
        // No more tasks or weak points to schedule
        break;
      }
    }
  }

  return proposedBlocks;
}

/**
 * Generate deterministic coaching recommendations
 */
export function generateDeterministicRecommendations(params: {
  tasks: AcademicTask[];
  masteryList: SubjectMasterySummary[];
  freeSlots: TimeSlot[];
  date: string;
}): CoachingRecommendation[] {
  const { tasks, masteryList, freeSlots, date } = params;
  const recommendations: CoachingRecommendation[] = [];

  // 1. Check for urgent/overdue tasks
  const overdueTasks = tasks
    .filter((t) => !t.is_completed)
    .map((t) => ({ task: t, urgency: calculateTaskUrgency(t, date) }))
    .filter((item) => item.urgency.isOverdue || item.urgency.daysUntilDue <= 1)
    .sort((a, b) => b.urgency.score - a.urgency.score);

  if (overdueTasks.length > 0) {
    const top = overdueTasks[0];
    recommendations.push({
      id: `rec-urgent-${top.task.id}`,
      type: "urgent_task",
      title: `Finaliser : ${top.task.title}`,
      description: top.urgency.isOverdue
        ? `Cette tâche accuse un retard de ${Math.abs(top.urgency.daysUntilDue)} jour(s). Débloquez-la pour libérer votre bande passante mentale.`
        : `Échéance imminente (${top.urgency.daysUntilDue === 0 ? "Aujourd'hui" : "Demain"}). Prévoyez un créneau dédié.`,
      reasoning: `Échéance: ${top.task.due_date} | Priorité: ${top.task.priority.toUpperCase()} | Estimation: ${top.task.estimated_minutes} min`,
      priority: "high",
      relatedTaskId: top.task.id,
      relatedSubjectId: top.task.subject_id,
      action: {
        label: "Planifier ce travail",
        actionType: "schedule_block",
        payload: { taskId: top.task.id, duration: top.task.estimated_minutes || 45 },
      },
    });
  }

  // 2. Check for weak points requiring active recall
  const criticalWeakness = masteryList.find(
    (m) => m.urgencyLevel === "critical" || m.urgencyLevel === "warning"
  );

  if (criticalWeakness) {
    recommendations.push({
      id: `rec-weak-${criticalWeakness.subjectId}`,
      type: "weak_point_drill",
      title: `Consolider : ${criticalWeakness.subjectName}`,
      description: `Votre taux de réussite actuel est de ${Math.round(criticalWeakness.accuracyRate * 100)}%. Un micro-quiz de 5 questions réactivera les notions clés.`,
      reasoning: `Dernière révision: il y a ${criticalWeakness.daysSinceLastReview} jours | Score de rétention: ${criticalWeakness.masteryScore}/100`,
      priority: criticalWeakness.urgencyLevel === "critical" ? "high" : "medium",
      relatedSubjectId: criticalWeakness.subjectId,
      action: {
        label: "Lancer le micro-drill",
        actionType: "start_drill",
        payload: { subjectId: criticalWeakness.subjectId, subjectName: criticalWeakness.subjectName },
      },
    });
  }

  // 3. Recommend a deep work focus session if free slot >= 45m exists
  const largeSlot = freeSlots.find((s) => s.durationMinutes >= 45);
  if (largeSlot) {
    recommendations.push({
      id: `rec-focus-${largeSlot.start}`,
      type: "schedule_adjustment",
      title: `Créneau de Deep Work (${largeSlot.durationMinutes} min)`,
      description: `Vous disposez d'une plage ininterrompue de ${largeSlot.start} à ${largeSlot.end}. Idéal pour un bloc de concentration sans distraction.`,
      reasoning: `Fenêtre disponible continue de ${largeSlot.durationMinutes} minutes détectée dans votre emploi du temps.`,
      priority: "medium",
      action: {
        label: "Démarrer session focus",
        actionType: "start_focus",
        payload: { durationMinutes: Math.min(largeSlot.durationMinutes, 50) },
      },
    });
  }

  return recommendations;
}

/**
 * Allocate a specific duration slot for a requested subject or task
 */
export function allocateSpecificSlot(params: {
  date: string;
  durationMinutes: number;
  subjectId: string | null;
  subjectName: string;
  freeSlots: TimeSlot[];
  existingBlocks: CalendarTimeblock[];
  title?: string;
  category?: "revision" | "practice" | "deep_work" | "drill";
}): ProposedTimeblock | null {
  const {
    date,
    durationMinutes,
    subjectId,
    subjectName,
    freeSlots,
    existingBlocks,
    title,
    category = "revision",
  } = params;

  for (const slot of freeSlots) {
    if (slot.durationMinutes >= durationMinutes) {
      const startMin = timeToMinutes(slot.start);
      const endMin = startMin + durationMinutes;
      const startTime = minutesToTime(startMin);
      const endTime = minutesToTime(endMin);

      const conflicts = detectConflicts(startTime, endTime, existingBlocks);
      if (conflicts.length === 0) {
        return {
          tempId: `prop-slot-${Date.now()}-${startTime.replace(":", "")}`,
          taskId: null,
          subjectId,
          title: title || `Révision ciblée: ${subjectName}`,
          date,
          startTime,
          endTime,
          durationMinutes,
          rationale: `Créneau de ${durationMinutes} min sans conflit réservé dans la plage disponible de ${slot.start} à ${slot.end}.`,
          category,
        };
      }
    }
  }

  return null;
}

