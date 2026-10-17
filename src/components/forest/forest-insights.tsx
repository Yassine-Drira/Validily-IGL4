"use client";

import React, { useMemo } from "react";
import { ForestEntry, TreeSpecies } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "./tree-models";
import { Trees, Clock, Award, Flame, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestInsightsProps {
  entries: ForestEntry[];
  totalFocusedMinutes?: number;
  currentStreak?: number;
  isLoading?: boolean;
  className?: string;
}

export function ForestInsights({
  entries = [],
  totalFocusedMinutes,
  currentStreak,
  isLoading = false,
  className = "",
}: ForestInsightsProps) {
  const stats = useMemo(() => {
    const healthy = entries.filter((e) => e.tree_status === "healthy");
    const leafless = entries.filter((e) => e.tree_status === "leafless");
    const totalCount = entries.length;

    const successRate = totalCount > 0 ? Math.round((healthy.length / totalCount) * 100) : 100;

    let totalSeconds = 0;
    const speciesTally: Record<string, number> = {};

    healthy.forEach((e) => {
      const dur = e.session?.actual_duration_seconds || e.session?.target_duration_seconds || 1500;
      totalSeconds += dur;

      speciesTally[e.tree_species] = (speciesTally[e.tree_species] || 0) + 1;
    });

    const effectiveTotalMinutes = Math.max(
      Math.floor(totalSeconds / 60),
      totalFocusedMinutes || 0
    );
    const hours = Math.floor(effectiveTotalMinutes / 60);
    const minutes = effectiveTotalMinutes % 60;

    // Most planted species
    let topSpecies = "cedar";
    let topCount = 0;
    Object.entries(speciesTally).forEach(([sp, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topSpecies = sp;
      }
    });

    // Calculate daily streak of healthy trees if not supplied from server
    let streak = currentStreak !== undefined ? currentStreak : 0;
    if (currentStreak === undefined) {
      const daysSet = new Set(
        healthy
          .map((e) => {
            const raw = e.earned_at || e.created_at;
            if (!raw) return null;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
          })
          .filter(Boolean) as string[]
      );
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split("T")[0];
        if (daysSet.has(dateKey)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
    }

    return {
      healthyCount: healthy.length,
      leaflessCount: leafless.length,
      successRate,
      hours,
      minutes,
      topSpecies,
      topCount,
      streak,
    };
  }, [entries, totalFocusedMinutes, currentStreak]);

  if (isLoading && entries.length === 0) {
    return (
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4", className)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#E4E8F0] shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 animate-pulse"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#F1F5F9] shrink-0" />
            <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
              <div className="h-2 bg-[#F1F5F9] rounded-full w-16 sm:w-24" />
              <div className="h-4 sm:h-5 bg-[#F1F5F9] rounded-lg w-12 sm:w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4", className)}>
      {/* 1. Arbres Sains */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#E4E8F0] shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
          <Trees className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] sm:text-[11px] font-medium text-[#68748A] block truncate">
            Arbres sains
          </span>
          <div className="flex items-baseline space-x-1 sm:space-x-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-[#111A2E] font-mono font-tabular">
              {stats.healthyCount}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold font-mono">
              {stats.successRate}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Temps Concentré */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#E4E8F0] shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-[#2855D9] flex items-center justify-center border border-blue-100 shrink-0">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#2855D9]" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] sm:text-[11px] font-medium text-[#68748A] block truncate">
            Temps de focus
          </span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-[#111A2E] font-mono font-tabular">
              {stats.hours > 0 ? `${stats.hours}h ` : ""}{stats.minutes}m
            </span>
          </div>
        </div>
      </div>

      {/* 3. Série Consécutive (Streak) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#E4E8F0] shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 fill-amber-500/20" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] sm:text-[11px] font-medium text-[#68748A] block truncate">
            Série d&apos;assiduité
          </span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-[#111A2E] font-mono font-tabular">
              {stats.streak}
            </span>
            <span className="text-[10px] sm:text-xs text-[#68748A] font-medium truncate">
              <span className="hidden sm:inline">jours de suite</span>
              <span className="sm:hidden">jours</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Espèce Préférée */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#E4E8F0] shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0 overflow-hidden">
          <TreeSvg
            species={(stats.topSpecies as TreeSpecies) || "cedar"}
            status="healthy"
            size={32}
            showMound={false}
          />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] sm:text-[11px] font-medium text-[#68748A] block truncate">
            Espèce favorite
          </span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-[#111A2E] truncate">
              {(SPECIES_METADATA[(stats.topSpecies as TreeSpecies)] || SPECIES_METADATA.cedar).name.split(" ")[0]}
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#68748A] font-mono shrink-0">
              ({stats.topCount})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
