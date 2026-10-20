"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Plus,
  AlertTriangle,
  ListTodo,
  Check,
  Edit2,
  X,
  MoreVertical,
  Copy,
  CalendarPlus,
} from "lucide-react";
import type {
  AcademicTask,
  AcademicSubtask,
  Subject,
  AcademicTaskPriority,
  AcademicTaskCategory,
} from "@/types/database";
import {
  toggleAcademicTaskAction,
  updateAcademicTaskAction,
  deleteAcademicTaskAction,
  createAcademicTaskAction,
  createCalendarTimeblockAction,
  checkCalendarConflictAction,
} from "@/lib/actions/planner-actions";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { FocusTriggerButton } from "./focus-trigger-button";
import { getLocalTodayDateString, cn } from "@/lib/utils";
import {
  PLANNER_COLOR_OPTIONS,
  resolvePlannerColorKey,
  resolvePlannerTheme,
  formatNotesWithColor,
  type PlannerColorKey,
} from "@/lib/planner/planner-theme";

interface AcademicTodoListProps {
  tasks: AcademicTask[];
  subjects: Subject[];
  onRefresh: () => void;
  selectedDate?: string;
  onTasksChange?: (updatedTasks: AcademicTask[]) => void;
  onTaskDelete?: (taskId: string) => void;
}

type FilterTab = "all" | "today" | "upcoming" | "overdue" | "completed";

export function AcademicTodoList({
  tasks,
  subjects,
  onRefresh,
  selectedDate,
  onTasksChange,
  onTaskDelete,
}: AcademicTodoListProps) {
  // Local optimistic state for instant checkbox response (< 1ms)
  const [localTasks, setLocalTasks] = useState<AcademicTask[]>(tasks);
  // Track sequence per task to reject stale out-of-order server responses during rapid toggles
  const taskToggleSeq = useRef<Record<string, number>>({});
  // Track tasks toggled during current session so they stay visible & stable in current view
  const [sessionToggledIds, setSessionToggledIds] = useState<Set<string>>(new Set());

  // Keep local tasks in sync with incoming props without reverting in-flight toggles
  useEffect(() => {
    setLocalTasks((prev) => {
      const hasPending = Object.values(taskToggleSeq.current).some((seq) => (seq as number) > 0);
      if (!hasPending) {
        return tasks;
      }
      const prevMap = new Map(prev.map((t) => [t.id, t]));
      return tasks.map((t) => {
        if ((taskToggleSeq.current[t.id] || 0) > 0) {
          const current = prevMap.get(t.id);
          return current ? { ...t, is_completed: current.is_completed } : t;
        }
        return t;
      });
    });
  }, [tasks]);

  const [activeTab, setActiveTab] = useState<FilterTab>(selectedDate ? "today" : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<AcademicTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setSessionToggledIds(new Set()); // Fresh view when switching tabs
  };

  // Quick scheduling state
  const [schedulingTask, setSchedulingTask] = useState<AcademicTask | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStart, setScheduleStart] = useState("09:00");
  const [scheduleEnd, setScheduleEnd] = useState("10:00");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleColor, setScheduleColor] = useState<PlannerColorKey>("cobalt");
  const [scheduleConflictWarning, setScheduleConflictWarning] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  const todayStr = useMemo(() => getLocalTodayDateString(), []);

  // Close overflow menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".task-menu-container")) {
        setActiveMenuTaskId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleOpenScheduleModal = (task: AcademicTask) => {
    setActiveMenuTaskId(null);
    setSchedulingTask(task);
    setScheduleDate(task.due_date || todayStr);
    setScheduleStart("09:00");
    const duration = task.estimated_minutes || 60;
    const startM = 9 * 60;
    const endM = Math.min(1440, startM + duration);
    const endH = Math.floor(endM / 60);
    const endMin = endM % 60;
    setScheduleEnd(`${endH.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`);
    setScheduleNotes("");
    const matchingSub = subjects.find((s) => s.id === task.subject_id) || task.subject;
    setScheduleColor(resolvePlannerColorKey(null, matchingSub, task.category));
    setScheduleConflictWarning(null);
  };

  const handleCheckScheduleConflict = async (date: string, start: string, end: string) => {
    const res = await checkCalendarConflictAction(date, start, end);
    if (res.hasConflict) {
      setScheduleConflictWarning(
        `Attention: Ce créneau chevauche ${res.conflictingBlocks.length} autre(s) séance(s).`
      );
    } else {
      setScheduleConflictWarning(null);
    }
  };

  const handleSaveScheduledBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTask) return;
    setIsScheduling(true);
    const encodedNotes = formatNotesWithColor(scheduleNotes || null, scheduleColor);
    await createCalendarTimeblockAction({
      title: schedulingTask.title,
      block_date: scheduleDate,
      start_time: scheduleStart,
      end_time: scheduleEnd,
      subject_id: schedulingTask.subject_id || null,
      task_id: schedulingTask.id,
      notes: encodedNotes,
    });
    setIsScheduling(false);
    setSchedulingTask(null);
    onRefresh();
  };

  // High-performance non-blocking optimistic task toggle (< 1ms) with sequence guard
  const handleToggleTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const currentTask = localTasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const nextStatus = !currentTask.is_completed;
    const nextSeq = (taskToggleSeq.current[taskId] || 0) + 1;
    taskToggleSeq.current[taskId] = nextSeq;

    // Track as session-toggled so the task stays stable in view and doesn't jump
    setSessionToggledIds((prev) => new Set(prev).add(taskId));

    // Instant optimistic update (< 1ms)
    const updated = localTasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            is_completed: nextStatus,
            completed_at: nextStatus ? new Date().toISOString() : null,
          }
        : t
    );
    setLocalTasks(updated);
    onTasksChange?.(updated);

    try {
      const res = await toggleAcademicTaskAction(taskId, nextStatus);

      // If a newer click occurred while this request was in flight, discard this response
      if (taskToggleSeq.current[taskId] !== nextSeq) {
        return;
      }

      taskToggleSeq.current[taskId] = 0;

      if (!res.success) {
        // Rollback only if the authoritative latest request failed
        setLocalTasks((prev) => {
          const rolledBack = prev.map((t) =>
            t.id === taskId ? { ...t, is_completed: currentTask.is_completed } : t
          );
          onTasksChange?.(rolledBack);
          return rolledBack;
        });
      }
    } catch {
      if (taskToggleSeq.current[taskId] === nextSeq) {
        taskToggleSeq.current[taskId] = 0;
        setLocalTasks((prev) => {
          const rolledBack = prev.map((t) =>
            t.id === taskId ? { ...t, is_completed: currentTask.is_completed } : t
          );
          onTasksChange?.(rolledBack);
          return rolledBack;
        });
      }
    }
  };

  // Duplicate task
  const handleDuplicateTask = async (task: AcademicTask) => {
    setActiveMenuTaskId(null);
    await createAcademicTaskAction({
      title: `${task.title} (Copie)`,
      description: task.description || undefined,
      subject_id: task.subject_id || undefined,
      priority: task.priority,
      category: task.category,
      due_date: task.due_date,
      due_time: task.due_time || undefined,
      estimated_minutes: task.estimated_minutes,
      subtasks: task.subtasks,
    });
    onRefresh();
  };

  // Filter tasks based on search, active tab, subject, and priority
  const filteredTasks = useMemo(() => {
    return localTasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Subject Filter
      if (selectedSubjectId !== "all") {
        if (task.subject_id !== selectedSubjectId) return false;
      }

      // 3. Priority Filter
      if (selectedPriority !== "all") {
        if (task.priority !== selectedPriority) return false;
      }

      // 4. Tab Filter
      if (activeTab === "today") {
        return task.due_date === todayStr;
      }
      if (activeTab === "upcoming") {
        return task.due_date > todayStr;
      }
      if (activeTab === "overdue") {
        return task.due_date < todayStr && (!task.is_completed || sessionToggledIds.has(task.id));
      }
      if (activeTab === "completed") {
        return task.is_completed || sessionToggledIds.has(task.id);
      }

      return true;
    }).sort((a, b) => {
      // Completed tab: sort by completed_at desc
      if (activeTab === "completed") {
        return (b.completed_at || "").localeCompare(a.completed_at || "") || (b.due_date || "").localeCompare(a.due_date || "");
      }

      // In interactive views, already-settled completed tasks sort below active tasks.
      // Session-toggled tasks preserve their position in-place so they never jump underneath the cursor!
      const isSettledCompletedA = a.is_completed && !sessionToggledIds.has(a.id);
      const isSettledCompletedB = b.is_completed && !sessionToggledIds.has(b.id);
      if (isSettledCompletedA !== isSettledCompletedB) {
        return isSettledCompletedA ? 1 : -1;
      }

      // Deterministic priority weight (urgent > high > medium > low)
      const prioWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      const weightA = prioWeight[a.priority] || 2;
      const weightB = prioWeight[b.priority] || 2;
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // Due time (earlier time first)
      if (a.due_time && b.due_time && a.due_time !== b.due_time) {
        return a.due_time.localeCompare(b.due_time);
      }

      // Due date
      if (a.due_date && b.due_date && a.due_date !== b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }

      return (b.created_at || b.id).localeCompare(a.created_at || a.id);
    });
  }, [localTasks, searchQuery, selectedSubjectId, selectedPriority, activeTab, todayStr, sessionToggledIds]);

  // Toggle subtask completion
  const handleToggleSubtask = async (task: AcademicTask, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    // Optimistic
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t))
    );
    await updateAcademicTaskAction(task.id, { subtasks: updatedSubtasks });
    onRefresh();
  };

  // Add subtask
  const handleAddSubtask = async (taskId: string) => {
    const title = newSubtaskTitles[taskId]?.trim();
    if (!title) return;

    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSubtask: AcademicSubtask = {
      id: `st-${Date.now()}`,
      title,
      done: false,
      order: task.subtasks.length + 1,
    };
    const updatedSubtasks = [...task.subtasks, newSubtask];

    setNewSubtaskTitles((prev) => ({ ...prev, [taskId]: "" }));
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t))
    );
    await updateAcademicTaskAction(taskId, { subtasks: updatedSubtasks });
    onRefresh();
  };

  // Delete task with 0ms optimistic removal and synchronized parent eviction
  const handleDeleteTask = async (taskId: string) => {
    // 1. Immediately close modal to eliminate perceived lag
    setDeletingTaskId(null);
    // 2. Instant optimistic local eviction
    setLocalTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      onTasksChange?.(updated);
      return updated;
    });
    // 3. Immediately evict from parent shell state
    onTaskDelete?.(taskId);
    // 4. Server persistence with resilient fallback
    try {
      await deleteAcademicTaskAction(taskId);
    } catch (err) {
      console.error("Error deleting task:", err);
    } finally {
      onRefresh();
    }
  };

  // Toggle expand
  const toggleExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Priority indicator styles
  const getPriorityDot = (p: AcademicTaskPriority) => {
    switch (p) {
      case "urgent":
        return { dot: "bg-[#DC2626]", badge: "text-[#DC2626] bg-[#DC2626]/10", label: "Urgent" };
      case "high":
        return { dot: "bg-[#D97706]", badge: "text-[#D97706] bg-[#D97706]/10", label: "Élevé" };
      case "medium":
        return { dot: "bg-[#2855D9]", badge: "text-[#2855D9] bg-[#EDF2FF]", label: "Moyen" };
      default:
        return { dot: "bg-[#68748A]", badge: "text-[#68748A] bg-[#F4F6FA]", label: "Faible" };
    }
  };

  // Counts for tabs
  const overdueCount = useMemo(
    () => localTasks.filter((t) => t.due_date < todayStr && !t.is_completed).length,
    [localTasks, todayStr]
  );
  const todayCount = useMemo(
    () => localTasks.filter((t) => t.due_date === todayStr && !t.is_completed).length,
    [localTasks, todayStr]
  );

  return (
    <div className="space-y-4">
      {/* 1. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E8F0] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            Toutes ({localTasks.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "today"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            <span>Aujourd'hui</span>
            {todayCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "today" ? "bg-white/20 text-white" : "bg-[#EDF2FF] text-[#2855D9]"
                }`}
              >
                {todayCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("upcoming")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            À venir
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("overdue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "overdue"
                ? "bg-[#DC2626] text-white shadow-xs"
                : "text-[#DC2626] hover:bg-[#DC2626]/10"
            }`}
          >
            <span>En retard</span>
            {overdueCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "overdue" ? "bg-white/20 text-white" : "bg-[#DC2626]/10 text-[#DC2626]"
                }`}
              >
                {overdueCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-[#059669] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            Terminées
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68748A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full sm:w-48 pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#E4E8F0] rounded-lg outline-none text-[#111A2E] placeholder-[#68748A]"
          />
        </div>
      </div>

      {/* 2. Secondary Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-[#68748A]">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtrer :</span>
        </div>

        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="bg-white border border-[#E4E8F0] rounded-lg px-2.5 py-1 text-[#111A2E] outline-none text-xs"
        >
          <option value="all">Toutes les matières</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="bg-white border border-[#E4E8F0] rounded-lg px-2.5 py-1 text-[#111A2E] outline-none text-xs"
        >
          <option value="all">Toutes les priorités</option>
          <option value="urgent">Urgent</option>
          <option value="high">Élevé</option>
          <option value="medium">Moyen</option>
          <option value="low">Faible</option>
        </select>

        {(selectedSubjectId !== "all" || selectedPriority !== "all" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedSubjectId("all");
              setSelectedPriority("all");
              setSearchQuery("");
            }}
            className="text-xs text-[#2855D9] hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* 3. De-crowded Task List Rows */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E4E8F0] rounded-xl p-8 text-center space-y-2">
          <ListTodo className="w-8 h-8 text-[#68748A] mx-auto opacity-45" />
          <p className="text-sm font-semibold text-[#111A2E]">Aucune tâche trouvée</p>
          <p className="text-xs text-[#68748A]">
            {activeTab === "overdue"
              ? "Excellente nouvelle ! Vous n'avez aucune tâche en retard."
              : "Ajoutez une tâche pour organiser vos révisions et rendus académiques."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isExpanded = expandedTaskIds.has(task.id);
            const isOverdue = task.due_date < todayStr && !task.is_completed;
            const completedSubtasks = task.subtasks.filter((st) => st.done).length;
            const totalSubtasks = task.subtasks.length;
            const matchingSubject = subjects.find((s) => s.id === task.subject_id) || task.subject;
            const theme = resolvePlannerTheme(null, matchingSubject, task.category);
            const prio = getPriorityDot(task.priority);
            const isMenuOpen = activeMenuTaskId === task.id;

            return (
              <div
                key={task.id}
                className={cn(
                  "group relative rounded-xl p-3 transition-all duration-300 ease-out border",
                  isMenuOpen ? "z-30 overflow-visible" : "z-1 overflow-visible",
                  task.is_completed
                    ? "opacity-75 border-[#E4E8F0] bg-[#FAFAF7]/95 backdrop-blur-xs shadow-none"
                    : isOverdue
                    ? "border-rose-300/60 bg-gradient-to-r from-rose-50/60 via-white/95 to-rose-50/20 backdrop-blur-md shadow-2xs hover:shadow-md"
                    : cn(
                        "bg-white/95 backdrop-blur-md hover:bg-white hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.06)]",
                        theme.cardBorder
                      )
                )}
              >
                {/* Luminous left accent glow bar */}
                {!task.is_completed && (
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
                      isOverdue ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]" : theme.accentBar
                    )}
                  />
                )}

                {/* Primary Row: Animated Checkbox, Title, Priority dot, Focus Action, Overflow Menu */}
                <div className="flex items-center justify-between gap-3 pl-1.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Completion checkbox with tactile scale-pop micro-animation */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleTask(task.id, e)}
                      className={cn(
                        "relative flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-200 shrink-0 cursor-pointer active:scale-80 select-none focus:outline-none",
                        task.is_completed
                          ? "border-emerald-500 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-[0_0_10px_rgba(5,150,105,0.45)] animate-task-halo scale-100"
                          : "border-[#68748A]/40 hover:border-[#2855D9] hover:bg-[#EDF2FF]/60 hover:scale-110"
                      )}
                      title={task.is_completed ? "Cliquer pour réactiver (marquer non terminée)" : "Cliquer pour valider la tâche"}
                    >
                      {task.is_completed ? (
                        <Check className="w-3.5 h-3.5 stroke-[3] text-white animate-check-pop" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 opacity-0 hover:opacity-100 text-[#2855D9] transition-opacity" />
                      )}
                    </button>

                    {/* Priority Dot */}
                    <span
                      className={`w-2 h-2 rounded-full ${prio.dot} shrink-0`}
                      title={`Priorité : ${prio.label}`}
                    />

                    {/* Title */}
                    <span
                      className={cn(
                        "text-xs font-semibold leading-tight break-words line-clamp-2 transition-all duration-200",
                        task.is_completed
                          ? "line-through decoration-emerald-600/80 decoration-[1.5px] text-[#68748A] opacity-75"
                          : "text-[#111A2E]"
                      )}
                    >
                      {task.title}
                    </span>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-1.5 shrink-0 task-menu-container relative">
                    {/* Primary Action: Focus Trigger Button */}
                    <FocusTriggerButton
                      title={task.title}
                      estimatedMinutes={task.estimated_minutes}
                      taskId={task.id}
                      size="sm"
                    />

                    {/* Quick Direct Delete Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTaskId(task.id);
                      }}
                      className="p-1 rounded-md text-[#68748A] hover:text-[#DC2626] hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Supprimer la tâche"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Overflow menu toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuTaskId(isMenuOpen ? null : task.id);
                      }}
                      className="p-1 rounded-md text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] transition-colors cursor-pointer"
                      title="Plus d'actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Secondary Contextual Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E4E8F0] rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(task)}
                          className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#EDF2FF] text-[#2855D9] font-medium transition-colors cursor-pointer"
                        >
                          <CalendarPlus className="w-4 h-4 shrink-0 text-[#2855D9]" />
                          <span>Planifier sur l'agenda</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuTaskId(null);
                            setEditingTask(task);
                          }}
                          className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#F4F6FA] text-[#111A2E] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 shrink-0 text-[#68748A]" />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateTask(task)}
                          className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#F4F6FA] text-[#111A2E] transition-colors cursor-pointer"
                        >
                          <Copy className="w-4 h-4 shrink-0 text-[#68748A]" />
                          <span>Dupliquer</span>
                        </button>
                        <div className="border-t border-[#E4E8F0] my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuTaskId(null);
                            setDeletingTaskId(task.id);
                          }}
                          className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-rose-50 text-[#DC2626] font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 shrink-0 text-[#DC2626]" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Row: Due Date, Duration, Subject, Subtasks count */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#68748A] pl-6 pt-1.5 mt-0.5 border-t border-[#E4E8F0]/40">
                  {/* Due date */}
                  <div
                    className={`flex items-center gap-1 font-tabular ${
                      isOverdue ? "text-[#DC2626] font-semibold" : ""
                    }`}
                  >
                    {isOverdue && <AlertTriangle className="w-3 h-3 text-[#DC2626]" />}
                    <Calendar className="w-3 h-3 text-[#68748A]" />
                    <span>
                      {task.due_date === todayStr ? "Aujourd'hui" : task.due_date}
                      {task.due_time ? ` à ${task.due_time.slice(0, 5)}` : ""}
                    </span>
                  </div>

                  {/* Estimated duration */}
                  <div className="flex items-center gap-1 font-tabular">
                    <Clock className="w-3 h-3 text-[#68748A]" />
                    <span>{task.estimated_minutes} min</span>
                  </div>

                  {/* Subject Badge */}
                  {matchingSubject && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg font-medium border shadow-2xs",
                        theme.badgeBg,
                        theme.badgeText,
                        theme.badgeBorder
                      )}
                    >
                      <SubjectIcon
                        name={matchingSubject.name}
                        slug={matchingSubject.slug}
                        className="w-2.5 h-2.5"
                      />
                      <span className="max-w-[80px] truncate font-semibold">{matchingSubject.name}</span>
                    </span>
                  )}

                  {/* Subtasks expand toggle */}
                  {totalSubtasks > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(task.id)}
                      className="flex items-center gap-1 text-[10px] hover:text-[#111A2E] transition-colors ml-auto font-tabular font-medium"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <span>
                        {completedSubtasks}/{totalSubtasks} sous-tâches
                      </span>
                    </button>
                  )}
                </div>

                {/* Expandable Subtasks Accordion */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#E4E8F0] pl-6 space-y-2">
                    {totalSubtasks > 0 && (
                      <div className="w-full bg-[#F4F6FA] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2855D9] h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      {task.subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-2 text-xs text-[#111A2E]"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(task, st.id)}
                            className="text-[#68748A] hover:text-[#059669] transition-colors"
                          >
                            {st.done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                            ) : (
                              <Circle className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className={st.done ? "line-through text-[#68748A]" : ""}>
                            {st.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newSubtaskTitles[task.id] || ""}
                        onChange={(e) =>
                          setNewSubtaskTitles((prev) => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubtask(task.id);
                          }
                        }}
                        placeholder="Ajouter une étape..."
                        className="flex-1 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-2.5 py-1 outline-none text-[#111A2E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubtask(task.id)}
                        className="px-2.5 py-1 text-xs bg-[#EDF2FF] text-[#2855D9] hover:bg-[#DCE7FE] rounded-md font-medium transition-colors"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E4E8F0] p-5 max-w-sm w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#DC2626]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-[#111A2E]">Supprimer cette tâche ?</h3>
            </div>
            <p className="text-xs text-[#68748A]">
              Cette action est irréversible. Les blocs programmés sur votre calendrier liés à cette tâche resteront conservés dans votre historique.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E8F0]">
              <button
                type="button"
                onClick={() => setDeletingTaskId(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#68748A] hover:bg-[#F4F6FA] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(deletingTaskId)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Scheduling Modal */}
      {schedulingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E4E8F0] p-5 max-w-md w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#111A2E] flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-[#2855D9]" />
                <span>Planifier sur le calendrier</span>
              </h3>
              <button
                type="button"
                onClick={() => setSchedulingTask(null)}
                className="p-1 hover:bg-[#F4F6FA] rounded-lg text-[#68748A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#EDF2FF] p-3 rounded-xl border border-[#2855D9]/20">
              <span className="text-[10px] font-semibold text-[#2855D9] uppercase tracking-wider block">
                Tâche sélectionnée
              </span>
              <p className="text-xs font-bold text-[#111A2E] mt-0.5 truncate">
                {schedulingTask.title}
              </p>
            </div>

            <form onSubmit={handleSaveScheduledBlock} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#68748A] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => {
                      setScheduleDate(e.target.value);
                      handleCheckScheduleConflict(e.target.value, scheduleStart, scheduleEnd);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#68748A] mb-1">Début</label>
                  <input
                    type="time"
                    required
                    value={scheduleStart}
                    onChange={(e) => {
                      setScheduleStart(e.target.value);
                      handleCheckScheduleConflict(scheduleDate, e.target.value, scheduleEnd);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#68748A] mb-1">Fin</label>
                  <input
                    type="time"
                    required
                    value={scheduleEnd}
                    onChange={(e) => {
                      setScheduleEnd(e.target.value);
                      handleCheckScheduleConflict(scheduleDate, scheduleStart, e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>
              </div>

              {scheduleConflictWarning && (
                <div className="p-2.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/30 flex items-start gap-2 text-xs text-[#92400E]">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>{scheduleConflictWarning}</span>
                </div>
              )}

              {/* Color Tag Picker (Glassmorphism Pro Color Themes) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#111A2E] mb-1.5 flex items-center justify-between">
                  <span>Couleur & Thème visuel</span>
                  <span className="text-[10px] text-[#2855D9] font-medium bg-[#EDF2FF] px-2 py-0.5 rounded-full">
                    {PLANNER_COLOR_OPTIONS.find((c) => c.key === scheduleColor)?.label || "Cobalt"}
                  </span>
                </label>
                <div className="flex items-center justify-between gap-1.5 bg-[#F4F6FA] p-2 rounded-xl border border-[#E4E8F0]">
                  {PLANNER_COLOR_OPTIONS.map((opt) => {
                    const isSelected = scheduleColor === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setScheduleColor(opt.key)}
                        className={`w-7 h-7 rounded-full transition-all duration-150 flex items-center justify-center relative ${
                          isSelected
                            ? "scale-110 ring-2 ring-offset-2 ring-[#2855D9] shadow-sm"
                            : "opacity-75 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: opt.dotColor }}
                        title={`${opt.label}: ${opt.description}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#68748A] mb-1">
                  Notes de séance (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="ex: Réviser la partie 1 et faire les exercices 1 à 3"
                  className="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl outline-none focus:border-[#2855D9] text-[#111A2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E8F0]">
                <button
                  type="button"
                  onClick={() => setSchedulingTask(null)}
                  className="px-3 py-1.5 text-xs font-medium text-[#68748A] hover:bg-[#F4F6FA] rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E42AC] rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isScheduling ? "Planification..." : "Ajouter à l'agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
