"use client";

import React, { useState, useCallback } from "react";
import {
  CheckCircle2,
  Flame,
  TrendingUp,
  Plus,
  RefreshCw,
  Sparkles,
  Calendar,
} from "lucide-react";
import type { HabitWithTodayState, AcademicGoal } from "@/types/database";
import { TodayHabitsView } from "./today-habits-view";
import { HabitManagementView } from "./habit-management-view";
import { HabitInsightsView } from "./habit-insights-view";
import { HabitFormModal } from "./habit-form-modal";
import { HabitDetailDrawer } from "./habit-detail-drawer";
import { getHabitsAction } from "@/lib/actions/habit-actions";

interface HabitsShellProps {
  initialHabits: HabitWithTodayState[];
  initialGoals: AcademicGoal[];
  currentDateStr: string;
}

type HabitsTab = "today" | "habits" | "insights";

export function HabitsShell({
  initialHabits,
  initialGoals,
  currentDateStr,
}: HabitsShellProps) {
  const [currentTab, setCurrentTab] = useState<HabitsTab>("today");
  const [habits, setHabits] = useState<HabitWithTodayState[]>(initialHabits);
  const [goals] = useState<AcademicGoal[]>(initialGoals);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep state synchronized with server component revalidation
  React.useEffect(() => {
    setHabits(initialHabits);
  }, [initialHabits]);

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithTodayState | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] = useState<HabitWithTodayState | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getHabitsAction({ status: "all", targetDate: currentDateStr });
      if (res.success && res.data) {
        setHabits(res.data);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [currentDateStr]);

  const handleOpenCreateModal = () => {
    setEditingHabit(null);
    setIsModalOpen(true);
  };

  const handleEditHabit = (habit: HabitWithTodayState) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleSelectHabit = (habit: HabitWithTodayState) => {
    setSelectedDetailHabit(habit);
  };

  return (
    <div className="space-y-6">
      {/* 1. Master Page Header */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#68748A]">
            <Flame className="w-3.5 h-3.5 text-[#D97706] fill-current" />
            <span>Discipline & Constance Académique</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111A2E] tracking-tight mt-1">
            Habitudes & Routine
          </h1>
          <p className="text-xs text-[#68748A] mt-1 max-w-xl">
            Construisez des automatismes de travail durables, comprenez vos baisses de régime et alignez vos micro-actions sur vos objectifs d'ingénierie.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-[#68748A] hover:text-[#182235] bg-[#F4F6FA] hover:bg-[#E4E8F0] rounded-lg transition-colors cursor-pointer"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E40AF] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer une routine</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0] text-xs font-semibold w-fit">
        <button
          onClick={() => setCurrentTab("today")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
            currentTab === "today"
              ? "bg-white text-[#2855D9] shadow-xs"
              : "text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Aujourd'hui</span>
        </button>
        <button
          onClick={() => setCurrentTab("habits")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
            currentTab === "habits"
              ? "bg-white text-[#2855D9] shadow-xs"
              : "text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Toutes les Habitudes</span>
        </button>
        <button
          onClick={() => setCurrentTab("insights")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
            currentTab === "insights"
              ? "bg-white text-[#2855D9] shadow-xs"
              : "text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytique & Insights</span>
        </button>
      </div>

      {/* 3. Main Views */}
      {currentTab === "today" && (
        <TodayHabitsView
          initialHabits={habits}
          currentDateStr={currentDateStr}
          goals={goals}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectHabit={handleSelectHabit}
          onRefresh={handleRefresh}
        />
      )}

      {currentTab === "habits" && (
        <HabitManagementView
          habits={habits}
          goals={goals}
          onOpenCreateModal={handleOpenCreateModal}
          onEditHabit={handleEditHabit}
          onSelectHabit={handleSelectHabit}
          onRefresh={handleRefresh}
        />
      )}

      {currentTab === "insights" && (
        <HabitInsightsView
          habits={habits}
          goals={goals}
          onRefresh={handleRefresh}
        />
      )}

      {/* 4. Modals and Drawers */}
      <HabitFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        initialHabit={editingHabit}
        goals={goals}
      />

      <HabitDetailDrawer
        habit={selectedDetailHabit}
        isOpen={Boolean(selectedDetailHabit)}
        onClose={() => setSelectedDetailHabit(null)}
        onEdit={(h) => {
          setSelectedDetailHabit(null);
          handleEditHabit(h);
        }}
        goals={goals}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
