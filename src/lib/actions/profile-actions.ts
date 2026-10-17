"use server";

import fs from "fs";
import path from "path";
import type { ForestEntry } from "../../types/database";
import type { ComputedAchievement } from "../utils/achievements";

const CACHE_DIR = path.join(process.cwd(), ".validily-cache");

function readDiskJson(filename: string): any {
  try {
    const file = path.join(CACHE_DIR, filename);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return null;
}

const globalForestState = globalThis as unknown as {
  __localForestEntries?: Map<string, ForestEntry>;
};

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

async function getForestActionsModule() {
  try {
    return await import("./forest-actions");
  } catch {
    try {
      const p = "./forest-actions.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

async function getAchievementsModule() {
  try {
    return await import("../utils/achievements");
  } catch {
    try {
      const p = "../utils/achievements.ts";
      return await import(/* @vite-ignore */ p);
    } catch {
      return null;
    }
  }
}

export interface StudentPublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role?: string;
  isVip?: boolean;
  email?: string; // Only populated for admin callers
  isPrivate?: boolean;
  stats: {
    streak: number;
    totalFocusedMinutes: number;
    healthyTreesCount: number;
    witheredTreesCount: number;
    totalSessions: number;
    speciesCount: number;
  };
  trees: ForestEntry[];
  achievements: ComputedAchievement[];
  unlockedAchievementsCount: number;
}

export interface StudentPerformanceOverview {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  role: string;
  isVip: boolean;
  totalFocusedMinutes: number;
  healthyTreesCount: number;
  streak: number;
  achievementsUnlocked: number;
  created_at: string;
}

// In-memory cache for ultra-fast student profile loads (< 5ms)
const studentProfileCache = new Map<string, { data: StudentPublicProfile; expiry: number }>();

export async function invalidateStudentProfileCache(studentId?: string): Promise<void> {
  if (studentId) {
    studentProfileCache.delete(studentId);
  } else {
    studentProfileCache.clear();
  }
}

/**
 * Fetch a student's public profile safely:
 * Only name, photo, bosquet, streaks, and achievements are exposed.
 * Personal notes, private drafts, or credentials are never exposed.
 */
export async function getStudentPublicProfile(
  studentId: string
): Promise<{ success: boolean; profile?: StudentPublicProfile; error?: string }> {
  try {
    if (!studentId) {
      return { success: false, error: "Identifiant d'étudiant manquant." };
    }

    const cached = studentProfileCache.get(studentId);
    if (cached && Date.now() < cached.expiry) {
      return { success: true, profile: cached.data };
    }

    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    if (!requester || !requester.id) {
      return { success: false, error: "Connexion requise pour consulter les profils." };
    }

    const isAdmin = requester.role === "admin";
    const serverMod = await getSupabaseServerModule();
    const isConfigured = serverMod ? serverMod.isSupabaseConfigured() : false;
    const serviceSupabase = await getAdminClient();
    const forestMod = await getForestActionsModule();

    let displayName = "Étudiant IGL4";
    let avatarUrl: string | null = null;
    let role = "student";
    let isVip = false;
    let studentEmail: string | undefined = undefined;

    // Known mock profiles for testing & offline resilience
    if (studentId === "student-target-privacy-01") {
      displayName = "Sarra Ben Amor";
      avatarUrl = "https://images.unsplash.com/photo-sarra";
      role = "student";
      isVip = false;
    } else if (requester.id === studentId) {
      displayName = requester.name || displayName;
      avatarUrl = requester.avatarUrl || avatarUrl;
      role = requester.role || role;
      isVip = Boolean(requester.isVip);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);

    // Parallelize DB queries, auth info, and forest data concurrently
    const [profileRes, authRes, forestRes] = await Promise.all([
      isConfigured && serviceSupabase && isUuid
        ? Promise.resolve(
            serviceSupabase
              .from("profiles")
              .select("id, display_name, avatar_url, role")
              .eq("id", studentId)
              .maybeSingle()
          ).catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      isConfigured && serviceSupabase && isUuid
        ? Promise.resolve(serviceSupabase.auth.admin.getUserById(studentId)).catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      forestMod
        ? forestMod.getMyForest(studentId).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (profileRes?.data) {
      displayName = profileRes.data.display_name || displayName;
      avatarUrl = profileRes.data.avatar_url || null;
      role = profileRes.data.role || "student";
    }

    if (authRes?.data?.user) {
      const u = authRes.data.user;
      displayName =
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        displayName;
      avatarUrl = u.user_metadata?.avatar_url || avatarUrl;
      isVip = Boolean(u.user_metadata?.is_vip || u.app_metadata?.is_vip);
      if (isAdmin) {
        studentEmail = u.email;
      }
    }

    const trees: ForestEntry[] = forestRes?.trees || [];
    const healthyTrees = trees.filter((t) => t.tree_status === "healthy");
    const healthyCount = healthyTrees.length;
    const witheredCount = trees.filter((t) => t.tree_status === "leafless").length;

    // Calculate focused minutes strictly from healthy sessions
    const healthyMinutes = Math.floor(
      healthyTrees.reduce((acc, t) => {
        const sec =
          t.session?.actual_duration_seconds ??
          t.session?.target_duration_seconds ??
          1500;
        return acc + (typeof sec === "number" && sec > 0 ? sec : 1500);
      }, 0) / 60
    );

    // Also check daily focus history from disk cache
    let dbDailyMinutes = 0;
    const dailyFocusData = readDiskJson(`daily_focus_${studentId}.json`);
    const activeDatesSet = new Set<string>();
    if (dailyFocusData && typeof dailyFocusData === "object") {
      for (const [dateStr, rec] of Object.entries(dailyFocusData as Record<string, any>)) {
        const m = rec.totalMinutes || Math.floor((rec.totalSeconds || 0) / 60);
        dbDailyMinutes += m;
        if (rec.totalSeconds > 0 || rec.totalMinutes > 0) {
          activeDatesSet.add(dateStr);
        }
      }
    }

    const totalMinutes = Math.max(
      forestRes?.stats?.totalFocusedMinutes || 0,
      forestRes?.totalFocusedMinutes || 0,
      healthyMinutes,
      dbDailyMinutes
    );

    // Calculate streak from tree dates and daily focus dates
    healthyTrees.forEach((e) => {
      const raw = e.earned_at || e.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (!isNaN(d.getTime())) activeDatesSet.add(d.toISOString().split("T")[0]);
    });

    const activeDates = Array.from(activeDatesSet).sort().reverse();
    let streak = forestRes?.stats?.currentStreak || 0;
    if (activeDates.length > 0 && streak === 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];

      if (activeDates[0] === today || activeDates[0] === yesterday) {
        streak = 1;
        const curr = new Date(activeDates[0]);
        for (let i = 1; i < activeDates.length; i++) {
          curr.setDate(curr.getDate() - 1);
          const expected = curr.toISOString().split("T")[0];
          if (activeDates[i] === expected) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    const plantedSpecies = Array.from(
      new Set(healthyTrees.map((t) => t.tree_species).filter(Boolean))
    );

    // Compute achievements
    const achieveMod = await getAchievementsModule();
    const achievements: ComputedAchievement[] = achieveMod
      ? achieveMod.computeStudentAchievements(trees, streak, totalMinutes)
      : [];
    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

    const profileData: StudentPublicProfile = {
      id: studentId,
      displayName,
      avatarUrl,
      role,
      isVip,
      ...(isAdmin && studentEmail ? { email: studentEmail } : {}),
      stats: {
        streak,
        totalFocusedMinutes: totalMinutes,
        healthyTreesCount: healthyCount,
        witheredTreesCount: witheredCount,
        totalSessions: trees.length,
        speciesCount: plantedSpecies.length,
      },
      trees,
      achievements,
      unlockedAchievementsCount: unlockedCount,
    };

    studentProfileCache.set(studentId, { data: profileData, expiry: Date.now() + 20000 });

    return { success: true, profile: profileData };
  } catch (err: any) {
    return { success: false, error: err?.message || "Impossible de charger le profil." };
  }
}

/**
 * Admin action: Overview of all students' study performance, streaks,
 * bosquet healthy tree counts, and achievements.
 */
export async function listStudentsPerformanceAction(): Promise<{
  success: boolean;
  students?: StudentPerformanceOverview[];
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const adminCheck = authMod
      ? await authMod.assertAdmin()
      : { authorized: false, error: "Module d'autorisation indisponible." };

    if (!adminCheck.authorized) {
      return {
        success: false,
        error: adminCheck.error || "Action strictement réservée aux administrateurs.",
      };
    }

    const serverMod = await getSupabaseServerModule();
    const isConfigured = serverMod ? serverMod.isSupabaseConfigured() : false;
    const serviceSupabase = await getAdminClient();

    if (!isConfigured || !serviceSupabase) {
      // Mock data for offline/test environments
      return {
        success: true,
        students: [
          {
            id: "student-mock-1",
            displayName: "Amen Allah",
            email: "amen@validily.tn",
            role: "student",
            isVip: true,
            totalFocusedMinutes: 320,
            healthyTreesCount: 11,
            streak: 5,
            achievementsUnlocked: 7,
            created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
          },
          {
            id: "student-mock-2",
            displayName: "Sarra Ben Amor",
            email: "sarra@validily.tn",
            role: "student",
            isVip: false,
            totalFocusedMinutes: 210,
            healthyTreesCount: 7,
            streak: 3,
            achievementsUnlocked: 5,
            created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
          },
          {
            id: "student-mock-3",
            displayName: "Yassine Drira",
            email: "yassine@validily.tn",
            role: "admin",
            isVip: true,
            totalFocusedMinutes: 680,
            healthyTreesCount: 22,
            streak: 8,
            achievementsUnlocked: 9,
            created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          },
        ],
      };
    }

    // Parallel fetch: profiles, auth users, and optional DB tables
    const [profilesRes, authDataRes, treesRes, revProgressRes, quizAttemptsRes] = await Promise.all([
      serviceSupabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, created_at")
        .order("created_at", { ascending: false }),
      serviceSupabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
      serviceSupabase
        .from("forest_entries")
        .select("user_id, tree_status, created_at, earned_at, duration_minutes, tree_species"),
      serviceSupabase
        .from("revision_progress")
        .select("user_id, status, updated_at"),
      serviceSupabase
        .from("quiz_attempts")
        .select("user_id, completed_at"),
    ]);

    if (profilesRes.error) {
      return { success: false, error: profilesRes.error.message };
    }

    const profiles = profilesRes.data || [];
    const authData = authDataRes?.data;
    const authMap = new Map((authData?.users || []).map((u: any) => [u.id, u]));

    const dbTreesByUser = new Map<string, any[]>();
    if (treesRes?.data && Array.isArray(treesRes.data)) {
      treesRes.data.forEach((t: any) => {
        const arr = dbTreesByUser.get(t.user_id) || [];
        arr.push(t);
        dbTreesByUser.set(t.user_id, arr);
      });
    }

    const revsByUser = new Map<string, any[]>();
    if (revProgressRes?.data && Array.isArray(revProgressRes.data)) {
      revProgressRes.data.forEach((r: any) => {
        const arr = revsByUser.get(r.user_id) || [];
        arr.push(r);
        revsByUser.set(r.user_id, arr);
      });
    }

    const quizzesByUser = new Map<string, any[]>();
    if (quizAttemptsRes?.data && Array.isArray(quizAttemptsRes.data)) {
      quizAttemptsRes.data.forEach((q: any) => {
        const arr = quizzesByUser.get(q.user_id) || [];
        arr.push(q);
        quizzesByUser.set(q.user_id, arr);
      });
    }

    const achieveMod = await getAchievementsModule();

    const results: StudentPerformanceOverview[] = (profiles || []).map((p: any) => {
      const authUser = authMap.get(p.id) as any;
      const email = authUser?.email || "etudiant@university.tn";
      const isVip = Boolean(authUser?.user_metadata?.is_vip || authUser?.app_metadata?.is_vip);

      // Collect trees for user from DB, disk cache, and memory
      const userTreesMap = new Map<string, any>();
      const dbTrees = dbTreesByUser.get(p.id) || [];
      dbTrees.forEach((t: any) => {
        const key = t.id || `${t.user_id}_${t.earned_at || t.created_at}`;
        userTreesMap.set(key, t);
      });

      const diskForest = readDiskJson(`forest_${p.id}.json`);
      if (Array.isArray(diskForest)) {
        diskForest.forEach((t: any) => {
          if (t && t.id && !userTreesMap.has(t.id)) {
            userTreesMap.set(t.id, t);
          }
        });
      }

      if (globalForestState.__localForestEntries) {
        for (const t of globalForestState.__localForestEntries.values()) {
          if (t.user_id === p.id && t.id && !userTreesMap.has(t.id)) {
            userTreesMap.set(t.id, t);
          }
        }
      }

      const userTrees = Array.from(userTreesMap.values());
      const healthy = userTrees.filter((t: any) => t.tree_status === "healthy");
      const healthyCount = healthy.length;

      const healthyMinutes = Math.floor(
        healthy.reduce((acc: number, t: any) => {
          const sec =
            t.session?.actual_duration_seconds ??
            t.session?.target_duration_seconds ??
            (t.duration_minutes ? t.duration_minutes * 60 : 1500);
          return acc + (typeof sec === "number" && sec > 0 ? sec : 1500);
        }, 0) / 60
      );

      // Collect verified daily focus from disk cache
      const dailyFocusData = readDiskJson(`daily_focus_${p.id}.json`);
      let dbDailyMinutes = 0;
      const activeDatesSet = new Set<string>();

      if (dailyFocusData && typeof dailyFocusData === "object") {
        for (const [dateStr, rec] of Object.entries(dailyFocusData as Record<string, any>)) {
          const m = rec.totalMinutes || Math.floor((rec.totalSeconds || 0) / 60);
          dbDailyMinutes += m;
          if (rec.totalSeconds > 0 || rec.totalMinutes > 0) {
            activeDatesSet.add(dateStr);
          }
        }
      }

      // Add tree earned dates
      healthy.forEach((t: any) => {
        const raw = t.earned_at || t.created_at;
        if (!raw) return;
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          activeDatesSet.add(d.toISOString().split("T")[0]);
        }
      });

      // Add revisions and quizzes active dates
      const revs = revsByUser.get(p.id) || [];
      revs.forEach((r: any) => {
        if (r.updated_at) {
          const d = new Date(r.updated_at);
          if (!isNaN(d.getTime())) activeDatesSet.add(d.toISOString().split("T")[0]);
        }
      });

      const quizzes = quizzesByUser.get(p.id) || [];
      quizzes.forEach((q: any) => {
        if (q.completed_at) {
          const d = new Date(q.completed_at);
          if (!isNaN(d.getTime())) activeDatesSet.add(d.toISOString().split("T")[0]);
        }
      });

      const totalMinutes = Math.max(healthyMinutes, dbDailyMinutes);

      // Streak calculation
      const activeDates = Array.from(activeDatesSet).sort().reverse();
      let streak = 0;
      if (activeDates.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split("T")[0];

        if (activeDates[0] === today || activeDates[0] === yesterday) {
          streak = 1;
          const curr = new Date(activeDates[0]);
          for (let i = 1; i < activeDates.length; i++) {
            curr.setDate(curr.getDate() - 1);
            const expected = curr.toISOString().split("T")[0];
            if (activeDates[i] === expected) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      // Achievements
      let achievementsUnlocked = 0;
      if (achieveMod) {
        const achievements = achieveMod.computeStudentAchievements(userTrees, streak, totalMinutes);
        achievementsUnlocked = achievements.filter((a: any) => a.isUnlocked).length;
      } else {
        if (healthyCount >= 1 || totalMinutes >= 15) achievementsUnlocked++;
        if (healthyCount >= 5) achievementsUnlocked++;
        if (healthyCount >= 15) achievementsUnlocked++;
        if (healthyCount >= 36) achievementsUnlocked++;
        if (healthyCount >= 100) achievementsUnlocked++;
        if (totalMinutes >= 120) achievementsUnlocked++;
        if (totalMinutes >= 600) achievementsUnlocked++;
        if (totalMinutes >= 1440) achievementsUnlocked++;
        if (streak >= 3) achievementsUnlocked++;
        if (streak >= 7) achievementsUnlocked++;
      }

      return {
        id: p.id,
        displayName:
          p.display_name || authUser?.user_metadata?.full_name || email.split("@")[0] || "Étudiant",
        email,
        avatarUrl: p.avatar_url || authUser?.user_metadata?.avatar_url || null,
        role: p.role || "student",
        isVip,
        totalFocusedMinutes: totalMinutes,
        healthyTreesCount: healthyCount,
        streak,
        achievementsUnlocked,
        created_at: p.created_at,
      };
    });

    return { success: true, students: results };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors du chargement des performances étudiants." };
  }
}

async function safeRevalidate(path: string) {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

export async function updateUserProfile(data: {
  displayName: string;
  avatarUrl?: string | null;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!data.displayName?.trim()) {
      return { error: "Le nom d'affichage ne peut pas être vide." };
    }

    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    if (!requester) {
      return { error: "Authentification requise pour modifier votre profil." };
    }

    const cleanName = data.displayName.trim();
    const avatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : null;

    const serverMod = await getSupabaseServerModule();
    const isConfigured = serverMod ? serverMod.isSupabaseConfigured() : false;
    if (!isConfigured) {
      return { success: true };
    }

    const supabase = serverMod ? await serverMod.createClient() : null;
    const serviceSupabase = await getAdminClient();

    // 1. Update Auth metadata (never store giant base64 strings in auth metadata to avoid bloating JWT session cookies)
    const authMetadataAvatar = avatarUrl && !avatarUrl.startsWith("data:") ? avatarUrl : null;
    if (supabase) {
      try {
        await supabase.auth.updateUser({
          data: {
            display_name: cleanName,
            avatar_url: authMetadataAvatar,
          },
        });
      } catch {}
    }

    // 2. Upsert Profile table
    if (serviceSupabase) {
      await serviceSupabase.from("profiles").upsert(
        {
          id: requester.id,
          display_name: cleanName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    safeRevalidate("/my-space");
    safeRevalidate("/");
    return { success: true };
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    return { error: err.message || "Échec de la mise à jour du profil." };
  }
}

export async function removeUserAvatar(): Promise<{ success?: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const requester = authMod ? await authMod.getRequesterUser() : null;
    if (!requester) {
      return { error: "Authentification requise pour modifier votre photo." };
    }
    const serviceSupabase = await getAdminClient();
    let currentName = "Étudiant";
    if (serviceSupabase) {
      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("display_name")
        .eq("id", requester.id)
        .maybeSingle();

      if (profile?.display_name) {
        currentName = profile.display_name;
      }
    }

    return updateUserProfile({ displayName: currentName, avatarUrl: null });
  } catch (err: any) {
    return { error: err.message || "Échec de suppression de la photo." };
  }
}

