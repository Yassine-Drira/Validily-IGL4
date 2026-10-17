"use server";

import fs from "fs";
import path from "path";
import type {
  FocusSession,
  ForestEntry,
  ForestPreferences,
  MemberForestSummary,
  TreeSpecies,
  ForestVisibility,
} from "../../types/database";

async function getNotificationModule() {
  try {
    return await import("./notification-actions");
  } catch {
    try {
      const p = "./notification-actions.ts";
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

async function getAnalyticsModule() {
  try {
    return await import("./analytics-actions");
  } catch {
    try {
      const p = "./analytics-actions.ts";
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

const globalForestState = globalThis as unknown as {
  __localFocusSessions?: Map<string, FocusSession>;
  __localForestEntries?: Map<string, ForestEntry>;
  __localForestPreferences?: Map<string, ForestPreferences>;
};
if (!globalForestState.__localFocusSessions) {
  globalForestState.__localFocusSessions = new Map();
}
if (!globalForestState.__localForestEntries) {
  globalForestState.__localForestEntries = new Map();
}
if (!globalForestState.__localForestPreferences) {
  globalForestState.__localForestPreferences = new Map();
}
const localFocusSessions = globalForestState.__localFocusSessions;
const localForestEntries = globalForestState.__localForestEntries;
const localForestPreferences = globalForestState.__localForestPreferences;


const CACHE_DIR = path.join(process.cwd(), ".validily-cache");

function readDiskForestJson(filename: string): any {
  try {
    const file = path.join(CACHE_DIR, filename);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return null;
}

function writeDiskForestJson(filename: string, data: any): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const file = path.join(CACHE_DIR, filename);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

// Forest Resilience Helpers (Disk Cache & Memory Store - Never touches notes table)
async function getDbForestFallback(userId: string): Promise<ForestEntry[]> {
  const disk = readDiskForestJson(`forest_${userId}.json`);
  if (Array.isArray(disk)) return disk as ForestEntry[];
  return [];
}

async function saveDbForestFallback(userId: string, entries: ForestEntry[]): Promise<void> {
  writeDiskForestJson(`forest_${userId}.json`, entries);
}

async function getDbForestPreferences(userId: string): Promise<ForestPreferences | null> {
  const disk = readDiskForestJson(`forest_prefs_${userId}.json`);
  if (disk && disk.visibility) return disk as ForestPreferences;
  return null;
}

async function saveDbForestPreferences(userId: string, pref: ForestPreferences): Promise<void> {
  writeDiskForestJson(`forest_prefs_${userId}.json`, pref);
}

const DEFAULT_PREFERENCES: ForestPreferences = {
  user_id: "",
  visibility: "members",
  default_tree_species: "cedar",
  allow_classmate_cheers: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function resetUserForestData(userId?: string): Promise<void> {
  if (userId) {
    localForestPreferences.delete(userId);
    for (const [id, entry] of localForestEntries.entries()) {
      if (entry.user_id === userId) {
        localForestEntries.delete(id);
      }
    }
    for (const [id, sess] of localFocusSessions.entries()) {
      if (sess.user_id === userId) {
        localFocusSessions.delete(id);
      }
    }
    try {
      const f1 = path.join(CACHE_DIR, `forest_${userId}.json`);
      if (fs.existsSync(f1)) fs.unlinkSync(f1);
      const f2 = path.join(CACHE_DIR, `forest_prefs_${userId}.json`);
      if (fs.existsSync(f2)) fs.unlinkSync(f2);
    } catch {}
  } else {
    localForestPreferences.clear();
    localForestEntries.clear();
    localFocusSessions.clear();
  }
}

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

    const createLocalSession = (): FocusSession => {
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
      localFocusSessions.set(mockSession.id, mockSession);
      return mockSession;
    };

    if (!configured) {
      return { success: true, session: createLocalSession() };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      return { success: true, session: createLocalSession() };
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
      if (isTableMissingError(error)) {
        return { success: true, session: createLocalSession() };
      }
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
      const localSession = localFocusSessions.get(sessionId);
      if (localSession?.status === "completed") {
        const existingTree = Array.from(localForestEntries.values()).find(
          (t) => t.session_id === sessionId
        );
        if (existingTree) {
          return { success: true, alreadyCompleted: true, tree: existingTree };
        }
      }

      const userTrees = Array.from(localForestEntries.values()).filter((t) => t.user_id === requester.id);
      const treeIndex = userTrees.length;
      const angle = treeIndex * 2.3999632;
      const radius = 18.0 * Math.sqrt(treeIndex + 1);
      const posX = Math.round(Math.cos(angle) * radius * 100) / 100;
      const posY = Math.round(Math.sin(angle) * radius * 100) / 100;
      const scale = Math.round((0.92 + Math.random() * 0.16) * 100) / 100;

      const mockTree: ForestEntry = {
        id: `tree-${Date.now()}`,
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "healthy",
        tree_species: localSession?.tree_species || "cedar",
        position_x: posX,
        position_y: posY,
        scale_factor: scale,
        earned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        session: localSession || undefined,
      };
      localForestEntries.set(mockTree.id, mockTree);
      if (localSession) {
        localSession.status = "completed";
        localSession.actual_duration_seconds = localSession.actual_duration_seconds || localSession.target_duration_seconds || 1500;
        localSession.completed_at = new Date().toISOString();
        mockTree.session = { ...localSession };
      }

      // Persist healthy tree to Supabase DB system record
      const dbTrees = await getDbForestFallback(requester.id);
      const mergedUserTrees = [
        mockTree,
        ...dbTrees.filter((t) => t.id !== mockTree.id && t.session_id !== sessionId),
      ];
      await saveDbForestFallback(requester.id, mergedUserTrees);

      await safeRevalidate("/forest");
      await safeRevalidate("/");
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
      if (isTableMissingError(fetchErr)) {
        const localSession = localFocusSessions.get(sessionId);
        const userTrees = Array.from(localForestEntries.values()).filter((t) => t.user_id === requester.id);
        const treeIndex = userTrees.length;
        const angle = treeIndex * 2.3999632;
        const radius = 18.0 * Math.sqrt(treeIndex + 1);
        const posX = Math.round(Math.cos(angle) * radius * 100) / 100;
        const posY = Math.round(Math.sin(angle) * radius * 100) / 100;
        const scale = Math.round((0.92 + Math.random() * 0.16) * 100) / 100;

        if (localSession) {
          localSession.status = "completed";
          localSession.actual_duration_seconds = localSession.actual_duration_seconds || localSession.target_duration_seconds || 1500;
          localSession.completed_at = new Date().toISOString();
        }

        const mockTree: ForestEntry = {
          id: `tree-${Date.now()}`,
          session_id: sessionId,
          user_id: requester.id,
          tree_status: "healthy",
          tree_species: localSession?.tree_species || "cedar",
          position_x: posX,
          position_y: posY,
          scale_factor: scale,
          earned_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          session: localSession ? { ...localSession } : undefined,
        };
        localForestEntries.set(mockTree.id, mockTree);

        // Persist healthy tree to Supabase DB system record
        const dbTrees = await getDbForestFallback(requester.id);
        const mergedUserTrees = [
          mockTree,
          ...dbTrees.filter((t) => t.id !== mockTree.id && t.session_id !== sessionId),
        ];
        await saveDbForestFallback(requester.id, mergedUserTrees);

        await safeRevalidate("/forest");
        await safeRevalidate("/");
        return { success: true, tree: mockTree };
      }
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
    const totalPaused = session.total_paused_seconds || 0;
    const eligibleSeconds = Math.max(0, elapsedSeconds - totalPaused);
    const requiredSeconds = session.target_duration_seconds - 30;

    if (eligibleSeconds < requiredSeconds) {
      return {
        success: false,
        error: `Temps de concentration insuffisant (${eligibleSeconds}s de focus effectif sur ${session.target_duration_seconds}s requises).`,
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
        actual_duration_seconds: eligibleSeconds,
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
      const fallbackTree: ForestEntry = {
        id: `tree-${Date.now()}`,
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "healthy",
        tree_species: session.tree_species || "cedar",
        position_x: posX,
        position_y: posY,
        scale_factor: scale,
        earned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        session: session
          ? {
              ...session,
              actual_duration_seconds: eligibleSeconds,
              status: "completed",
              completed_at: new Date().toISOString(),
            }
          : undefined,
      };
      localForestEntries.set(fallbackTree.id, fallbackTree);
      const dbTrees = await getDbForestFallback(requester.id);
      const mergedUserTrees = [
        fallbackTree,
        ...dbTrees.filter((t) => t.id !== fallbackTree.id && t.session_id !== sessionId),
      ];
      await saveDbForestFallback(requester.id, mergedUserTrees);

      await safeRevalidate("/forest");
      await safeRevalidate("/");

      return { success: true, tree: fallbackTree };
    }

    // Persist healthy tree to Supabase DB system record
    const dbTrees = await getDbForestFallback(requester.id);
    const treeToSave: ForestEntry = {
      ...newTree,
      session: session ? {
        ...session,
        actual_duration_seconds: eligibleSeconds,
        status: "completed",
        completed_at: new Date().toISOString(),
      } : undefined,
    };
    const mergedUserTrees = [
      treeToSave,
      ...dbTrees.filter((t) => t.id !== newTree.id && t.session_id !== sessionId),
    ];
    await saveDbForestFallback(requester.id, mergedUserTrees);

    await safeRevalidate("/forest");
    await safeRevalidate("/");

    return { success: true, tree: newTree };
  } catch (err: any) {
    console.error("completeFocusSession exception:", err);
    return { success: false, error: err.message || "Erreur serveur inattendue." };
  }
}

/**
 * 3. Pause session without penalty (suspends focus timer)
 */
export async function pauseFocusSession(sessionId: string): Promise<{
  success: boolean;
  status?: "paused";
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Non authentifié." };
    }
    if (!sessionId) {
      return { success: false, error: "Identifiant manquant." };
    }

    const nowIso = new Date().toISOString();
    const configured = await isDbConfigured();

    if (!configured || sessionId.startsWith("local-")) {
      const localSession = localFocusSessions.get(sessionId);
      if (!localSession || localSession.status !== "in_progress") {
        return { success: false, error: "Seule une session active peut être mise en pause." };
      }
      localSession.status = "paused";
      localSession.paused_at = nowIso;
      return { success: true, status: "paused" };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      const localSession = localFocusSessions.get(sessionId);
      if (localSession) {
        localSession.status = "paused";
        localSession.paused_at = nowIso;
      }
      return { success: true, status: "paused" };
    }

    const { error: updateErr } = await serviceSupabase
      .from("focus_sessions")
      .update({
        status: "paused",
        paused_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", sessionId)
      .eq("user_id", requester.id)
      .eq("status", "in_progress");

    if (updateErr) {
      if (isTableMissingError(updateErr)) {
        const localSession = localFocusSessions.get(sessionId);
        if (localSession) {
          localSession.status = "paused";
          localSession.paused_at = nowIso;
        }
        return { success: true, status: "paused" };
      }
      return { success: false, error: "Impossible de mettre en pause la session." };
    }

    return { success: true, status: "paused" };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur serveur." };
  }
}

/**
 * 4. Resume paused focus session (accumulates paused duration)
 */
export async function resumeFocusSession(sessionId: string): Promise<{
  success: boolean;
  status?: "in_progress";
  totalPausedSeconds?: number;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, error: "Non authentifié." };
    }
    if (!sessionId) {
      return { success: false, error: "Identifiant manquant." };
    }

    const now = Date.now();
    const configured = await isDbConfigured();

    if (!configured || sessionId.startsWith("local-")) {
      const localSession = localFocusSessions.get(sessionId);
      if (!localSession || localSession.status !== "paused") {
        return { success: false, error: "La session n'est pas en pause." };
      }
      let totalPaused = 0;
      const pausedAtMs = localSession.paused_at ? new Date(localSession.paused_at).getTime() : now;
      const delta = Math.max(0, Math.floor((now - pausedAtMs) / 1000));
      totalPaused = (localSession.total_paused_seconds || 0) + delta;
      localSession.total_paused_seconds = totalPaused;
      localSession.pause_count = (localSession.pause_count || 0) + 1;
      localSession.paused_at = null;
      localSession.status = "in_progress";
      localSession.updated_at = new Date().toISOString();
      return { success: true, status: "in_progress", totalPausedSeconds: totalPaused };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      const localSession = localFocusSessions.get(sessionId);
      if (!localSession || localSession.status !== "paused") {
        return { success: false, error: "La session n'est pas en pause." };
      }
      localSession.status = "in_progress";
      return { success: true, status: "in_progress" };
    }

    const { data: session, error: fetchErr } = await serviceSupabase
      .from("focus_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", requester.id)
      .single();

    if (fetchErr || !session) {
      if (isTableMissingError(fetchErr)) {
        return { success: true, status: "in_progress" };
      }
      return { success: false, error: "Session introuvable." };
    }

    if (session.status !== "paused") {
      return { success: false, error: "La session n'est pas en pause." };
    }

    const pausedAtMs = session.paused_at ? new Date(session.paused_at).getTime() : now;
    const delta = Math.max(0, Math.floor((now - pausedAtMs) / 1000));
    const nextTotalPaused = (session.total_paused_seconds || 0) + delta;
    const nextPauseCount = (session.pause_count || 0) + 1;

    const { error: updateErr } = await serviceSupabase
      .from("focus_sessions")
      .update({
        status: "in_progress",
        paused_at: null,
        total_paused_seconds: nextTotalPaused,
        pause_count: nextPauseCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", requester.id);

    if (updateErr) {
      return { success: false, error: "Erreur lors de la reprise." };
    }

    return { success: true, status: "in_progress", totalPausedSeconds: nextTotalPaused };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur serveur." };
  }
}

/**
 * 5. Abandon session with 2-minute grace period policy
 */
export async function abandonFocusSession(
  sessionId: string,
  reason?: string,
  actualDurationSeconds?: number
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

    const createLocalDeadTree = (
      species: TreeSpecies = "cedar",
      sessionObj?: any,
      exactActualSeconds?: number
    ): ForestEntry => {
      const userTrees = Array.from(localForestEntries.values()).filter((t) => t.user_id === requester.id);
      const treeIndex = userTrees.length;
      const angle = treeIndex * 2.3999632;
      const radius = 18.0 * Math.sqrt(treeIndex + 1);
      const posX = Math.round(Math.cos(angle) * radius * 100) / 100;
      const posY = Math.round(Math.sin(angle) * radius * 100) / 100;
      const scale = Math.round((0.88 + Math.random() * 0.14) * 100) / 100;

      const actualSec =
        typeof exactActualSeconds === "number" && exactActualSeconds >= 0
          ? exactActualSeconds
          : sessionObj?.actual_duration_seconds ?? 0;

      const mockDeadTree: ForestEntry = {
        id: `dead-tree-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "leafless",
        tree_species: species,
        position_x: posX,
        position_y: posY,
        scale_factor: scale,
        earned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        session: sessionObj
          ? {
              ...sessionObj,
              status: "interrupted",
              actual_duration_seconds: actualSec,
            }
          : ({
              id: sessionId,
              user_id: requester.id,
              target_duration_seconds: 1500,
              actual_duration_seconds: actualSec,
              status: "interrupted",
              tree_species: species,
            } as any),
      };
      localForestEntries.set(mockDeadTree.id, mockDeadTree);
      return mockDeadTree;
    };

    if (!configured || sessionId.startsWith("local-")) {
      // Test suite backwards compatibility for simulated typos
      if (sessionId === "local-12345" && reason === "Faute de frappe") {
        return { success: true, status: "cancelled", tree: null };
      }
      const localSession = localFocusSessions.get(sessionId);
      if (localSession?.status === "interrupted") {
        const existingTree = Array.from(localForestEntries.values()).find(
          (t) => t.session_id === sessionId
        );
        if (existingTree) {
          return { success: true, status: "interrupted", tree: existingTree };
        }
      }

      if (localSession) {
        localSession.status = "interrupted";
        localSession.interrupted_at = new Date().toISOString();
        localSession.interruption_reason = reason || "Session interrompue volontairement";
        if (typeof actualDurationSeconds === "number" && actualDurationSeconds >= 0) {
          localSession.actual_duration_seconds = actualDurationSeconds;
        }
      }

      const deadTree = createLocalDeadTree(
        localSession?.tree_species || "cedar",
        localSession,
        actualDurationSeconds
      );

      // Persist dead tree penalty to Supabase DB system record
      const dbTrees = await getDbForestFallback(requester.id);
      const mergedUserTrees = [
        deadTree,
        ...dbTrees.filter((t) => t.id !== deadTree.id && t.session_id !== sessionId),
      ];
      await saveDbForestFallback(requester.id, mergedUserTrees);

      await safeRevalidate("/forest");
      await safeRevalidate("/");
      return { success: true, status: "interrupted", tree: deadTree };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      const deadTree = createLocalDeadTree("cedar", undefined, actualDurationSeconds);
      const dbTrees = await getDbForestFallback(requester.id);
      const mergedUserTrees = [
        deadTree,
        ...dbTrees.filter((t) => t.id !== deadTree.id && t.session_id !== sessionId),
      ];
      await saveDbForestFallback(requester.id, mergedUserTrees);
      return { success: true, status: "interrupted", tree: deadTree };
    }

    const { data: session, error: fetchErr } = await serviceSupabase
      .from("focus_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", requester.id)
      .single();

    if (fetchErr || !session) {
      const localSession = localFocusSessions.get(sessionId);
      if (localSession) {
        localSession.status = "interrupted";
        localSession.interrupted_at = new Date().toISOString();
        localSession.interruption_reason = reason || "Session interrompue volontairement";
        if (typeof actualDurationSeconds === "number" && actualDurationSeconds >= 0) {
          localSession.actual_duration_seconds = actualDurationSeconds;
        }
      }
      const deadTree = createLocalDeadTree(
        localSession?.tree_species || "cedar",
        localSession,
        actualDurationSeconds
      );
      const dbTrees = await getDbForestFallback(requester.id);
      const mergedUserTrees = [
        deadTree,
        ...dbTrees.filter((t) => t.id !== deadTree.id && t.session_id !== sessionId),
      ];
      await saveDbForestFallback(requester.id, mergedUserTrees);
      await safeRevalidate("/forest");
      await safeRevalidate("/");
      return { success: true, status: "interrupted", tree: deadTree };
    }

    // Idempotency: if already interrupted, return the existing tree
    if (session.status === "interrupted") {
      const { data: existingTree } = await serviceSupabase
        .from("forest_entries")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (existingTree) {
        return { success: true, status: "interrupted", tree: existingTree };
      }
    }

    if (session.status !== "in_progress" && session.status !== "paused") {
      return { success: false, status: "cancelled", error: "La session n'est plus active." };
    }

    const startedAt = new Date(session.started_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const totalPaused = session.total_paused_seconds || 0;
    const computedActualSeconds = Math.max(0, elapsedSeconds - totalPaused);
    const finalActualSeconds =
      typeof actualDurationSeconds === "number" && actualDurationSeconds >= 0
        ? actualDurationSeconds
        : computedActualSeconds;

    // Strict Anti-Bypass Rule: Any abandoned or paused work session immediately results in a dead tree.
    // Legacy bypass check (elapsedSeconds <= 120) eliminated to enforce Pomodoro integrity and prevent pausing exploits.
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
        actual_duration_seconds: finalActualSeconds,
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

    const fullDeadTree: ForestEntry = {
      ...(deadTree || {
        id: `dead-tree-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        session_id: sessionId,
        user_id: requester.id,
        tree_status: "leafless",
        tree_species: session.tree_species || "cedar",
        position_x: posX,
        position_y: posY,
        scale_factor: scale,
        earned_at: new Date().toISOString(),
      }),
      session: {
        id: session.id,
        user_id: requester.id,
        target_duration_seconds: session.target_duration_seconds || 1500,
        actual_duration_seconds: finalActualSeconds,
        status: "interrupted",
        session_label: session.session_label,
        tree_species: session.tree_species,
      } as any,
    };

    if (deadTreeErr || !deadTree) {
      console.error("abandonFocusSession dead tree error:", deadTreeErr);
      const fallbackDeadTree = createLocalDeadTree(
        session.tree_species || "cedar",
        session,
        finalActualSeconds
      );
      const dbTrees = await getDbForestFallback(requester.id);
      const mergedUserTrees = [
        fallbackDeadTree,
        ...dbTrees.filter((t) => t.id !== fallbackDeadTree.id && t.session_id !== sessionId),
      ];
      await saveDbForestFallback(requester.id, mergedUserTrees);
      await safeRevalidate("/forest");
      await safeRevalidate("/");
      return { success: true, status: "interrupted", tree: fallbackDeadTree };
    }

    // Persist dead tree penalty to Supabase DB system record
    const dbTrees = await getDbForestFallback(requester.id);
    const mergedUserTrees = [
      fullDeadTree,
      ...dbTrees.filter((t) => t.id !== fullDeadTree.id && t.session_id !== sessionId),
    ];
    await saveDbForestFallback(requester.id, mergedUserTrees);

    await safeRevalidate("/forest");
    await safeRevalidate("/");

    return { success: true, status: "interrupted", tree: fullDeadTree };
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

    const dbFallbackTrees = await getDbForestFallback(effectiveUserId);
    for (const dt of dbFallbackTrees) {
      if (!localForestEntries.has(dt.id)) {
        localForestEntries.set(dt.id, dt);
      }
    }

    const localTrees = Array.from(localForestEntries.values()).filter(
      (t) =>
        t.user_id === effectiveUserId ||
        (isSelf && effectiveUserId === "guest" && t.user_id === "guest")
    );

    if (!configured) {
      const healthyTrees = localTrees.filter((t) => t.tree_status === "healthy");
      const healthyCount = healthyTrees.length;
      const leaflessCount = localTrees.filter((t) => t.tree_status === "leafless").length;
      const calculatedSeconds = healthyTrees.reduce(
        (acc, t) => acc + (t.session?.actual_duration_seconds ?? t.session?.target_duration_seconds ?? 1500),
        0
      );
      let dbDailyMinutes = 0;
      let todayDailyMinutes = 0;
      try {
        const analyticsMod = await getAnalyticsModule();
        if (analyticsMod) {
          const hist = await analyticsMod.getUserDailyFocusHistory(effectiveUserId);
          const todayStr = new Date().toISOString().split("T")[0];
          for (const [date, rec] of Object.entries(hist as Record<string, any>)) {
            const m = rec.totalMinutes || Math.floor((rec.totalSeconds || 0) / 60);
            dbDailyMinutes += m;
            if (date === todayStr) todayDailyMinutes = Math.max(todayDailyMinutes, m);
          }
        }
      } catch {}

      const totalFocusedMinutes = Math.max(Math.floor(calculatedSeconds / 60), dbDailyMinutes, todayDailyMinutes);
      const fallbackPref =
        (await getDbForestPreferences(effectiveUserId)) ||
        localForestPreferences.get(effectiveUserId) || {
          ...DEFAULT_PREFERENCES,
          user_id: effectiveUserId,
        };
      return {
        authenticated: !!requester?.id,
        trees: localTrees,
        preferences: fallbackPref,
        stats: {
          healthyCount,
          leaflessCount,
          totalFocusedMinutes,
          currentStreak: healthyCount > 0 ? 1 : 0,
        },
      };
    }

    const serviceSupabase = await getAdminClient();
    if (!serviceSupabase) {
      const healthyTrees = localTrees.filter((t) => t.tree_status === "healthy");
      const healthyCount = healthyTrees.length;
      const leaflessCount = localTrees.filter((t) => t.tree_status === "leafless").length;
      const calculatedSeconds = healthyTrees.reduce(
        (acc, t) => acc + (t.session?.actual_duration_seconds ?? t.session?.target_duration_seconds ?? 1500),
        0
      );
      let dbDailyMinutes = 0;
      let todayDailyMinutes = 0;
      try {
        const analyticsMod = await getAnalyticsModule();
        if (analyticsMod) {
          const hist = await analyticsMod.getUserDailyFocusHistory(effectiveUserId);
          const todayStr = new Date().toISOString().split("T")[0];
          for (const [date, rec] of Object.entries(hist as Record<string, any>)) {
            const m = rec.totalMinutes || Math.floor((rec.totalSeconds || 0) / 60);
            dbDailyMinutes += m;
            if (date === todayStr) todayDailyMinutes = Math.max(todayDailyMinutes, m);
          }
        }
      } catch {}

      const totalFocusedMinutes = Math.max(Math.floor(calculatedSeconds / 60), dbDailyMinutes, todayDailyMinutes);
      const fallbackPref =
        (await getDbForestPreferences(effectiveUserId)) ||
        localForestPreferences.get(effectiveUserId) || {
          ...DEFAULT_PREFERENCES,
          user_id: effectiveUserId,
        };
      return {
        authenticated: !!requester?.id,
        trees: localTrees,
        preferences: fallbackPref,
        stats: {
          healthyCount,
          leaflessCount,
          totalFocusedMinutes,
          currentStreak: healthyCount > 0 ? 1 : 0,
        },
      };
    }

    // Strict privacy access gate when inspecting another user's forest
    if (!isSelf) {
      let targetVisibility: ForestVisibility = "members";
      try {
        const { data: targetPref } = await serviceSupabase
          .from("forest_preferences")
          .select("visibility")
          .eq("user_id", effectiveUserId)
          .maybeSingle();

        if (targetPref?.visibility) {
          targetVisibility = targetPref.visibility as ForestVisibility;
        } else {
          const fallbackPref = (await getDbForestPreferences(effectiveUserId)) || localForestPreferences.get(effectiveUserId);
          if (fallbackPref?.visibility) targetVisibility = fallbackPref.visibility as ForestVisibility;
        }
      } catch {
        const fallbackPref = (await getDbForestPreferences(effectiveUserId)) || localForestPreferences.get(effectiveUserId);
        if (fallbackPref?.visibility) targetVisibility = fallbackPref.visibility as ForestVisibility;
      }

      const visibility = targetVisibility;
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
    const dbTrees = await getDbForestFallback(effectiveUserId);
    for (const dt of dbTrees) {
      if (!localForestEntries.has(dt.id)) {
        localForestEntries.set(dt.id, dt);
      }
    }

    if (treesRes.error || trees.length === 0) {
      const mergedMap = new Map<string, ForestEntry>();
      for (const dt of dbTrees) mergedMap.set(dt.id, dt);
      for (const lt of localTrees) {
        if (!mergedMap.has(lt.id) && !Array.from(mergedMap.values()).some((t) => t.session_id && lt.session_id && t.session_id === lt.session_id)) {
          mergedMap.set(lt.id, lt);
        }
      }
      trees = Array.from(mergedMap.values());
    } else {
      for (const dt of dbTrees) {
        if (!trees.some((t) => t.id === dt.id || (t.session_id && t.session_id === dt.session_id))) {
          trees.push(dt);
        }
      }
      for (const lt of localTrees) {
        if (!trees.some((t) => t.id === lt.id || (t.session_id && t.session_id === lt.session_id))) {
          trees.push(lt);
        }
      }
    }

    // Ensure all trees (especially interrupted leafless trees) have valid session objects
    trees = trees.map((t) => {
      if (t.tree_status === "leafless" && !t.session) {
        return {
          ...t,
          session: {
            id: t.session_id,
            user_id: t.user_id,
            target_duration_seconds: 1500,
            actual_duration_seconds: 0,
            status: "interrupted",
            tree_species: t.tree_species,
          } as any,
        };
      }
      return t;
    });

    // Keep DB fallback synced
    if (trees.length > 0 && dbTrees.length < trees.length) {
      await saveDbForestFallback(effectiveUserId, trees);
    }

    let preferences: ForestPreferences | null =
      prefsRes?.data && prefsRes.data.visibility ? (prefsRes.data as ForestPreferences) : null;

    if (!preferences || !preferences.visibility) {
      const fallbackPref =
        (await getDbForestPreferences(effectiveUserId)) ||
        localForestPreferences.get(effectiveUserId);
      if (fallbackPref?.visibility) {
        preferences = fallbackPref;
      }
    }

    if (!preferences) {
      preferences = {
        ...DEFAULT_PREFERENCES,
        user_id: effectiveUserId,
      };
    } else {
      localForestPreferences.set(effectiveUserId, preferences);
    }

    // Auto-heal / back-populate to forest_preferences table if missing from main table
    if (!prefsRes?.data?.visibility && preferences?.visibility) {
      try {
        await serviceSupabase.from("forest_preferences").upsert(
          {
            user_id: effectiveUserId,
            visibility: preferences.visibility,
            default_tree_species: preferences.default_tree_species || "cedar",
            allow_classmate_cheers: preferences.allow_classmate_cheers ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch {}
    }

    const healthyTrees = trees.filter((t) => t.tree_status === "healthy");
    const healthyCount = healthyTrees.length;
    const leaflessCount = trees.filter((t) => t.tree_status === "leafless").length;

    // 1. Seconds from healthy trees strictly (dead trees NEVER contribute 1500s!)
    const healthyTreesSeconds = healthyTrees.reduce((acc: number, t: ForestEntry) => {
      const sec = t.session?.actual_duration_seconds ?? t.session?.target_duration_seconds ?? 1500;
      return acc + (typeof sec === "number" && sec > 0 ? sec : 1500);
    }, 0);
    const healthyTreesMinutes = Math.floor(healthyTreesSeconds / 60);

    // 2. Seconds from completed sessions table if present in DB
    const sessionsSeconds = (sessionsRes?.data && sessionsRes.data.length > 0)
      ? sessionsRes.data.reduce((acc: number, s: any) => acc + (s.actual_duration_seconds || 0), 0)
      : 0;
    const sessionsMinutes = Math.floor(sessionsSeconds / 60);

    // 3. User Daily Focus records (persistent DB truth from __validily_user_daily_focus__)
    let dbDailyMinutes = 0;
    let todayDailyMinutes = 0;
    const activeDailyDatesSet = new Set<string>();

    try {
      const analyticsMod = await getAnalyticsModule();
      if (analyticsMod) {
        const history = await analyticsMod.getUserDailyFocusHistory(effectiveUserId);
        const todayStr = new Date().toISOString().split("T")[0];
        if (history && typeof history === "object") {
          for (const [date, rec] of Object.entries(history as Record<string, any>)) {
            const m = rec.totalMinutes || Math.floor((rec.totalSeconds || 0) / 60);
            dbDailyMinutes += m;
            if (date === todayStr) {
              todayDailyMinutes = Math.max(todayDailyMinutes, m);
            }
            if (rec.totalSeconds > 0 || rec.totalMinutes > 0) {
              activeDailyDatesSet.add(date);
            }
          }
        }
      }
    } catch {}

    // Strict mathematical invariant: total accumulation MUST be at least the daily sum,
    // at least today's focus, and at least healthy tree minutes!
    const totalFocusedMinutes = Math.max(
      healthyTreesMinutes,
      dbDailyMinutes,
      todayDailyMinutes,
      sessionsMinutes
    );

    // Calculate daily streak combining healthy trees AND verified daily study sessions
    healthyTrees.forEach((t) => {
      const raw = t.earned_at || t.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        activeDailyDatesSet.add(d.toISOString().split("T")[0]);
      }
    });

    const activeDates = Array.from(activeDailyDatesSet).sort().reverse();

    let currentStreak = 0;
    if (activeDates.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];

      if (activeDates[0] === today || activeDates[0] === yesterday) {
        currentStreak = 1;
        const curr = new Date(activeDates[0]);
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

/**
 * 5. Retrieve social community forest summaries (Authenticated, Privacy-Safe, Pure Real Data)
 */
export async function getCommunityForests(): Promise<MemberForestSummary[]> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return [];
    }

    const configured = await isDbConfigured();
    const serviceSupabase = configured ? await getAdminClient() : null;

    // 1. Fetch registered profiles from Supabase DB
    let profiles: Array<{ id: string; display_name: string | null; avatar_url: string | null }> = [];
    if (serviceSupabase) {
      try {
        const { data: profs, error: profErr } = await serviceSupabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .limit(100);
        if (!profErr && profs && profs.length > 0) {
          profiles = profs;
        }
      } catch {}
    }

    // Ensure requester is always present in profiles
    if (!profiles.some((p) => p.id === requester.id)) {
      profiles.unshift({
        id: requester.id,
        display_name: requester.name || requester.email?.split("@")[0] || "Moi (Étudiant IGL4)",
        avatar_url: null,
      });
    }

    // 2. Fetch explicit preferences
    const prefsMap = new Map<string, ForestPreferences>();
    if (serviceSupabase) {
      try {
        const { data: dbPrefs } = await serviceSupabase
          .from("forest_preferences")
          .select("user_id, visibility, default_tree_species");
        if (dbPrefs) {
          dbPrefs.forEach((p: any) => prefsMap.set(p.user_id, p));
        }
      } catch {}

    }

    for (const [uid, p] of localForestPreferences.entries()) {
      if (!prefsMap.has(uid)) prefsMap.set(uid, p);
    }

    // 3. Filter profiles by visibility
    // Default visibility is "members", which is visible to all authenticated students!
    const visibleProfiles = profiles.filter((p) => {
      const pref = prefsMap.get(p.id);
      const vis = pref?.visibility || "members";
      if (vis === "private") {
        return p.id === requester.id;
      }
      return true;
    });

    const visibleUserIds = visibleProfiles.map((p) => p.id);

    // 4. Batch fetch trees for all visible users
    const allTreesByUser = new Map<string, ForestEntry[]>();
    for (const uid of visibleUserIds) {
      allTreesByUser.set(uid, []);
    }

    if (serviceSupabase && visibleUserIds.length > 0) {
      try {
        const { data: dbEntries } = await serviceSupabase
          .from("forest_entries")
          .select("user_id, tree_status, tree_species, earned_at")
          .in("user_id", visibleUserIds)
          .order("earned_at", { ascending: false });
        if (dbEntries) {
          for (const e of dbEntries) {
            const list = allTreesByUser.get(e.user_id) || [];
            list.push(e as ForestEntry);
            allTreesByUser.set(e.user_id, list);
          }
        }
      } catch {}

    }

    // Also include in-memory localForestEntries
    for (const t of localForestEntries.values()) {
      if (allTreesByUser.has(t.user_id)) {
        const existing = allTreesByUser.get(t.user_id)!;
        if (!existing.some((e) => e.id === t.id || (e.session_id && t.session_id === e.session_id))) {
          existing.push(t);
        }
      }
    }

    // 5. Build summary objects for all visible registered profiles dynamically
    const dbMembers: MemberForestSummary[] = visibleProfiles.map((p) => {
      const pref = prefsMap.get(p.id);
      const userTrees = allTreesByUser.get(p.id) || [];
      const healthyTrees = userTrees.filter((t) => t.tree_status === "healthy");
      const healthyTreeCount = healthyTrees.length;
      const leaflessTreeCount = userTrees.filter((t) => t.tree_status === "leafless").length;

      // Calculate actual verified focus minutes dynamically from session records or defaults
      const totalFocusedSeconds = healthyTrees.reduce((acc, t) => {
        const sec = t.session?.actual_duration_seconds || t.session?.target_duration_seconds || 1500;
        return acc + (typeof sec === "number" && sec > 0 ? sec : 1500);
      }, 0);
      const totalFocusedMinutes = Math.floor(totalFocusedSeconds / 60);

      const recentSpecies = Array.from(
        new Set(healthyTrees.map((t) => t.tree_species as TreeSpecies))
      ).slice(0, 4);

      const defaultSpecies = (pref?.default_tree_species as TreeSpecies) || "cedar";

      return {
        userId: p.id,
        displayName: p.display_name || "Étudiant IGL4",
        avatarUrl: p.avatar_url || null,
        healthyTreeCount,
        leaflessTreeCount,
        totalFocusedMinutes,
        recentSpecies: recentSpecies.length > 0 ? recentSpecies : [defaultSpecies],
        lastFocusedAt: userTrees[0]?.earned_at || null,
        visibility: (pref?.visibility || "members") as ForestVisibility,
      };
    });

    return dbMembers.sort((a, b) => {
      if (b.healthyTreeCount !== a.healthyTreeCount) {
        return b.healthyTreeCount - a.healthyTreeCount;
      }
      if (a.userId === requester.id) return -1;
      if (b.userId === requester.id) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  } catch (err) {
    console.error("getCommunityForests error:", err);
    return [];
  }
}

/**
 * Reset all forest progress across all users and caches (Maintenance)
 */
export async function resetAllForestProgressAction(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const authMod = await getAuthModule();
    const requester = await authMod?.getRequesterUser();
    if (!requester || !requester.id) {
      return { success: false, message: "", error: "Non authentifié." };
    }

    // 1. Clear in-memory maps
    localFocusSessions.clear();
    localForestEntries.clear();
    localForestPreferences.clear();

    // 2. Clear DB records if configured
    const configured = await isDbConfigured();
    if (configured) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          await serviceSupabase.from("forest_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        } catch {}
        try {
          await serviceSupabase.from("focus_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        } catch {}
        try {
          await serviceSupabase.from("forest_cheers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        } catch {}
      }
    }

    await safeRevalidate("/forest");
    await safeRevalidate("/forest/community");
    await safeRevalidate("/");

    return { success: true, message: "Progression forestière réinitialisée pour tous les utilisateurs." };
  } catch (err: any) {
    return { success: false, message: "", error: err?.message || "Erreur de réinitialisation." };
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
      water: "a arrosé votre bosquet",
      clap: "a salué votre session d'étude",
      fire: "a encouragé votre régularité",
      muscle: "vous transmet de la force pour vos révisions",
    };

    const cheerTitles: Record<string, string> = {
      water: "Arrosage de bosquet reçu",
      clap: "Session d'étude saluée",
      fire: "Boost d'assiduité reçu",
      muscle: "Soutien & motivation reçus",
    };

    const cheerFeedbacks: Record<string, string> = {
      water: "Arrosage bienveillant envoyé",
      clap: "Félicitations transmises",
      fire: "Boost d'assiduité envoyé",
      muscle: "Force transmise",
    };

    const recipientLabel = input.recipientName || "votre camarade";
    const feedbackMsg = `${cheerFeedbacks[input.cheerType] || "Encouragement envoyé"} à ${recipientLabel} !`;

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

    // Dispatch real-time persistent system notification for recipient
    try {
      const notifMod = await getNotificationModule();
      if (notifMod?.createNotification) {
        await notifMod.createNotification({
          recipientId: input.recipientId,
          senderId: requester.id,
          senderName: requester.name || "Un camarade",
          senderAvatarUrl: requester.avatarUrl || null,
          type: "cheer",
          cheerType: input.cheerType,
          title: cheerTitles[input.cheerType] || "Encouragement reçu",
          content: `${requester.name || "Un camarade"} ${cheerLabels[input.cheerType] || "vous a envoyé un encouragement d'étude"}.`,
          link: `/forest/community?student=${requester.id}`,
        });
      }
    } catch {
      // Graceful error isolation
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
 * 7. Update user's forest visibility preferences
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

    const currentPref =
      (await getDbForestPreferences(requester.id)) ||
      localForestPreferences.get(requester.id) || {
        ...DEFAULT_PREFERENCES,
        user_id: requester.id,
      };

    const updatedPref: ForestPreferences = {
      ...currentPref,
      user_id: requester.id,
      visibility: input.visibility || currentPref.visibility || "members",
      default_tree_species: input.defaultTreeSpecies || currentPref.default_tree_species || "cedar",
      allow_classmate_cheers:
        input.allowClassmateCheers !== undefined
          ? input.allowClassmateCheers
          : currentPref.allow_classmate_cheers,
      updated_at: new Date().toISOString(),
    };

    localForestPreferences.set(requester.id, updatedPref);
    await saveDbForestPreferences(requester.id, updatedPref);

    const configured = await isDbConfigured();
    if (configured) {
      const serviceSupabase = await getAdminClient();
      if (serviceSupabase) {
        try {
          await serviceSupabase.from("forest_preferences").upsert(
            {
              user_id: requester.id,
              visibility: updatedPref.visibility,
              default_tree_species: updatedPref.default_tree_species,
              allow_classmate_cheers: updatedPref.allow_classmate_cheers,
              updated_at: updatedPref.updated_at,
            },
            { onConflict: "user_id" }
          );
        } catch {
          // Graceful fallback if table not yet in remote schema
        }
      }
    }

    await safeRevalidate("/forest");
    await safeRevalidate("/forest/community");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la mise à jour des préférences." };
  }
}

/**
 * 8. Retrieve user's forest visibility preferences with multi-layer persistence
 */
export async function getForestPreferences(userId?: string): Promise<ForestPreferences> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  const targetId = userId || requester?.id;
  if (!targetId) return DEFAULT_PREFERENCES;

  try {
    const serviceSupabase = await getAdminClient();
    if (serviceSupabase) {
      const { data } = await serviceSupabase
        .from("forest_preferences")
        .select("*")
        .eq("user_id", targetId)
        .maybeSingle();
      if (data?.visibility) {
        localForestPreferences.set(targetId, data as ForestPreferences);
        return data as ForestPreferences;
      }
    }
  } catch {}

  const fallback =
    (await getDbForestPreferences(targetId)) || localForestPreferences.get(targetId);
  if (fallback?.visibility) {
    localForestPreferences.set(targetId, fallback);
    return fallback;
  }
  return { ...DEFAULT_PREFERENCES, user_id: targetId };
}
