"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Clock,
  Target,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Info,
  Calendar,
  Check,
  Undo2,
} from "lucide-react";
import type { HabitWithTodayState, AcademicGoal, HabitPreferredTime } from "@/types/database";
import { HabitIcon } from "./habit-icon";
import { recordCheckinAction, undoCheckinAction } from "@/lib/actions/habit-actions";

interface TodayHabitsViewProps {
  initialHabits: HabitWithTodayState[];
  currentDateStr: string;
  goals: AcademicGoal[];
  onOpenCreateModal: () => void;
  onSelectHabit: (habit: HabitWithTodayState) => void;
  onRefresh: () => void;
}

const TIME_OF_DAY_GROUPS: Array<{
  id: HabitPreferredTime;
  label: string;
  sublabel: string;
}> = [
  { id: "morning", label: "Matin", sublabel: "Avant 12:00" },
  { id: "afternoon", label: "Après-midi", sublabel: "12:00 — 18:00" },
  { id: "evening", label: "Soirée", sublabel: "Après 18:00" },
  { id: "anytime", label: "Toute la journée", sublabel: "Sans contrainte d'horaire" },
];

export function TodayHabitsView({
  initialHabits,
  currentDateStr,
  goals,
  onOpenCreateModal,
  onSelectHabit,
  onRefresh,
}: TodayHabitsViewProps) {
  const [habits, setHabits] = useState<HabitWithTodayState[]>(initialHabits);
  const [isPending, startTransition] = useTransition();
  const [editingQuantHabitId, setEditingQuantHabitId] = useState<string | null>(null);
  const [quantInputValue, setQuantInputValue] = useState<string>("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setHabits(initialHabits);
  }, [initialHabits]);

  // Calculations for Today's Execution
  const scheduledTodayHabits = habits.filter(
    (h) => h.status === "active" && h.todayStatus !== "not_scheduled"
  );
  const completedTodayCount = scheduledTodayHabits.filter(
    (h) => h.todayStatus === "completed"
  ).length;
  const remainingTodayCount = scheduledTodayHabits.length - completedTodayCount;
  const completionPercentage =
    scheduledTodayHabits.length > 0
      ? Math.round((completedTodayCount / scheduledTodayHabits.length) * 100)
      : 0;

  // Format date in French
  const formattedDate = React.useMemo(() => {
    try {
      const [year, month, day] = currentDateStr.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return currentDateStr;
    }
  }, [currentDateStr]);

  // 1-Click Binary Toggle / Checkin Handler (Optimistic with Rollback)
  const handleToggleCheckin = (habit: HabitWithTodayState) => {
    const isCompleted = habit.todayStatus === "completed";
    const previousHabits = [...habits];

    // Optimistic Update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const newStatus = isCompleted ? "pending" : "completed";
        const newStreak = isCompleted
          ? Math.max(0, h.currentStreak - 1)
          : h.currentStreak + 1;
        return {
          ...h,
          todayStatus: newStatus,
          currentStreak: newStreak,
          todayCheckin: isCompleted
            ? null
            : {
                id: `${h.id}_${currentDateStr}`,
                habit_id: h.id,
                user_id: h.user_id,
                date: currentDateStr,
                value: h.target_value,
                status: "completed",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
        };
      })
    );

    if (!isCompleted) {
      setAnimatingId(habit.id);
      setTimeout(() => setAnimatingId(null), 800);
    }

    startTransition(async () => {
      try {
        if (isCompleted) {
          const res = await undoCheckinAction({
            habitId: habit.id,
            date: currentDateStr,
          });
          if (!res.success) {
            setHabits(previousHabits);
          }
        } else {
          const res = await recordCheckinAction({
            habitId: habit.id,
            date: currentDateStr,
            value: habit.target_value,
            status: "completed",
          });
          if (!res.success) {
            setHabits(previousHabits);
          }
        }
        onRefresh();
      } catch {
        setHabits(previousHabits);
      }
    });
  };

  // Quick-Add Increment for Quantitative Habits
  const handleIncrementQuant = (habit: HabitWithTodayState, increment: number) => {
    const currentValue = habit.todayCheckin?.value || 0;
    const newValue = Math.max(0, currentValue + increment);
    const previousHabits = [...habits];

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const isDone = newValue >= h.target_value;
        return {
          ...h,
          todayStatus: isDone ? "completed" : newValue > 0 ? "partial" : "pending",
          todayCheckin: {
            id: `${h.id}_${currentDateStr}`,
            habit_id: h.id,
            user_id: h.user_id,
            date: currentDateStr,
            value: newValue,
            status: isDone ? "completed" : "partial",
            created_at: h.todayCheckin?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      })
    );

    startTransition(async () => {
      try {
        const res = await recordCheckinAction({
          habitId: habit.id,
          date: currentDateStr,
          value: newValue,
        });
        if (!res.success) {
          setHabits(previousHabits);
        }
        onRefresh();
      } catch {
        setHabits(previousHabits);
      }
    });
  };

  // Custom Direct Entry Submission
  const handleSaveCustomQuant = (habit: HabitWithTodayState) => {
    const val = parseFloat(quantInputValue);
    if (isNaN(val) || val < 0) {
      setEditingQuantHabitId(null);
      return;
    }
    const previousHabits = [...habits];
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const isDone = val >= h.target_value;
        return {
          ...h,
          todayStatus: isDone ? "completed" : val > 0 ? "partial" : "pending",
          todayCheckin: {
            id: `${h.id}_${currentDateStr}`,
            habit_id: h.id,
            user_id: h.user_id,
            date: currentDateStr,
            value: val,
            status: isDone ? "completed" : "partial",
            created_at: h.todayCheckin?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      })
    );
    setEditingQuantHabitId(null);
    setQuantInputValue("");

    startTransition(async () => {
      try {
        const res = await recordCheckinAction({
          habitId: habit.id,
          date: currentDateStr,
          value: val,
        });
        if (!res.success) {
          setHabits(previousHabits);
        }
        onRefresh();
      } catch {
        setHabits(previousHabits);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Daily Summary */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#68748A]">
              <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <h2 className="text-xl font-bold text-[#111A2E] tracking-tight mt-1">
              Exécution du Jour
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Validez vos routines clés d'un clic pour ancrer une constance sans friction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E40AF] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Habitude</span>
            </button>
          </div>
        </div>

        {/* Daily Progress Gauge */}
        <div className="mt-5 pt-4 border-t border-[#E4E8F0] grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#182235]">
                Progression : {completedTodayCount} sur {scheduledTodayHabits.length} complétée(s)
              </span>
              <span className="text-[#2855D9] font-mono font-bold">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#EDF2FF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2855D9] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-end gap-3 text-xs">
            <div className="px-3 py-1.5 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg">
              <span className="text-[#68748A]">Restantes : </span>
              <span className="font-bold text-[#182235] font-tabular">
                {remainingTodayCount}
              </span>
            </div>
            {completedTodayCount > 0 && (
              <div className="px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-[#059669] font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{completedTodayCount} validée(s)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Scheduled Habits Grouped by Time of Day */}
      {scheduledTodayHabits.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-[#EDF2FF] text-[#2855D9] rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#111A2E]">
            Aucune habitude programmée pour aujourd'hui
          </h3>
          <p className="text-xs text-[#68748A] max-w-md mx-auto">
            Construisez une dynamique quotidienne en créant votre première routine ou en adoptant un modèle académique éprouvé.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Explorer les modèles recommandés</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {TIME_OF_DAY_GROUPS.map((group) => {
            const groupHabits = scheduledTodayHabits.filter(
              (h) => h.preferred_time === group.id
            );
            if (groupHabits.length === 0) return null;

            return (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111A2E] tracking-tight">
                      {group.label}
                    </h3>
                    <span className="text-[11px] text-[#68748A] font-mono">
                      • {group.sublabel}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#68748A]">
                    {groupHabits.filter((h) => h.todayStatus === "completed").length} /{" "}
                    {groupHabits.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupHabits.map((habit) => {
                    const isCompleted = habit.todayStatus === "completed";
                    const isPartial = habit.todayStatus === "partial";
                    const linkedGoal = goals.find((g) => g.id === habit.goal_id);
                    const quantCurrent = habit.todayCheckin?.value || 0;
                    const quantProgressPct =
                      habit.habit_type === "quantitative" && habit.target_value > 0
                        ? Math.min(100, Math.round((quantCurrent / habit.target_value) * 100))
                        : 0;

                    return (
                      <div
                        key={habit.id}
                        className={`group relative bg-[#FFFFFF] border rounded-xl p-4 transition-all duration-200 shadow-xs hover:border-[#2855D9]/40 ${
                          isCompleted
                            ? "border-[#A7F3D0] bg-[#FAFAF7]"
                            : "border-[#E4E8F0]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Icon & Info */}
                          <div
                            className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                            onClick={() => onSelectHabit(habit)}
                          >
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isCompleted
                                  ? "bg-[#059669] text-white"
                                  : "bg-[#EDF2FF] text-[#2855D9]"
                              }`}
                            >
                              <HabitIcon name={habit.icon} className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-sm font-bold truncate tracking-tight ${
                                    isCompleted
                                      ? "line-through text-[#68748A]"
                                      : "text-[#111A2E]"
                                  }`}
                                >
                                  {habit.name}
                                </h4>
                                {habit.currentStreak > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] font-mono shrink-0">
                                    <Flame className="w-2.5 h-2.5 fill-current" />
                                    <span>{habit.currentStreak}j</span>
                                  </span>
                                )}
                              </div>

                              {habit.description && (
                                <p className="text-xs text-[#68748A] truncate mt-0.5">
                                  {habit.description}
                                </p>
                              )}

                              {/* Badges: Goal link & frequency */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {linkedGoal && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2855D9] bg-[#EDF2FF] px-2 py-0.5 rounded">
                                    <Target className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[140px]">
                                      {linkedGoal.title}
                                    </span>
                                  </span>
                                )}
                                <span className="text-[10px] text-[#68748A] bg-[#F4F6FA] px-2 py-0.5 rounded font-mono">
                                  {habit.habit_type === "quantitative"
                                    ? `Cible : ${habit.target_value} ${habit.unit}`
                                    : "Binaire"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Tactile Check-In Control */}
                          <div className="shrink-0 flex items-center gap-2">
                            {habit.habit_type === "binary" ? (
                              <button
                                onClick={() => handleToggleCheckin(habit)}
                                disabled={isPending}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  isCompleted
                                    ? "bg-[#059669] text-white hover:bg-[#047857]"
                                    : "border-2 border-[#D8DFEB] text-transparent hover:border-[#2855D9] hover:bg-[#EDF2FF]"
                                } ${animatingId === habit.id ? "scale-110" : "scale-100"}`}
                                title={isCompleted ? "Annuler validation" : "Valider pour aujourd'hui"}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            ) : (
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  onClick={() => handleToggleCheckin(habit)}
                                  disabled={isPending}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    isCompleted
                                      ? "bg-[#059669] text-white"
                                      : isPartial
                                      ? "bg-[#EDF2FF] border border-[#2855D9] text-[#2855D9]"
                                      : "border-2 border-[#D8DFEB] text-transparent hover:border-[#2855D9]"
                                  }`}
                                  title={isCompleted ? "Complété !" : "Marquer comme fait"}
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantitative Progress Stepper & Manual Entry */}
                        {habit.habit_type === "quantitative" && (
                          <div className="mt-3 pt-3 border-t border-[#E4E8F0]/70 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#68748A]">
                                Effectué :{" "}
                                <strong className="text-[#182235] font-tabular">
                                  {quantCurrent}
                                </strong>{" "}
                                / {habit.target_value} {habit.unit}
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-[#2855D9]">
                                {quantProgressPct}%
                              </span>
                            </div>

                            <div className="w-full h-1.5 bg-[#EDF2FF] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCompleted ? "bg-[#059669]" : "bg-[#2855D9]"
                                }`}
                                style={{ width: `${quantProgressPct}%` }}
                              />
                            </div>

                            {/* Stepper Quick-Add & Manual Input */}
                            <div className="flex items-center justify-between gap-2 mt-1">
                              {editingQuantHabitId === habit.id ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantInputValue}
                                    onChange={(e) => setQuantInputValue(e.target.value)}
                                    placeholder={String(quantCurrent)}
                                    className="w-20 px-2 py-1 text-xs border border-[#2855D9] rounded bg-white text-[#182235] font-tabular focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveCustomQuant(habit)}
                                    className="px-2.5 py-1 text-xs font-semibold bg-[#2855D9] text-white rounded hover:bg-[#1E40AF] cursor-pointer"
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={() => setEditingQuantHabitId(null)}
                                    className="px-2 py-1 text-xs text-[#68748A] hover:text-[#182235] cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        handleIncrementQuant(
                                          habit,
                                          habit.target_value >= 30 ? 15 : habit.target_value >= 10 ? 5 : 1
                                        )
                                      }
                                      className="px-2 py-0.5 text-[11px] font-semibold text-[#2855D9] bg-[#EDF2FF] hover:bg-[#DDE7FF] rounded transition-colors cursor-pointer font-mono"
                                      title="Ajouter un palier"
                                    >
                                      +{habit.target_value >= 30 ? 15 : habit.target_value >= 10 ? 5 : 1}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleIncrementQuant(
                                          habit,
                                          habit.target_value >= 60 ? 30 : habit.target_value >= 20 ? 10 : 2
                                        )
                                      }
                                      className="px-2 py-0.5 text-[11px] font-semibold text-[#2855D9] bg-[#EDF2FF] hover:bg-[#DDE7FF] rounded transition-colors cursor-pointer font-mono"
                                    >
                                      +{habit.target_value >= 60 ? 30 : habit.target_value >= 20 ? 10 : 2}
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setEditingQuantHabitId(habit.id);
                                      setQuantInputValue(String(quantCurrent));
                                    }}
                                    className="text-[11px] font-medium text-[#68748A] hover:text-[#2855D9] transition-colors cursor-pointer underline"
                                  >
                                    Saisie manuelle
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
