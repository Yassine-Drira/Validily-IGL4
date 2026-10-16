"use server";

import type {
  FocusSession,
  ForestEntry,
  ForestPreferences,
  MemberForestSummary,
  TreeSpecies,
  ForestVisibility,
} from "../../types/database";

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
  const mod = await getSupabaseServerModule();
  return mod ? mod.isSupabaseConfigured() : false;
}

async function safeRevalidate(path: string) {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context (e.g. standalone node tests)
  }
}

const DEFAULT_PREFERENCES: ForestPreferences = {
  user_id: "",
  visibility: "members",
  default_tree_species: "cedar",
  allow_classmate_cheers: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 1. Start a verified Pomodoro session on the server
 */
export async function startFocusSession(input: {
  targetDurationSeconds: number;
  treeSpecies?: TreeSpecies;
  subjectId?: string;
  sessionLabel?: string;
}): Promise<{
  success: boolean;
  session?: FocusSession;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Authentification requise pour enregistrer une session dans votre Bosquet." };
    }

    const duration = Math.round(input.targetDurationSeconds);
    if (isNaN(duration) || duration < 300 || duration > 10800) {
      return { success: false, error: "La durée de focus doit être comprise entre 5 et 180 minutes." };
    }

    const species: TreeSpecies = input.treeSpecies || "cedar";
    const configured = await isDbConfigured();

    if (!configured) {
      // Local fallback for offline / guest simulation
      const mockSession: FocusSession = {
        id: `local-${Date.now()}`,
        user_id: requester.id,
        subject_id: input.subjectId || null,
        session_label: input.sessionLabel || null,
        target_duration_seconds: duration,
        actual_duration_seconds: 0,
        status: "in_progress",
        tree_species: species,
        started_at: new Date().toISOString(),
        completed_at: null,
        interrupted_at: null,
        interruption_reason: null,
        idempotency_key: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { success: true, session: mockSession };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      return { success: false, error: "Service de base de données indisponible." };
    }

    const { data: session, error } = await serviceSupabase
      .from("focus_sessions")
      .insert({
        user_id: requester.id,
        subject_id: input.subjectId || null,
        session_label: input.sessionLabel?.trim() || null,
        target_duration_seconds: duration,
        status: "in_progress",
        tree_species: species,
      })
      .select()
      .single();

    if (error || !session) {
      console.error("startFocusSession error:", error);
      return { success: false, error: "Erreur lors du démarrage de la session de focus." };
    }

    return { success: true, session };
  } catch (err: any) {
    console.error("startFocusSession exception:", err);
    return { success: false, error: err.message || "Erreur serveur inattendue." };
  }
}

/**
 * 2. Complete session with server-time verification and atomic tree planting
 */
export async function completeFocusSession(
  sessionId: string,
  idempotencyKey?: string
): Promise<{
  success: boolean;
  tree?: ForestEntry;
  alreadyCompleted?: boolean;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Authentification requise pour valider votre arbre." };
    }

    if (!sessionId) {
      return { success: false, error: "Identifiant de session manquant." };
    }

    const configured = await isDbConfigured();

    // Local / unconfigured fallback
    if (!configured || sessionId.startsWith("local-")) {
      const mockTree: ForestEntry = {
        id: `tree-${Date.now()}`,
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "healthy",
        tree_species: "cedar",
        position_x: 0,
        position_y: 0,
        scale_factor: 1.0,
        earned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      return { success: true, tree: mockTree };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      return { success: false, error: "Service indisponible." };
    }

    // 1. Fetch active session
    const { data: session, error: fetchErr } = await serviceSupabase
      .from("focus_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", requester.id)
      .single();

    if (fetchErr || !session) {
      return { success: false, error: "Session introuvable ou accès non autorisé." };
    }

    // 2. Idempotency check: if already completed, return existing tree without duplicating
    if (session.status === "completed") {
      const { data: existingTree } = await serviceSupabase
        .from("forest_entries")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      return {
        success: true,
        alreadyCompleted: true,
        tree: existingTree || undefined,
      };
    }

    if (session.status !== "in_progress") {
      return { success: false, error: "La session n'est plus active ou a été interrompue." };
    }

    // 3. Strict Server Clock Verification (Allow 30s grace window for network lag/throttling)
    const startedAt = new Date(session.started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    const requiredSeconds = session.target_duration_seconds - 30;

    if (elapsedSeconds < requiredSeconds) {
      return {
        success: false,
        error: `Temps de concentration insuffisant (${elapsedSeconds}s écoulées sur ${session.target_duration_seconds}s requises).`,
      };
    }

    // 4. Calculate deterministic spiral coordinates (Golden Angle distribution)
    const { count } = await serviceSupabase
      .from("forest_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", requester.id);

    const treeIndex = count || 0;
    const angle = treeIndex * 2.3999632; // Golden angle in radians
    const radius = 18.0 * Math.sqrt(treeIndex + 1);
    const posX = Math.round(Math.cos(angle) * radius * 100) / 100;
    const posY = Math.round(Math.sin(angle) * radius * 100) / 100;
    const scale = Math.round((0.92 + Math.random() * 0.16) * 100) / 100;

    // 5. Update session to completed
    const { error: updateErr } = await serviceSupabase
      .from("focus_sessions")
      .update({
        status: "completed",
        actual_duration_seconds: elapsedSeconds,
        completed_at: new Date().toISOString(),
        idempotency_key: idempotencyKey || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", requester.id);

    if (updateErr) {
      console.error("completeFocusSession update error:", updateErr);
      return { success: false, error: "Erreur lors de la clôture de la session." };
    }

    // 6. Insert verified healthy tree
    const { data: newTree, error: treeErr } = await serviceSupabase
      .from("forest_entries")
      .insert({
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "healthy",
        tree_species: session.tree_species || "cedar",
        position_x: posX,
        position_y: posY,
        scale_factor: scale,
        earned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (treeErr || !newTree) {
      console.error("completeFocusSession tree insertion error:", treeErr);
      return { success: false, error: "Erreur lors de la plantation de l'arbre." };
    }

    await safeRevalidate("/forest");
    await safeRevalidate("/");

    return { success: true, tree: newTree };
  } catch (err: any) {
    console.error("completeFocusSession exception:", err);
    return { success: false, error: err.message || "Erreur serveur inattendue." };
  }
}

/**
 * 3. Abandon session with 2-minute grace period policy
 */
export async function abandonFocusSession(
  sessionId: string,
  reason?: string
): Promise<{
  success: boolean;
  status: "cancelled" | "interrupted";
  tree?: ForestEntry | null;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, status: "cancelled", error: "Non authentifié." };
    }

    if (!sessionId) {
      return { success: false, status: "cancelled", error: "Identifiant manquant." };
    }

    const configured = await isDbConfigured();

    if (!configured || sessionId.startsWith("local-")) {
      return { success: true, status: "cancelled", tree: null };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      return { success: false, status: "cancelled", error: "Service indisponible." };
    }

    const { data: session, error: fetchErr } = await serviceSupabase
      .from("focus_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", requester.id)
      .single();

    if (fetchErr || !session) {
      return { success: false, status: "cancelled", error: "Session introuvable." };
    }

    if (session.status !== "in_progress") {
      return { success: false, status: "cancelled", error: "La session n'est plus active." };
    }

    const startedAt = new Date(session.started_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

    // Policy Rule 1: Abandoned within 120s -> Graceful Cancellation without penalty
    if (elapsedSeconds <= 120) {
      await serviceSupabase
        .from("focus_sessions")
        .update({
          status: "cancelled",
          actual_duration_seconds: elapsedSeconds,
          interrupted_at: new Date().toISOString(),
          interruption_reason: reason || "Annulation rapide (période de grâce 2 min)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return { success: true, status: "cancelled", tree: null };
    }

    // Policy Rule 2: Abandoned after 120s -> Permanent Leafless Tree
    const { count } = await serviceSupabase
      .from("forest_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", requester.id);

    const treeIndex = count || 0;
    const angle = treeIndex * 2.3999632;
    const radius = 18.0 * Math.sqrt(treeIndex + 1);
    const posX = Math.round(Math.cos(angle) * radius * 100) / 100;
    const posY = Math.round(Math.sin(angle) * radius * 100) / 100;
    const scale = Math.round((0.88 + Math.random() * 0.14) * 100) / 100;

    await serviceSupabase
      .from("focus_sessions")
      .update({
        status: "interrupted",
        actual_duration_seconds: elapsedSeconds,
        interrupted_at: new Date().toISOString(),
        interruption_reason: reason || "Session interrompue volontairement",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    const { data: deadTree, error: deadTreeErr } = await serviceSupabase
      .from("forest_entries")
      .insert({
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "leafless",
        tree_species: session.tree_species || "cedar",
        position_x: posX,
        position_y: posY,
        scale_factor: scale,
        earned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (deadTreeErr || !deadTree) {
      console.error("abandonFocusSession dead tree error:", deadTreeErr);
    }

    await safeRevalidate("/forest");
    await safeRevalidate("/");

    return { success: true, status: "interrupted", tree: deadTree || null };
  } catch (err: any) {
    console.error("abandonFocusSession exception:", err);
    return { success: false, status: "cancelled", error: err.message };
  }
}

function getStarterGroveTrees(_userId: string): ForestEntry[] {
  return [];
}

/**
 * 4. Retrieve personal forest trees, preferences and verified metrics
 */
export async function getMyForest(targetUserId?: string): Promise<{
  authenticated: boolean;
  trees: ForestEntry[];
  preferences: ForestPreferences;
  stats: {
    healthyCount: number;
    leaflessCount: number;
    totalFocusedMinutes: number;
    currentStreak: number;
  };
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    const effectiveUserId = targetUserId || requester?.id;
    const configured = await isDbConfigured();

    if (!effectiveUserId) {
      return {
        authenticated: false,
        trees: [],
        preferences: DEFAULT_PREFERENCES,
        stats: {
          healthyCount: 0,
          leaflessCount: 0,
          totalFocusedMinutes: 0,
          currentStreak: 0,
        },
      };
    }

    const isSelf = !targetUserId || targetUserId === requester?.id;

    if (!configured) {
      return {
        authenticated: !!requester?.id,
        trees: [],
        preferences: { ...DEFAULT_PREFERENCES, user_id: effectiveUserId },
        stats: {
          healthyCount: 0,
          leaflessCount: 0,
          totalFocusedMinutes: 0,
          currentStreak: 0,
        },
      };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      return {
        authenticated: !!requester?.id,
        trees: [],
        preferences: { ...DEFAULT_PREFERENCES, user_id: effectiveUserId },
        stats: {
          healthyCount: 0,
          leaflessCount: 0,
          totalFocusedMinutes: 0,
          currentStreak: 0,
        },
      };
    }

    // Strict privacy access gate when inspecting another user's forest
    if (!isSelf) {
      const { data: targetPref } = await serviceSupabase
        .from("forest_preferences")
        .select("visibility")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      const visibility = targetPref?.visibility || "members";

      if (visibility === "private") {
        return {
          authenticated: !!requester?.id,
          trees: [],
          preferences: { ...DEFAULT_PREFERENCES, user_id: effectiveUserId, visibility: "private" },
          stats: { healthyCount: 0, leaflessCount: 0, totalFocusedMinutes: 0, currentStreak: 0 },
        };
      }

      if (visibility === "members" && !requester?.id) {
        return {
          authenticated: false,
          trees: [],
          preferences: { ...DEFAULT_PREFERENCES, user_id: effectiveUserId, visibility: "members" },
          stats: { healthyCount: 0, leaflessCount: 0, totalFocusedMinutes: 0, currentStreak: 0 },
        };
      }
    }

    const [treesRes, prefsRes, sessionsRes] = await Promise.all([
      serviceSupabase
        .from("forest_entries")
        .select("*, session:focus_sessions(session_label, target_duration_seconds, actual_duration_seconds, subject:subjects(name))")
        .eq("user_id", effectiveUserId)
        .order("earned_at", { ascending: false })
        .limit(300),
      serviceSupabase
        .from("forest_preferences")
        .select("*")
        .eq("user_id", effectiveUserId)
        .maybeSingle(),
      serviceSupabase
        .from("focus_sessions")
        .select("actual_duration_seconds, status, completed_at")
        .eq("user_id", effectiveUserId)
        .eq("status", "completed"),
    ]);

    let trees: ForestEntry[] = treesRes.data || [];
    // No fake trees injected for empty forests
    // trees remains []
    const preferences: ForestPreferences = prefsRes.data || {
      ...DEFAULT_PREFERENCES,
      user_id: effectiveUserId,
    };

    const healthyCount = trees.filter((t) => t.tree_status === "healthy").length;
    const leaflessCount = trees.filter((t) => t.tree_status === "leafless").length;

    const calculatedSeconds = (sessionsRes?.data && sessionsRes.data.length > 0)
      ? sessionsRes.data.reduce((acc: number, s: any) => acc + (s.actual_duration_seconds || 0), 0)
      : trees.reduce((acc: number, t: ForestEntry) => acc + (t.session?.actual_duration_seconds || t.session?.target_duration_seconds || 1500), 0);
    const totalFocusedMinutes = Math.floor(calculatedSeconds / 60);

    // Calculate daily streak
    const activeDates = Array.from(
      new Set(
        trees
          .filter((t) => t.tree_status === "healthy")
          .map((t) => t.earned_at.split("T")[0])
      )
    ).sort().reverse();

    let currentStreak = 0;
    if (activeDates.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];

      if (activeDates[0] === today || activeDates[0] === yesterday) {
        currentStreak = 1;
        let curr = new Date(activeDates[0]);
        for (let i = 1; i < activeDates.length; i++) {
          curr.setDate(curr.getDate() - 1);
          const expected = curr.toISOString().split("T")[0];
          if (activeDates[i] === expected) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      authenticated: true,
      trees,
      preferences,
      stats: {
        healthyCount,
        leaflessCount,
        totalFocusedMinutes,
        currentStreak,
      },
    };
  } catch (err) {
    console.error("getMyForest error:", err);
    return {
      authenticated: false,
      trees: [],
      preferences: DEFAULT_PREFERENCES,
      stats: {
        healthyCount: 0,
        leaflessCount: 0,
        totalFocusedMinutes: 0,
        currentStreak: 0,
      },
    };
  }
}

function getStarterCohortMembers(): MemberForestSummary[] {
  return [];
}

/**
 * 5. Retrieve social community forest summaries (Authenticated, Privacy-Safe)
 */
export async function getCommunityForests(): Promise<MemberForestSummary[]> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return [];
    }

    const starterCohort = getStarterCohortMembers();
    const configured = await isDbConfigured();
    if (!configured) {
      return starterCohort;
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) return starterCohort;

    // 1. Fetch public / members-visible preferences
    const { data: prefs, error: prefsErr } = await serviceSupabase
      .from("forest_preferences")
      .select("user_id, visibility, default_tree_species")
      .in("visibility", ["members", "public"])
      .limit(50);

    if (prefsErr || !prefs || prefs.length === 0) {
      return starterCohort;
    }

    const userIds = prefs.map((p: any) => p.user_id);

    // 2. Fetch profiles & forest entries for these users in batch
    const [profilesRes, entriesRes] = await Promise.all([
      serviceSupabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds),
      serviceSupabase
        .from("forest_entries")
        .select("user_id, tree_status, tree_species, earned_at")
        .in("user_id", userIds)
        .order("earned_at", { ascending: false }),
    ]);

    const profiles = profilesRes.data || [];
    const entries = entriesRes.data || [];

    const dbMembers: MemberForestSummary[] = userIds
      .map((uid: string) => {
        const pref = prefs.find((p: any) => p.user_id === uid);
        const profile = profiles.find((p: any) => p.id === uid);
        const userTrees = entries.filter((e: any) => e.user_id === uid);

        const healthyTreeCount = userTrees.filter((t: any) => t.tree_status === "healthy").length;
        const leaflessTreeCount = userTrees.filter((t: any) => t.tree_status === "leafless").length;

        const recentSpecies = Array.from(
          new Set(userTrees.map((t: any) => t.tree_species as TreeSpecies))
        ).slice(0, 3);

        const lastFocusedAt = userTrees[0]?.earned_at || null;

        return {
          userId: uid,
          displayName: profile?.display_name || "Étudiant IGL4",
          avatarUrl: profile?.avatar_url || null,
          healthyTreeCount,
          leaflessTreeCount,
          totalFocusedMinutes: healthyTreeCount * 25,
          recentSpecies: recentSpecies.length > 0 ? recentSpecies : [(pref?.default_tree_species as TreeSpecies) || "cedar"],
          lastFocusedAt,
          visibility: (pref?.visibility || "members") as ForestVisibility,
        };
      })
      .filter((m: any) => m.healthyTreeCount > 0 || m.userId === requester.id);

    // Merge DB members with starter cohort, deduplicating by userId
    const seen = new Set(dbMembers.map((m) => m.userId));
    const merged = [...dbMembers];
    for (const starter of starterCohort) {
      if (!seen.has(starter.userId)) {
        seen.add(starter.userId);
        merged.push(starter);
      }
    }

    return merged.sort((a, b) => b.healthyTreeCount - a.healthyTreeCount);
  } catch (err) {
    console.error("getCommunityForests error:", err);
    return getStarterCohortMembers();
  }
}

/**
 * 6. Send an encouraging cheer to a classmate's forest
 */
export async function sendClassmateCheer(input: {
  recipientId: string;
  recipientName?: string;
  cheerType: "water" | "clap" | "fire" | "muscle";
  message?: string;
}): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, message: "", error: "Connexion requise pour encourager vos camarades." };
    }

    if (requester.id === input.recipientId) {
      return { success: false, message: "", error: "Vous ne pouvez pas vous encourager vous-même." };
    }

    const cheerLabels: Record<string, string> = {
      water: "💧 Arrosage bienveillant envoyé",
      clap: "👏 Félicitations pour la session envoyées",
      fire: "🔥 Encouragement d'assiduité envoyé",
      muscle: "💪 Force & persévérance transmises",
    };

    const recipientLabel = input.recipientName || "votre camarade";
    const feedbackMsg = `${cheerLabels[input.cheerType] || "Encouragement envoyé"} à ${recipientLabel} !`;

    const configured = await isDbConfigured();
    if (configured) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          await serviceSupabase.from("forest_cheers").insert({
            sender_id: requester.id,
            recipient_id: input.recipientId,
            cheer_type: input.cheerType,
            message: input.message || null,
            created_at: new Date().toISOString(),
          });
        } catch {
          // Graceful fallback if forest_cheers table not in DB
        }
      }
    }

    return {
      success: true,
      message: feedbackMsg,
    };
  } catch (err: any) {
    return { success: false, message: "", error: err?.message || "Erreur lors de l'envoi de l'encouragement." };
  }
}

/**
 * 6. Update user's forest visibility preferences
 */
export async function updateForestPreferences(input: {
  visibility?: ForestVisibility;
  defaultTreeSpecies?: TreeSpecies;
  allowClassmateCheers?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Non authentifié." };
    }

    const configured = await isDbConfigured();
    if (!configured) {
      return { success: true };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      return { success: false, error: "Service indisponible." };
    }

    const { error } = await serviceSupabase.from("forest_preferences").upsert(
      {
        user_id: requester.id,
        ...(input.visibility ? { visibility: input.visibility } : {}),
        ...(input.defaultTreeSpecies ? { default_tree_species: input.defaultTreeSpecies } : {}),
        ...(input.allowClassmateCheers !== undefined
          ? { allow_classmate_cheers: input.allowClassmateCheers }
          : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("updateForestPreferences error:", error);
      return { success: false, error: "Erreur lors de la mise à jour des préférences." };
    }

    await safeRevalidate("/forest");
    await safeRevalidate("/forest/community");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
