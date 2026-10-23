"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  List,
  Layers,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Move,
} from "lucide-react";
import type {
  CalendarTimeblock,
  AcademicTask,
  Subject,
} from "@/types/database";
import {
  createCalendarTimeblockAction,
  updateCalendarTimeblockAction,
  deleteCalendarTimeblockAction,
  checkCalendarConflictAction,
} from "@/lib/actions/planner-actions";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { FocusTriggerButton } from "./focus-trigger-button";
import { TimeblockEventCard } from "./timeblock-event-card";
import { TaskSelector } from "./task-selector";
import { getLocalTodayDateString, cn } from "@/lib/utils";
import {
  PLANNER_COLOR_OPTIONS,
  PlannerColorKey,
  parseNotesAndColor,
  formatNotesWithColor,
} from "@/lib/planner/planner-theme";

interface AcademicCalendarViewProps {
  timeblocks: CalendarTimeblock[];
  tasks: AcademicTask[];
  subjects: Subject[];
  onRefresh: () => void;
  currentDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

type CalendarViewMode = "day" | "3days" | "week" | "agenda";

// Timeline spans from 08:00 to 00:00 midnight (16 hours: 8 to 23, with row 23 ending at midnight)
const START_HOUR = 8;
const END_HOUR = 24; // Midnight
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const SLOT_HEIGHT = 60; // 60px per hour = 1px per minute

function parseTimeToMinutes(timeStr: string, isEnd = false): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (isEnd && h === 0 && m === 0) {
    return 24 * 60; // 1440 minutes = midnight
  }
  return (h || 0) * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const normalized = Math.min(1440, Math.max(0, minutes));
  if (normalized === 1440) return "00:00"; // Midnight boundary
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatHourLabel(h: number) {
  return `${h.toString().padStart(2, "0")}:00`;
}

function getDaysOfWeek(baseDateStr: string): Date[] {
  const base = new Date(baseDateStr + "T12:00:00");
  const day = base.getDay();
  // Monday as first day of week
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(base.setDate(diff));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function get3Days(baseDateStr: string): Date[] {
  const base = new Date(baseDateStr + "T12:00:00");
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

import {
  computeTimeblockDayLayout,
  type ColumnLayout,
} from "@/lib/planner/calendar-layout";

export function AcademicCalendarView({
  timeblocks,
  tasks,
  subjects,
  onRefresh,
  currentDate,
  onDateChange,
}: AcademicCalendarViewProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CalendarTimeblock | null>(null);

  // Responsive default: Day view on small mobile screens (<640px) for optimal readability
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setViewMode("day");
    }
  }, []);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(currentDate);
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:30");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTaskId, setFormTaskId] = useState<string | null>(null);
  const [formNotes, setFormNotes] = useState("");
  const [formColor, setFormColor] = useState<PlannerColorKey>("cobalt");
  const [formConflictWarning, setFormConflictWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Local optimistic state for timeblocks (instant drag-and-drop & zero-latency updates)
  const [localBlocks, setLocalBlocks] = useState<CalendarTimeblock[]>(timeblocks);

  useEffect(() => {
    setLocalBlocks(timeblocks);
  }, [timeblocks]);

  // Drag-and-Drop movement state
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    dateStr: string;
    startMin: number;
    duration: number;
  } | null>(null);

  // Drag-to-select state for continuous multi-hour scheduling
  const [dragState, setDragState] = useState<{
    dateStr: string;
    startMin: number;
    currentMin: number;
  } | null>(null);

  // Dynamic stretching / resizing state (supports top and bottom bar dragging with 15m snapping)
  const [resizingBlock, setResizingBlock] = useState<{
    blockId: string;
    edge: "top" | "bottom";
    dateStr: string;
    initialStartMin: number;
    initialEndMin: number;
    currentStartMin: number;
    currentEndMin: number;
  } | null>(null);

  const justResizedRef = useRef(false);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => getLocalTodayDateString(), []);

  // Window pointer listeners for smooth 60fps dynamic task stretching / resizing
  useEffect(() => {
    if (!resizingBlock) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!gridContainerRef.current) return;
      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const scrollOffset = gridContainerRef.current.scrollTop;
      const offsetY = e.clientY - gridRect.top + scrollOffset;
      const rawMin = START_HOUR * 60 + (offsetY / SLOT_HEIGHT) * 60;
      // Snap to 15-minute intervals
      const snapped = Math.round(rawMin / 15) * 15;

      if (resizingBlock.edge === "top") {
        // Upper bar: cannot extend before START_HOUR, and must leave at least 15m before initialEndMin
        const clamped = Math.max(
          START_HOUR * 60,
          Math.min(resizingBlock.initialEndMin - 15, snapped)
        );
        setResizingBlock((prev) => (prev ? { ...prev, currentStartMin: clamped } : null));
      } else {
        // Lower bar: cannot extend beyond END_HOUR, and must leave at least 15m after initialStartMin
        const clamped = Math.min(
          END_HOUR * 60,
          Math.max(resizingBlock.initialStartMin + 15, snapped)
        );
        setResizingBlock((prev) => (prev ? { ...prev, currentEndMin: clamped } : null));
      }
    };

    const handlePointerUp = async () => {
      const current = resizingBlock;
      setResizingBlock(null);
      if (!current) return;

      const { blockId, currentStartMin, currentEndMin, initialStartMin, initialEndMin } = current;

      if (currentStartMin !== initialStartMin || currentEndMin !== initialEndMin) {
        justResizedRef.current = true;
        setTimeout(() => {
          justResizedRef.current = false;
        }, 250);

        const newStartStr = minutesToTimeString(currentStartMin);
        const newEndStr = minutesToTimeString(currentEndMin);
        const newDuration = currentEndMin - currentStartMin;

        const previousBlocks = [...localBlocks];

        // Zero-latency optimistic update (< 1ms)
        setLocalBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  start_time: newStartStr,
                  end_time: newEndStr,
                  duration_minutes: newDuration,
                }
              : b
          )
        );

        const res = await updateCalendarTimeblockAction(blockId, {
          start_time: newStartStr,
          end_time: newEndStr,
          duration_minutes: newDuration,
        });

        if (!res.success) {
          setLocalBlocks(previousBlocks);
          alert(res.error || "Impossible de redimensionner le créneau");
        } else {
          onRefresh();
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizingBlock, localBlocks, onRefresh]);

  const handleResizeStart = (
    e: React.PointerEvent,
    block: CalendarTimeblock,
    edge: "top" | "bottom"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startMin = parseTimeToMinutes(block.start_time);
    const endMin = parseTimeToMinutes(block.end_time, true);

    setResizingBlock({
      blockId: block.id,
      edge,
      dateStr: block.block_date,
      initialStartMin: startMin,
      initialEndMin: endMin,
      currentStartMin: startMin,
      currentEndMin: endMin,
    });
  };

  const handleCardClick = (block: CalendarTimeblock) => {
    if (justResizedRef.current) return;
    handleOpenEditModal(block);
  };

  // Identify unscheduled tasks (active tasks without any linked calendar timeblock)
  const unscheduledTasks = useMemo(() => {
    const scheduledTaskIds = new Set(timeblocks.map((b) => b.task_id).filter(Boolean));
    return tasks.filter((t) => !t.is_completed && !scheduledTaskIds.has(t.id));
  }, [tasks, timeblocks]);

  // Compute displayed dates based on view mode
  const displayedDates = useMemo(() => {
    if (viewMode === "day") {
      return [new Date(currentDate + "T12:00:00")];
    }
    if (viewMode === "3days") {
      return get3Days(currentDate);
    }
    if (viewMode === "week") {
      return getDaysOfWeek(currentDate);
    }
    return [];
  }, [viewMode, currentDate]);

  // Compute collision layout for all displayed days (memoized O(N log N))
  const layoutMap = useMemo(() => {
    const map = new Map<string, Map<string, ColumnLayout>>();
    for (const dateObj of displayedDates) {
      const dStr = getLocalTodayDateString(dateObj);
      const dBlocks = localBlocks.filter((b) => b.block_date === dStr);
      map.set(dStr, computeTimeblockDayLayout(dBlocks));
    }
    return map;
  }, [displayedDates, localBlocks]);

  // Navigate Previous
  const handlePrev = () => {
    const d = new Date(currentDate + "T12:00:00");
    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "3days") d.setDate(d.getDate() - 3);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 7);
    onDateChange(getLocalTodayDateString(d));
  };

  // Navigate Next
  const handleNext = () => {
    const d = new Date(currentDate + "T12:00:00");
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "3days") d.setDate(d.getDate() + 3);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 7);
    onDateChange(getLocalTodayDateString(d));
  };

  // Navigate Today
  const handleToday = () => {
    onDateChange(todayStr);
  };

  // Open modal with specific date & time interval
  const handleOpenCreateModal = (dateStr?: string, startStr = "09:00", endStr = "10:30") => {
    setEditingBlock(null);
    setFormTitle("");
    setFormDate(dateStr || currentDate);
    setFormStart(startStr);
    setFormEnd(endStr);
    setFormSubjectId("");
    setFormTaskId(null);
    setFormNotes("");
    setFormColor("cobalt");
    setFormConflictWarning(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing block
  const handleOpenEditModal = (block: CalendarTimeblock) => {
    setEditingBlock(block);
    setFormTitle(block.title);
    setFormDate(block.block_date);
    setFormStart(block.start_time.slice(0, 5));
    setFormEnd(block.end_time.slice(0, 5));
    setFormSubjectId(block.subject_id || "");
    setFormTaskId(block.task_id || null);

    const { colorKey, displayNotes } = parseNotesAndColor(block.notes);
    setFormNotes(displayNotes || "");
    setFormColor(colorKey || "cobalt");

    setFormConflictWarning(null);
    setIsModalOpen(true);
  };

  // Check conflict dynamically
  const checkConflictOnTimeChange = async (date: string, start: string, end: string) => {
    const res = await checkCalendarConflictAction(date, start, end, editingBlock?.id);
    if (res.hasConflict) {
      setFormConflictWarning(
        `Attention: Ce créneau chevauche ${res.conflictingBlocks.length} autre(s) séance(s).`
      );
    } else {
      setFormConflictWarning(null);
    }
  };

  // Save Block
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) return;

    setSaving(true);
    const sMins = parseTimeToMinutes(formStart);
    const eMins = parseTimeToMinutes(formEnd, true);
    const duration = eMins > sMins ? eMins - sMins : 60;
    const encodedNotes = formatNotesWithColor(formNotes.trim(), formColor);

    if (editingBlock) {
      const res = await updateCalendarTimeblockAction(editingBlock.id, {
        title: cleanTitle,
        block_date: formDate,
        start_time: formStart,
        end_time: formEnd,
        duration_minutes: duration,
        subject_id: formSubjectId || null,
        task_id: formTaskId || null,
        notes: encodedNotes,
      });

      setSaving(false);
      if (!res.success) {
        alert(res.error || "Erreur de modification du créneau");
        return;
      }
    } else {
      const res = await createCalendarTimeblockAction({
        title: cleanTitle,
        block_date: formDate,
        start_time: formStart,
        end_time: formEnd,
        duration_minutes: duration,
        subject_id: formSubjectId || null,
        task_id: formTaskId || null,
        notes: encodedNotes,
      });

      setSaving(false);
      if (!res.success) {
        alert(res.error || "Erreur de création du créneau");
        return;
      }
    }

    setIsModalOpen(false);
    onRefresh();
  };

  // Delete Block with instant optimistic removal
  const handleDeleteBlock = async (blockId: string) => {
    setLocalBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setIsModalOpen(false);
    await deleteCalendarTimeblockAction(blockId);
    onRefresh();
  };

  // Duplicate Block to next day (+1 j)
  const handleDuplicateBlock = async (block: CalendarTimeblock) => {
    const originalDate = new Date(block.block_date + "T12:00:00");
    originalDate.setDate(originalDate.getDate() + 1);
    const nextDateStr = getLocalTodayDateString(originalDate);

    await createCalendarTimeblockAction({
      title: `${block.title} (Copie)`,
      block_date: nextDateStr,
      start_time: block.start_time,
      end_time: block.end_time,
      subject_id: block.subject_id,
      task_id: block.task_id,
      notes: block.notes,
    });
    onRefresh();
  };

  // Toggle complete with instant optimistic response (< 1ms)
  const handleToggleComplete = async (block: CalendarTimeblock) => {
    const nextStatus = !block.is_completed;
    setLocalBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, is_completed: nextStatus } : b))
    );
    await updateCalendarTimeblockAction(block.id, {
      is_completed: nextStatus,
    });
    onRefresh();
  };

  // Handle task selection from TaskSelector in scheduling modal
  const handleSelectTask = (task: AcademicTask | null) => {
    if (!task) {
      setFormTaskId(null);
      return;
    }
    setFormTaskId(task.id);
    if (!formTitle.trim()) {
      setFormTitle(task.title);
    }
    if (task.subject_id) {
      setFormSubjectId(task.subject_id);
    }
    if (task.estimated_minutes) {
      const sMins = parseTimeToMinutes(formStart);
      const eMins = Math.min(1440, sMins + task.estimated_minutes);
      setFormEnd(minutesToTimeString(eMins));
    }
  };

  // Drag-to-select handlers for continuous interval selection
  const handlePointerDownColumn = (e: React.PointerEvent<HTMLDivElement>, dateStr: string) => {
    if ((e.target as HTMLElement).closest("[role='button']")) return; // ignore clicking existing blocks
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMin = START_HOUR * 60 + Math.floor((offsetY / SLOT_HEIGHT) * 60);
    // Snap to 30 min intervals
    const snappedStart = Math.max(START_HOUR * 60, Math.min(23 * 60, Math.floor(rawMin / 30) * 30));
    setDragState({
      dateStr,
      startMin: snappedStart,
      currentMin: snappedStart + 60,
    });
  };

  const handlePointerMoveColumn = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMin = START_HOUR * 60 + Math.floor((offsetY / SLOT_HEIGHT) * 60);
    const snapped = Math.max(dragState.startMin + 30, Math.min(1440, Math.ceil(rawMin / 30) * 30));
    setDragState((prev) => (prev ? { ...prev, currentMin: snapped } : null));
  };

  // Drag-and-Drop movement handlers (HTML5 DnD for moving blocks across grid)
  const handleEventDragStart = (e: React.DragEvent, block: CalendarTimeblock) => {
    e.dataTransfer.setData("text/plain", block.id);
    e.dataTransfer.effectAllowed = "move";
    setMovingBlockId(block.id);
  };

  const handleEventDragEnd = () => {
    setMovingBlockId(null);
    setDropPreview(null);
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!movingBlockId) return;

    const block = localBlocks.find((b) => b.id === movingBlockId);
    if (!block) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMin = START_HOUR * 60 + Math.floor((offsetY / SLOT_HEIGHT) * 60);
    const duration = block.duration_minutes || 60;
    const maxStart = END_HOUR * 60 - duration;
    // Snap to 30 min intervals
    const snappedStart = Math.max(START_HOUR * 60, Math.min(maxStart, Math.floor(rawMin / 30) * 30));

    if (
      !dropPreview ||
      dropPreview.dateStr !== dateStr ||
      dropPreview.startMin !== snappedStart
    ) {
      setDropPreview({
        dateStr,
        startMin: snappedStart,
        duration,
      });
    }
  };

  const handleColumnDrop = async (e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData("text/plain") || movingBlockId;
    if (!blockId || !dropPreview) {
      setMovingBlockId(null);
      setDropPreview(null);
      return;
    }

    const block = localBlocks.find((b) => b.id === blockId);
    if (!block) {
      setMovingBlockId(null);
      setDropPreview(null);
      return;
    }

    const newStart = minutesToTimeString(dropPreview.startMin);
    const newEnd = minutesToTimeString(dropPreview.startMin + dropPreview.duration);

    if (block.block_date === dateStr && block.start_time.slice(0, 5) === newStart) {
      setMovingBlockId(null);
      setDropPreview(null);
      return;
    }

    const previousBlocks = [...localBlocks];

    // 1. Instant optimistic update (< 1ms UI response)
    setLocalBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              block_date: dateStr,
              start_time: newStart,
              end_time: newEnd,
              duration_minutes: dropPreview.duration,
            }
          : b
      )
    );

    setMovingBlockId(null);
    setDropPreview(null);

    // 2. Persist in background
    const res = await updateCalendarTimeblockAction(blockId, {
      block_date: dateStr,
      start_time: newStart,
      end_time: newEnd,
      duration_minutes: block.duration_minutes,
    });

    if (!res.success) {
      setLocalBlocks(previousBlocks);
      alert(res.error || "Impossible de déplacer le créneau");
    } else {
      onRefresh();
    }
  };

  const handlePointerUpColumn = () => {
    if (!dragState) return;
    const startMins = Math.min(dragState.startMin, dragState.currentMin);
    const endMins = Math.max(dragState.startMin + 30, dragState.currentMin);
    const startStr = minutesToTimeString(startMins);
    const endStr = minutesToTimeString(endMins);
    const targetDate = dragState.dateStr;
    setDragState(null);
    handleOpenCreateModal(targetDate, startStr, endStr);
  };

  return (
    <div className="space-y-4">
      {/* Unscheduled Tasks Assist Banner */}
      {unscheduledTasks.length > 0 && (
        <div className="bg-[#EDF2FF] border border-[#2855D9]/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-[#111A2E] shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2855D9] animate-pulse shrink-0" />
            <span className="font-semibold">{unscheduledTasks.length} tâche(s) en attente de planification</span>
            <span className="hidden sm:inline text-[#68748A]">
              — Réservez un créneau dédié pour vos devoirs et révisions.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreateModal(currentDate)}
            className="text-[11px] font-semibold text-[#2855D9] hover:underline shrink-0"
          >
            Planifier maintenant →
          </button>
        </div>
      )}

      {/* 1. Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E8F0] pb-3">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#E4E8F0] rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 hover:bg-[#F4F6FA] rounded text-[#68748A] hover:text-[#111A2E] transition-colors"
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-[#111A2E] hover:bg-[#F4F6FA] rounded transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 hover:bg-[#F4F6FA] rounded text-[#68748A] hover:text-[#111A2E] transition-colors"
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-semibold text-[#111A2E] font-tabular">
            {viewMode === "day" &&
              new Date(currentDate + "T12:00:00").toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            {viewMode === "week" && displayedDates.length > 0 && (
              <>
                {displayedDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} —{" "}
                {displayedDates[6].toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </>
            )}
            {viewMode === "3days" && displayedDates.length > 0 && (
              <>
                {displayedDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} —{" "}
                {displayedDates[2].toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </>
            )}
            {viewMode === "agenda" && "Agenda complet des séances"}
          </span>
        </div>

        {/* View switchers and New Event button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#E4E8F0] rounded-lg p-0.5 shadow-2xs text-xs">
            {(["day", "3days", "week", "agenda"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded transition-colors capitalize ${
                  viewMode === mode
                    ? "bg-[#2855D9] text-white font-medium shadow-2xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                }`}
              >
                {mode === "day" ? "Jour" : mode === "3days" ? "3 Jours" : mode === "week" ? "Semaine" : "Agenda"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2855D9] text-white text-xs font-medium rounded-lg hover:bg-[#1E42AC] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau créneau</span>
          </button>
        </div>
      </div>

      {/* 2. Agenda View */}
      {viewMode === "agenda" && (
        <div className="space-y-3">
          {timeblocks.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E4E8F0] rounded-xl p-8 text-center text-[#68748A] text-xs">
              Aucun créneau planifié sur cette période.
            </div>
          ) : (
            timeblocks.map((block) => {
              const sub = subjects.find((s) => s.id === block.subject_id) || block.subject;
              const linked = tasks.find((t) => t.id === block.task_id) || block.task;
              return (
                <TimeblockEventCard
                  key={block.id}
                  block={block}
                  subject={sub}
                  linkedTask={linked}
                  onEdit={handleOpenEditModal}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteBlock}
                  onDuplicate={handleDuplicateBlock}
                />
              );
            })
          )}
        </div>
      )}

      {/* 3. Grid Views (Day, 3-Days, Week) with Continuous Multi-Hour Timeline & Glassmorphism Pro */}
      {viewMode !== "agenda" && (
        <div className="relative bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(40,85,217,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(40,85,217,0.04),rgba(255,255,255,0))] before:pointer-events-none">
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <div
              className="min-w-full"
              style={{
                minWidth:
                  viewMode === "week"
                    ? "780px"
                    : viewMode === "3days"
                    ? "480px"
                    : "100%",
              }}
            >
              {/* Header Row: Days columns */}
              <div
                className="grid border-b border-[#E4E8F0]/80 bg-white/70 backdrop-blur-md sticky top-0 z-20 shadow-2xs"
                style={{
                  gridTemplateColumns: `56px repeat(${displayedDates.length}, minmax(0, 1fr))`,
                }}
              >
            <div className="p-2.5 text-[11px] font-semibold text-[#68748A] text-center border-r border-[#E4E8F0]/80">
              Heure
            </div>
            {displayedDates.map((dateObj) => {
              const dateStr = getLocalTodayDateString(dateObj);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={dateStr}
                  className={`p-2 text-center border-r last:border-r-0 border-[#E4E8F0] ${
                    isToday ? "bg-[#EDF2FF]/60 text-[#2855D9]" : "text-[#111A2E]"
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase text-[#68748A]">
                    {dateObj.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-sm font-bold font-tabular inline-block px-1.5 py-0.5 rounded-full ${
                      isToday ? "bg-[#2855D9] text-white" : ""
                    }`}
                  >
                    {dateObj.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hourly Body with continuous scrollable canvas */}
          <div
            ref={gridContainerRef}
            className="max-h-[640px] overflow-y-auto relative select-none"
            style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `56px repeat(${displayedDates.length}, minmax(0, 1fr))`,
                height: `${HOURS.length * SLOT_HEIGHT}px`,
              }}
            >
              {/* Hour Labels Column */}
              <div className="border-r border-[#E4E8F0] bg-[#FAFAF7]">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${SLOT_HEIGHT}px` }}
                    className="border-b border-[#E4E8F0] p-2 text-[11px] text-[#68748A] font-tabular text-right pr-2.5"
                  >
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {displayedDates.map((dateObj) => {
                const dateStr = getLocalTodayDateString(dateObj);
                const dayBlocks = localBlocks.filter((b) => b.block_date === dateStr);
                const isTodayCol = dateStr === todayStr;
                const now = new Date();
                const currentMinuteOfDay = now.getHours() * 60 + now.getMinutes();

                const isDraggingThisCol = dragState && dragState.dateStr === dateStr;

                return (
                  <div
                    key={dateStr}
                    onPointerDown={(e) => handlePointerDownColumn(e, dateStr)}
                    onPointerMove={isDraggingThisCol ? handlePointerMoveColumn : undefined}
                    onPointerUp={isDraggingThisCol ? handlePointerUpColumn : undefined}
                    onDragOver={(e) => handleColumnDragOver(e, dateStr)}
                    onDrop={(e) => handleColumnDrop(e, dateStr)}
                    className="border-r last:border-r-0 border-[#E4E8F0]/70 relative hover:bg-blue-50/15 cursor-crosshair transition-colors"
                    style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}
                  >
                    {/* Background hour grid guide lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                        className="border-b border-[#E4E8F0]/60 pointer-events-none"
                      />
                    ))}

                    {/* Current Time Indicator Line (authoritative local time with luminous glow) */}
                    {isTodayCol && currentMinuteOfDay >= START_HOUR * 60 && currentMinuteOfDay <= END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        style={{
                          top: `${((currentMinuteOfDay - START_HOUR * 60) / 60) * SLOT_HEIGHT}px`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] -ml-1.25 shadow-[0_0_8px_#EF4444] animate-pulse" />
                        <div className="h-[2px] bg-gradient-to-r from-[#EF4444] via-[#EF4444]/80 to-transparent flex-1 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                      </div>
                    )}

                    {/* Drag selection visual highlight overlay with Glassmorphism */}
                    {isDraggingThisCol && (
                      <div
                        className="absolute left-1 right-1 rounded-xl bg-blue-500/20 backdrop-blur-xs border-2 border-dashed border-[#2855D9] z-20 pointer-events-none flex items-center justify-center text-xs font-bold text-[#2855D9] shadow-md animate-in fade-in-50"
                        style={{
                          top: `${((Math.min(dragState.startMin, dragState.currentMin) - START_HOUR * 60) / 60) * SLOT_HEIGHT}px`,
                          height: `${(Math.max(30, Math.abs(dragState.currentMin - dragState.startMin)) / 60) * SLOT_HEIGHT}px`,
                        }}
                      >
                        <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#2855D9]/30 shadow-xs">
                          {minutesToTimeString(Math.min(dragState.startMin, dragState.currentMin))} -{" "}
                          {minutesToTimeString(Math.max(dragState.startMin + 30, dragState.currentMin))}
                        </span>
                      </div>
                    )}

                    {/* Drop Movement Preview Indicator (Glassmorphism Pro Target Indicator) */}
                    {dropPreview && dropPreview.dateStr === dateStr && (
                      <div
                        className="absolute left-1 right-1 rounded-2xl bg-gradient-to-br from-blue-500/25 via-indigo-500/15 to-transparent border-2 border-dashed border-[#2855D9] backdrop-blur-md z-30 pointer-events-none flex flex-col items-center justify-center text-xs font-bold text-[#2855D9] shadow-xl animate-in fade-in-50 duration-100"
                        style={{
                          top: `${((dropPreview.startMin - START_HOUR * 60) / 60) * SLOT_HEIGHT}px`,
                          height: `${Math.max(32, (dropPreview.duration / 60) * SLOT_HEIGHT - 3)}px`,
                        }}
                      >
                        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2855D9]/30 shadow-md flex items-center gap-2 text-xs font-bold text-[#2855D9]">
                          <span className="w-2 h-2 rounded-full bg-[#2855D9] animate-ping" />
                          <span>
                            {minutesToTimeString(dropPreview.startMin)} -{" "}
                            {minutesToTimeString(dropPreview.startMin + dropPreview.duration)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Resize Floating Live Badge Indicator */}
                    {resizingBlock && resizingBlock.dateStr === dateStr && (
                      <div
                        className="absolute left-1 right-1 z-50 pointer-events-none transition-all duration-75 flex items-center justify-center animate-in fade-in zoom-in-95"
                        style={{
                          top: `${((resizingBlock[resizingBlock.edge === "top" ? "currentStartMin" : "currentEndMin"] - START_HOUR * 60) / 60) * SLOT_HEIGHT - 20}px`,
                        }}
                      >
                        <div className="bg-[#111A2E]/95 text-white backdrop-blur-md px-3 py-1 rounded-xl border border-blue-400/50 shadow-2xl flex items-center gap-2 text-xs font-bold font-tabular text-blue-200">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                          <span>
                            {minutesToTimeString(resizingBlock.currentStartMin)} -{" "}
                            {minutesToTimeString(resizingBlock.currentEndMin)} (
                            {resizingBlock.currentEndMin - resizingBlock.currentStartMin}m)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Continuous Multi-Hour Timeblock Event Cards with Collision Clustering & Vertical Seam Separation */}
                    {dayBlocks.map((block) => {
                      const dayLayouts = layoutMap.get(dateStr);
                      const layout = dayLayouts?.get(block.id) || { colIndex: 0, totalCols: 1 };
                      const isSingleCol = layout.totalCols === 1;
                      const isParallel = layout.totalCols > 1;

                      let leftStyle = "4px";
                      let widthStyle = "calc(100% - 8px)";
                      let zIndexVal = 10;

                      if (!isSingleCol) {
                        if (viewMode === "day") {
                          const widthPercent = 100 / layout.totalCols;
                          const leftPercent = layout.colIndex * widthPercent;
                          leftStyle = `calc(${leftPercent}% + 2px)`;
                          widthStyle = `calc(${widthPercent}% - 4px)`;
                          zIndexVal = 10 + layout.colIndex;
                        } else {
                          // Pro Staggered Cascade in Week & 3-Days views (Apple Calendar / Notion Calendar style)
                          if (layout.totalCols === 2) {
                            if (layout.colIndex === 0) {
                              leftStyle = "2px";
                              widthStyle = "calc(72% - 2px)";
                              zIndexVal = 10;
                            } else {
                              leftStyle = "calc(28% + 2px)";
                              widthStyle = "calc(70% - 4px)";
                              zIndexVal = 14;
                            }
                          } else {
                            const stepPercent = Math.min(22, 50 / (layout.totalCols - 1));
                            const widthPercent = Math.max(54, 100 - (layout.totalCols - 1) * stepPercent);
                            const leftPercent = layout.colIndex * stepPercent;
                            leftStyle = `calc(${leftPercent}% + 2px)`;
                            widthStyle = `calc(${widthPercent}% - 4px)`;
                            zIndexVal = 10 + layout.colIndex * 2;
                          }
                        }
                      }

                      const startMins = parseTimeToMinutes(block.start_time);
                      const duration = block.duration_minutes || 60;

                      const isResizingThis = resizingBlock && resizingBlock.blockId === block.id;
                      const effectiveStart = isResizingThis ? resizingBlock.currentStartMin : startMins;
                      const effectiveEnd = isResizingThis
                        ? resizingBlock.currentEndMin
                        : parseTimeToMinutes(block.end_time, true);
                      const effectiveDuration = Math.max(15, effectiveEnd - effectiveStart);

                      // Clean vertical placement with 5px gap between consecutive blocks
                      const topPx = ((effectiveStart - START_HOUR * 60) / 60) * SLOT_HEIGHT + 2;
                      const heightPx = Math.max(28, (effectiveDuration / 60) * SLOT_HEIGHT - 5);
                      const isNearTop = topPx < 120;

                      const sub = subjects.find((s) => s.id === block.subject_id) || block.subject;
                      const linked = tasks.find((t) => t.id === block.task_id) || block.task;

                      return (
                        <div
                          key={block.id}
                          className={cn(
                            "transition-all duration-200 ease-out",
                            isParallel &&
                              viewMode !== "day" &&
                              "hover:!left-[2px] hover:!w-[calc(100%-4px)] hover:!z-40 hover:shadow-2xl"
                          )}
                          style={{
                            position: "absolute",
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: isResizingThis ? "2px" : leftStyle,
                            width: isResizingThis ? "calc(100% - 4px)" : widthStyle,
                            zIndex: isResizingThis ? 50 : zIndexVal,
                          }}
                        >
                          <TimeblockEventCard
                            block={{
                              ...block,
                              start_time: isResizingThis ? minutesToTimeString(effectiveStart) : block.start_time,
                              end_time: isResizingThis ? minutesToTimeString(effectiveEnd) : block.end_time,
                              duration_minutes: effectiveDuration,
                            }}
                            subject={sub}
                            linkedTask={linked}
                            onEdit={handleCardClick}
                            onToggleComplete={handleToggleComplete}
                            onDelete={handleDeleteBlock}
                            onDuplicate={handleDuplicateBlock}
                            onDragStart={handleEventDragStart}
                            onDragEnd={handleEventDragEnd}
                            onResizeStart={handleResizeStart}
                            isDragging={movingBlockId === block.id}
                            isResizing={Boolean(isResizingThis)}
                            isCompact={effectiveDuration < 45}
                            isNearTop={isNearTop}
                            isParallel={isParallel}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* 4. Event Create / Edit Dialog with TaskSelector & Interval Adjustment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 border border-[#E4E8F0] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto [scrollbar-width:thin]">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="text-base font-bold text-[#111A2E] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2855D9]" />
                <span>{editingBlock ? "Modifier la séance" : "Planifier une séance"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#68748A] hover:text-[#111A2E] p-1 rounded-lg hover:bg-[#F4F6FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                  Titre du créneau *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ex: Révision Algorithmique & Graphes"
                  className="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl outline-none focus:border-[#2855D9] text-[#111A2E]"
                />
              </div>

              {/* Task Selector (Shared linking experience) */}
              <TaskSelector
                tasks={tasks}
                subjects={subjects}
                selectedTaskId={formTaskId}
                onSelectTask={handleSelectTask}
              />

              {/* Subject selector */}
              <div>
                <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                  Matière associée
                </label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl outline-none focus:border-[#2855D9] text-[#111A2E]"
                >
                  <option value="">Aucune matière spécifique</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time range row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#68748A] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => {
                      setFormDate(e.target.value);
                      checkConflictOnTimeChange(e.target.value, formStart, formEnd);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#68748A] mb-1">Début</label>
                  <input
                    type="time"
                    required
                    value={formStart}
                    onChange={(e) => {
                      setFormStart(e.target.value);
                      checkConflictOnTimeChange(formDate, e.target.value, formEnd);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#68748A] mb-1">Fin</label>
                  <input
                    type="time"
                    required
                    value={formEnd}
                    onChange={(e) => {
                      setFormEnd(e.target.value);
                      checkConflictOnTimeChange(formDate, formStart, e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>
              </div>

              {/* Quick Duration Presets & Postpone Assist */}
              <div className="bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#111A2E] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2855D9]" />
                    <span>Durées rapides (Presets)</span>
                  </span>
                  {editingBlock && (
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(formDate + "T12:00:00");
                        d.setDate(d.getDate() + 1);
                        const newDate = getLocalTodayDateString(d);
                        setFormDate(newDate);
                        checkConflictOnTimeChange(newDate, formStart, formEnd);
                      }}
                      className="text-[11px] text-[#2855D9] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Reporter à demain (+1 j)</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "25 min (Pomo)", mins: 25 },
                    { label: "45 min", mins: 45 },
                    { label: "1h (60m)", mins: 60 },
                    { label: "1h30 (90m)", mins: 90 },
                    { label: "2h (120m)", mins: 120 },
                  ].map((preset) => (
                    <button
                      key={preset.mins}
                      type="button"
                      onClick={() => {
                        const sMins = parseTimeToMinutes(formStart);
                        const eMins = Math.min(1440, sMins + preset.mins);
                        const newEnd = minutesToTimeString(eMins);
                        setFormEnd(newEnd);
                        checkConflictOnTimeChange(formDate, formStart, newEnd);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#EDF2FF] text-[#111A2E] hover:text-[#2855D9] rounded-lg border border-[#E4E8F0] transition-colors shadow-2xs"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conflict warning notification */}
              {formConflictWarning && (
                <div className="p-2.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/30 flex items-start gap-2 text-xs text-[#92400E]">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>{formConflictWarning}</span>
                </div>
              )}

              {/* Color Tag Picker (Glassmorphism Pro Color Themes) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#111A2E] mb-1.5 flex items-center justify-between">
                  <span>Couleur & Thème visuel</span>
                  <span className="text-[10px] text-[#2855D9] font-medium bg-[#EDF2FF] px-2 py-0.5 rounded-full">
                    {PLANNER_COLOR_OPTIONS.find((c) => c.key === formColor)?.label || "Cobalt"}
                  </span>
                </label>
                <div className="flex items-center justify-between gap-1.5 bg-[#F4F6FA] p-2 rounded-xl border border-[#E4E8F0]">
                  {PLANNER_COLOR_OPTIONS.map((opt) => {
                    const isSelected = formColor === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setFormColor(opt.key)}
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

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-medium text-[#68748A] mb-1">
                  Notes ou objectifs de séance (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ex: Finir les exercices 3 et 4 de la fiche TD"
                  className="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl outline-none focus:border-[#2855D9] text-[#111A2E]"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E4E8F0]">
                {editingBlock ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(editingBlock.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition-colors"
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        await handleDuplicateBlock(editingBlock);
                        setSaving(false);
                        setIsModalOpen(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#2855D9] hover:bg-[#EDF2FF] rounded-lg transition-colors flex items-center gap-1 border border-[#2855D9]/20"
                      title="Dupliquer vers demain (+1 j)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Dupliquer</span>
                    </button>
                  </div>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-[#68748A] hover:bg-[#F4F6FA] rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formTitle.trim()}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E42AC] rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {saving ? "Enregistrement..." : editingBlock ? "Sauvegarder" : "Planifier"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
