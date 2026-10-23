"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  History,
  Trees,
  Plus,
  Sparkles,
  ArrowRight,
  ListTodo,
  ExternalLink,
  Bot,
} from "lucide-react";
import type {
  AcademicTask,
  CalendarTimeblock,
  Subject,
} from "@/types/database";
import type { PlannerHistorySummary } from "@/lib/actions/planner-actions";
import {
  getAcademicTasksAction,
  getCalendarTimeblocksAction,
  getPlannerHistoryAction,
} from "@/lib/actions/planner-actions";
import { TaskQuickAdd } from "./task-quick-add";
import { AcademicTodoList } from "./academic-todo-list";
import { AcademicCalendarView } from "./academic-calendar-view";
import { PlannerHistoryView } from "./planner-history-view";
import { AcademicGoalsCard } from "./academic-goals-card";
import { FocusTriggerButton } from "./focus-trigger-button";
import { useFocus } from "@/components/focus/focus-provider";
import { getLocalTodayDateString } from "@/lib/utils";
import Link from "next/link";

interface PlannerShellProps {
  initialTasks: AcademicTask[];
  initialTimeblocks: CalendarTimeblock[];
  initialHistory: PlannerHistorySummary;
  subjects: Subject[];
}

type PlannerSection = "today" | "calendar" | "todo" | "history";

export function PlannerShell({
  initialTasks,
  initialTimeblocks,
  initialHistory,
  subjects,
}: PlannerShellProps) {
  const [section, setSection] = useState<PlannerSection>("today");
  const [currentDate, setCurrentDate] = useState(() => getLocalTodayDateString());
  const [tasks, setTasks] = useState<AcademicTask[]>(initialTasks);
  const [timeblocks, setTimeblocks] = useState<CalendarTimeblock[]>(initialTimeblocks);
  const [history, setHistory] = useState<PlannerHistorySummary>(initialHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isFirstRender = useRef(true);

  const { isRunning, isPaused, timeLeft, setIsModalOpen } = useFocus();

  // High-performance client-side cache for timeblock ranges to preserve free-tier Supabase egress
  const calendarRangeCache = useRef<Map<string, CalendarTimeblock[]>>(new Map());

  // Optimized refresh handler with instant cache hit
  const handleRefresh = useCallback(async (forceHistory = false) => {
    setIsRefreshing(true);
    try {
      const now = new Date(currentDate + "T12:00:00");
      // Range: 14 days before to 21 days after current date
      const startRange = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const endRange = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const cacheKey = `${startRange}_${endRange}`;

      // Instant cache retrieval (0ms UI latency)
      if (!forceHistory && calendarRangeCache.current.has(cacheKey)) {
        setTimeblocks(calendarRangeCache.current.get(cacheKey)!);
      }

      const fetchHistory = forceHistory || section === "history";
      const promises: [Promise<any>, Promise<any>, Promise<any>?] = [
        getAcademicTasksAction(),
        getCalendarTimeblocksAction(startRange, endRange),
      ];
      if (fetchHistory) {
        promises.push(getPlannerHistoryAction(30));
      }

      const [tasksRes, blocksRes, historyRes] = await Promise.allSettled(promises);

      if (tasksRes.status === "fulfilled" && tasksRes.value.success) setTasks(tasksRes.value.data);
      if (blocksRes.status === "fulfilled" && blocksRes.value.success) {
        setTimeblocks(blocksRes.value.data);
        calendarRangeCache.current.set(cacheKey, blocksRes.value.data);
      }
      if (historyRes && historyRes.status === "fulfilled" && historyRes.value.success) setHistory(historyRes.value.data);
    } catch {
      // Safe resilience against transient failures
    } finally {
      setIsRefreshing(false);
    }
  }, [currentDate, section]);

  // When date changes, refresh timeblocks range
  const handleDateChange = (newDate: string) => {
    setCurrentDate(newDate);
  };

  // Stable ref for handleRefresh to prevent re-fetching on section tab clicks
  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  // Only refresh when currentDate changes after initial render (initial data comes from SSR)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    handleRefreshRef.current();
  }, [currentDate]);

  // Lazy-load history when switching to history tab if not loaded
  const handleSelectSection = (s: PlannerSection) => {
    setSection(s);
    if (s === "history") {
      handleRefresh(true);
    }
  };

  // Synchronize task toggles across shell sections without re-querying network
  const handleTasksChange = useCallback((updatedTasks: AcademicTask[]) => {
    setTasks((prev) => {
      const map = new Map(updatedTasks.map((t) => [t.id, t]));
      return prev.map((t) => map.get(t.id) || t);
    });
  }, []);

  // Instant task deletion eviction from parent shell state
  const handleTaskDelete = useCallback((deletedTaskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
  }, []);

  const todayStr = useMemo(() => getLocalTodayDateString(), []);
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.due_date === todayStr),
    [tasks, todayStr]
  );
  const todayBlocks = useMemo(
    () => timeblocks.filter((b) => b.block_date === todayStr),
    [timeblocks, todayStr]
  );

  return (
    <div className="space-y-6">
      {/* 1. Planner Top Banner & Section Selector */}
      <div className="bg-white/90 backdrop-blur-md border border-[#E4E8F0] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#2855D9] bg-[#EDF2FF] px-2 py-0.5 rounded-full font-mono">
                Espace Organisation & Travail
              </span>
              {(isRunning || isPaused) && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full hover:bg-[#059669]/20 transition-colors animate-pulse"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  <span>Session Bosquet en cours</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111A2E] mt-1">
              Planning & Tâches Académiques
            </h1>
            <p className="text-xs text-[#68748A] mt-0.5">
              Planifiez vos révisions, gérez vos rendus et suivez vos accomplissements IGL4.
            </p>
          </div>

          {/* Shortcuts: NotebookLM & Bosquet Focus */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <a
              href="https://notebooklm.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#111A2E] bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:text-[#2855D9] hover:bg-[#EDF2FF]/40 transition-all shadow-2xs group"
              title="Ouvrir Google NotebookLM (nouvel onglet, connexion via votre compte Google personnel)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Ouvrir NotebookLM</span>
              <ExternalLink className="w-3 h-3 text-[#68748A] group-hover:text-[#2855D9] transition-colors" />
            </a>

            <Link
              href="/coach"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/20 transition-colors shadow-2xs"
            >
              <Bot className="w-4 h-4 text-[#6366F1]" />
              <span>Coach IA & Tuteur</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            <Link
              href="/forest"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#059669] bg-[#059669]/10 hover:bg-[#059669]/20 border border-[#059669]/20 transition-colors shadow-2xs"
            >
              <Trees className="w-4 h-4" />
              <span>Bosquet Focus</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 mt-5 border-t border-[#E4E8F0] pt-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            id="planner-tab-today"
            onClick={() => handleSelectSection("today")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              section === "today"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Aujourd'hui</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                section === "today" ? "bg-white/20 text-white" : "bg-[#F4F6FA] text-[#68748A]"
              }`}
            >
              {todayTasks.filter((t) => !t.is_completed).length}
            </span>
          </button>

          <button
            type="button"
            id="planner-tab-calendar"
            onClick={() => handleSelectSection("calendar")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              section === "calendar"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendrier</span>
          </button>

          <button
            type="button"
            id="planner-tab-todo"
            onClick={() => handleSelectSection("todo")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              section === "todo"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tâches (To-Do)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                section === "todo" ? "bg-white/20 text-white" : "bg-[#F4F6FA] text-[#68748A]"
              }`}
            >
              {tasks.filter((t) => !t.is_completed).length}
            </span>
          </button>

          <button
            type="button"
            id="planner-tab-history"
            onClick={() => handleSelectSection("history")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              section === "history"
                ? "bg-[#2855D9] text-white shadow-xs"
                : "text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#111A2E]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique & Progrès</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                section === "history" ? "bg-white/20 text-white" : "bg-[#F4F6FA] text-[#68748A]"
              }`}
            >
              {history.totalTasksCompleted}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Based on Selected Section */}

      {/* SECTION: TODAY */}
      {section === "today" && (
        <div className="space-y-5">
          {/* Goals Dashboard (Daily / Weekly / Monthly) */}
          <AcademicGoalsCard subjects={subjects} currentDate={currentDate} />

          {/* Quick-Add Box */}
          <TaskQuickAdd
            subjects={subjects}
            defaultDate={todayStr}
            onTaskCreated={handleRefresh}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Tasks Column */}
            <div className="bg-white border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-2.5">
                <h2 className="text-sm font-semibold text-[#111A2E] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#2855D9]" />
                  <span>Tâches du jour ({todayTasks.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setSection("todo")}
                  className="text-xs text-[#2855D9] hover:underline flex items-center gap-1"
                >
                  <span>Voir toutes les tâches</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <AcademicTodoList
                tasks={todayTasks}
                subjects={subjects}
                onRefresh={handleRefresh}
                selectedDate={todayStr}
                onTasksChange={handleTasksChange}
                onTaskDelete={handleTaskDelete}
              />
            </div>

            {/* Today's Scheduled Blocks Column */}
            <div className="bg-white border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-2.5">
                <h2 className="text-sm font-semibold text-[#111A2E] flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#2855D9]" />
                  <span>Séances programmées aujourd'hui ({todayBlocks.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setSection("calendar")}
                  className="text-xs text-[#2855D9] hover:underline flex items-center gap-1"
                >
                  <span>Ouvrir l'agenda complet</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {todayBlocks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl space-y-2">
                  <Clock className="w-6 h-6 mx-auto opacity-40 text-[#68748A]" />
                  <p className="font-medium text-[#111A2E]">Aucun créneau réservé pour aujourd'hui</p>
                  <p>Ouvrez le calendrier pour bloquer une session de révision.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        block.is_completed
                          ? "bg-[#FAFAF7] border-[#E4E8F0] opacity-70"
                          : "bg-white border-[#E4E8F0] shadow-2xs"
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-[#111A2E]">{block.title}</h4>
                        <div className="text-[11px] text-[#68748A] font-tabular mt-0.5">
                          {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)} ({block.duration_minutes} min)
                        </div>
                      </div>
                      <FocusTriggerButton
                        title={block.title}
                        estimatedMinutes={block.duration_minutes}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: CALENDAR */}
      {section === "calendar" && (
        <AcademicCalendarView
          timeblocks={timeblocks}
          tasks={tasks}
          subjects={subjects}
          onRefresh={handleRefresh}
          currentDate={currentDate}
          onDateChange={handleDateChange}
        />
      )}

      {/* SECTION: TO-DO */}
      {section === "todo" && (
        <div className="space-y-4">
          <TaskQuickAdd
            subjects={subjects}
            defaultDate={todayStr}
            onTaskCreated={handleRefresh}
          />
          <div className="bg-white border border-[#E4E8F0] rounded-xl p-4 shadow-xs">
            <AcademicTodoList
              tasks={tasks}
              subjects={subjects}
              onRefresh={handleRefresh}
              onTasksChange={handleTasksChange}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        </div>
      )}

      {/* SECTION: HISTORY */}
      {section === "history" && (
        <PlannerHistoryView history={history} subjects={subjects} />
      )}
    </div>
  );
}
