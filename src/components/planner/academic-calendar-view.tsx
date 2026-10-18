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
import { getLocalTodayDateString } from "@/lib/utils";

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
  const [formConflictWarning, setFormConflictWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Drag-to-select state for continuous multi-hour scheduling
  const [dragState, setDragState] = useState<{
    dateStr: string;
    startMin: number;
    currentMin: number;
  } | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => getLocalTodayDateString(), []);

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
    setFormNotes(block.notes || "");
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
    if (!formTitle.trim()) return;

    setSaving(true);

    if (editingBlock) {
      await updateCalendarTimeblockAction(editingBlock.id, {
        title: formTitle,
        block_date: formDate,
        start_time: formStart,
        end_time: formEnd,
        subject_id: formSubjectId || null,
        task_id: formTaskId || null,
        notes: formNotes,
      });
    } else {
      await createCalendarTimeblockAction({
        title: formTitle,
        block_date: formDate,
        start_time: formStart,
        end_time: formEnd,
        subject_id: formSubjectId || null,
        task_id: formTaskId || null,
        notes: formNotes,
      });
    }

    setSaving(false);
    setIsModalOpen(false);
    onRefresh();
  };

  // Delete Block
  const handleDeleteBlock = async (blockId: string) => {
    await deleteCalendarTimeblockAction(blockId);
    setIsModalOpen(false);
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

  // Toggle complete
  const handleToggleComplete = async (block: CalendarTimeblock) => {
    await updateCalendarTimeblockAction(block.id, {
      is_completed: !block.is_completed,
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

      {/* 3. Grid Views (Day, 3-Days, Week) with Continuous Multi-Hour Timeline */}
      {viewMode !== "agenda" && (
        <div className="bg-white border border-[#E4E8F0] rounded-xl overflow-hidden shadow-xs">
          {/* Header Row: Days columns */}
          <div
            className="grid border-b border-[#E4E8F0] bg-[#F4F6FA] sticky top-0 z-10"
            style={{
              gridTemplateColumns: `56px repeat(${displayedDates.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="p-2.5 text-[11px] font-semibold text-[#68748A] text-center border-r border-[#E4E8F0]">
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
                const dayBlocks = timeblocks.filter((b) => b.block_date === dateStr);
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
                    className="border-r last:border-r-0 border-[#E4E8F0] relative hover:bg-[#F4F6FA]/20 cursor-crosshair transition-colors"
                    style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}
                  >
                    {/* Background hour grid guide lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                        className="border-b border-[#E4E8F0]/70 pointer-events-none"
                      />
                    ))}

                    {/* Current Time Indicator Line (authoritative local time) */}
                    {isTodayCol && currentMinuteOfDay >= START_HOUR * 60 && currentMinuteOfDay <= END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        style={{
                          top: `${((currentMinuteOfDay - START_HOUR * 60) / 60) * SLOT_HEIGHT}px`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] -ml-1.25 shadow-xs" />
                        <div className="h-[2px] bg-[#EF4444] flex-1 shadow-xs" />
                      </div>
                    )}

                    {/* Drag selection visual highlight overlay */}
                    {isDraggingThisCol && (
                      <div
                        className="absolute left-1 right-1 rounded-lg bg-[#2855D9]/20 border-2 border-dashed border-[#2855D9] z-20 pointer-events-none flex items-center justify-center text-xs font-semibold text-[#2855D9] shadow-xs"
                        style={{
                          top: `${((Math.min(dragState.startMin, dragState.currentMin) - START_HOUR * 60) / 60) * SLOT_HEIGHT}px`,
                          height: `${(Math.max(30, Math.abs(dragState.currentMin - dragState.startMin)) / 60) * SLOT_HEIGHT}px`,
                        }}
                      >
                        <span>
                          {minutesToTimeString(Math.min(dragState.startMin, dragState.currentMin))} -{" "}
                          {minutesToTimeString(Math.max(dragState.startMin + 30, dragState.currentMin))}
                        </span>
                      </div>
                    )}

                    {/* Continuous Multi-Hour Timeblock Event Cards */}
                    {dayBlocks.map((block) => {
                      const startMins = parseTimeToMinutes(block.start_time);
                      const duration = block.duration_minutes;
                      const topPx = ((startMins - START_HOUR * 60) / 60) * SLOT_HEIGHT;
                      const heightPx = Math.max(32, (duration / 60) * SLOT_HEIGHT - 3);

                      const sub = subjects.find((s) => s.id === block.subject_id) || block.subject;
                      const linked = tasks.find((t) => t.id === block.task_id) || block.task;

                      return (
                        <div
                          key={block.id}
                          style={{
                            position: "absolute",
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: "4px",
                            right: "4px",
                            zIndex: 10,
                          }}
                        >
                          <TimeblockEventCard
                            block={block}
                            subject={sub}
                            linkedTask={linked}
                            onEdit={handleOpenEditModal}
                            onToggleComplete={handleToggleComplete}
                            onDelete={handleDeleteBlock}
                            onDuplicate={handleDuplicateBlock}
                            isCompact={duration < 45}
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
      )}

      {/* 4. Event Create / Edit Dialog with TaskSelector & Interval Adjustment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E4E8F0] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
