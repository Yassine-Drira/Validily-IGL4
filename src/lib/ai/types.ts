/**
 * Autonomous AI Coach & Scheduler - Type Definitions & Contracts
 * Pure TypeScript interfaces for deterministic planning, conversational RAG, and validation.
 */

import type {
  AcademicTask,
  CalendarTimeblock,
  Subject,
  QuizAttempt,
  FocusSession,
  HabitWithTodayState,
} from "@/types/database";

export type UrgencyLevel = "critical" | "warning" | "moderate" | "mastered";

export interface SubjectMasterySummary {
  subjectId: string;
  subjectName: string;
  slug?: string;
  totalAttempts: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracyRate: number; // 0 to 1
  lastPracticedAt: string | null;
  daysSinceLastReview: number;
  masteryScore: number; // 0 to 100
  urgencyLevel: UrgencyLevel;
  recentMistakes: Array<{
    questionText: string;
    explanation?: string;
    userAnswer?: string;
    correctAnswer?: string;
  }>;
}

export interface TimeSlot {
  start: string; // HH:MM (24h)
  end: string;   // HH:MM (24h)
  durationMinutes: number;
}

export interface TimeConflict {
  existingBlockId: string;
  title: string;
  startTime: string;
  endTime: string;
  conflictType: "direct_overlap" | "partial_overlap";
  proposedStartTime: string;
  proposedEndTime: string;
}

export interface ProposedTimeblock {
  tempId: string;
  taskId: string | null;
  subjectId: string | null;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  rationale: string;
  category: "revision" | "practice" | "deep_work" | "drill";
}

export type CoachingRecommendationType =
  | "urgent_task"
  | "weak_point_drill"
  | "schedule_adjustment"
  | "break_recovery"
  | "spaced_review";

export interface CoachingAction {
  label: string;
  actionType: "schedule_block" | "start_drill" | "start_focus" | "view_task";
  payload?: Record<string, any>;
}

export interface CoachingRecommendation {
  id: string;
  type: CoachingRecommendationType;
  title: string;
  description: string;
  reasoning: string; // Grounded evidence (e.g., "DevOps quiz accuracy 40%, deadline in 2 days")
  priority: "high" | "medium" | "low";
  relatedTaskId?: string | null;
  relatedSubjectId?: string | null;
  action: CoachingAction;
}

export interface AdaptiveDrillQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  questionText: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  verified: boolean; // True if sourced from curriculum/mistakes; false if AI-generated synthetic
}

export interface AdaptiveDrill {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  questions: AdaptiveDrillQuestion[];
  generatedAt: string;
  source: "mistake_review" | "weakness_drill" | "curriculum_bank";
}

export interface PlanTelemetry {
  provider: string;
  model: string;
  latencyMs: number;
  cacheHit: boolean;
  tokensUsed?: number;
  isFallback: boolean;
  errorMessage?: string;
}

export interface AIPlanResponse {
  date: string;
  overview: string;
  availableMinutes: number;
  bookedMinutes: number;
  recommendations: CoachingRecommendation[];
  proposedSchedule: ProposedTimeblock[];
  weakPoints: SubjectMasterySummary[];
  conflicts: TimeConflict[];
  freeSlots: TimeSlot[];
  telemetry: PlanTelemetry;
}

export interface AIPlanRequest {
  userId: string;
  date: string; // YYYY-MM-DD
  workingHours: {
    start: string; // HH:MM default "08:00"
    end: string;   // HH:MM default "22:00"
  };
  tasks: AcademicTask[];
  existingBlocks: CalendarTimeblock[];
  masteryList: SubjectMasterySummary[];
  freeSlots: TimeSlot[];
  focusHistory?: FocusSession[];
  habits?: HabitWithTodayState[];
}

export interface AIDrillRequest {
  userId: string;
  subjectId?: string;
  targetResourceId?: string;
  targetNoteId?: string;
  targetDocTitle?: string;
  targetCount?: number;
  preferredDifficulty?: "beginner" | "intermediate" | "advanced";
}

// -----------------------------------------------------------------------------
// Conversational RAG & Assistant Contracts
// -----------------------------------------------------------------------------

export type EvidenceType = "task" | "calendar" | "assessment" | "mistake" | "availability" | "document" | "note";

export interface EvidenceCitation {
  type: EvidenceType;
  id: string;
  label: string;
  detail: string;
}

export interface ProposedDrillAction {
  subjectId: string;
  subjectName: string;
  questionCount: number;
  reason?: string;
  targetResourceId?: string;
  targetNoteId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  citations?: EvidenceCitation[];
  recommendations?: CoachingRecommendation[];
  proposedSchedule?: ProposedTimeblock[];
  proposedDrill?: ProposedDrillAction | null;
  telemetry?: PlanTelemetry;
}

export interface CoachChatRequest {
  userId: string;
  date: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context: AIPlanRequest;
  retrievedChunks?: Array<{
    sourceId: string;
    sourceType: string;
    title: string;
    content: string;
    snippet: string;
  }>;
}

export interface RAGQuizRequest {
  userId: string;
  subjectId?: string;
  resourceId?: string;
  noteId?: string;
  questionCount: number; // 3, 5, 10
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface CoachChatResponse {
  reply: string;
  citations: EvidenceCitation[];
  recommendations: CoachingRecommendation[];
  proposedSchedule: ProposedTimeblock[];
  proposedDrill: ProposedDrillAction | null;
  telemetry: PlanTelemetry;
}
