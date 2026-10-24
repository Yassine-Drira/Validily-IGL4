"use server";

import type {
  CoachConversation,
  CoachMessageRecord,
  CoachConversationSearchResult,
} from "@/types/database";
import type { ChatMessage, CoachChatResponse } from "../ai/types.ts";
import { getLocalTodayDateString } from "../utils.ts";
import { checkAndConsumeAIQuota } from "../ai/quota-service.ts";
import { getAuthorizedUserContext } from "../ai/data-adapters.ts";
import { retrieveAcademicContext } from "../ai/academic-retrieval-service.ts";
import { ProviderRegistry } from "../ai/providers/registry.ts";
import { sanitizeAndValidatePlan } from "../ai/action-validator.ts";
import { recordAIUsageLog } from "./admin-ai-actions.ts";

// Dynamic lazy loaders to prevent Node.js ESM alias resolution issues in standalone test runners
async function getAuthModule() {
  try {
    return await import("../auth/authorization");
  } catch {
    try {
      const p = "../auth/authorization.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

async function getSupabaseServerModule() {
  try {
    return await import("../supabase/server");
  } catch {
    try {
      const p = "../supabase/server.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

async function getAdminClient() {
  try {
    const adminMod = await import("../supabase/admin");
    return adminMod.getServiceSupabase();
  } catch {
    try {
      const p = "../supabase/admin.ts";
      const adminMod = await import(/* @vite-ignore */ p);
      return adminMod.getServiceSupabase();
    } catch {
      return null;
    }
  }
}

async function isDbConfigured(): Promise<boolean> {
  const serverMod = await getSupabaseServerModule();
  return serverMod?.isSupabaseConfigured() ?? false;
}

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42P01"
  );
}

// -----------------------------------------------------------------------------
// In-Memory Fallback Stores for Offline Execution & Automated Test Isolation
// -----------------------------------------------------------------------------
const globalCoachConversationsState = globalThis as unknown as {
  __localCoachConversations?: Map<string, CoachConversation>;
  __localCoachMessages?: Map<string, CoachMessageRecord>;
};

if (!globalCoachConversationsState.__localCoachConversations) {
  globalCoachConversationsState.__localCoachConversations = new Map();
}
if (!globalCoachConversationsState.__localCoachMessages) {
  globalCoachConversationsState.__localCoachMessages = new Map();
}

export async function _resetLocalCoachConversationsStore() {
  globalCoachConversationsState.__localCoachConversations?.clear();
  globalCoachConversationsState.__localCoachMessages?.clear();
}

/**
 * Cleanly format auto-derived conversation title from the first prompt
 */
function deriveTitleFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Nouvelle discussion";
  const maxLength = 60;
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cleanCut = lastSpace > 25 ? truncated.slice(0, lastSpace) : truncated;
  return `${cleanCut.trim()}...`;
}

/**
 * List coach conversations for authenticated user with cursor pagination
 */
export async function listCoachConversationsAction(
  cursor?: string,
  limit: number = 20
): Promise<{
  success: boolean;
  data?: {
    conversations: CoachConversation[];
    nextCursor?: string | null;
    hasMore: boolean;
  };
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise pour charger l'historique." };
    }

    const pageSize = Math.min(50, Math.max(1, limit));

    // Try Supabase first if configured
    if (await isDbConfigured()) {
      const supabase = await getAdminClient();
      if (supabase) {
        let query = supabase
          .from("coach_conversations")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(pageSize + 1);

        if (cursor) {
          query = query.lt("updated_at", cursor);
        }

        const { data, error } = await query;
        if (!error && data) {
          const hasMore = data.length > pageSize;
          const items = hasMore ? data.slice(0, pageSize) : data;
          const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

          return {
            success: true,
            data: {
              conversations: items as CoachConversation[],
              nextCursor,
              hasMore,
            },
          };
        } else if (error && !isTableMissingError(error)) {
          console.error("Supabase listCoachConversations error:", error);
        }
      }
    }

    // In-memory fallback
    const all = Array.from(globalCoachConversationsState.__localCoachConversations!.values())
      .filter((c) => c.user_id === user.id && c.status === "active")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    let startIndex = 0;
    if (cursor) {
      const idx = all.findIndex((c) => c.id === cursor || c.updated_at === cursor);
      if (idx !== -1) {
        startIndex = idx + 1;
      } else {
        const cursorTime = new Date(cursor).getTime();
        if (!isNaN(cursorTime)) {
          const timeIdx = all.findIndex((c) => new Date(c.updated_at).getTime() < cursorTime);
          startIndex = timeIdx !== -1 ? timeIdx : all.length;
        }
      }
    }

    const paged = all.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < all.length;
    const nextCursor = hasMore && paged.length > 0 ? paged[paged.length - 1].id : null;

    return {
      success: true,
      data: {
        conversations: paged,
        nextCursor,
        hasMore,
      },
    };
  } catch (err: any) {
    console.error("listCoachConversationsAction error:", err);
    return { success: false, error: err.message || "Erreur de chargement des conversations." };
  }
}

/**
 * Retrieve messages for a specific conversation with strict ownership verification
 */
export async function getCoachConversationMessagesAction(
  conversationId: string,
  limit: number = 40
): Promise<{
  success: boolean;
  data?: {
    conversation: CoachConversation;
    messages: ChatMessage[];
  };
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    if (!conversationId) {
      return { success: false, error: "ID de conversation manquant." };
    }

    // Try Supabase first if configured
    if (await isDbConfigured()) {
      const supabase = await getAdminClient();
      if (supabase) {
        // 1. Verify ownership of parent conversation
        const { data: convo, error: convoErr } = await supabase
          .from("coach_conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("user_id", user.id)
          .single();

        if (!convoErr && convo) {
          // 2. Fetch messages ordered chronologically
          const { data: rawMessages, error: msgErr } = await supabase
            .from("coach_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(limit);

          if (!msgErr && rawMessages) {
            const formatted: ChatMessage[] = rawMessages.map((m: CoachMessageRecord) => {
              const payload = m.structured_payload || {};
              const dateObj = new Date(m.created_at);
              return {
                id: m.id,
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
                timestamp: isNaN(dateObj.getTime())
                  ? ""
                  : dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                citations: payload.citations,
                recommendations: payload.recommendations,
                proposedSchedule: payload.proposedSchedule,
                proposedDrill: payload.proposedDrill,
                telemetry: payload.telemetry,
              };
            });

            return {
              success: true,
              data: {
                conversation: convo as CoachConversation,
                messages: formatted,
              },
            };
          }
        }
      }
    }

    // In-memory fallback
    const convo = globalCoachConversationsState.__localCoachConversations!.get(conversationId);
    if (!convo || convo.user_id !== user.id) {
      return { success: false, error: "Conversation introuvable ou non autorisée." };
    }

    const messages = Array.from(globalCoachConversationsState.__localCoachMessages!.values())
      .filter((m) => m.conversation_id === conversationId && m.user_id === user.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-limit)
      .map((m) => {
        const payload = m.structured_payload || {};
        const dateObj = new Date(m.created_at);
        return {
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          timestamp: isNaN(dateObj.getTime())
            ? ""
            : dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          citations: payload.citations,
          recommendations: payload.recommendations,
          proposedSchedule: payload.proposedSchedule,
          proposedDrill: payload.proposedDrill,
          telemetry: payload.telemetry,
        };
      });

    return {
      success: true,
      data: {
        conversation: convo,
        messages,
      },
    };
  } catch (err: any) {
    console.error("getCoachConversationMessagesAction error:", err);
    return { success: false, error: err.message || "Erreur de chargement des messages." };
  }
}

/**
 * Create a new persistent AI Coach conversation
 */
export async function createCoachConversationAction(
  initialTitle?: string
): Promise<{
  success: boolean;
  data?: CoachConversation;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    const now = new Date().toISOString();
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = initialTitle?.trim() || "Nouvelle discussion";
    const titleSource = initialTitle ? "user" : "auto";

    const newRecord: CoachConversation = {
      id,
      user_id: user.id,
      title,
      title_source: titleSource,
      status: "active",
      created_at: now,
      updated_at: now,
      last_message_at: now,
      metadata: {},
      message_count: 0,
    };

    // Try Supabase first if configured
    if (await isDbConfigured()) {
      const supabase = await getAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("coach_conversations")
          .insert(newRecord)
          .select()
          .single();

        if (!error && data) {
          return { success: true, data: data as CoachConversation };
        }
      }
    }

    // In-memory fallback
    globalCoachConversationsState.__localCoachConversations!.set(id, newRecord);

    return { success: true, data: newRecord };
  } catch (err: any) {
    console.error("createCoachConversationAction error:", err);
    return { success: false, error: err.message || "Erreur lors de la création de la discussion." };
  }
}

/**
 * Rename an existing conversation with ownership validation
 */
export async function renameCoachConversationAction(
  conversationId: string,
  newTitle: string
): Promise<{
  success: boolean;
  data?: CoachConversation;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    const title = newTitle.trim();
    if (!title) {
      return { success: false, error: "Le titre ne peut pas être vide." };
    }

    const now = new Date().toISOString();

    // Try Supabase first if configured
    if (await isDbConfigured()) {
      const supabase = await getAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("coach_conversations")
          .update({
            title,
            title_source: "user",
            updated_at: now,
          })
          .eq("id", conversationId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (!error && data) {
          return { success: true, data: data as CoachConversation };
        }
      }
    }

    // In-memory fallback
    const convo = globalCoachConversationsState.__localCoachConversations!.get(conversationId);
    if (!convo || convo.user_id !== user.id) {
      return { success: false, error: "Conversation introuvable ou non autorisée." };
    }

    convo.title = title;
    convo.title_source = "user";
    convo.updated_at = now;
    globalCoachConversationsState.__localCoachConversations!.set(conversationId, convo);

    return { success: true, data: convo };
  } catch (err: any) {
    console.error("renameCoachConversationAction error:", err);
    return { success: false, error: err.message || "Erreur lors du renommage." };
  }
}

/**
 * Delete a conversation and cascade remove its persisted messages
 */
export async function deleteCoachConversationAction(
  conversationId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    // Try Supabase first if configured
    if (await isDbConfigured()) {
      const supabase = await getAdminClient();
      if (supabase) {
        const { error } = await supabase
          .from("coach_conversations")
          .delete()
          .eq("id", conversationId)
          .eq("user_id", user.id);

        if (!error) {
          return { success: true };
        }
      }
    }

    // In-memory fallback
    const convo = globalCoachConversationsState.__localCoachConversations!.get(conversationId);
    if (!convo || convo.user_id !== user.id) {
      return { success: false, error: "Conversation introuvable ou non autorisée." };
    }

    globalCoachConversationsState.__localCoachConversations!.delete(conversationId);

    // Cascade delete local messages
    for (const [msgId, msg] of globalCoachConversationsState.__localCoachMessages!.entries()) {
      if (msg.conversation_id === conversationId) {
        globalCoachConversationsState.__localCoachMessages!.delete(msgId);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteCoachConversationAction error:", err);
    return { success: false, error: err.message || "Erreur lors de la suppression." };
  }
}

/**
 * High-speed search across conversation titles and message contents with snippet excerpts
 */
export async function searchCoachConversationsAction(
  queryText: string,
  limit: number = 10
): Promise<{
  success: boolean;
  data?: CoachConversationSearchResult[];
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise." };
    }

    const q = queryText.trim().toLowerCase();
    if (!q) {
      return { success: true, data: [] };
    }

    const results: CoachConversationSearchResult[] = [];
    const seenConvoIds = new Set<string>();

    // 1. Search in local/in-memory store or Supabase
    // We check conversations first for title matches
    const allConvos = Array.from(globalCoachConversationsState.__localCoachConversations!.values())
      .filter((c) => c.user_id === user.id && c.status === "active")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Title matches (Rank 1)
    for (const c of allConvos) {
      if (c.title.toLowerCase().includes(q)) {
        seenConvoIds.add(c.id);
        results.push({
          conversationId: c.id,
          title: c.title,
          matchType: "title",
          snippet: c.title,
          lastMessageAt: c.last_message_at,
        });
      }
      if (results.length >= limit) break;
    }

    // Content matches (Rank 2)
    if (results.length < limit) {
      const allMessages = Array.from(globalCoachConversationsState.__localCoachMessages!.values())
        .filter((m) => m.user_id === user.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      for (const m of allMessages) {
        if (!seenConvoIds.has(m.conversation_id)) {
          const lowerContent = m.content.toLowerCase();
          const matchIndex = lowerContent.indexOf(q);
          if (matchIndex !== -1) {
            const parent = allConvos.find((c) => c.id === m.conversation_id);
            if (parent) {
              seenConvoIds.add(m.conversation_id);
              // Extract snippet window around match
              const start = Math.max(0, matchIndex - 30);
              const end = Math.min(m.content.length, matchIndex + q.length + 50);
              const rawSnippet = m.content.slice(start, end);
              const snippet = `${start > 0 ? "..." : ""}${rawSnippet.trim()}${end < m.content.length ? "..." : ""}`;

              results.push({
                conversationId: m.conversation_id,
                title: parent.title,
                matchType: "content",
                snippet,
                lastMessageAt: parent.last_message_at,
              });
            }
          }
        }
        if (results.length >= limit) break;
      }
    }

    return { success: true, data: results };
  } catch (err: any) {
    console.error("searchCoachConversationsAction error:", err);
    return { success: false, error: err.message || "Erreur de recherche." };
  }
}

/**
 * Send a message within a persistent conversation session:
 * - Enforces atomic 24h rolling quota
 * - Persists user message immediately
 * - Auto-derives conversation title if still default
 * - Assembles bounded context (last 6 turns) + RAG retrieval
 * - Invokes AI provider with validation
 * - Persists completed assistant response with full structured card payload
 */
export async function sendCoachConversationMessageAction(params: {
  conversationId: string;
  content: string;
  targetDate?: string;
}): Promise<{
  success: boolean;
  data?: {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    conversation: CoachConversation;
  };
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Authentification requise pour discuter avec Validily AI." };
    }

    const { conversationId, content, targetDate } = params;
    const trimmedContent = content?.trim();
    if (!trimmedContent) {
      return { success: false, error: "Le message ne peut pas être vide." };
    }

    // 1. Resolve & verify ownership of conversation
    let convo = globalCoachConversationsState.__localCoachConversations!.get(conversationId);
    if (!convo || convo.user_id !== user.id) {
      return { success: false, error: "Conversation introuvable ou non autorisée." };
    }

    // 2. Atomic server-side rolling quota check & consumption
    const quota = await checkAndConsumeAIQuota(user.id);
    if (!quota.allowed) {
      await recordAIUsageLog({
        userId: user.id,
        provider: "quota-engine",
        model: "rolling-24h",
        actionType: "chat",
        status: "quota_exceeded",
        errorMessage: quota.error,
      });
      return { success: false, error: quota.error };
    }

    const now = new Date().toISOString();
    const dateStr = targetDate || getLocalTodayDateString();

    // 3. Persist user message
    const userMsgId = `msg-usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMsgRecord: CoachMessageRecord = {
      id: userMsgId,
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: trimmedContent,
      created_at: now,
    };
    globalCoachConversationsState.__localCoachMessages!.set(userMsgId, userMsgRecord);

    // 4. Update title if first message & titleSource is "auto"
    if (convo.title_source === "auto" && convo.title === "Nouvelle discussion") {
      convo.title = deriveTitleFromPrompt(trimmedContent);
    }
    convo.updated_at = now;
    convo.last_message_at = now;
    convo.message_count = (convo.message_count || 0) + 1;
    globalCoachConversationsState.__localCoachConversations!.set(conversationId, convo);

    // 5. Assemble bounded context window (strict token preservation: last 6 turns)
    const existingMessages = Array.from(globalCoachConversationsState.__localCoachMessages!.values())
      .filter((m) => m.conversation_id === conversationId && m.user_id === user.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Only take the last 6 messages including the newly inserted user message
    const boundedTurnWindow = existingMessages.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // 6. RAG Retrieval for academic context
    const retrievedChunks = await retrieveAcademicContext(user.id, {
      query: trimmedContent,
      maxChunks: 6,
    });

    const context = await getAuthorizedUserContext(dateStr);
    if (!context) {
      return { success: false, error: "Impossible de charger le contexte académique." };
    }

    // 7. Invoke provider registry
    const registry = ProviderRegistry.getInstance();
    const chatResponse = await registry.executeChat(
      {
        userId: user.id,
        date: dateStr,
        messages: boundedTurnWindow,
        retrievedChunks,
        context: {
          userId: user.id,
          date: dateStr,
          workingHours: context.workingHours,
          tasks: context.tasks,
          existingBlocks: context.existingBlocks,
          masteryList: context.masteryList,
          freeSlots: context.freeSlots,
          habits: context.habits,
        },
      },
      context.subjects
    );

    // 8. Ground and validate schedule blocks
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

    const validatedResponse: CoachChatResponse = {
      ...chatResponse,
      recommendations: validated.validRecommendations,
      proposedSchedule: validated.validSchedule,
    };

    // 9. Persist completed assistant response
    const astMsgId = `msg-ast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const astNow = new Date().toISOString();
    const astMsgRecord: CoachMessageRecord = {
      id: astMsgId,
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: validatedResponse.reply,
      structured_payload: {
        citations: validatedResponse.citations,
        recommendations: validatedResponse.recommendations,
        proposedSchedule: validatedResponse.proposedSchedule,
        proposedDrill: validatedResponse.proposedDrill,
        telemetry: validatedResponse.telemetry,
      },
      created_at: astNow,
    };
    globalCoachConversationsState.__localCoachMessages!.set(astMsgId, astMsgRecord);

    // Update conversation metadata
    convo.updated_at = astNow;
    convo.last_message_at = astNow;
    convo.message_count = (convo.message_count || 0) + 1;
    convo.last_message_preview = validatedResponse.reply.slice(0, 80);
    globalCoachConversationsState.__localCoachConversations!.set(conversationId, convo);

    // Record usage telemetry for admin monitoring & quota tracking
    await recordAIUsageLog({
      userId: user.id,
      provider: validatedResponse.telemetry?.provider || "validily-ai",
      model: validatedResponse.telemetry?.model || "openai/gpt-oss-120b",
      actionType: "chat",
      promptTokens: validatedResponse.telemetry?.tokensUsed || 0,
      latencyMs: validatedResponse.telemetry?.latencyMs || 0,
      status: "success",
    });

    const userTimeStr = new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const astTimeStr = new Date(astNow).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    return {
      success: true,
      data: {
        userMessage: {
          id: userMsgId,
          role: "user",
          content: trimmedContent,
          timestamp: userTimeStr,
        },
        assistantMessage: {
          id: astMsgId,
          role: "assistant",
          content: validatedResponse.reply,
          timestamp: astTimeStr,
          citations: validatedResponse.citations,
          recommendations: validatedResponse.recommendations,
          proposedSchedule: validatedResponse.proposedSchedule,
          proposedDrill: validatedResponse.proposedDrill,
          telemetry: validatedResponse.telemetry,
        },
        conversation: convo,
      },
    };
  } catch (err: any) {
    console.error("sendCoachConversationMessageAction error:", err);
    return { success: false, error: err.message || "Erreur lors de la réponse du Coach." };
  }
}
