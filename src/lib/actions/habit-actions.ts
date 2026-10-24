"use server";

import type {
  Habit,
  HabitCheckin,
  HabitType,
  HabitCategory,
  HabitFrequencyType,
  HabitStatus,
  HabitPreferredTime,
  HabitCheckinStatus,
  HabitWithTodayState,
  HabitAnalyticsSummary,
} from "@/types/database";
import {
  getLocalTodayDateString,
  addDaysToDateString,
  calculateHabitStreaks,
  calculateHabitAnalytics,
  getDayCompletionStatus,
  getWeekKey,
} from "../habits/habit-engine.ts";

// Lazy loaders to prevent Node.js ESM alias resolution issues in standalone tests
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

async function safeRevalidate(path: string) {
  try {
    const cacheMod = await import("next/cache");
    cacheMod.revalidatePath?.(path);
  } catch {
    // Outside active Next.js request context (e.g. in test runner)
  }
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
// In-Memory Fallback Stores for Zero-Latency Local Execution & Test Isolation
// -----------------------------------------------------------------------------
const globalHabitsState = globalThis as unknown as {
  __localHabits?: Map<string, Habit>;
  __localHabitCheckins?: Map<string, HabitCheckin>;
  __habitAnalyticsCache?: Map<string, { data: HabitAnalyticsSummary; expiresAt: number }>;
};

if (!globalHabitsState.__localHabits) {
  globalHabitsState.__localHabits = new Map();
}
if (!globalHabitsState.__localHabitCheckins) {
  globalHabitsState.__localHabitCheckins = new Map();
}
if (!globalHabitsState.__habitAnalyticsCache) {
  globalHabitsState.__habitAnalyticsCache = new Map();
}

export async function invalidateHabitAnalyticsCache() {
  globalHabitsState.__habitAnalyticsCache?.clear();
}

export async function _resetLocalHabitsStore() {
  globalHabitsState.__localHabits?.clear();
  globalHabitsState.__localHabitCheckins?.clear();
  globalHabitsState.__habitAnalyticsCache?.clear();
}

/**
 * Seed realistic starter habits if user has none
 */
function seedInitialHabitsIfEmpty(userId: string) {
  const existingUserHabits = Array.from(globalHabitsState.__localHabits!.values()).filter(
    (h) => h.user_id === userId
  );
  if (existingUserHabits.length > 0) return;

  const todayStr = getLocalTodayDateString();
  const sampleHabits: Habit[] = [
    {
      id: "seed-habit-study",
      user_id: userId,
      name: "Session Révision Active (Pomodoro)",
      description: "45 minutes de concentration continue sans smartphone.",
      icon: "Brain",
      category: "study",
      habit_type: "quantitative",
      target_value: 45,
      unit: "minutes",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "morning",
      reminder_time: "09:00",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-reading",
      user_id: userId,
      name: "Lecture & Fiches de Cours",
      description: "Lire 15 pages de polycopiés ou synthétiser un chapitre.",
      icon: "BookOpen",
      category: "study",
      habit_type: "quantitative",
      target_value: 15,
      unit: "pages",
      frequency_type: "specific_days",
      scheduled_days: [1, 2, 3, 4, 5],
      preferred_time: "afternoon",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-sleep",
      user_id: userId,
      name: "Coucher Régulier (Avant 23h30)",
      description: "Respecter une fenêtre de sommeil stable pour la consolidation mnésique.",
      icon: "Sparkles",
      category: "health",
      habit_type: "binary",
      target_value: 1,
      unit: "fois",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "evening",
      reminder_time: "23:00",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-gym",
      user_id: userId,
      name: "going to GYM",
      description: "Entraînement physique et cardio.",
      icon: "Heart",
      category: "health",
      habit_type: "binary",
      target_value: 1,
      unit: "fois",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "morning",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-revision-extra",
      user_id: userId,
      name: "Session Révision Active (Pomodoro)",
      description: "Deuxième bloc de travail approfondi.",
      icon: "Brain",
      category: "study",
      habit_type: "quantitative",
      target_value: 45,
      unit: "minutes",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "afternoon",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-hydration",
      user_id: userId,
      name: "Hydratation Optimale (2L d'eau)",
      description: "Boire régulièrement tout au long de la journée.",
      icon: "Heart",
      category: "health",
      habit_type: "quantitative",
      target_value: 2000,
      unit: "ml",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "anytime",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-mindfulness",
      user_id: userId,
      name: "Méditation & Respiration",
      description: "Séance de cohérence cardiaque et recentrage.",
      icon: "Zap",
      category: "mindfulness",
      habit_type: "quantitative",
      target_value: 10,
      unit: "minutes",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "morning",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-planning",
      user_id: userId,
      name: "Revue Hebdomadaire des Objectifs",
      description: "Planifier les priorités de la semaine à venir.",
      icon: "Layers",
      category: "productivity",
      habit_type: "binary",
      target_value: 1,
      unit: "fois",
      frequency_type: "weekly_count",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      target_days_per_week: 1,
      preferred_time: "evening",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-disconnect",
      user_id: userId,
      name: "Déconnexion Écrans 22h",
      description: "Éteindre les écrans une heure avant de dormir.",
      icon: "Clock",
      category: "routine",
      habit_type: "binary",
      target_value: 1,
      unit: "fois",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "evening",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-habit-coding",
      user_id: userId,
      name: "Pratique Algorithmique (LeetCode)",
      description: "Résolution quotidienne d'un problème d'algorithmique.",
      icon: "BookOpen",
      category: "study",
      habit_type: "binary",
      target_value: 1,
      unit: "exercice",
      frequency_type: "daily",
      scheduled_days: [1, 2, 3, 4, 5, 6, 0],
      preferred_time: "morning",
      start_date: todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const h of sampleHabits) {
    globalHabitsState.__localHabits!.set(h.id, h);
  }
}

// -----------------------------------------------------------------------------
// Core Actions
// -----------------------------------------------------------------------------

export async function getHabitsAction(options?: {
  status?: HabitStatus | "all";
  targetDate?: string;
}): Promise<{ success: boolean; data?: HabitWithTodayState[]; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    const todayStr = options?.targetDate || getLocalTodayDateString();
    const statusFilter = options?.status || "active";

    // 1. Try Supabase if configured
    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        let query = adminClient
          .from("habits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        const { data: habitsData, error: habitsError } = await query;

        if (!habitsError && habitsData) {
          // Fetch checkins for this user - limited to active + last 2 past months (~70 days) to optimize egress & storage
          const minDateForRoue = addDaysToDateString(todayStr, -70);
          const { data: checkinsData } = await adminClient
            .from("habit_checkins")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", minDateForRoue);

          const checkins = checkinsData || [];
          const checkinByHabitAndDate = new Map<string, HabitCheckin>();
          const allCheckinsByHabit = new Map<string, HabitCheckin[]>();

          for (const c of checkins) {
            checkinByHabitAndDate.set(`${c.habit_id}_${c.date}`, c);
            const list = allCheckinsByHabit.get(c.habit_id) || [];
            list.push(c);
            allCheckinsByHabit.set(c.habit_id, list);
          }

          const enriched: HabitWithTodayState[] = habitsData.map((h: Habit) => {
            const todayCheckin = checkinByHabitAndDate.get(`${h.id}_${todayStr}`) || null;
            const habitCheckins = allCheckinsByHabit.get(h.id) || [];
            const todayStatus = getDayCompletionStatus(h, todayCheckin || undefined, todayStr, todayStr);
            const { currentStreak } = calculateHabitStreaks(h, habitCheckins, todayStr);

            let weeklyProgress = undefined;
            if (h.frequency_type === "weekly_count") {
              const currentWeek = getWeekKey(todayStr);
              let completedThisWeek = 0;
              for (const c of habitCheckins) {
                if (getWeekKey(c.date) === currentWeek) {
                  if (c.status === "completed" || (h.habit_type === "quantitative" && c.value >= h.target_value)) {
                    completedThisWeek++;
                  }
                }
              }
              weeklyProgress = {
                completedThisWeek,
                targetDays: h.target_days_per_week || 3,
              };
            }

            return {
              ...h,
              todayStatus,
              todayCheckin,
              currentStreak,
              weeklyProgress,
              recentCheckins: habitCheckins,
            };
          });

          return { success: true, data: enriched };
        } else if (habitsError && !isTableMissingError(habitsError)) {
          console.error("getHabitsAction database error:", habitsError);
        }
      }
    }

    // 2. Fallback to resilient in-memory store
    seedInitialHabitsIfEmpty(user.id);
    const userHabits = Array.from(globalHabitsState.__localHabits!.values()).filter(
      (h) => h.user_id === user.id && (statusFilter === "all" || h.status === statusFilter)
    );

    const minDateForRoue = addDaysToDateString(todayStr, -70);
    const userCheckins = Array.from(globalHabitsState.__localHabitCheckins!.values()).filter(
      (c) => c.user_id === user.id && c.date >= minDateForRoue
    );

    const checkinByHabitAndDate = new Map<string, HabitCheckin>();
    const allCheckinsByHabit = new Map<string, HabitCheckin[]>();
    for (const c of userCheckins) {
      checkinByHabitAndDate.set(`${c.habit_id}_${c.date}`, c);
      const list = allCheckinsByHabit.get(c.habit_id) || [];
      list.push(c);
      allCheckinsByHabit.set(c.habit_id, list);
    }

    const enriched: HabitWithTodayState[] = userHabits.map((h) => {
      const todayCheckin = checkinByHabitAndDate.get(`${h.id}_${todayStr}`) || null;
      const habitCheckins = allCheckinsByHabit.get(h.id) || [];
      const todayStatus = getDayCompletionStatus(h, todayCheckin || undefined, todayStr, todayStr);
      const { currentStreak } = calculateHabitStreaks(h, habitCheckins, todayStr);

      let weeklyProgress = undefined;
      if (h.frequency_type === "weekly_count") {
        const currentWeek = getWeekKey(todayStr);
        let completedThisWeek = 0;
        for (const c of habitCheckins) {
          if (getWeekKey(c.date) === currentWeek) {
            if (c.status === "completed" || (h.habit_type === "quantitative" && c.value >= h.target_value)) {
              completedThisWeek++;
            }
          }
        }
        weeklyProgress = {
          completedThisWeek,
          targetDays: h.target_days_per_week || 3,
        };
      }

      return {
        ...h,
        todayStatus,
        todayCheckin,
        currentStreak,
        weeklyProgress,
        recentCheckins: habitCheckins,
      };
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error("getHabitsAction error:", err);
    return { success: false, error: err.message || "Erreur lors du chargement des habitudes." };
  }
}

export async function createHabitAction(payload: {
  name: string;
  description?: string;
  icon?: string;
  category?: HabitCategory;
  habit_type?: HabitType;
  target_value?: number;
  unit?: string;
  frequency_type?: HabitFrequencyType;
  scheduled_days?: number[];
  target_days_per_week?: number;
  preferred_time?: HabitPreferredTime;
  reminder_time?: string;
  start_date?: string;
  goal_id?: string;
}): Promise<{ success: boolean; data?: Habit; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: "Le nom de l'habitude est requis." };
    }

    const todayStr = getLocalTodayDateString();
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      user_id: user.id,
      goal_id: payload.goal_id || null,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      icon: payload.icon || "Sparkles",
      category: payload.category || "study",
      habit_type: payload.habit_type || "binary",
      target_value: payload.target_value && payload.target_value > 0 ? Number(payload.target_value) : 1,
      unit: payload.unit?.trim() || (payload.habit_type === "quantitative" ? "fois" : "fois"),
      frequency_type: payload.frequency_type || "daily",
      scheduled_days: payload.scheduled_days && payload.scheduled_days.length > 0 ? payload.scheduled_days : [1, 2, 3, 4, 5, 6, 0],
      target_days_per_week: payload.target_days_per_week ? Math.min(7, Math.max(1, payload.target_days_per_week)) : 7,
      preferred_time: payload.preferred_time || "morning",
      reminder_time: payload.reminder_time || null,
      start_date: payload.start_date || todayStr,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("habits")
          .insert(newHabit)
          .select()
          .single();

        if (!error && data) {
          await safeRevalidate("/habits");
          return { success: true, data };
        }
      }
    }

    // In-memory fallback
    globalHabitsState.__localHabits!.set(newHabit.id, newHabit);
    await safeRevalidate("/habits");
    return { success: true, data: newHabit };
  } catch (err: any) {
    console.error("createHabitAction error:", err);
    return { success: false, error: err.message || "Erreur lors de la création de l'habitude." };
  }
}

export async function updateHabitAction(
  habitId: string,
  updates: Partial<Omit<Habit, "id" | "user_id" | "created_at">>
): Promise<{ success: boolean; data?: Habit; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("habits")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", habitId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (!error && data) {
          await safeRevalidate("/habits");
          return { success: true, data };
        } else if (error) {
          console.error("updateHabitAction DB error:", error);
          if (!isTableMissingError(error)) {
            return { success: false, error: error.message || "Erreur lors de la mise à jour." };
          }
        }
      }
    }

    const localHabit = globalHabitsState.__localHabits!.get(habitId);
    if (!localHabit || localHabit.user_id !== user.id) {
      return { success: false, error: "Habitude introuvable ou non autorisée." };
    }

    const updated: Habit = {
      ...localHabit,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    globalHabitsState.__localHabits!.set(habitId, updated);
    await safeRevalidate("/habits");
    return { success: true, data: updated };
  } catch (err: any) {
    console.error("updateHabitAction error:", err);
    return { success: false, error: err.message || "Erreur lors de la mise à jour." };
  }
}

export async function archiveHabitAction(
  habitId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    const nowIso = new Date().toISOString();
    return updateHabitAction(habitId, {
      status: "archived",
      archived_at: nowIso,
    });
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de l'archivage." };
  }
}

export async function deleteHabitAction(
  habitId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { error } = await adminClient
          .from("habits")
          .delete()
          .eq("id", habitId)
          .eq("user_id", user.id);

        if (!error) {
          await safeRevalidate("/habits");
          return { success: true };
        } else {
          console.error("deleteHabitAction DB error:", error);
          if (!isTableMissingError(error)) {
            return { success: false, error: error.message || "Erreur lors de la suppression." };
          }
        }
      }
    }

    const localHabit = globalHabitsState.__localHabits!.get(habitId);
    if (localHabit && localHabit.user_id === user.id) {
      globalHabitsState.__localHabits!.delete(habitId);
      // Clean checkins
      for (const [id, c] of globalHabitsState.__localHabitCheckins!.entries()) {
        if (c.habit_id === habitId) {
          globalHabitsState.__localHabitCheckins!.delete(id);
        }
      }
      await safeRevalidate("/habits");
      return { success: true };
    }

    return { success: false, error: "Habitude introuvable." };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la suppression." };
  }
}

/**
 * Fast Check-in Action (1-click completion or quantitative adjustment)
 * Idempotent upsert protection.
 */
export async function recordCheckinAction(payload: {
  habitId: string;
  date?: string;
  value?: number;
  status?: HabitCheckinStatus;
  notes?: string;
}): Promise<{ success: boolean; data?: HabitCheckin; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    const dateStr = payload.date || getLocalTodayDateString();

    // Verify habit ownership
    let habit: Habit | undefined;
    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data } = await adminClient
          .from("habits")
          .select("*")
          .eq("id", payload.habitId)
          .eq("user_id", user.id)
          .single();
        if (data) habit = data;
      }
    }
    if (!habit) {
      habit = globalHabitsState.__localHabits!.get(payload.habitId);
      if (!habit || habit.user_id !== user.id) {
        return { success: false, error: "Habitude introuvable ou non autorisée." };
      }
    }

    const val = payload.value !== undefined ? Number(payload.value) : habit.target_value;
    let computedStatus: HabitCheckinStatus = payload.status || "completed";
    if (!payload.status) {
      if (habit.habit_type === "quantitative") {
        computedStatus = val >= habit.target_value ? "completed" : val > 0 ? "partial" : "completed";
      } else {
        computedStatus = "completed";
      }
    }

    const checkinRecord: HabitCheckin = {
      id: `${payload.habitId}_${dateStr}`,
      habit_id: payload.habitId,
      user_id: user.id,
      date: dateStr,
      value: val,
      status: computedStatus,
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("habit_checkins")
          .upsert(
            {
              habit_id: payload.habitId,
              user_id: user.id,
              date: dateStr,
              value: val,
              status: computedStatus,
              notes: payload.notes || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "habit_id,date" }
          )
          .select()
          .single();

        if (!error && data) {
          await invalidateHabitAnalyticsCache();
          await safeRevalidate("/habits");
          return { success: true, data };
        } else if (error) {
          console.error("recordCheckinAction DB error:", error);
          if (!isTableMissingError(error)) {
            return { success: false, error: error.message || "Erreur lors de l'enregistrement." };
          }
        }
      }
    }

    globalHabitsState.__localHabitCheckins!.set(checkinRecord.id, checkinRecord);
    await invalidateHabitAnalyticsCache();
    await safeRevalidate("/habits");
    return { success: true, data: checkinRecord };
  } catch (err: any) {
    console.error("recordCheckinAction error:", err);
    return { success: false, error: err.message || "Erreur lors de l'enregistrement." };
  }
}

export async function undoCheckinAction(payload: {
  habitId: string;
  date?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    const dateStr = payload.date || getLocalTodayDateString();

    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { error } = await adminClient
          .from("habit_checkins")
          .delete()
          .eq("habit_id", payload.habitId)
          .eq("date", dateStr)
          .eq("user_id", user.id);

        if (!error) {
          await invalidateHabitAnalyticsCache();
          await safeRevalidate("/habits");
          return { success: true };
        } else {
          console.error("undoCheckinAction DB error:", error);
          if (!isTableMissingError(error)) {
            return { success: false, error: error.message || "Erreur lors de l'annulation." };
          }
        }
      }
    }

    const checkinKey = `${payload.habitId}_${dateStr}`;
    globalHabitsState.__localHabitCheckins!.delete(checkinKey);
    await invalidateHabitAnalyticsCache();
    await safeRevalidate("/habits");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de l'annulation." };
  }
}

export async function getHabitAnalyticsAction(
  habitId: string,
  rangeDays: number = 30,
  anchorDate?: string
): Promise<{ success: boolean; data?: HabitAnalyticsSummary; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    const todayStr = anchorDate || getLocalTodayDateString();
    const cacheKey = `${user.id}_${habitId}_${rangeDays}_${todayStr}`;
    const cached = globalHabitsState.__habitAnalyticsCache?.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { success: true, data: cached.data };
    }

    let habit: Habit | undefined;
    let checkins: HabitCheckin[] = [];

    if (await isDbConfigured()) {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data: hData } = await adminClient
          .from("habits")
          .select("*")
          .eq("id", habitId)
          .eq("user_id", user.id)
          .single();

        if (hData) {
          habit = hData;
          // Restrict query to active window + 2 archived months
          const minDateForAnalytics = addDaysToDateString(todayStr, -70);
          const { data: cData } = await adminClient
            .from("habit_checkins")
            .select("*")
            .eq("habit_id", habitId)
            .eq("user_id", user.id)
            .gte("date", minDateForAnalytics);
          checkins = cData || [];
        }
      }
    }

    if (!habit) {
      habit = globalHabitsState.__localHabits!.get(habitId);
      if (!habit || habit.user_id !== user.id) {
        return { success: false, error: "Habitude introuvable ou non autorisée." };
      }
      checkins = Array.from(globalHabitsState.__localHabitCheckins!.values()).filter(
        (c) => c.habit_id === habitId && c.user_id === user.id
      );
    }

    const analytics = calculateHabitAnalytics(habit, checkins, rangeDays, todayStr);

    // Cache analytics result: 60s for current month, 10 min for past months (immutable archived data)
    const isPastMonth = todayStr < getLocalTodayDateString().slice(0, 7);
    const ttlMs = isPastMonth ? 10 * 60 * 1000 : 60 * 1000;
    globalHabitsState.__habitAnalyticsCache?.set(cacheKey, {
      data: analytics,
      expiresAt: Date.now() + ttlMs,
    });

    return { success: true, data: analytics };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors du calcul analytique." };
  }
}

export async function applyDiagnosticAdjustmentAction(
  habitId: string,
  actionType: "shift_time" | "reduce_target" | "change_frequency" | "link_goal",
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const user = await authMod?.getRequesterUser();
    if (!user?.id) {
      return { success: false, error: "Non authentifié." };
    }

    const updates: Partial<Habit> = {};
    if (actionType === "shift_time" && payload.preferredTime) {
      updates.preferred_time = payload.preferredTime;
    } else if (actionType === "reduce_target" && payload.targetValue) {
      updates.target_value = payload.targetValue;
    } else if (actionType === "link_goal" && payload.goalId) {
      updates.goal_id = payload.goalId;
    }

    return updateHabitAction(habitId, updates);
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de l'application de l'ajustement." };
  }
}
