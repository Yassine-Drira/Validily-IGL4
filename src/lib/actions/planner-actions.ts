"use server";

import type {
  AcademicTask,
  AcademicTaskCategory,
  AcademicTaskPriority,
  AcademicSubtask,
  CalendarTimeblock,
  Subject,
  AcademicGoal,
  AcademicGoalPeriod,
  AcademicGoalMetric,
  AcademicGoalStatus,
  AcademicGoalWithProgress,
} from "@/types/database";
import { sanitizeSubtasks } from "../utils/sanitize-subtasks.ts";
import { cleanDbSubjectId } from "../utils.ts";

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
    // Outside active Next.js request context or running in isolated test runner
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
const globalPlannerState = globalThis as unknown as {
  __localAcademicTasks?: Map<string, AcademicTask>;
  __localCalendarTimeblocks?: Map<string, CalendarTimeblock>;
  __localAcademicGoals?: Map<string, AcademicGoal>;
};

if (!globalPlannerState.__localAcademicTasks) {
  globalPlannerState.__localAcademicTasks = new Map();
}
if (!globalPlannerState.__localCalendarTimeblocks) {
  globalPlannerState.__localCalendarTimeblocks = new Map();
}
if (!globalPlannerState.__localAcademicGoals) {
  globalPlannerState.__localAcademicGoals = new Map();
}

const localTasks = globalPlannerState.__localAcademicTasks;
const localTimeblocks = globalPlannerState.__localCalendarTimeblocks;
const localGoals = globalPlannerState.__localAcademicGoals;

export async function _resetLocalPlannerStore(): Promise<void> {
  localTasks.clear();
  localTimeblocks.clear();
  localGoals.clear();
}

export async function _injectLocalTask(task: AcademicTask): Promise<void> {
  localTasks.set(task.id, task);
}

export async function _injectLocalTimeblock(block: CalendarTimeblock): Promise<void> {
  localTimeblocks.set(block.id, block);
}

export async function _injectLocalGoal(goal: AcademicGoal): Promise<void> {
  localGoals.set(goal.id, goal);
}

// -----------------------------------------------------------------------------
// Validation Utilities
// -----------------------------------------------------------------------------
const VALID_PRIORITIES = new Set<AcademicTaskPriority>(["low", "medium", "high", "urgent"]);
const VALID_CATEGORIES = new Set<AcademicTaskCategory>([
  "td_tp",
  "project",
  "exam",
  "revision",
  "reading",
  "other",
]);

function normalizePriority(p?: string): AcademicTaskPriority {
  if (p && VALID_PRIORITIES.has(p as AcademicTaskPriority)) {
    return p as AcademicTaskPriority;
  }
  return "medium";
}

function normalizeCategory(c?: string): AcademicTaskCategory {
  if (c && VALID_CATEGORIES.has(c as AcademicTaskCategory)) {
    return c as AcademicTaskCategory;
  }
  return "other";
}

function isValidDateString(d?: string): boolean {
  if (!d) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function isValidTimeString(t?: string | null): boolean {
  if (!t) return true; // optional
  return /^\d{2}:\d{2}(:\d{2})?$/.test(t);
}

function parseTimeInMinutes(timeStr: string, isEnd = false): number {
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  if (isEnd && hours === 0 && minutes === 0) {
    return 1440; // 24 * 60: midnight as the exclusive end boundary
  }
  return hours * 60 + minutes;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanSubjectId(id?: string | null): string | null {
  if (!id || typeof id !== "string") return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Securely verifies that a referenced academic task exists and belongs to the requester.
 * Queries Supabase database when configured; falls back to local in-memory store in test/offline mode.
 */
async function verifyTaskOwnership(
  taskId: string,
  requesterId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!taskId || typeof taskId !== "string") {
    return { valid: false, error: "Identifiant de tâche invalide" };
  }

  // 1. Persistent database check
  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data: verifiedTask, error } = await adminClient
          .from("academic_tasks")
          .select("id, user_id")
          .eq("id", taskId)
          .maybeSingle();

        if (error && !isTableMissingError(error)) {
          return { valid: false, error: "Erreur de vérification de la tâche liée" };
        }
        if (!verifiedTask) {
          return { valid: false, error: "Tâche liée introuvable" };
        }
        if (verifiedTask.user_id !== requesterId) {
          return {
            valid: false,
            error: "Impossible de lier une tâche appartenant à un autre utilisateur",
          };
        }
        return { valid: true };
      }
    } catch {
      // Fall through to in-memory fallback
    }
  }

  // 2. Local in-memory fallback
  const task = localTasks.get(taskId);
  if (!task) {
    return { valid: false, error: "Tâche liée introuvable" };
  }
  if (task.user_id !== requesterId) {
    return {
      valid: false,
      error: "Impossible de lier une tâche appartenant à un autre utilisateur",
    };
  }
  return { valid: true };
}

// -----------------------------------------------------------------------------
// 1. ACADEMIC TASKS (TO-DO LIST) SERVER ACTIONS
// -----------------------------------------------------------------------------

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  subject_id?: string | null;
  category?: AcademicTaskCategory;
  priority?: AcademicTaskPriority;
  due_date: string;
  due_time?: string | null;
  estimated_minutes?: number;
  subtasks?: Array<{ title: string; done?: boolean }>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  subject_id?: string | null;
  category?: AcademicTaskCategory;
  priority?: AcademicTaskPriority;
  due_date?: string;
  due_time?: string | null;
  estimated_minutes?: number;
  actual_minutes?: number;
  is_completed?: boolean;
  completed_at?: string | null;
  subtasks?: AcademicSubtask[];
  sort_order?: number;
}

/**
 * Creates a new personal academic task for the authenticated user.
 */
export async function createAcademicTaskAction(input: CreateTaskInput): Promise<{
  success: boolean;
  data?: AcademicTask;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise pour créer une tâche" };
  }

  const cleanTitle = (input.title || "").trim();
  if (!cleanTitle) {
    return { success: false, error: "Le titre de la tâche est obligatoire" };
  }
  if (cleanTitle.length > 255) {
    return { success: false, error: "Le titre ne doit pas dépasser 255 caractères" };
  }

  if (!isValidDateString(input.due_date)) {
    return { success: false, error: "Date d'échéance invalide (format attendu: AAAA-MM-JJ)" };
  }

  if (!isValidTimeString(input.due_time)) {
    return { success: false, error: "Heure d'échéance invalide (format attendu: HH:MM)" };
  }

  const estimated = Math.max(0, Math.min(1440, Number(input.estimated_minutes) || 30));
  const category = normalizeCategory(input.category);
  const priority = normalizePriority(input.priority);

  // Parse and normalize subtasks with strict bounds
  const subtasks: AcademicSubtask[] = sanitizeSubtasks(input.subtasks);

  const nowIso = new Date().toISOString();
  const taskId = crypto.randomUUID();

  const newTask: AcademicTask = {
    id: taskId,
    user_id: requester.id,
    subject_id: cleanSubjectId(input.subject_id),
    title: cleanTitle,
    description: input.description?.trim() || null,
    category,
    priority,
    due_date: input.due_date,
    due_time: input.due_time?.trim() || null,
    estimated_minutes: estimated,
    actual_minutes: 0,
    is_completed: false,
    completed_at: null,
    subtasks,
    sort_order: 0,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // If Supabase is configured, try persisting to DB
  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("academic_tasks")
          .insert({
            user_id: requester.id,
            subject_id: cleanDbSubjectId(newTask.subject_id),
            title: newTask.title,
            description: newTask.description,
            category: newTask.category,
            priority: newTask.priority,
            due_date: newTask.due_date,
            due_time: newTask.due_time,
            estimated_minutes: newTask.estimated_minutes,
            actual_minutes: 0,
            is_completed: false,
            subtasks: newTask.subtasks,
            sort_order: 0,
          })
          .select("*, subject:subjects(id, name, slug, icon, semester_id)")
          .single();

        if (!error && data) {
          localTasks.set(data.id, data as AcademicTask);
          await safeRevalidate("/planner");
          return { success: true, data: data as AcademicTask };
        } else if (error && !isTableMissingError(error)) {
          return { success: false, error: "Erreur d'enregistrement de la tâche" };
        }
      }
    } catch {
      // Gracefully fall back to local store
    }
  }

  // Fallback to resilient in-memory store
  localTasks.set(newTask.id, newTask);
  await safeRevalidate("/planner");
  return { success: true, data: newTask };
}

/**
 * Retrieves all academic tasks for the authenticated user, optionally filtered.
 */
export async function getAcademicTasksAction(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  subjectId?: string;
  completed?: boolean;
  category?: string;
  priority?: string;
}): Promise<{
  success: boolean;
  data: AcademicTask[];
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, data: [], error: "Authentification requise" };
  }

  // Attempt database retrieval if configured
  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        let query = adminClient
          .from("academic_tasks")
          .select("*, subject:subjects(id, name, slug, icon, semester_id)")
          .eq("user_id", requester.id)
          .order("due_date", { ascending: true })
          .order("sort_order", { ascending: true });

        if (params?.date) query = query.eq("due_date", params.date);
        if (params?.startDate) query = query.gte("due_date", params.startDate);
        if (params?.endDate) query = query.lte("due_date", params.endDate);
        if (params?.subjectId) query = query.eq("subject_id", params.subjectId);
        if (params?.completed !== undefined) query = query.eq("is_completed", params.completed);
        if (params?.category) query = query.eq("category", params.category);
        if (params?.priority) query = query.eq("priority", params.priority);

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          // Sync with local memory cache
          for (const item of data) {
            localTasks.set(item.id, item as AcademicTask);
          }
          return { success: true, data: data as AcademicTask[] };
        }
      }
    } catch {
      // Fallback to local store
    }
  }

  // Fallback filtering over local memory store
  const tasks = Array.from(localTasks.values())
    .filter((t) => t.user_id === requester.id)
    .filter((t) => {
      if (params?.date && t.due_date !== params.date) return false;
      if (params?.startDate && t.due_date < params.startDate) return false;
      if (params?.endDate && t.due_date > params.endDate) return false;
      if (params?.subjectId && t.subject_id !== params.subjectId) return false;
      if (params?.completed !== undefined && t.is_completed !== params.completed) return false;
      if (params?.category && t.category !== params.category) return false;
      if (params?.priority && t.priority !== params.priority) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      return a.sort_order - b.sort_order;
    });

  return { success: true, data: tasks };
}

/**
 * Updates an existing academic task, strictly enforcing user ownership.
 */
export async function updateAcademicTaskAction(
  taskId: string,
  input: UpdateTaskInput
): Promise<{
  success: boolean;
  data?: AcademicTask;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise" };
  }

  if (!taskId) {
    return { success: false, error: "Identifiant de tâche manquant" };
  }

  // Check local store or fetch to verify ownership
  const existingLocal = localTasks.get(taskId);
  if (existingLocal && existingLocal.user_id !== requester.id) {
    return { success: false, error: "Accès refusé: cette tâche ne vous appartient pas" };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    const clean = input.title.trim();
    if (!clean) return { success: false, error: "Le titre ne peut pas être vide" };
    updates.title = clean.slice(0, 255);
  }
  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.subject_id !== undefined) updates.subject_id = cleanSubjectId(input.subject_id);
  if (input.category !== undefined) updates.category = normalizeCategory(input.category);
  if (input.priority !== undefined) updates.priority = normalizePriority(input.priority);
  if (input.due_date !== undefined) {
    if (!isValidDateString(input.due_date)) {
      return { success: false, error: "Format de date invalide" };
    }
    updates.due_date = input.due_date;
  }
  if (input.due_time !== undefined) {
    if (!isValidTimeString(input.due_time)) {
      return { success: false, error: "Format d'heure invalide" };
    }
    updates.due_time = input.due_time?.trim() || null;
  }
  if (input.estimated_minutes !== undefined) {
    updates.estimated_minutes = Math.max(0, Math.min(1440, Number(input.estimated_minutes) || 0));
  }
  if (input.actual_minutes !== undefined) {
    updates.actual_minutes = Math.max(0, Number(input.actual_minutes) || 0);
  }
  if (input.is_completed !== undefined) {
    updates.is_completed = Boolean(input.is_completed);
    updates.completed_at = updates.is_completed ? new Date().toISOString() : null;
  }
  if (input.subtasks !== undefined) {
    updates.subtasks = sanitizeSubtasks(input.subtasks);
  }
  if (input.sort_order !== undefined) {
    updates.sort_order = Number(input.sort_order) || 0;
  }

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        // Enforce database-level ownership verification before mutating
        const { data: verifiedTask, error: fetchErr } = await adminClient
          .from("academic_tasks")
          .select("id, user_id")
          .eq("id", taskId)
          .maybeSingle();

        if (fetchErr && !isTableMissingError(fetchErr)) {
          return { success: false, error: "Erreur de vérification de la tâche" };
        }
        if (verifiedTask && verifiedTask.user_id !== requester.id) {
          return { success: false, error: "Accès refusé: cette tâche ne vous appartient pas" };
        }

        const dbUpdates = {
          ...updates,
          ...(updates.subject_id !== undefined ? { subject_id: cleanDbSubjectId(updates.subject_id) } : {}),
        };

        const { data, error } = await adminClient
          .from("academic_tasks")
          .update(dbUpdates)
          .eq("id", taskId)
          .eq("user_id", requester.id) // Enforce ownership boundary
          .select("*, subject:subjects(id, name, slug, icon, semester_id)")
          .single();

        if (!error && data) {
          localTasks.set(data.id, data as AcademicTask);
          await safeRevalidate("/planner");
          return { success: true, data: data as AcademicTask };
        } else if (error && !isTableMissingError(error)) {
          return { success: false, error: "Erreur de mise à jour de la tâche" };
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  if (!existingLocal) {
    return { success: false, error: "Tâche introuvable" };
  }

  const updatedTask: AcademicTask = {
    ...existingLocal,
    ...updates,
  };
  localTasks.set(taskId, updatedTask);
  await safeRevalidate("/planner");
  return { success: true, data: updatedTask };
}

/**
 * Quick toggle for task completion status.
 */
export async function toggleAcademicTaskAction(
  taskId: string,
  isCompleted: boolean
): Promise<{
  success: boolean;
  data?: AcademicTask;
  error?: string;
}> {
  return updateAcademicTaskAction(taskId, {
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
  });
}

/**
 * Deletes an academic task. Preserves historical calendar records by nulling references.
 */
export async function deleteAcademicTaskAction(taskId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise" };
  }

  if (!taskId) {
    return { success: false, error: "Identifiant manquant" };
  }

  const existingLocal = localTasks.get(taskId);
  if (existingLocal && existingLocal.user_id !== requester.id) {
    return { success: false, error: "Accès refusé: cette tâche ne vous appartient pas" };
  }

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        // Disassociate calendar timeblocks without deleting them to preserve history
        await adminClient
          .from("calendar_timeblocks")
          .update({ task_id: null })
          .eq("task_id", taskId)
          .eq("user_id", requester.id);

        const { error } = await adminClient
          .from("academic_tasks")
          .delete()
          .eq("id", taskId)
          .eq("user_id", requester.id);

        if (!error) {
          localTasks.delete(taskId);
          await safeRevalidate("/planner");
          return { success: true };
        } else if (error && !isTableMissingError(error)) {
          return { success: false, error: "Erreur de suppression" };
        }
      }
    } catch {
      // Fallback
    }
  }

  // Local fallback
  localTasks.delete(taskId);
  // Unlink any local timeblock
  for (const block of localTimeblocks.values()) {
    if (block.task_id === taskId && block.user_id === requester.id) {
      block.task_id = null;
    }
  }

  await safeRevalidate("/planner");
  return { success: true };
}

// -----------------------------------------------------------------------------
// 2. CALENDAR TIMEBLOCKS SERVER ACTIONS
// -----------------------------------------------------------------------------

export interface CreateTimeblockInput {
  title: string;
  block_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes?: number;
  subject_id?: string | null;
  task_id?: string | null;
  notes?: string | null;
}

export interface UpdateTimeblockInput {
  title?: string;
  block_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  subject_id?: string | null;
  task_id?: string | null;
  is_completed?: boolean;
  notes?: string | null;
}

/**
 * Creates an interactive study block on the calendar.
 */
export async function createCalendarTimeblockAction(
  input: CreateTimeblockInput
): Promise<{
  success: boolean;
  data?: CalendarTimeblock;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise pour planifier un créneau" };
  }

  const cleanTitle = (input.title || "").trim();
  if (!cleanTitle) {
    return { success: false, error: "Le titre de la séance est obligatoire" };
  }

  if (!isValidDateString(input.block_date)) {
    return { success: false, error: "Date de séance invalide (AAAA-MM-JJ)" };
  }

  if (!isValidTimeString(input.start_time) || !isValidTimeString(input.end_time)) {
    return { success: false, error: "Horaires invalides (format HH:MM)" };
  }

  const startMins = parseTimeInMinutes(input.start_time);
  const endMins = parseTimeInMinutes(input.end_time, true);
  let duration = endMins > startMins ? endMins - startMins : 60;
  if (input.duration_minutes && input.duration_minutes > 0) {
    duration = Math.max(5, Math.min(1440, input.duration_minutes));
  }

  // Cross-user verification: If task_id is provided, verify it belongs to this user!
  if (input.task_id) {
    const taskCheck = await verifyTaskOwnership(input.task_id, requester.id);
    if (!taskCheck.valid) {
      return { success: false, error: taskCheck.error || "Tâche liée non valide" };
    }
  }

  const blockId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const newBlock: CalendarTimeblock = {
    id: blockId,
    user_id: requester.id,
    task_id: input.task_id || null,
    subject_id: cleanSubjectId(input.subject_id),
    title: cleanTitle.slice(0, 255),
    block_date: input.block_date,
    start_time: input.start_time,
    end_time: input.end_time,
    duration_minutes: duration,
    is_completed: false,
    completed_at: null,
    notes: input.notes?.trim() || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("calendar_timeblocks")
          .insert({
            user_id: requester.id,
            task_id: newBlock.task_id,
            subject_id: cleanDbSubjectId(newBlock.subject_id),
            title: newBlock.title,
            block_date: newBlock.block_date,
            start_time: newBlock.start_time,
            end_time: newBlock.end_time,
            duration_minutes: newBlock.duration_minutes,
            notes: newBlock.notes,
          })
          .select("*, subject:subjects(id, name, slug, icon)")
          .single();

        if (!error && data) {
          localTimeblocks.set(data.id, data as CalendarTimeblock);
          await safeRevalidate("/planner");
          return { success: true, data: data as CalendarTimeblock };
        } else if (error && !isTableMissingError(error)) {
          return { success: false, error: "Erreur d'enregistrement du créneau" };
        }
      }
    } catch {
      // Fallback
    }
  }

  localTimeblocks.set(newBlock.id, newBlock);
  await safeRevalidate("/planner");
  return { success: true, data: newBlock };
}

/**
 * Retrieves calendar timeblocks within a date range for the current user.
 */
export async function getCalendarTimeblocksAction(
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  data: CalendarTimeblock[];
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, data: [], error: "Authentification requise" };
  }

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return { success: false, data: [], error: "Plage de dates invalide" };
  }

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("calendar_timeblocks")
          .select("*, subject:subjects(id, name, slug, icon), task:academic_tasks(id, title, is_completed)")
          .eq("user_id", requester.id)
          .gte("block_date", startDate)
          .lte("block_date", endDate)
          .order("block_date", { ascending: true })
          .order("start_time", { ascending: true });

        if (!error && Array.isArray(data)) {
          for (const item of data) {
            localTimeblocks.set(item.id, item as CalendarTimeblock);
          }
          return { success: true, data: data as CalendarTimeblock[] };
        }
      }
    } catch {
      // Fallback
    }
  }

  const blocks = Array.from(localTimeblocks.values())
    .filter(
      (b) =>
        b.user_id === requester.id &&
        b.block_date >= startDate &&
        b.block_date <= endDate
    )
    .sort((a, b) => {
      if (a.block_date !== b.block_date) return a.block_date.localeCompare(b.block_date);
      return a.start_time.localeCompare(b.start_time);
    });

  return { success: true, data: blocks };
}

/**
 * Updates a calendar timeblock with ownership and cross-user task protection.
 */
export async function updateCalendarTimeblockAction(
  timeblockId: string,
  input: UpdateTimeblockInput
): Promise<{
  success: boolean;
  data?: CalendarTimeblock;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise" };
  }

  const existingLocal = localTimeblocks.get(timeblockId);
  if (existingLocal && existingLocal.user_id !== requester.id) {
    return { success: false, error: "Accès refusé: ce créneau ne vous appartient pas" };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    const clean = input.title.trim();
    if (!clean) return { success: false, error: "Le titre ne peut pas être vide" };
    updates.title = clean.slice(0, 255);
  }
  if (input.block_date !== undefined) {
    if (!isValidDateString(input.block_date)) return { success: false, error: "Date invalide" };
    updates.block_date = input.block_date;
  }
  if (input.start_time !== undefined) {
    if (!isValidTimeString(input.start_time)) return { success: false, error: "Heure de début invalide" };
    updates.start_time = input.start_time;
  }
  if (input.end_time !== undefined) {
    if (!isValidTimeString(input.end_time)) return { success: false, error: "Heure de fin invalide" };
    updates.end_time = input.end_time;
  }
  if (input.duration_minutes !== undefined) {
    updates.duration_minutes = Math.max(5, Math.min(1440, Number(input.duration_minutes) || 30));
  } else if (updates.start_time && updates.end_time) {
    const s = parseTimeInMinutes(updates.start_time);
    const e = parseTimeInMinutes(updates.end_time, true);
    updates.duration_minutes = e > s ? e - s : 60;
  }
  if (input.subject_id !== undefined) updates.subject_id = cleanSubjectId(input.subject_id);
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
  if (input.is_completed !== undefined) {
    updates.is_completed = Boolean(input.is_completed);
    updates.completed_at = updates.is_completed ? new Date().toISOString() : null;
  }

  // Cross-user task check and unlinking support
  if (input.task_id !== undefined) {
    if (input.task_id) {
      const taskCheck = await verifyTaskOwnership(input.task_id, requester.id);
      if (!taskCheck.valid) {
        return { success: false, error: taskCheck.error || "Tâche liée non valide" };
      }
      updates.task_id = input.task_id;
    } else {
      // Safely unlink with null
      updates.task_id = null;
    }
  }

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        // Enforce timeblock ownership in DB before mutating
        const { data: existingBlock, error: fetchErr } = await adminClient
          .from("calendar_timeblocks")
          .select("id, user_id")
          .eq("id", timeblockId)
          .maybeSingle();

        if (fetchErr && !isTableMissingError(fetchErr)) {
          return { success: false, error: "Erreur de vérification du créneau" };
        }
        if (existingBlock && existingBlock.user_id !== requester.id) {
          return { success: false, error: "Accès refusé: ce créneau ne vous appartient pas" };
        }

        const dbUpdates = {
          ...updates,
          ...(updates.subject_id !== undefined ? { subject_id: cleanDbSubjectId(updates.subject_id) } : {}),
        };

        const { data, error } = await adminClient
          .from("calendar_timeblocks")
          .update(dbUpdates)
          .eq("id", timeblockId)
          .eq("user_id", requester.id)
          .select("*, subject:subjects(id, name, slug, icon)")
          .single();

        if (!error && data) {
          localTimeblocks.set(data.id, data as CalendarTimeblock);
          await safeRevalidate("/planner");
          return { success: true, data: data as CalendarTimeblock };
        } else if (error && !isTableMissingError(error)) {
          return { success: false, error: "Erreur de mise à jour du créneau" };
        }
      }
    } catch {
      // Fallback
    }
  }

  if (!existingLocal) {
    return { success: false, error: "Créneau introuvable" };
  }

  const updatedBlock: CalendarTimeblock = {
    ...existingLocal,
    ...updates,
  };
  localTimeblocks.set(timeblockId, updatedBlock);
  await safeRevalidate("/planner");
  return { success: true, data: updatedBlock };
}

/**
 * Deletes a calendar timeblock. Does NOT delete any associated task.
 */
export async function deleteCalendarTimeblockAction(timeblockId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise" };
  }

  const existingLocal = localTimeblocks.get(timeblockId);
  if (existingLocal && existingLocal.user_id !== requester.id) {
    return { success: false, error: "Accès refusé" };
  }

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { error } = await adminClient
          .from("calendar_timeblocks")
          .delete()
          .eq("id", timeblockId)
          .eq("user_id", requester.id);

        if (!error) {
          localTimeblocks.delete(timeblockId);
          await safeRevalidate("/planner");
          return { success: true };
        }
      }
    } catch {
      // Fallback
    }
  }

  localTimeblocks.delete(timeblockId);
  await safeRevalidate("/planner");
  return { success: true };
}

/**
 * Checks for overlapping study sessions on a given date for the current user.
 */
export async function checkCalendarConflictAction(
  blockDate: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<{
  hasConflict: boolean;
  conflictingBlocks: CalendarTimeblock[];
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { hasConflict: false, conflictingBlocks: [] };
  }

  if (!isValidDateString(blockDate) || !isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return { hasConflict: false, conflictingBlocks: [], error: "Horaires ou date invalides" };
  }

  const targetStart = parseTimeInMinutes(startTime);
  const targetEnd = parseTimeInMinutes(endTime, true);

  if (targetEnd <= targetStart) {
    return {
      hasConflict: false,
      conflictingBlocks: [],
      error: "L'heure de fin doit être postérieure à l'heure de début",
    };
  }

  // 1. Persistent database check if configured
  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        let query = adminClient
          .from("calendar_timeblocks")
          .select("*")
          .eq("user_id", requester.id)
          .eq("block_date", blockDate);

        if (excludeId) {
          query = query.neq("id", excludeId);
        }

        const { data, error } = await query;
        if (error && !isTableMissingError(error)) {
          return {
            hasConflict: false,
            conflictingBlocks: [],
            error: "Erreur lors de la vérification des conflits d'horaires",
          };
        }

        if (!error && Array.isArray(data)) {
          const conflicts = (data as CalendarTimeblock[]).filter((b) => {
            const bStart = parseTimeInMinutes(b.start_time);
            const bEnd = parseTimeInMinutes(b.end_time, true);
            // Strict interval overlap: targetStart < bEnd && targetEnd > bStart
            return targetStart < bEnd && targetEnd > bStart;
          });
          return {
            hasConflict: conflicts.length > 0,
            conflictingBlocks: conflicts,
          };
        }
      }
    } catch {
      // Fallback to in-memory
    }
  }

  // 2. In-memory fallback
  const dayBlocks = Array.from(localTimeblocks.values()).filter(
    (b) =>
      b.user_id === requester.id &&
      b.block_date === blockDate &&
      b.id !== excludeId
  );

  const conflicts = dayBlocks.filter((b) => {
    const bStart = parseTimeInMinutes(b.start_time);
    const bEnd = parseTimeInMinutes(b.end_time, true);
    return targetStart < bEnd && targetEnd > bStart;
  });

  return {
    hasConflict: conflicts.length > 0,
    conflictingBlocks: conflicts,
  };
}

// -----------------------------------------------------------------------------
// 3. PLANNER HISTORY & INTEGRATED PROGRESS
// -----------------------------------------------------------------------------

export interface PlannerHistorySummary {
  completedTasks: AcademicTask[];
  completedBlocks: CalendarTimeblock[];
  totalTasksCompleted: number;
  totalEstimatedMinutesCompleted: number;
  totalActualMinutesCompleted: number;
  totalFocusMinutesToday: number;
  dailyFocusHistory: Array<{ date: string; minutes: number }>;
  forestStats?: {
    healthyTrees: number;
    currentStreak: number;
    totalFocusedMinutes: number;
  };
}

/**
 * Retrieves comprehensive persisted history of student accomplishments.
 * Integrates completed tasks, completed calendar blocks, and existing Forest/Analytics records.
 */
export async function getPlannerHistoryAction(
  daysCount: number = 30
): Promise<{
  success: boolean;
  data: PlannerHistorySummary;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return {
      success: false,
      data: {
        completedTasks: [],
        completedBlocks: [],
        totalTasksCompleted: 0,
        totalEstimatedMinutesCompleted: 0,
        totalActualMinutesCompleted: 0,
        totalFocusMinutesToday: 0,
        dailyFocusHistory: [],
      },
    };
  }

  // 1. Fetch completed tasks
  const tasksResult = await getAcademicTasksAction({ completed: true });
  const completedTasks = tasksResult.success ? tasksResult.data : [];

  // 2. Fetch completed or past calendar blocks
  const now = new Date();
  const pastDate = new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);
  const startDateStr = pastDate.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const blocksResult = await getCalendarTimeblocksAction(startDateStr, todayStr);
  const completedBlocks = (blocksResult.success ? blocksResult.data : []).filter(
    (b) => b.is_completed || b.block_date < todayStr
  );

  // 3. Fetch existing daily focus telemetry from analytics-actions
  let dailyFocusHistory: Array<{ date: string; minutes: number }> = [];
  let totalFocusMinutesToday = 0;
  try {
    const analyticsMod = await import("./analytics-actions");
    const rawHistory = await analyticsMod.getUserDailyFocusHistory();
    dailyFocusHistory = Object.entries(rawHistory || {}).map(([date, rec]) => ({
      date,
      minutes: rec?.totalMinutes || 0,
    }));
    const todayRec = await analyticsMod.getUserTodayFocus();
    totalFocusMinutesToday = todayRec?.totalMinutes || 0;
  } catch {
    // Non-blocking fallback
  }

  // 4. Fetch existing Forest accomplishment stats without duplicate counters
  let forestStats: PlannerHistorySummary["forestStats"] = undefined;
  try {
    const forestMod = await import("./forest-actions");
    const myForest = await forestMod.getMyForest();
    if (myForest?.stats) {
      forestStats = {
        healthyTrees: myForest.stats.healthyCount,
        currentStreak: myForest.stats.currentStreak,
        totalFocusedMinutes: myForest.stats.totalFocusedMinutes,
      };
    }
  } catch {
    // Non-blocking fallback
  }

  const totalEstimated = completedTasks.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0);
  const totalActual = completedTasks.reduce((acc, t) => acc + (t.actual_minutes || 0), 0);

  return {
    success: true,
    data: {
      completedTasks,
      completedBlocks,
      totalTasksCompleted: completedTasks.length,
      totalEstimatedMinutesCompleted: totalEstimated,
      totalActualMinutesCompleted: totalActual,
      totalFocusMinutesToday,
      dailyFocusHistory,
      forestStats,
    },
  };
}

// -----------------------------------------------------------------------------
// 4. ACADEMIC GOALS (DAILY, WEEKLY, MONTHLY TARGETS & VERIFIED PROGRESS)
// -----------------------------------------------------------------------------

export interface SetGoalInput {
  id?: string;
  title?: string;
  description?: string;
  period_type: AcademicGoalPeriod;
  period_key: string; // e.g. "2026-10-18", "2026-W42", "2026-10"
  metric_type: AcademicGoalMetric;
  target_value: number;
  unit?: string;
  subject_id?: string | null;
  manual_progress?: number;
  status?: AcademicGoalStatus;
  deadline?: string | null;
}

function getDefaultGoalTitle(metric: AcademicGoalMetric): string {
  switch (metric) {
    case "study_minutes":
      return "Temps de concentration";
    case "tasks_completed":
      return "Tâches à terminer";
    case "study_sessions":
      return "Séances d'étude";
    case "exercises":
      return "Série d'exercices";
    case "chapters":
      return "Révision de chapitres";
    default:
      return "Objectif personnel";
  }
}

function getDefaultGoalUnit(metric: AcademicGoalMetric): string {
  switch (metric) {
    case "study_minutes":
      return "min";
    case "tasks_completed":
      return "tâches";
    case "study_sessions":
      return "séances";
    case "exercises":
      return "exercices";
    case "chapters":
      return "chapitres";
    default:
      return "unités";
  }
}

/**
 * Creates or updates an academic goal target (daily, weekly, monthly, or custom).
 */
export async function setAcademicGoalAction(
  input: SetGoalInput
): Promise<{
  success: boolean;
  data?: AcademicGoal;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise pour définir un objectif" };
  }

  const validPeriods: AcademicGoalPeriod[] = ["daily", "weekly", "monthly", "custom"];
  if (!validPeriods.includes(input.period_type)) {
    return { success: false, error: "Type de période invalide" };
  }

  const validMetrics: AcademicGoalMetric[] = [
    "study_minutes",
    "tasks_completed",
    "study_sessions",
    "exercises",
    "chapters",
    "custom",
  ];
  if (!validMetrics.includes(input.metric_type)) {
    return { success: false, error: "Type de métrique invalide" };
  }

  const target = Math.max(1, Math.min(100000, Number(input.target_value) || 1));
  const periodKey = (input.period_key || "").trim() || "default";
  const title = (input.title || "").trim() || getDefaultGoalTitle(input.metric_type);
  const unit = (input.unit || "").trim() || getDefaultGoalUnit(input.metric_type);
  const manualProgress = Math.max(0, Math.min(100000, Number(input.manual_progress) || 0));
  const status: AcademicGoalStatus = input.status || "active";

  const isValidUuid = input.id ? UUID_REGEX.test(input.id) : false;
  let resolvedGoalId: string | null = isValidUuid ? input.id! : null;

  // Deduplication: If creating without ID, reuse existing goal with same period & title
  if (!resolvedGoalId && await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data: existingSame } = await adminClient
          .from("academic_goals")
          .select("id")
          .eq("user_id", requester.id)
          .eq("period_type", input.period_type)
          .eq("period_key", periodKey)
          .eq("title", title)
          .maybeSingle();

        if (existingSame?.id) {
          resolvedGoalId = existingSame.id;
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  if (!resolvedGoalId) {
    for (const [id, g] of localGoals.entries()) {
      if (
        g.user_id === requester.id &&
        g.period_type === input.period_type &&
        g.period_key === periodKey &&
        g.title.trim().toLowerCase() === title.trim().toLowerCase()
      ) {
        resolvedGoalId = id;
        break;
      }
    }
  }

  const goalId = resolvedGoalId || crypto.randomUUID();
  const nowIso = new Date().toISOString();

  // Security: If updating an existing goal (input.id provided), enforce ownership check!
  if (input.id) {
    if (await isDbConfigured()) {
      try {
        const adminClient = await getAdminClient();
        if (adminClient && isValidUuid) {
          const { data: existingGoal, error: fetchErr } = await adminClient
            .from("academic_goals")
            .select("id, user_id")
            .eq("id", input.id)
            .maybeSingle();

          if (fetchErr && !isTableMissingError(fetchErr)) {
            return { success: false, error: "Erreur de vérification de l'objectif" };
          }
          if (existingGoal && existingGoal.user_id !== requester.id) {
            return { success: false, error: "Accès refusé: cet objectif ne vous appartient pas" };
          }
        }
      } catch {
        // Fall through to in-memory check
      }
    }

    const localExisting = localGoals.get(input.id);
    if (localExisting && localExisting.user_id !== requester.id) {
      return { success: false, error: "Accès refusé: cet objectif ne vous appartient pas" };
    }
  }

  const goalPayload: AcademicGoal = {
    id: goalId,
    user_id: requester.id,
    title,
    description: input.description?.trim() || null,
    period_type: input.period_type,
    period_key: periodKey,
    metric_type: input.metric_type,
    target_value: target,
    unit,
    subject_id: cleanSubjectId(input.subject_id),
    manual_progress: manualProgress,
    status,
    deadline: input.deadline || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // If Supabase is configured, persist to database
  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("academic_goals")
          .upsert(
            {
              id: goalPayload.id,
              user_id: requester.id,
              title: goalPayload.title,
              description: goalPayload.description,
              period_type: goalPayload.period_type,
              period_key: goalPayload.period_key,
              metric_type: goalPayload.metric_type,
              target_value: goalPayload.target_value,
              unit: goalPayload.unit,
              subject_id: cleanDbSubjectId(goalPayload.subject_id),
              manual_progress: goalPayload.manual_progress,
              status: goalPayload.status,
              deadline: goalPayload.deadline,
              updated_at: nowIso,
            },
            { onConflict: "id" }
          )
          .select("*")
          .single();

        if (!error && data) {
          localGoals.set(data.id, data as AcademicGoal);
          await safeRevalidate("/planner");
          return { success: true, data: data as AcademicGoal };
        } else if (error && !isTableMissingError(error)) {
          console.error("setAcademicGoalAction DB error:", error);
          return { success: false, error: "Erreur d'enregistrement de l'objectif: " + (error.message || "") };
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  // Fallback in-memory upsert
  let foundId: string | null = input.id || null;
  if (!foundId) {
    for (const [id, g] of localGoals.entries()) {
      if (
        g.user_id === requester.id &&
        g.period_type === input.period_type &&
        g.period_key === periodKey &&
        g.metric_type === input.metric_type
      ) {
        foundId = id;
        break;
      }
    }
  }

  const savedGoal: AcademicGoal = foundId && localGoals.has(foundId)
    ? {
        ...localGoals.get(foundId)!,
        title: goalPayload.title,
        description: goalPayload.description,
        target_value: target,
        unit: goalPayload.unit,
        subject_id: input.subject_id || null,
        manual_progress: input.manual_progress !== undefined ? manualProgress : (localGoals.get(foundId)!.manual_progress || 0),
        status,
        deadline: goalPayload.deadline,
        updated_at: nowIso,
      }
    : goalPayload;

  localGoals.set(savedGoal.id, savedGoal);
  await safeRevalidate("/planner");
  return { success: true, data: savedGoal };
}

/**
 * Updates manual progress for exercises, chapters, or custom goals.
 */
export async function updateAcademicGoalProgressAction(
  goalId: string,
  newProgress: number
): Promise<{
  success: boolean;
  data?: AcademicGoal;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise" };
  }

  const existingLocal = localGoals.get(goalId);
  if (existingLocal && existingLocal.user_id !== requester.id) {
    return { success: false, error: "Accès refusé" };
  }

  const progressVal = Math.max(0, Math.min(100000, Number(newProgress) || 0));
  const nowIso = new Date().toISOString();

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data: existingGoal, error: fetchErr } = await adminClient
          .from("academic_goals")
          .select("id, user_id")
          .eq("id", goalId)
          .maybeSingle();

        if (fetchErr && !isTableMissingError(fetchErr)) {
          return { success: false, error: "Erreur de vérification de l'objectif" };
        }
        if (existingGoal && existingGoal.user_id !== requester.id) {
          return { success: false, error: "Accès refusé: cet objectif ne vous appartient pas" };
        }

        const { data, error } = await adminClient
          .from("academic_goals")
          .update({ manual_progress: progressVal, updated_at: nowIso })
          .eq("id", goalId)
          .eq("user_id", requester.id)
          .select("*")
          .single();

        if (!error && data) {
          localGoals.set(data.id, data as AcademicGoal);
          await safeRevalidate("/planner");
          return { success: true, data: data as AcademicGoal };
        }
      }
    } catch {
      // Fallback
    }
  }

  if (existingLocal) {
    const updated: AcademicGoal = {
      ...existingLocal,
      manual_progress: progressVal,
      updated_at: nowIso,
    };
    localGoals.set(goalId, updated);
    await safeRevalidate("/planner");
    return { success: true, data: updated };
  }

  return { success: false, error: "Objectif introuvable" };
}

/**
 * Retrieves goals with dynamically computed verified progress from task and focus telemetry.
 */
export async function getAcademicGoalsAction(params?: {
  period_type?: AcademicGoalPeriod;
  period_key?: string;
}): Promise<{
  success: boolean;
  data: AcademicGoalWithProgress[];
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, data: [], error: "Authentification requise" };
  }

  let goals: AcademicGoal[] = [];

  // 1. Fetch configured goals from DB or local
  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        let query = adminClient
          .from("academic_goals")
          .select("*")
          .eq("user_id", requester.id);

        if (params?.period_type) query = query.eq("period_type", params.period_type);
        if (params?.period_key) query = query.eq("period_key", params.period_key);

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          goals = data as AcademicGoal[];
          for (const g of goals) {
            localGoals.set(g.id, g);
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  if (goals.length === 0) {
    goals = Array.from(localGoals.values()).filter(
      (g) =>
        g.user_id === requester.id &&
        (!params?.period_type || g.period_type === params.period_type) &&
        (!params?.period_key || g.period_key === params.period_key)
    );
  }

  // 2. Fetch trustworthy verified telemetry & DB records to compute actual progress
  let verifiedFocusMinutes = 0;
  try {
    const analyticsMod = await import("./analytics-actions");
    const todayRec = await analyticsMod.getUserTodayFocus();
    verifiedFocusMinutes = todayRec?.totalMinutes || 0;
  } catch {
    // Non-blocking fallback
  }

  // Get user tasks & calendar blocks for metrics
  let userTasks: AcademicTask[] = [];
  let userBlocks: CalendarTimeblock[] = [];

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data: dbTasks } = await adminClient
          .from("academic_tasks")
          .select("id, is_completed, subject_id, due_date")
          .eq("user_id", requester.id);
        if (Array.isArray(dbTasks)) {
          userTasks = dbTasks as AcademicTask[];
        }

        const { data: dbBlocks } = await adminClient
          .from("calendar_timeblocks")
          .select("id, is_completed, subject_id, block_date")
          .eq("user_id", requester.id);
        if (Array.isArray(dbBlocks)) {
          userBlocks = dbBlocks as CalendarTimeblock[];
        }
      }
    } catch {
      // Fallback
    }
  }

  if (userTasks.length === 0) {
    userTasks = Array.from(localTasks.values()).filter((t) => t.user_id === requester.id);
  }
  if (userBlocks.length === 0) {
    userBlocks = Array.from(localTimeblocks.values()).filter((b) => b.user_id === requester.id);
  }

  // 3. Map verified progress to each goal
  const goalsWithProgress: AcademicGoalWithProgress[] = goals.map((g) => {
    let progress = 0;
    let isAutomated = false;

    // Detectable missions only: time spent (focus telemetry) and focused periods (completed blocks)
    if (g.metric_type === "study_minutes") {
      progress = verifiedFocusMinutes;
      isAutomated = true;
    } else if (g.metric_type === "study_sessions") {
      progress = userBlocks.filter((b) => {
        if (!b.is_completed) return false;
        if (g.subject_id && b.subject_id !== g.subject_id) return false;
        if (g.period_type === "daily" && b.block_date !== g.period_key) return false;
        return true;
      }).length;
      isAutomated = true;
    } else if (g.metric_type === "tasks_completed") {
      // If student manually modified progress (e.g. from 0 to 2), respect their manual tracking!
      if (typeof g.manual_progress === "number" && g.manual_progress > 0) {
        progress = g.manual_progress;
        isAutomated = false;
      } else {
        // Fallback to auto-detected completed tasks
        progress = userTasks.filter((t) => {
          if (!t.is_completed) return false;
          if (g.subject_id && t.subject_id !== g.subject_id) return false;
          if (g.period_type === "daily" && t.due_date !== g.period_key) return false;
          return true;
        }).length;
        isAutomated = true;
      }
    } else {
      // Manual tracking for devoirs, exercises, chapters, or custom academic objectives
      progress = g.manual_progress ?? 0;
      isAutomated = false;
    }

    const percentage = Math.min(100, Math.round((progress / g.target_value) * 100));
    return {
      ...g,
      current_progress: progress,
      is_completed: progress >= g.target_value,
      percentage,
      is_automated: isAutomated,
    };
  });

  return { success: true, data: goalsWithProgress };
}

/**
 * Deletes an academic goal target.
 */
export async function deleteAcademicGoalAction(
  goalId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const authMod = await getAuthModule();
  const requester = await authMod?.getRequesterUser();
  if (!requester?.id) {
    return { success: false, error: "Authentification requise" };
  }

  const existingLocal = localGoals.get(goalId);
  if (existingLocal && existingLocal.user_id !== requester.id) {
    return { success: false, error: "Accès refusé" };
  }

  if (await isDbConfigured()) {
    try {
      const adminClient = await getAdminClient();
      if (adminClient) {
        const { data: existingGoal, error: fetchErr } = await adminClient
          .from("academic_goals")
          .select("id, user_id")
          .eq("id", goalId)
          .maybeSingle();

        if (fetchErr && !isTableMissingError(fetchErr)) {
          return { success: false, error: "Erreur de vérification de l'objectif" };
        }
        if (existingGoal && existingGoal.user_id !== requester.id) {
          return { success: false, error: "Accès refusé: cet objectif ne vous appartient pas" };
        }

        const { error } = await adminClient
          .from("academic_goals")
          .delete()
          .eq("id", goalId)
          .eq("user_id", requester.id);

        if (!error) {
          localGoals.delete(goalId);
          await safeRevalidate("/planner");
          return { success: true };
        }
      }
    } catch {
      // Fallback
    }
  }

  localGoals.delete(goalId);
  await safeRevalidate("/planner");
  return { success: true };
}
