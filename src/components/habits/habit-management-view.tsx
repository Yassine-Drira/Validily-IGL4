"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Flame,
  Clock,
  Target,
  MoreVertical,
  Play,
  Pause,
  Archive,
  Trash2,
  Edit2,
  CheckCircle2,
  Eye,
} from "lucide-react";
import type {
  HabitWithTodayState,
  HabitStatus,
  HabitCategory,
  AcademicGoal,
} from "@/types/database";
import { HabitIcon } from "./habit-icon";
import {
  updateHabitAction,
  archiveHabitAction,
  deleteHabitAction,
} from "@/lib/actions/habit-actions";

interface HabitManagementViewProps {
  habits: HabitWithTodayState[];
  goals: AcademicGoal[];
  onOpenCreateModal: () => void;
  onEditHabit: (habit: HabitWithTodayState) => void;
  onSelectHabit: (habit: HabitWithTodayState) => void;
  onRefresh: () => void;
}

const CATEGORY_FILTERS: Array<{ id: HabitCategory | "all"; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "study", label: "Études" },
  { id: "health", label: "Santé" },
  { id: "mindfulness", label: "Pleine conscience" },
  { id: "productivity", label: "Productivité" },
  { id: "routine", label: "Routine" },
];

export function HabitManagementView({
  habits,
  goals,
  onOpenCreateModal,
  onEditHabit,
  onSelectHabit,
  onRefresh,
}: HabitManagementViewProps) {
  const [statusFilter, setStatusFilter] = useState<HabitStatus | "all">("active");
  const [categoryFilter, setCategoryFilter] = useState<HabitCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuHabitId, setActiveMenuHabitId] = useState<string | null>(null);

  // Filtered habits
  const filteredHabits = habits.filter((h) => {
    if (statusFilter !== "all" && h.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== "all" && h.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = h.name.toLowerCase().includes(q);
      const matchDesc = h.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const handleTogglePause = async (habit: HabitWithTodayState) => {
    const newStatus: HabitStatus = habit.status === "paused" ? "active" : "paused";
    await updateHabitAction(habit.id, { status: newStatus });
    setActiveMenuHabitId(null);
    onRefresh();
  };

  const handleArchive = async (habit: HabitWithTodayState) => {
    if (confirm(`Confirmez-vous l'archivage de l'habitude "${habit.name}" ? L'historique et les statistiques passées seront intégralement conservés.`)) {
      await archiveHabitAction(habit.id);
      setActiveMenuHabitId(null);
      onRefresh();
    }
  };

  const handleDelete = async (habit: HabitWithTodayState) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'habitude "${habit.name}" ?`)) {
      await deleteHabitAction(habit.id);
      setActiveMenuHabitId(null);
      onRefresh();
    }
  };

  const getFrequencyText = (habit: HabitWithTodayState) => {
    if (habit.frequency_type === "daily") return "Tous les jours";
    if (habit.frequency_type === "weekly_count") {
      return `${habit.target_days_per_week || 3}x par semaine`;
    }
    if (habit.frequency_type === "specific_days") {
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      return habit.scheduled_days.map((d) => days[d]).join(", ");
    }
    return "Quotidien";
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une habitude..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg text-[#182235] placeholder:text-[#68748A] focus:outline-none focus:border-[#2855D9]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-lg border border-[#E4E8F0] text-xs font-semibold">
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === "active"
                ? "bg-white text-[#2855D9] shadow-xs"
                : "text-[#68748A] hover:text-[#182235]"
            }`}
          >
            Actives ({habits.filter((h) => h.status === "active").length})
          </button>
          <button
            onClick={() => setStatusFilter("paused")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === "paused"
                ? "bg-white text-[#2855D9] shadow-xs"
                : "text-[#68748A] hover:text-[#182235]"
            }`}
          >
            En pause ({habits.filter((h) => h.status === "paused").length})
          </button>
          <button
            onClick={() => setStatusFilter("archived")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === "archived"
                ? "bg-white text-[#2855D9] shadow-xs"
                : "text-[#68748A] hover:text-[#182235]"
            }`}
          >
            Archivées ({habits.filter((h) => h.status === "archived").length})
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-[#2855D9] shadow-xs"
                : "text-[#68748A] hover:text-[#182235]"
            }`}
          >
            Toutes ({habits.length})
          </button>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors shrink-0 cursor-pointer ${
              categoryFilter === cat.id
                ? "bg-[#2855D9] text-white"
                : "bg-white border border-[#E4E8F0] text-[#68748A] hover:border-[#2855D9]/40 hover:text-[#182235]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Habit Cards Grid */}
      {filteredHabits.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-12 text-center space-y-3 shadow-xs">
          <p className="text-sm font-semibold text-[#111A2E]">
            Aucune habitude ne correspond à vos filtres.
          </p>
          <p className="text-xs text-[#68748A]">
            Modifiez votre recherche ou réinitialisez les filtres pour afficher vos routines.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
            className="text-xs text-[#2855D9] font-semibold hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHabits.map((habit) => {
            const linkedGoal = goals.find((g) => g.id === habit.goal_id);
            const isMenuOpen = activeMenuHabitId === habit.id;

            return (
              <div
                key={habit.id}
                className="group relative bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs hover:border-[#2855D9]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Icon, Title & Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center shrink-0">
                        <HabitIcon name={habit.icon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#111A2E] truncate tracking-tight">
                          {habit.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-[#68748A] uppercase">
                            {habit.category}
                          </span>
                          {habit.status === "paused" && (
                            <span className="text-[10px] bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.2 rounded font-semibold">
                              En pause
                            </span>
                          )}
                          {habit.status === "archived" && (
                            <span className="text-[10px] bg-[#F4F6FA] text-[#68748A] px-1.5 py-0.2 rounded font-semibold">
                              Archivée
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Context Menu Button */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() =>
                          setActiveMenuHabitId(isMenuOpen ? null : habit.id)
                        }
                        className="p-1 text-[#68748A] hover:text-[#182235] rounded hover:bg-[#F4F6FA] cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E4E8F0] rounded-lg shadow-md z-20 py-1 text-xs">
                          <button
                            onClick={() => {
                              setActiveMenuHabitId(null);
                              onSelectHabit(habit);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[#182235] hover:bg-[#F4F6FA] flex items-center gap-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#2855D9]" />
                            <span>Voir détails & stats</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuHabitId(null);
                              onEditHabit(habit);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[#182235] hover:bg-[#F4F6FA] flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#68748A]" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => handleTogglePause(habit)}
                            className="w-full px-3 py-1.5 text-left text-[#182235] hover:bg-[#F4F6FA] flex items-center gap-2 cursor-pointer"
                          >
                            {habit.status === "paused" ? (
                              <>
                                <Play className="w-3.5 h-3.5 text-[#059669]" />
                                <span>Reprendre</span>
                              </>
                            ) : (
                              <>
                                <Pause className="w-3.5 h-3.5 text-[#D97706]" />
                                <span>Mettre en pause</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleArchive(habit)}
                            className="w-full px-3 py-1.5 text-left text-[#182235] hover:bg-[#F4F6FA] flex items-center gap-2 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5 text-[#68748A]" />
                            <span>Archiver</span>
                          </button>
                          <div className="my-1 border-t border-[#E4E8F0]" />
                          <button
                            onClick={() => handleDelete(habit)}
                            className="w-full px-3 py-1.5 text-left text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {habit.description && (
                    <p className="text-xs text-[#68748A] line-clamp-2 mt-2">
                      {habit.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 pt-3 border-t border-[#E4E8F0]/70 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#68748A]">
                      <span>Fréquence :</span>
                      <span className="font-semibold text-[#182235]">
                        {getFrequencyText(habit)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#68748A]">
                      <span>Cible :</span>
                      <span className="font-semibold text-[#182235] font-tabular">
                        {habit.target_value} {habit.unit}
                      </span>
                    </div>

                    {linkedGoal && (
                      <div className="flex items-center justify-between text-[#68748A]">
                        <span>Objectif :</span>
                        <span className="font-semibold text-[#2855D9] truncate max-w-[150px]">
                          {linkedGoal.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="mt-4 pt-3 border-t border-[#E4E8F0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-mono font-bold text-[#D97706]">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>Série : {habit.currentStreak} j</span>
                  </div>

                  <button
                    onClick={() => onSelectHabit(habit)}
                    className="text-xs font-semibold text-[#2855D9] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Détails</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
