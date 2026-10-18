"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { getLocalTodayDateString } from "@/lib/utils";

interface AcademicTodoListProps {
  tasks: AcademicTask[];
  subjects: Subject[];
  onRefresh: () => void;
  selectedDate?: string;
}

type FilterTab = "all" | "today" | "upcoming" | "overdue" | "completed";

export function AcademicTodoList({
  tasks,
  subjects,
  onRefresh,
  selectedDate,
}: AcademicTodoListProps) {
  // Local optimistic state for instant checkbox response (< 1ms)
  const [localTasks, setLocalTasks] = useState<AcademicTask[]>(tasks);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Keep local tasks in sync with incoming props
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<AcademicTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // Quick scheduling state
  const [schedulingTask, setSchedulingTask] = useState<AcademicTask | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStart, setScheduleStart] = useState("09:00");
  const [scheduleEnd, setScheduleEnd] = useState("10:00");
  const [scheduleNotes, setScheduleNotes] = useState("");
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
    await createCalendarTimeblockAction({
      title: schedulingTask.title,
      block_date: scheduleDate,
      start_time: scheduleStart,
      end_time: scheduleEnd,
      subject_id: schedulingTask.subject_id || null,
      task_id: schedulingTask.id,
      notes: scheduleNotes || null,
    });
    setIsScheduling(false);
    setSchedulingTask(null);
    onRefresh();
  };

  // High-performance optimistic task toggle (< 1ms UI response)
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (togglingIds.has(taskId)) return; // Guard against rapid duplicate clicks

    setTogglingIds((prev) => new Set(prev).add(taskId));
    const nextStatus = !currentStatus;

    // 1. Instant optimistic update
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: nextStatus } : t))
    );

    // 2. Server mutation in background
    const res = await toggleAcademicTaskAction(taskId, nextStatus);

    if (!res.success) {
      // 3. Rollback on failure
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentStatus } : t))
      );
    } else {
      // Background revalidation
      onRefresh();
    }

    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
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
        return task.due_date === todayStr && !task.is_completed;
      }
      if (activeTab === "upcoming") {
        return task.due_date > todayStr && !task.is_completed;
      }
      if (activeTab === "overdue") {
        return task.due_date < todayStr && !task.is_completed;
      }
      if (activeTab === "completed") {
        return task.is_completed;
      }

      return true;
    });
  }, [localTasks, searchQuery, selectedSubjectId, selectedPriority, activeTab, todayStr]);

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

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    await deleteAcademicTaskAction(taskId);
    setDeletingTaskId(null);
    onRefresh();
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
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            Toutes ({localTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
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
            onClick={() => setActiveTab("upcoming")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "upcoming"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            À venir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
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
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
            const prio = getPriorityDot(task.priority);
            const isMenuOpen = activeMenuTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`group bg-white border rounded-xl p-3 transition-all shadow-2xs hover:border-[#2855D9]/40 ${
                  task.is_completed
                    ? "opacity-65 border-[#E4E8F0] bg-[#FAFAF7]"
                    : isOverdue
                    ? "border-[#DC2626]/30 bg-[#FFF5F5]/30"
                    : "border-[#E4E8F0]"
                }`}
              >
                {/* Primary Row: Checkbox, Title, Priority dot, Focus Action, Overflow Menu */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Completion checkbox with 0ms optimistic flip */}
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id, task.is_completed)}
                      className="text-[#68748A] hover:text-[#2855D9] transition-colors shrink-0"
                      title={task.is_completed ? "Marquer non terminée" : "Marquer terminée"}
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669] fill-[#059669]/10" />
                      ) : (
                        <Circle className="w-4 h-4 hover:stroke-[#2855D9]" />
                      )}
                    </button>

                    {/* Priority Dot */}
                    <span
                      className={`w-2 h-2 rounded-full ${prio.dot} shrink-0`}
                      title={`Priorité : ${prio.label}`}
                    />

                    {/* Title */}
                    <span
                      className={`text-xs font-semibold leading-tight break-words line-clamp-2 ${
                        task.is_completed ? "line-through text-[#68748A]" : "text-[#111A2E]"
                      }`}
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

                    {/* Overflow menu toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuTaskId(isMenuOpen ? null : task.id);
                      }}
                      className="p-1 rounded-md text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] transition-colors"
                      title="Plus d'actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Secondary Contextual Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E4E8F0] rounded-xl shadow-lg z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(task)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#EDF2FF] text-[#2855D9] font-medium"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>Planifier sur l'agenda</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuTaskId(null);
                            setEditingTask(task);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F4F6FA] text-[#111A2E]"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#68748A]" />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateTask(task)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F4F6FA] text-[#111A2E]"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#68748A]" />
                          <span>Dupliquer</span>
                        </button>
                        <div className="border-t border-[#E4E8F0] my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuTaskId(null);
                            setDeletingTaskId(task.id);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#DC2626]/10 text-[#DC2626]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-[#EDF2FF] text-[#2855D9] font-medium">
                      <SubjectIcon
                        name={matchingSubject.name}
                        slug={matchingSubject.slug}
                        className="w-2.5 h-2.5"
                      />
                      <span className="max-w-[80px] truncate">{matchingSubject.name}</span>
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
