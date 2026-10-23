/**
 * Inference Provider Interface
 * Isolates model vendor logic behind a stable, interchangeable contract.
 */

import type {
  AIPlanRequest,
  AIDrillRequest,
  CoachingRecommendation,
  ProposedTimeblock,
  AdaptiveDrill,
} from "../types";
import type { Subject } from "@/types/database";

export interface AIPlanGenerationResult {
  overview: string;
  recommendations: CoachingRecommendation[];
  proposedSchedule: ProposedTimeblock[];
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
}
