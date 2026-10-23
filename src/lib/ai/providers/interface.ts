/**
 * Inference Provider Interface
 * Isolates model vendor logic behind a stable, interchangeable contract.
 */

import type {
  AIPlanRequest,
  AIDrillRequest,
  CoachChatRequest,
  CoachingRecommendation,
  ProposedTimeblock,
  AdaptiveDrill,
  EvidenceCitation,
  ProposedDrillAction,
} from "../types.ts";
import type { Subject } from "@/types/database";

export interface AIPlanGenerationResult {
  overview: string;
  recommendations: CoachingRecommendation[];
  proposedSchedule: ProposedTimeblock[];
  tokensUsed?: number;
}

export interface AIChatGenerationResult {
  reply: string;
  citations: EvidenceCitation[];
  recommendations: CoachingRecommendation[];
  proposedSchedule: ProposedTimeblock[];
  proposedDrill: ProposedDrillAction | null;
  tokensUsed?: number;
}

export interface AIInferenceProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  generateCoachingPlan(request: AIPlanRequest): Promise<AIPlanGenerationResult>;
  generateAdaptiveDrill(
    request: AIDrillRequest,
    mistakes: any[],
    subjects: Subject[]
  ): Promise<AdaptiveDrill>;
  generateChatResponse(
    request: CoachChatRequest,
    subjects: Subject[]
  ): Promise<AIChatGenerationResult>;
}
