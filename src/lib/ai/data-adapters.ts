/**
 * Data Adapters for AI Coach
 * Retrieves authorized user state, calendar blocks, tasks, deadlines, and quiz assessment history.
 * Minimizes egress, leverages local-first stores and repository cache.
 */

import { getRequesterUser } from "../auth/authorization.ts";
import { getSubjects } from "../supabase/repository.ts";
import {
  getAcademicTasksAction,
  getCalendarTimeblocksAction,
} from "../actions/planner-actions.ts";
// Lazy loader to prevent Node.js ESM alias resolution issues in standalone tests
async function getQuizActions() {
  try {
    return await import("../actions/quiz-actions");
  } catch {
    try {
      const p = "../actions/quiz-actions.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

// In-memory test store for quiz attempts & mistakes
const globalMistakesState = globalThis as unknown as {
  __localTestMistakes?: any[];
  __localTestAttempts?: any[];
};

export function _injectTestMistakes(mistakes: any[]) {
  globalMistakesState.__localTestMistakes = mistakes;
}

export function _injectTestAttempts(attempts: any[]) {
  globalMistakesState.__localTestAttempts = attempts;
}

import {
  calculateFreeSlots,
  calculateSubjectMastery,
  detectConflicts,
} from "./planning-engine.ts";
import type {
  AIPlanRequest,
  SubjectMasterySummary,
  TimeConflict,
  TimeSlot,
} from "./types.ts";
import type { Subject, AcademicTask, CalendarTimeblock } from "@/types/database";

export interface UserContextSnapshot {
  userId: string;
  userName: string;
  date: string;
  workingHours: { start: string; end: string };
  tasks: AcademicTask[];
  existingBlocks: CalendarTimeblock[];
  freeSlots: TimeSlot[];
  conflicts: TimeConflict[];
  masteryList: SubjectMasterySummary[];
  subjects: Subject[];
}

/**
 * Fetch and aggregate complete authenticated user context for the coach
 */
export async function getAuthorizedUserContext(
  targetDateStr: string = new Date().toISOString().slice(0, 10),
  workingHours: { start: string; end: string } = { start: "08:00", end: "22:00" }
): Promise<UserContextSnapshot | null> {
  const user = await getRequesterUser();
  if (!user?.id) {
    return null;
  }

  const userId = user.id;

  const quizMod = await getQuizActions();
  const attemptsPromise = globalMistakesState.__localTestAttempts
    ? Promise.resolve(globalMistakesState.__localTestAttempts)
    : quizMod?.getStudentQuizAttempts
    ? quizMod.getStudentQuizAttempts(userId).catch(() => [])
    : Promise.resolve([]);

  const mistakesPromise = globalMistakesState.__localTestMistakes
    ? Promise.resolve(globalMistakesState.__localTestMistakes)
    : quizMod?.getStudentMistakes
    ? quizMod.getStudentMistakes(userId).catch(() => [])
    : Promise.resolve([]);

  // Retrieve data in parallel
  const [dbSubjects, tasksRes, blocksRes, attempts, mistakes] = await Promise.all([
    getSubjects(undefined, userId).catch(() => [] as Subject[]),
    getAcademicTasksAction().catch(() => ({ success: false, data: [] })),
    getCalendarTimeblocksAction(targetDateStr, targetDateStr).catch(() => ({ success: false, data: [] })),
    attemptsPromise,
    mistakesPromise,
  ]);

  const defaultIgl4Subjects: Subject[] = [
    { id: "sub-igl4-archi", name: "Architecture Logicielle & Microservices", slug: "archi-logicielle", semester_id: "s1", description: "Design patterns, microservices", icon: "Boxes", sort_order: 1, is_active: true, created_at: "", updated_at: "" },
    { id: "sub-igl4-cloud", name: "Systèmes Répartis & Cloud Computing", slug: "systemes-repartis", semester_id: "s1", description: "Calcul distribué, cloud", icon: "Cloud", sort_order: 2, is_active: true, created_at: "", updated_at: "" },
    { id: "sub-igl4-devops", name: "DevOps & Intégration Continue", slug: "devops", semester_id: "s1", description: "CI/CD, Kubernetes, Docker", icon: "Workflow", sort_order: 3, is_active: true, created_at: "", updated_at: "" },
    { id: "sub-igl4-secu", name: "Sécurité & Audit des Systèmes", slug: "securite-si", semester_id: "s2", description: "Cryptographie, sécurité applicative", icon: "Shield", sort_order: 4, is_active: true, created_at: "", updated_at: "" },
  ];

  const subjects = (dbSubjects && dbSubjects.length > 0) ? dbSubjects : defaultIgl4Subjects;

  const tasks: AcademicTask[] = (tasksRes as any).success ? (tasksRes as any).data : [];
  const existingBlocks: CalendarTimeblock[] = (blocksRes as any).success ? (blocksRes as any).data : [];

  // Filter tasks to active or relevant to this user
  const userTasks = tasks.filter((t) => t.user_id === userId || !t.user_id);
  const userBlocks = existingBlocks.filter((b) => b.user_id === userId || !b.user_id);

  // 1. Calculate available free slots
  const freeSlots = calculateFreeSlots(workingHours, userBlocks);

  // 2. Detect any existing conflicts within current calendar blocks
  const conflicts: TimeConflict[] = [];
  for (let i = 0; i < userBlocks.length; i++) {
    for (let j = i + 1; j < userBlocks.length; j++) {
      const b1 = userBlocks[i];
      const b2 = userBlocks[j];
      const conf = detectConflicts(b1.start_time, b1.end_time, [b2]);
      if (conf.length > 0) {
        conflicts.push(...conf);
      }
    }
  }

  // 3. Compute deterministic subject mastery summaries
  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Group attempts by subject
  const attemptsBySubject = new Map<string, any[]>();
  for (const attempt of attempts) {
    const subId = (attempt.quiz as any)?.subject_id || (attempt.quiz as any)?.subject?.id;
    if (subId) {
      if (!attemptsBySubject.has(subId)) attemptsBySubject.set(subId, []);
      attemptsBySubject.get(subId)!.push(attempt);
    }
  }

  // Group mistakes by subject
  const mistakesBySubject = new Map<string, any[]>();
  for (const m of mistakes) {
    // Find matching subject
    const matchedSub = subjects.find(
      (s) => s.name?.toLowerCase() === m.subject_name?.toLowerCase() || s.id === (m as any).subject_id
    );
    const subId = matchedSub ? matchedSub.id : "default-subject";
    if (!mistakesBySubject.has(subId)) mistakesBySubject.set(subId, []);
    mistakesBySubject.get(subId)!.push({
      questionText: m.question_text,
      explanation: m.explanation,
      userAnswer: m.user_answer,
      correctAnswer: m.correct_answer,
    });
  }

  const masteryList: SubjectMasterySummary[] = [];

  for (const subject of subjects) {
    const subAttempts = attemptsBySubject.get(subject.id) || [];
    const subMistakes = mistakesBySubject.get(subject.id) || [];

    let totalQuestions = 0;
    let correctAnswers = 0;
    let lastPracticedAt: string | null = null;

    for (const a of subAttempts) {
      totalQuestions += a.total_questions || 0;
      correctAnswers += a.score || 0;
      if (!lastPracticedAt || new Date(a.completed_at).getTime() > new Date(lastPracticedAt).getTime()) {
        lastPracticedAt = a.completed_at;
      }
    }

    const mastery = calculateSubjectMastery({
      subjectId: subject.id,
      subjectName: subject.name,
      slug: subject.slug,
      totalAttempts: subAttempts.length,
      correctAnswers,
      totalQuestions,
      lastPracticedAt,
      targetDateStr,
      recentMistakes: subMistakes.slice(0, 5),
    });

    masteryList.push(mastery);
  }

  // Sort mastery: critical & warning first
  masteryList.sort((a, b) => a.masteryScore - b.masteryScore);

  return {
    userId,
    userName: user.name || "Étudiant IGL4",
    date: targetDateStr,
    workingHours,
    tasks: userTasks,
    existingBlocks: userBlocks,
    freeSlots,
    conflicts,
    masteryList,
    subjects,
  };
}
