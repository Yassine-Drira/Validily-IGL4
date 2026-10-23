"use server";

import { getRequesterUser } from "../auth/authorization.ts";
import { getAuthorizedUserContext } from "../ai/data-adapters.ts";
import { ProviderRegistry } from "../ai/providers/registry.ts";
import { sanitizeAndValidatePlan, validateBlockApplication } from "../ai/action-validator.ts";
import { computeStateHash, getCachedPlan, setCachedPlan, invalidateCoachCache } from "../ai/cache.ts";
import {
  createCalendarTimeblockAction,
  getCalendarTimeblocksAction,
  getAcademicTasksAction,
} from "./planner-actions.ts";

// Lazy loader to prevent Node.js ESM alias resolution issues in standalone tests
async function getQuizActions() {
  try {
    return await import("./quiz-actions");
  } catch {
    try {
      const p = "./quiz-actions.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}
import type {
  AIPlanResponse,
  ProposedTimeblock,
  AdaptiveDrill,
  ChatMessage,
  CoachChatResponse,
  CoachChatRequest,
} from "../ai/types.ts";
import { getLocalTodayDateString } from "../utils.ts";

async function safeRevalidate(path: string) {
  try {
    const cacheMod = await import("next/cache");
    cacheMod.revalidatePath?.(path);
  } catch {
    // Outside active Next.js request context (e.g. in test runner)
  }
}

/**
 * Generate or retrieve cached AI coaching plan for target date
 */
export async function getCoachingPlanAction(
  targetDate?: string,
  forceRefresh: boolean = false
): Promise<{ success: boolean; data?: AIPlanResponse; error?: string }> {
  try {
    const user = await getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise pour accéder au Coach IA." };
    }

    const dateStr = targetDate || getLocalTodayDateString();
    const context = await getAuthorizedUserContext(dateStr);

    if (!context) {
      return { success: false, error: "Impossible de charger le contexte utilisateur." };
    }

    const registry = ProviderRegistry.getInstance();
    const activeProvider = registry.getActiveProvider();

    // 1. Check cache using state fingerprint
    const stateHash = computeStateHash({
      userId: context.userId,
      date: dateStr,
      tasks: context.tasks,
      existingBlocks: context.existingBlocks,
      providerId: activeProvider.id,
    });

    if (!forceRefresh) {
      const cached = getCachedPlan(context.userId, dateStr, stateHash);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    // 2. Execute inference through registry (with resilient fallback)
    const rawPlan = await registry.executePlan({
      userId: context.userId,
      date: dateStr,
      workingHours: context.workingHours,
      tasks: context.tasks,
      existingBlocks: context.existingBlocks,
      masteryList: context.masteryList,
      freeSlots: context.freeSlots,
    });

    // 3. Ground and validate model output
    const subjectIds = new Set(context.subjects.map((s) => s.id));
    const validated = sanitizeAndValidatePlan(
      rawPlan.recommendations,
      rawPlan.proposedSchedule,
      {
        validTasks: context.tasks,
        validSubjectIds: subjectIds,
        freeSlots: context.freeSlots,
      }
    );

    const finalizedPlan: AIPlanResponse = {
      ...rawPlan,
      recommendations: validated.validRecommendations,
      proposedSchedule: validated.validSchedule,
    };

    // 4. Cache verified result
    setCachedPlan(context.userId, dateStr, stateHash, finalizedPlan);

    return { success: true, data: finalizedPlan };
  } catch (err: any) {
    console.error("getCoachingPlanAction error:", err);
    return { success: false, error: err.message || "Échec de génération du plan coach." };
  }
}

/**
 * Apply an approved proposed timeblock to the user's real calendar
 */
export async function applyProposedTimeblockAction(
  proposal: ProposedTimeblock
): Promise<{ success: boolean; error?: string; blockId?: string }> {
  try {
    const user = await getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    // 1. Fresh state retrieval to prevent race conditions & stale scheduling
    const [blocksRes, tasksRes] = await Promise.all([
      getCalendarTimeblocksAction(proposal.date, proposal.date),
      getAcademicTasksAction(),
    ]);

    const currentBlocks = blocksRes.success ? blocksRes.data : [];
    const currentTasks = tasksRes.success ? tasksRes.data : [];

    // 2. Pre-execution validation
    const validation = validateBlockApplication(proposal, currentBlocks, currentTasks);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // 3. Insert real calendar timeblock
    const createRes = await createCalendarTimeblockAction({
      task_id: proposal.taskId,
      subject_id: proposal.subjectId,
      title: proposal.title,
      block_date: proposal.date,
      start_time: proposal.startTime,
      end_time: proposal.endTime,
      notes: proposal.rationale ? `Coach IA : ${proposal.rationale}` : null,
    });

    if (!createRes.success) {
      return { success: false, error: createRes.error || "Échec de création du bloc." };
    }

    // 4. Invalidate coach cache so next query reflects the newly scheduled event
    invalidateCoachCache(user.id);
    safeRevalidate("/planner");
    safeRevalidate("/coach");

    return { success: true, blockId: createRes.data?.id };
  } catch (err: any) {
    console.error("applyProposedTimeblockAction error:", err);
    return { success: false, error: err.message || "Erreur lors de l'application du bloc." };
  }
}

/**
 * Generate adaptive drill targeting weak points
 */
export async function generateAdaptiveDrillAction(
  subjectId?: string,
  targetCount: number = 3
): Promise<{ success: boolean; data?: AdaptiveDrill; error?: string }> {
  try {
    const user = await getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    const context = await getAuthorizedUserContext();
    if (!context) {
      return { success: false, error: "Impossible de charger le contexte." };
    }

    const quizMod = await getQuizActions();
    const mistakes = quizMod?.getStudentMistakes ? await quizMod.getStudentMistakes(user.id) : [];
    const registry = ProviderRegistry.getInstance();

    const drill = await registry.executeDrill(
      {
        userId: user.id,
        subjectId,
        targetCount,
      },
      mistakes,
      context.subjects
    );

    return { success: true, data: drill };
  } catch (err: any) {
    console.error("generateAdaptiveDrillAction error:", err);
    return { success: false, error: err.message || "Échec de génération du micro-drill." };
  }
}

/**
 * Send conversational chat message to the AI Coach
 * Retrieves real context, computes deterministic values, invokes provider, and validates any actions.
 */
export async function sendCoachChatMessageAction(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  targetDate?: string
): Promise<{ success: boolean; data?: CoachChatResponse; error?: string }> {
  try {
    const user = await getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise pour discuter avec le Coach IA." };
    }

    const dateStr = targetDate || getLocalTodayDateString();
    const context = await getAuthorizedUserContext(dateStr);

    if (!context) {
      return { success: false, error: "Impossible de charger le contexte utilisateur." };
    }

    const registry = ProviderRegistry.getInstance();
    const chatResponse = await registry.executeChat(
      {
        userId: user.id,
        date: dateStr,
        messages,
        context: {
          userId: user.id,
          date: dateStr,
          workingHours: context.workingHours,
          tasks: context.tasks,
          existingBlocks: context.existingBlocks,
          masteryList: context.masteryList,
          freeSlots: context.freeSlots,
        },
      },
      context.subjects
    );

    // Validate any proposed schedule blocks or recommendations to prevent hallucination
    const subjectIds = new Set(context.subjects.map((s) => s.id));
    const validated = sanitizeAndValidatePlan(
      chatResponse.recommendations,
      chatResponse.proposedSchedule,
      {
        validTasks: context.tasks,
        validSubjectIds: subjectIds,
        freeSlots: context.freeSlots,
      }
    );

    return {
      success: true,
      data: {
        ...chatResponse,
        recommendations: validated.validRecommendations,
        proposedSchedule: validated.validSchedule,
      },
    };
  } catch (err: any) {
    console.error("sendCoachChatMessageAction error:", err);
    return { success: false, error: err.message || "Erreur lors de la réponse du Coach." };
  }
}

