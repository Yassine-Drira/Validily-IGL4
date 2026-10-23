/**
 * AI Provider Registry & Resilient Fallback Router
 * Discovers available providers and executes inference with guaranteed deterministic fallback.
 */

import type { AIInferenceProvider } from "./interface.ts";
import { MockFallbackProvider } from "./mock-fallback-provider.ts";
import { GroqProvider } from "./groq-provider.ts";
import { GeminiProvider } from "./gemini-provider.ts";
import type {
  AIPlanRequest,
  AIDrillRequest,
  AIPlanResponse,
  AdaptiveDrill,
  CoachChatRequest,
  CoachChatResponse,
} from "../types.ts";
import { detectConflicts } from "../planning-engine.ts";
import type { Subject } from "@/types/database";

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private fallbackProvider: MockFallbackProvider;
  private groqProvider: GroqProvider;
  private geminiProvider: GeminiProvider;

  private constructor() {
    this.fallbackProvider = new MockFallbackProvider();
    this.groqProvider = new GroqProvider();
    this.geminiProvider = new GeminiProvider();
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Determine primary active provider based on environment credentials
   */
  public getActiveProvider(): AIInferenceProvider {
    if (this.groqProvider.isConfigured()) {
      return this.groqProvider;
    }
    if (this.geminiProvider.isConfigured()) {
      return this.geminiProvider;
    }
    return this.fallbackProvider;
  }

  public getFallbackProvider(): MockFallbackProvider {
    return this.fallbackProvider;
  }

  /**
   * Execute coaching plan generation with automatic failover and telemetry capture
   */
  public async executePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
    const startTime = Date.now();
    const primary = this.getActiveProvider();
    let isFallback = primary.id === this.fallbackProvider.id;
    let providerName = primary.name;
    let errorMessage: string | undefined = undefined;

    let result;
    try {
      result = await primary.generateCoachingPlan(request);
    } catch (err: any) {
      // Automatic fallback on remote failure / 429 / timeout
      console.warn(`[AI-Coach] Remote provider ${primary.name} failed: ${err.message}. Falling back to deterministic engine.`);
      isFallback = true;
      providerName = this.fallbackProvider.name;
      errorMessage = err.message || "Provider unavailable";
      result = await this.fallbackProvider.generateCoachingPlan(request);
    }

    const duration = Date.now() - startTime;

    // Detect any conflicts in the proposed schedule against existing blocks
    const allConflicts = (result.proposedSchedule || []).flatMap((block) =>
      detectConflicts(block.startTime, block.endTime, request.existingBlocks)
    );

    const bookedMinutes = request.existingBlocks.reduce(
      (sum, b) => sum + (b.duration_minutes || 0),
      0
    );
    const availableMinutes = request.freeSlots.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );

    return {
      date: request.date,
      overview: result.overview,
      availableMinutes,
      bookedMinutes,
      recommendations: result.recommendations,
      proposedSchedule: result.proposedSchedule,
      weakPoints: request.masteryList,
      conflicts: allConflicts,
      freeSlots: request.freeSlots,
      telemetry: {
        provider: providerName,
        model: isFallback ? "heuristic-v1" : (primary as any).model || "remote-llm",
        latencyMs: duration,
        cacheHit: false,
        tokensUsed: result.tokensUsed || 0,
        isFallback,
        errorMessage,
      },
    };
  }

  /**
   * Execute adaptive drill generation with fallback
   */
  public async executeDrill(
    request: AIDrillRequest,
    mistakes: any[] = [],
    subjects: Subject[] = []
  ): Promise<AdaptiveDrill> {
    const primary = this.getActiveProvider();

    try {
      return await primary.generateAdaptiveDrill(request, mistakes, subjects);
    } catch (err: any) {
      console.warn(`[AI-Coach] Drill generation failed on ${primary.name}: ${err.message}. Using local mistake-based bank.`);
      return await this.fallbackProvider.generateAdaptiveDrill(request, mistakes, subjects);
    }
  }

  /**
   * Execute conversational RAG query with automatic failover and telemetry capture
   */
  public async executeChat(
    request: CoachChatRequest,
    subjects: Subject[]
  ): Promise<CoachChatResponse> {
    const startTime = Date.now();
    const primary = this.getActiveProvider();
    let isFallback = primary.id === this.fallbackProvider.id;
    let providerName = primary.name;
    let errorMessage: string | undefined = undefined;

    let result;
    try {
      result = await primary.generateChatResponse(request, subjects);
    } catch (err: any) {
      console.warn(`[AI-Coach] Chat error on ${primary.name}: ${err.message}. Falling back to deterministic assistant.`);
      isFallback = true;
      providerName = this.fallbackProvider.name;
      errorMessage = err.message || "Provider unavailable";
      result = await this.fallbackProvider.generateChatResponse(request, subjects);
    }

    const duration = Date.now() - startTime;

    return {
      reply: result.reply,
      citations: result.citations || [],
      recommendations: result.recommendations || [],
      proposedSchedule: result.proposedSchedule || [],
      proposedDrill: result.proposedDrill || null,
      telemetry: {
        provider: providerName,
        model: isFallback ? "deterministic-assistant-v1" : (primary as any).model || "remote-llm",
        latencyMs: duration,
        cacheHit: false,
        tokensUsed: result.tokensUsed || 0,
        isFallback,
        errorMessage,
      },
    };
  }
}
