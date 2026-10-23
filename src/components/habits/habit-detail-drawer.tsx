"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  Target,
  Edit2,
  Pause,
  Play,
  Archive,
  Trash2,
  ShieldCheck,
  Activity,
  Check,
} from "lucide-react";
import type {
  HabitWithTodayState,
  HabitAnalyticsSummary,
  HabitCheckin,
  AcademicGoal,
  HabitStatus,
} from "@/types/database";
import { HabitIcon } from "./habit-icon";
import {
  getHabitAnalyticsAction,
  recordCheckinAction,
  undoCheckinAction,
  updateHabitAction,
  archiveHabitAction,
  deleteHabitAction,
} from "@/lib/actions/habit-actions";
import {
  getLocalTodayDateString,
  addDaysToDateString,
  getDayCompletionStatus,
} from "@/lib/habits/habit-engine";

interface HabitDetailDrawerProps {
  habit: HabitWithTodayState | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (habit: HabitWithTodayState) => void;
  goals: AcademicGoal[];
  onRefresh: () => void;
}

export function HabitDetailDrawer({
  habit,
  isOpen,
  onClose,
  onEdit,
  goals,
  onRefresh,
}: HabitDetailDrawerProps) {
  const [analytics, setAnalytics] = useState<HabitAnalyticsSummary | null>(null);
  const [historyCheckins, setHistoryCheckins] = useState<Map<string, HabitCheckin>>(new Map());
  const [isUpdatingDate, setIsUpdatingDate] = useState<string | null>(null);

  const todayStr = getLocalTodayDateString();

  useEffect(() => {
    if (!habit || !isOpen) return;

    async function loadData() {
      const res = await getHabitAnalyticsAction(habit!.id, 30);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    }

    loadData();
  }, [habit, isOpen]);

  if (!isOpen || !habit) return null;

  const linkedGoal = goals.find((g) => g.id === habit.goal_id);

  // Generate 30 days list going back from today
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    last30Days.push(addDaysToDateString(todayStr, -i));
  }

  // Toggle checkin on a specific recent date
  const handleToggleDateCheckin = async (dateStr: string) => {
    setIsUpdatingDate(dateStr);
    try {
      // Toggle logic
      const isCurrentlyDone = habit.todayCheckin?.date === dateStr && habit.todayCheckin?.status === "completed";
      if (isCurrentlyDone) {
        await undoCheckinAction({ habitId: habit.id, date: dateStr });
      } else {
        await recordCheckinAction({
          habitId: habit.id,
          date: dateStr,
          value: habit.target_value,
          status: "completed",
        });
      }
      onRefresh();
      // Reload analytics
      const res = await getHabitAnalyticsAction(habit.id, 30);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } finally {
      setIsUpdatingDate(null);
    }
  };

  const handleTogglePause = async () => {
    const newStatus: HabitStatus = habit.status === "paused" ? "active" : "paused";
    await updateHabitAction(habit.id, { status: newStatus });
    onRefresh();
  };

  const handleArchive = async () => {
    if (confirm(`Confirmez-vous l'archivage de l'habitude "${habit.name}" ?`)) {
      await archiveHabitAction(habit.id);
      onRefresh();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${habit.name}" ?`)) {
      await deleteHabitAction(habit.id);
      onRefresh();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FFFFFF] border-l border-[#E4E8F0] w-full max-w-lg h-full overflow-y-auto flex flex-col shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-[#E4E8F0] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center shrink-0">
              <HabitIcon name={habit.icon} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#111A2E] truncate">
                  {habit.name}
                </h3>
                {habit.status === "paused" && (
                  <span className="text-[10px] bg-[#FEF3C7] text-[#D97706] font-semibold px-2 py-0.5 rounded">
                    En pause
                  </span>
                )}
                {habit.status === "archived" && (
                  <span className="text-[10px] bg-[#F4F6FA] text-[#68748A] font-semibold px-2 py-0.5 rounded">
                    Archivée
                  </span>
                )}
              </div>
              <p className="text-xs text-[#68748A] mt-0.5">
                {habit.description || "Aucune description fournie."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#68748A] hover:text-[#182235] rounded-lg hover:bg-[#F4F6FA] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Série actuelle</span>
                <Flame className="w-3.5 h-3.5 text-[#D97706] fill-current" />
              </div>
              <p className="text-xl font-bold text-[#182235] font-tabular">
                {habit.currentStreak} j
              </p>
              <p className="text-[10px] text-[#68748A]">
                Record : {analytics?.longestStreak || habit.currentStreak} j
              </p>
            </div>

            <div className="p-3.5 bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Taux 30 jours</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              </div>
              <p className="text-xl font-bold text-[#182235] font-tabular">
                {analytics?.completionRate || 0}%
              </p>
              <p className="text-[10px] text-[#68748A]">
                {analytics?.completedDays || 0} sessions validées
              </p>
            </div>
          </div>

          {/* Goal Alignment */}
          {linkedGoal && (
            <div className="p-3.5 bg-[#EDF2FF] border border-[#BFDBFE] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Target className="w-4 h-4 text-[#2855D9] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-semibold uppercase text-[#2855D9]">
                    Objectif Académique Lié
                  </span>
                  <p className="text-xs font-bold text-[#182235] truncate">
                    {linkedGoal.title}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-[#2855D9] shrink-0">
                {linkedGoal.period_type}
              </span>
            </div>
          )}

          {/* 30-Day Check-in History Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#111A2E] tracking-tight">
                Historique des 30 derniers jours
              </h4>
              <span className="text-[11px] text-[#68748A]">
                Cliquez pour corriger
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 p-3 bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl">
              {last30Days.map((dStr) => {
                const isToday = dStr === todayStr;
                const isUpdating = isUpdatingDate === dStr;
                return (
                  <button
                    key={dStr}
                    onClick={() => handleToggleDateCheckin(dStr)}
                    disabled={isUpdating}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center p-1 text-[10px] transition-all cursor-pointer border ${
                      isToday
                        ? "border-[#2855D9] bg-white text-[#2855D9] font-bold"
                        : "border-transparent bg-white text-[#68748A] hover:border-[#2855D9]"
                    }`}
                    title={dStr}
                  >
                    <span className="font-mono text-[9px]">{dStr.slice(8)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habit Configuration Specifications */}
          <div className="space-y-2 pt-2 border-t border-[#E4E8F0]">
            <h4 className="text-xs font-bold text-[#111A2E]">
              Paramètres & Planification
            </h4>
            <div className="divide-y divide-[#E4E8F0] text-xs">
              <div className="py-2 flex items-center justify-between text-[#68748A]">
                <span>Type de routine :</span>
                <span className="font-semibold text-[#182235]">
                  {habit.habit_type === "quantitative" ? "Quantitatif" : "Binaire"}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-[#68748A]">
                <span>Cible d'effort :</span>
                <span className="font-semibold text-[#182235]">
                  {habit.target_value} {habit.unit}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-[#68748A]">
                <span>Créneau privilégié :</span>
                <span className="font-semibold text-[#182235] capitalize">
                  {habit.preferred_time === "morning"
                    ? "Matin (avant 12h)"
                    : habit.preferred_time === "afternoon"
                    ? "Après-midi (12h - 18h)"
                    : habit.preferred_time === "evening"
                    ? "Soirée (après 18h)"
                    : "Toute la journée"}
                </span>
              </div>
              {habit.reminder_time && (
                <div className="py-2 flex items-center justify-between text-[#68748A]">
                  <span>Rappel programmé :</span>
                  <span className="font-semibold text-[#182235] font-mono">
                    {habit.reminder_time}
                  </span>
                </div>
              )}
              <div className="py-2 flex items-center justify-between text-[#68748A]">
                <span>Date de démarrage :</span>
                <span className="font-semibold text-[#182235] font-mono">
                  {habit.start_date}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#E4E8F0] bg-[#FAFAF7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(habit)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#182235] bg-white border border-[#E4E8F0] hover:bg-[#F4F6FA] rounded-lg cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
            <button
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#68748A] bg-white border border-[#E4E8F0] hover:bg-[#F4F6FA] rounded-lg cursor-pointer"
            >
              {habit.status === "paused" ? (
                <>
                  <Play className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Reprendre</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Pause</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#68748A] hover:text-[#182235] cursor-pointer"
              title="Archiver sans supprimer l'historique"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archiver</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg cursor-pointer"
              title="Supprimer définitivement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
