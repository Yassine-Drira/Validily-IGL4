"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Trees,
  Flame,
  Award,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import type { AcademicTask, CalendarTimeblock, Subject } from "@/types/database";
import type { PlannerHistorySummary } from "@/lib/actions/planner-actions";
import { SubjectIcon } from "@/components/academic/subject-icon";
import Link from "next/link";

interface PlannerHistoryViewProps {
  history: PlannerHistorySummary;
  subjects: Subject[];
}

export function PlannerHistoryView({ history, subjects }: PlannerHistoryViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "tasks" | "sessions">("all");

  const {
    completedTasks,
    completedBlocks,
    totalTasksCompleted,
    totalEstimatedMinutesCompleted,
    totalActualMinutesCompleted,
    totalFocusMinutesToday,
    dailyFocusHistory,
    forestStats,
  } = history;

  // Aggregate completed tasks per subject
  const subjectAggregates = React.useMemo(() => {
    const map = new Map<string, { subject: Subject; count: number; minutes: number }>();

    for (const task of completedTasks) {
      if (task.subject_id) {
        const sub = subjects.find((s) => s.id === task.subject_id);
        if (sub) {
          const prev = map.get(sub.id) || { subject: sub, count: 0, minutes: 0 };
          prev.count += 1;
          prev.minutes += task.estimated_minutes || 0;
          map.set(sub.id, prev);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [completedTasks, subjects]);

  return (
    <div className="space-y-5">
      {/* 1. Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Tasks Done */}
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#68748A] mb-1">
            <span className="text-xs font-medium">Tâches validées</span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#111A2E] font-tabular">
            {totalTasksCompleted}
          </div>
          <div className="text-[11px] text-[#68748A] font-tabular mt-0.5">
            {totalEstimatedMinutesCompleted} min estimées
          </div>
        </div>

        {/* Study Time Today */}
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#68748A] mb-1">
            <span className="text-xs font-medium">Focus aujourd'hui</span>
            <Clock className="w-4 h-4 text-[#2855D9]" />
          </div>
          <div className="text-2xl font-bold text-[#111A2E] font-tabular">
            {totalFocusMinutesToday} <span className="text-xs font-normal text-[#68748A]">min</span>
          </div>
          <div className="text-[11px] text-[#2855D9] font-medium mt-0.5 flex items-center gap-1">
            <span>Enregistré en base</span>
          </div>
        </div>

        {/* Forest Trees Planted */}
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#68748A] mb-1">
            <span className="text-xs font-medium">Arbres Bosquet</span>
            <Trees className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#059669] font-tabular">
            {forestStats?.healthyTrees ?? 0}
          </div>
          <div className="text-[11px] text-[#68748A] mt-0.5">
            <Link href="/forest" className="hover:text-[#059669] hover:underline flex items-center gap-0.5">
              <span>Voir le bosquet</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Current Study Streak */}
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#68748A] mb-1">
            <span className="text-xs font-medium">Série active</span>
            <Flame className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#D97706] font-tabular">
            {forestStats?.currentStreak ?? 0} <span className="text-xs font-normal text-[#68748A]">jours</span>
          </div>
          <div className="text-[11px] text-[#68748A] font-tabular mt-0.5">
            {forestStats?.totalFocusedMinutes ?? 0} min totales
          </div>
        </div>
      </div>

      {/* 2. Subject Breakdown */}
      {subjectAggregates.length > 0 && (
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-4 shadow-2xs space-y-3">
          <h3 className="text-xs font-semibold text-[#111A2E] uppercase tracking-wider font-mono">
            Répartition par matière (Tâches validées)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {subjectAggregates.map(({ subject, count, minutes }) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#F4F6FA] border border-[#E4E8F0]"
              >
                <div className="flex items-center gap-2">
                  <SubjectIcon name={subject.name} slug={subject.slug} className="w-4 h-4" />
                  <span className="text-xs font-medium text-[#111A2E]">{subject.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#2855D9] font-tabular">{count}</span>
                  <span className="text-[10px] text-[#68748A] block font-tabular">{minutes} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Accomplishment Timeline */}
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
          <h3 className="text-sm font-semibold text-[#111A2E]">
            Historique détaillé des accomplissements
          </h3>
          <div className="flex items-center gap-1 bg-[#F4F6FA] p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === "all" ? "bg-white text-[#111A2E] font-medium shadow-2xs" : "text-[#68748A]"
              }`}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === "tasks" ? "bg-white text-[#111A2E] font-medium shadow-2xs" : "text-[#68748A]"
              }`}
            >
              Tâches ({completedTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === "sessions" ? "bg-white text-[#111A2E] font-medium shadow-2xs" : "text-[#68748A]"
              }`}
            >
              Séances ({completedBlocks.length})
            </button>
          </div>
        </div>

        {/* Content list */}
        {completedTasks.length === 0 && completedBlocks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#68748A]">
            Aucun accomplissement archivé pour le moment. Terminez une tâche ou une séance de révision pour remplir votre historique !
          </div>
        ) : (
          <div className="space-y-2">
            {(activeTab === "all" || activeTab === "tasks") &&
              completedTasks.map((task) => {
                const sub = subjects.find((s) => s.id === task.subject_id) || task.subject;
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7]"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-[#111A2E] line-through">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#68748A] font-tabular">
                          <span>Échéance: {task.due_date}</span>
                          {task.completed_at && (
                            <span>• Validée le {new Date(task.completed_at).toLocaleDateString("fr-FR")}</span>
                          )}
                          {sub && (
                            <span className="inline-flex items-center gap-1 text-[#2855D9]">
                              <SubjectIcon name={sub.name} slug={sub.slug} className="w-2.5 h-2.5" />
                              <span>{sub.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-tabular text-[#68748A]">
                      {task.estimated_minutes} min
                    </span>
                  </div>
                );
              })}

            {(activeTab === "all" || activeTab === "sessions") &&
              completedBlocks.map((block) => {
                const sub = subjects.find((s) => s.id === block.subject_id) || block.subject;
                return (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#2855D9] shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-[#111A2E]">
                          {block.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#68748A] font-tabular">
                          <span>{block.block_date}</span>
                          <span>•</span>
                          <span>{block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}</span>
                          {sub && (
                            <span className="inline-flex items-center gap-1 text-[#2855D9]">
                              <SubjectIcon name={sub.name} slug={sub.slug} className="w-2.5 h-2.5" />
                              <span>{sub.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-tabular text-[#2855D9] font-medium">
                      {block.duration_minutes} min
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
