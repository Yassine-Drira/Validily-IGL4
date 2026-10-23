/**
 * Action & Model Output Validation Layer
 * Enforces entity integrity, Zod structure validation, temporal constraints,
 * and pre-execution safety gates.
 */

import { z } from "zod";
import type {
  ProposedTimeblock,
  CoachingRecommendation,
  TimeSlot,
} from "./types.ts";
import { timeToMinutes, detectConflicts } from "./planning-engine.ts";
import type { CalendarTimeblock, AcademicTask } from "@/types/database";

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const ProposedTimeblockSchema = z.object({
  tempId: z.string().min(1),
  taskId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time format (expected HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time format (expected HH:MM)"),
  durationMinutes: z.number().int().positive().max(360),
  rationale: z.string().max(500),
  category: z.enum(["revision", "practice", "deep_work", "drill"]),
});

export const CoachingRecommendationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "urgent_task",
    "weak_point_drill",
    "schedule_adjustment",
    "break_recovery",
    "spaced_review",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  reasoning: z.string().max(500),
  priority: z.enum(["high", "medium", "low"]),
  relatedTaskId: z.string().nullable().optional(),
  relatedSubjectId: z.string().nullable().optional(),
  action: z.object({
    label: z.string().min(1).max(100),
    actionType: z.enum(["schedule_block", "start_drill", "start_focus", "view_task"]),
    payload: z.record(z.string(), z.any()).optional(),
  }),
});

// -----------------------------------------------------------------------------
// Sanitization & Grounding Filter
// -----------------------------------------------------------------------------

export interface PlanValidationResult {
  validRecommendations: CoachingRecommendation[];
  validSchedule: ProposedTimeblock[];
  discardedCount: number;
  reasons: string[];
}

/**
 * Validates raw model output against trusted entities and physical time constraints
 */
export function sanitizeAndValidatePlan(
  rawRecommendations: any[],
  rawProposedSchedule: any[],
  context: {
    validTasks: AcademicTask[];
    validSubjectIds: Set<string>;
    freeSlots: TimeSlot[];
  }
): PlanValidationResult {
  const validTaskMap = new Map<string, AcademicTask>();
  context.validTasks.forEach((t) => validTaskMap.set(t.id, t));

  const validRecommendations: CoachingRecommendation[] = [];
  const validSchedule: ProposedTimeblock[] = [];
  const reasons: string[] = [];
  let discardedCount = 0;

  // 1. Validate Recommendations
  for (const item of rawRecommendations || []) {
    const parseRes = CoachingRecommendationSchema.safeParse(item);
    if (!parseRes.success) {
      discardedCount++;
      reasons.push(`Malformed recommendation schema: ${parseRes.error.message}`);
      continue;
    }

    const rec = parseRes.data;

    // Check entity reference: taskId must belong to user
    if (rec.relatedTaskId) {
      const task = validTaskMap.get(rec.relatedTaskId);
      if (!task) {
        discardedCount++;
        reasons.push(`Discarded recommendation referencing non-existent task ID: ${rec.relatedTaskId}`);
        continue;
      }
      if (task.is_completed) {
        // Discard recommendation for already completed task
        discardedCount++;
        reasons.push(`Discarded recommendation for completed task: ${task.title}`);
        continue;
      }
    }

    // Check entity reference: subjectId must exist
    if (rec.relatedSubjectId && !context.validSubjectIds.has(rec.relatedSubjectId)) {
      rec.relatedSubjectId = null; // Detach invalid subject ID rather than discarding whole rec
    }

    validRecommendations.push({
      ...rec,
      relatedTaskId: rec.relatedTaskId ?? null,
      relatedSubjectId: rec.relatedSubjectId ?? null,
    });
  }

  // 2. Validate Proposed Schedule Blocks
  for (const item of rawProposedSchedule || []) {
    const parseRes = ProposedTimeblockSchema.safeParse(item);
    if (!parseRes.success) {
      discardedCount++;
      reasons.push(`Malformed timeblock schema: ${parseRes.error.message}`);
      continue;
    }

    const block = parseRes.data;
    const startMin = timeToMinutes(block.startTime);
    const endMin = timeToMinutes(block.endTime);

    if (endMin <= startMin) {
      discardedCount++;
      reasons.push(`Invalid block duration: start ${block.startTime} is not before end ${block.endTime}`);
      continue;
    }

    // Check entity reference: taskId must belong to user
    if (block.taskId && !validTaskMap.has(block.taskId)) {
      discardedCount++;
      reasons.push(`Discarded proposed block referencing imaginary task ID: ${block.taskId}`);
      continue;
    }

    // Check entity reference: subjectId must exist
    if (block.subjectId && !context.validSubjectIds.has(block.subjectId)) {
      block.subjectId = null;
    }

    // Check if block fits within any available free slot
    const fitsInFreeSlot = context.freeSlots.some((slot) => {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      return startMin >= slotStart && endMin <= slotEnd;
    });

    if (!fitsInFreeSlot) {
      discardedCount++;
      reasons.push(`Block ${block.title} (${block.startTime}-${block.endTime}) falls outside available free slots`);
      continue;
    }

    validSchedule.push({
      ...block,
      taskId: block.taskId ?? null,
      subjectId: block.subjectId ?? null,
    });
  }

  return {
    validRecommendations,
    validSchedule,
    discardedCount,
    reasons,
  };
}

/**
 * Pre-execution validation before saving proposed block to calendar
 */
export function validateBlockApplication(
  proposal: ProposedTimeblock,
  currentBlocks: CalendarTimeblock[],
  validTasks: AcademicTask[]
): { valid: boolean; reason?: string } {
  const parseRes = ProposedTimeblockSchema.safeParse(proposal);
  if (!parseRes.success) {
    return { valid: false, reason: "Structure de bloc invalide." };
  }

  // Check task status
  if (proposal.taskId) {
    const task = validTasks.find((t) => t.id === proposal.taskId);
    if (!task) {
      return { valid: false, reason: "Tâche associée introuvable." };
    }
    if (task.is_completed) {
      return { valid: false, reason: "Cette tâche a déjà été marquée comme terminée." };
    }
  }

  // Check for any newly added conflicting events
  const conflicts = detectConflicts(proposal.startTime, proposal.endTime, currentBlocks);
  if (conflicts.length > 0) {
    return {
      valid: false,
      reason: `Conflit d'horaire détecté avec l'événement existant "${conflicts[0].title}" (${conflicts[0].startTime} - ${conflicts[0].endTime}).`,
    };
  }

  return { valid: true };
}
