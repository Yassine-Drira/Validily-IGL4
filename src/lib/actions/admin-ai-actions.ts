"use server";

import type { AIUsageLog, AIMonitoringSummary, AIActionType, AIRequestStatus } from "@/types/database";
import { getRequesterUser, isUserAdmin } from "../auth/authorization.ts";
import { resetUserAIQuota, getAIQuotaStatus } from "../ai/quota-service.ts";
import { grantVipAccess, revokeVipAccess, getUserVipStatus } from "./vip-actions.ts";
import type { ManagedUser } from "./admin-actions.ts";

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
  try {
    const serverMod = await import("../supabase/server");
    return serverMod?.isSupabaseConfigured() ?? false;
  } catch {
    return false;
  }
}

// In-memory fallback hot store for AI usage logs
const globalAIUsageState = globalThis as unknown as {
  __localAIUsageLogs?: AIUsageLog[];
};
if (!globalAIUsageState.__localAIUsageLogs) {
  globalAIUsageState.__localAIUsageLogs = [];
}

/**
 * Record an AI inference or quota audit log entry in Supabase and hot-memory
 */
export async function recordAIUsageLog(entry: {
  userId: string;
  provider: string;
  model: string;
  actionType: AIActionType;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  status: AIRequestStatus;
  errorMessage?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const promptTokens = entry.promptTokens || 0;
  const completionTokens = entry.completionTokens || 0;
  const totalTokens = promptTokens + completionTokens;

  const logRecord: AIUsageLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: entry.userId,
    provider: entry.provider,
    model: entry.model,
    action_type: entry.actionType,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    latency_ms: entry.latencyMs || 0,
    status: entry.status,
    error_message: entry.errorMessage || null,
    created_at: now,
  };

  // Push to local memory buffer (keep last 500)
  globalAIUsageState.__localAIUsageLogs!.unshift(logRecord);
  if (globalAIUsageState.__localAIUsageLogs!.length > 500) {
    globalAIUsageState.__localAIUsageLogs!.length = 500;
  }

  // Persist to Supabase if configured
  if (await isDbConfigured()) {
    try {
      const supabase = await getAdminClient();
      if (supabase) {
        await supabase.from("ai_usage_logs").insert({
          user_id: entry.userId,
          provider: entry.provider,
          model: entry.model,
          action_type: entry.actionType,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          latency_ms: entry.latencyMs || 0,
          status: entry.status,
          error_message: entry.errorMessage || null,
        });
      }
    } catch (err) {
      // Non-blocking telemetry
      console.warn("Could not insert AI usage log to Supabase:", err);
    }
  }
}

/**
 * Retrieve comprehensive AI Engine & Quota monitoring metrics for Admin Console
 */
export async function getAdminAIMonitoringDataAction(): Promise<{
  success: boolean;
  data?: AIMonitoringSummary;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user) {
      return { success: false, error: "Non authentifié." };
    }

    const admin = user.role === "admin" || (await isUserAdmin(user.id));
    if (!admin) {
      return { success: false, error: "Accès administrateur requis." };
    }

    // 1. Fetch managed users
    let usersList: ManagedUser[] = [];
    try {
      const adminMod = await import("./admin-actions.ts");
      const usersRes = await adminMod.listManagedUsers();
      if (usersRes.users) {
        usersList = usersRes.users;
      }
    } catch {
      // Offline fallback
    }

    // 2. Fetch logs from Supabase or memory
    let logs: AIUsageLog[] = [];
    if (await isDbConfigured()) {
      try {
        const supabase = await getAdminClient();
        if (supabase) {
          const { data, error } = await supabase
            .from("ai_usage_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

          if (!error && data) {
            logs = data as AIUsageLog[];
          }
        }
      } catch {
        // Fall back to memory
      }
    }

    if (logs.length === 0) {
      logs = [...globalAIUsageState.__localAIUsageLogs!];
    }

    // Enrich logs with user display name
    const userMap = new Map<string, { name: string; email: string }>();
    usersList.forEach((u) => {
      userMap.set(u.id, {
        name: u.displayName || u.email?.split("@")[0] || "Étudiant",
        email: u.email || "",
      });
    });

    const enrichedLogs: AIUsageLog[] = logs.map((l) => ({
      ...l,
      user_display_name: userMap.get(l.user_id)?.name || "Utilisateur",
      user_email: userMap.get(l.user_id)?.email || "",
    }));

    // 3. Compute 24h & aggregate metrics
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    let requests24h = 0;
    let totalTokens = 0;
    let totalLatency = 0;
    let quotaBlockedCount = 0;
    const providerBreakdown: Record<string, number> = {};

    enrichedLogs.forEach((l) => {
      const time = new Date(l.created_at).getTime();
      if (time >= twentyFourHoursAgo) {
        requests24h++;
      }
      totalTokens += l.total_tokens || 0;
      totalLatency += l.latency_ms || 0;
      if (l.status === "quota_exceeded") {
        quotaBlockedCount++;
      }
      const p = l.provider || "Autre";
      providerBreakdown[p] = (providerBreakdown[p] || 0) + 1;
    });

    const averageLatencyMs = enrichedLogs.length > 0 ? Math.round(totalLatency / enrichedLogs.length) : 0;

    // 4. Compute per-user Quota status for oversight
    const userQuotas = await Promise.all(
      usersList.slice(0, 30).map(async (u) => {
        const quota = await getAIQuotaStatus(u.id);
        const vip = await getUserVipStatus(u.id);
        const userLogs = enrichedLogs.filter((l) => l.user_id === u.id);
        const lastActive = userLogs.length > 0 ? userLogs[0].created_at : null;

        return {
          userId: u.id,
          displayName: u.displayName || u.email?.split("@")[0] || "Étudiant",
          email: u.email || "",
          used24h: quota.used,
          remaining: quota.remaining,
          isVip: vip.isVip,
          lastActiveAt: lastActive,
        };
      })
    );

    const activeVipUsersCount = userQuotas.filter((u) => u.isVip).length;

    return {
      success: true,
      data: {
        totalRequests: enrichedLogs.length,
        requests24h,
        totalTokens,
        averageLatencyMs,
        quotaBlockedCount,
        providerBreakdown,
        activeVipUsersCount,
        recentLogs: enrichedLogs.slice(0, 50),
        userQuotas,
      },
    };
  } catch (err: any) {
    console.error("getAdminAIMonitoringDataAction error:", err);
    return { success: false, error: err.message || "Erreur de chargement du monitoring IA." };
  }
}

/**
 * Reset a user's AI quota immediately (Admin override)
 */
export async function adminResetUserAIQuotaAction(targetUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user) {
      return { success: false, error: "Non authentifié." };
    }

    const admin = user.role === "admin" || (await isUserAdmin(user.id));
    if (!admin) {
      return { success: false, error: "Action réservée aux administrateurs." };
    }

    if (!targetUserId) {
      return { success: false, error: "ID utilisateur requis." };
    }

    const res = await resetUserAIQuota(targetUserId);
    return { success: res };
  } catch (err: any) {
    console.error("adminResetUserAIQuotaAction error:", err);
    return { success: false, error: err.message || "Échec de réinitialisation du quota." };
  }
}

/**
 * Grant VIP Pass to an individual student from the monitoring console
 */
export async function adminGrantVipPassAction(
  targetUserId: string,
  days: number = 30
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user) {
      return { success: false, error: "Non authentifié." };
    }

    const admin = user.role === "admin" || (await isUserAdmin(user.id));
    if (!admin) {
      return { success: false, error: "Action réservée aux administrateurs." };
    }

    const res = await grantVipAccess({
      targetUserId,
      durationDays: days,
      reason: "Attribution via Console Monitoring IA",
    });
    return { success: res.success, error: res.error };
  } catch (err: any) {
    console.error("adminGrantVipPassAction error:", err);
    return { success: false, error: err.message || "Échec d'attribution du statut VIP." };
  }
}

/**
 * Revoke VIP Pass from an individual student from the monitoring console
 */
export async function adminRevokeVipPassAction(targetUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getRequesterUser();
    if (!user) {
      return { success: false, error: "Non authentifié." };
    }

    const admin = user.role === "admin" || (await isUserAdmin(user.id));
    if (!admin) {
      return { success: false, error: "Action réservée aux administrateurs." };
    }

    const vip = await getUserVipStatus(targetUserId);
    const entId = vip.entitlement?.id || `vip-${targetUserId}`;
    const res = await revokeVipAccess(entId);
    return { success: res.success, error: res.error };
  } catch (err: any) {
    console.error("adminRevokeVipPassAction error:", err);
    return { success: false, error: err.message || "Échec de révocation du statut VIP." };
  }
}
