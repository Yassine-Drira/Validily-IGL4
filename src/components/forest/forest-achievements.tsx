"use client";

import React, { useMemo } from "react";
import { ForestEntry, TreeSpecies } from "@/types/database";
import {
  Award,
  Trees,
  Clock,
  Flame,
  Compass,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Sprout,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AchievementBadgeIcon } from "./achievement-badge-icon";

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category: "progression" | "endurance" | "streak" | "botany";
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  progressLabel: string;
  isUnlocked: boolean;
  unlockedReward?: string;
}

interface ForestAchievementsProps {
  entries: ForestEntry[];
  streak?: number;
  totalFocusedMinutes?: number;
  className?: string;
}

export function ForestAchievements({
  entries = [],
  streak = 0,
  totalFocusedMinutes,
  className = "",
}: ForestAchievementsProps) {
  const achievements = useMemo<AchievementItem[]>(() => {
    const healthyTrees = entries.filter((e) => e.tree_status === "healthy");
    const healthyCount = healthyTrees.length;

    // Calculate total focused minutes strictly from healthy trees if not explicitly provided
    const healthyMinutes = Math.floor(
      healthyTrees.reduce((acc, t) => {
        const sec =
          t.session?.actual_duration_seconds ??
          t.session?.target_duration_seconds ??
          1500;
        return acc + (typeof sec === "number" && sec > 0 ? sec : 1500);
      }, 0) / 60
    );

    const computedMinutes = Math.max(
      totalFocusedMinutes !== undefined ? totalFocusedMinutes : 0,
      healthyMinutes
    );

    // Calculate streak from healthy trees if not provided
    let computedStreak = streak;
    if (!computedStreak) {
      const daysSet = new Set(
        healthyTrees
          .map((e) => {
            const raw = e.earned_at || e.created_at;
            if (!raw) return null;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-CA");
          })
          .filter(Boolean) as string[]
      );
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString("en-CA");
        if (daysSet.has(dateKey)) {
          computedStreak++;
        } else if (i === 0) {
          // If no tree planted yet today, check if yesterday had one to maintain streak
          continue;
        } else {
          break;
        }
      }
    }

    const plantedSpecies = Array.from(
      new Set(
        healthyTrees
          .map((t) => t.tree_species as TreeSpecies)
          .filter((sp) => ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"].includes(sp))
      )
    );
    const speciesCount = plantedSpecies.length;

    const effectiveFirstTreeCount = Math.max(healthyCount, computedMinutes >= 15 && healthyCount > 0 ? 1 : healthyCount);

    const list: AchievementItem[] = [
      {
        id: "first_tree",
        title: "Première Pousse",
        description: "Valider une première session Pomodoro complète sans abandon.",
        category: "progression",
        icon: <Sprout className="w-5 h-5" />,
        iconBg: "bg-emerald-50 border-emerald-200",
        iconColor: "text-emerald-600",
        currentValue: effectiveFirstTreeCount,
        targetValue: 1,
        progressPercent: effectiveFirstTreeCount >= 1 ? 100 : 0,
        progressLabel: `${Math.min(1, effectiveFirstTreeCount)} / 1 arbre`,
        isUnlocked: effectiveFirstTreeCount >= 1,
        unlockedReward: "Pied de pousse déverrouillé",
      },
      {
        id: "grove_5",
        title: "Bosquet Naissant",
        description: "Planter 5 arbres sains pour façonner votre premier bosquet.",
        category: "progression",
        icon: <Trees className="w-5 h-5" />,
        iconBg: "bg-teal-50 border-teal-200",
        iconColor: "text-teal-600",
        currentValue: healthyCount,
        targetValue: 5,
        progressPercent: Math.min(100, Math.round((healthyCount / 5) * 100)),
        progressLabel: `${Math.min(5, healthyCount)} / 5 arbres`,
        isUnlocked: healthyCount >= 5,
        unlockedReward: "Extension insulaire",
      },
      {
        id: "grove_15",
        title: "Canopée Florissante",
        description: "Atteindre 15 arbres sains sans interruption de focus.",
        category: "progression",
        icon: <Sparkles className="w-5 h-5" />,
        iconBg: "bg-blue-50 border-blue-200",
        iconColor: "text-[#2855D9]",
        currentValue: healthyCount,
        targetValue: 15,
        progressPercent: Math.min(100, Math.round((healthyCount / 15) * 100)),
        progressLabel: `${Math.min(15, healthyCount)} / 15 arbres`,
        isUnlocked: healthyCount >= 15,
        unlockedReward: "Titre : Silviculteur IGL4",
      },
      {
        id: "full_island_36",
        title: "Île Luxuriante",
        description: "Remplir un quadrant insulaire complet de 36 arbres.",
        category: "progression",
        icon: <Trophy className="w-5 h-5" />,
        iconBg: "bg-indigo-50 border-indigo-200",
        iconColor: "text-indigo-600",
        currentValue: healthyCount,
        targetValue: 36,
        progressPercent: Math.min(100, Math.round((healthyCount / 36) * 100)),
        progressLabel: `${Math.min(36, healthyCount)} / 36 arbres`,
        isUnlocked: healthyCount >= 36,
        unlockedReward: "Déblocage de l'archipel étendu",
      },
      {
        id: "grove_master_100",
        title: "Forêt Séculaire",
        description: "Façonner un vaste écosystème forestier de 100 arbres sains.",
        category: "progression",
        icon: <Trees className="w-5 h-5" />,
        iconBg: "bg-emerald-100 border-emerald-300",
        iconColor: "text-emerald-700",
        currentValue: healthyCount,
        targetValue: 100,
        progressPercent: Math.min(100, Math.round((healthyCount / 100) * 100)),
        progressLabel: `${Math.min(100, healthyCount)} / 100 arbres`,
        isUnlocked: healthyCount >= 100,
        unlockedReward: "Statut Légende Silvicole IGL4",
      },
      {
        id: "focus_bronze",
        title: "Endurance de Bronze",
        description: "Cumuler au moins 2 heures (120 min) de concentration effective.",
        category: "endurance",
        icon: <Clock className="w-5 h-5" />,
        iconBg: "bg-amber-50 border-amber-200",
        iconColor: "text-amber-700",
        currentValue: computedMinutes,
        targetValue: 120,
        progressPercent: Math.min(100, Math.round((computedMinutes / 120) * 100)),
        progressLabel: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 2h`,
        isUnlocked: computedMinutes >= 120,
        unlockedReward: "Médaille de persévérance",
      },
      {
        id: "focus_silver",
        title: "Marathonien du Focus",
        description: "Atteindre 10 heures de révision cumulée sur vos cours.",
        category: "endurance",
        icon: <Zap className="w-5 h-5" />,
        iconBg: "bg-purple-50 border-purple-200",
        iconColor: "text-purple-600",
        currentValue: computedMinutes,
        targetValue: 600,
        progressPercent: Math.min(100, Math.round((computedMinutes / 600) * 100)),
        progressLabel: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 10h`,
        isUnlocked: computedMinutes >= 600,
        unlockedReward: "Badge Marathonien IGL4",
      },
      {
        id: "focus_gold",
        title: "Maître de la Concentration",
        description: "Franchir le cap de 24 heures (1440 min) de travail studieux vérifié.",
        category: "endurance",
        icon: <Award className="w-5 h-5" />,
        iconBg: "bg-amber-100 border-amber-300",
        iconColor: "text-amber-800",
        currentValue: computedMinutes,
        targetValue: 1440,
        progressPercent: Math.min(100, Math.round((computedMinutes / 1440) * 100)),
        progressLabel: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 24h`,
        isUnlocked: computedMinutes >= 1440,
        unlockedReward: "Couronne d'Or Académique",
      },
      {
        id: "streak_3",
        title: "Flamme d'Assiduité",
        description: "Maintenir une série consécutive de 3 jours d'étude réguliers.",
        category: "streak",
        icon: <Flame className="w-5 h-5 fill-amber-500/20" />,
        iconBg: "bg-orange-50 border-orange-200",
        iconColor: "text-orange-600",
        currentValue: computedStreak,
        targetValue: 3,
        progressPercent: Math.min(100, Math.round((computedStreak / 3) * 100)),
        progressLabel: `${Math.min(3, computedStreak)} / 3 jours`,
        isUnlocked: computedStreak >= 3,
        unlockedReward: "Aura d'assiduité brillante",
      },
      {
        id: "streak_7",
        title: "Semaine Héroïque",
        description: "Étudier 7 jours consécutifs sans faillir à votre engagement.",
        category: "streak",
        icon: <Flame className="w-5 h-5 fill-rose-500/20" />,
        iconBg: "bg-rose-50 border-rose-200",
        iconColor: "text-rose-600",
        currentValue: computedStreak,
        targetValue: 7,
        progressPercent: Math.min(100, Math.round((computedStreak / 7) * 100)),
        progressLabel: `${Math.min(7, computedStreak)} / 7 jours`,
        isUnlocked: computedStreak >= 7,
        unlockedReward: "Insigne Flamme Perpétuelle",
      },
      {
        id: "botanist_explorer",
        title: "Biodiversité Botanique",
        description: "Planter au moins 3 espèces végétales distinctes dans votre bosquet.",
        category: "botany",
        icon: <Compass className="w-5 h-5" />,
        iconBg: "bg-rose-50 border-rose-200",
        iconColor: "text-rose-600",
        currentValue: speciesCount,
        targetValue: 3,
        progressPercent: Math.min(100, Math.round((speciesCount / 3) * 100)),
        progressLabel: `${Math.min(3, speciesCount)} / 3 espèces`,
        isUnlocked: speciesCount >= 3,
        unlockedReward: "Insigne Explorateur Botaniste",
      },
      {
        id: "master_botanist",
        title: "Arboretum Universel",
        description: "Cultiver avec succès les 6 essences végétales du cursus.",
        category: "botany",
        icon: <Sprout className="w-5 h-5" />,
        iconBg: "bg-teal-50 border-teal-200",
        iconColor: "text-teal-700",
        currentValue: speciesCount,
        targetValue: 6,
        progressPercent: Math.min(100, Math.round((speciesCount / 6) * 100)),
        progressLabel: `${Math.min(6, speciesCount)} / 6 espèces`,
        isUnlocked: speciesCount >= 6,
        unlockedReward: "Titre : Maître Botaniste IGL4",
      },
    ];

    return list;
  }, [entries, streak, totalFocusedMinutes]);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const completionPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Global Milestone Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD] p-4 rounded-3xl border border-[#E4E8F0]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[#111A2E]">
                Paliers & Accomplissements
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#2855D9] border border-[#E4E8F0]">
                {unlockedCount} / {totalCount} débloqués
              </span>
            </div>
            <p className="text-[11px] text-[#68748A] mt-0.5">
              Chaque session de concentration validée fait progresser vos accomplissements pérennes.
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="sm:w-48 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[#68748A]">
            <span>Progression globale</span>
            <span className="text-[#2855D9] font-bold">{completionPercent}%</span>
          </div>
          <div className="w-full bg-[#E4E8F0] h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${completionPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-[#2855D9] rounded-full transition-all duration-700 ease-out"
            />
          </div>
        </div>
      </div>

      {/* Grid of Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {achievements.map((item) => (
          <div
            key={item.id}
            className={cn(
              "p-4 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden group",
              item.isUnlocked
                ? "bg-gradient-to-br from-white via-white to-emerald-50/40 border-emerald-200 shadow-xs hover:shadow-md hover:border-emerald-300"
                : "bg-white border-[#E4E8F0] hover:border-[#CBD5E1] hover:shadow-xs"
            )}
          >
            {/* Top Row: Iconic Badge + Badge Status */}
            <div>
              <div className="flex items-start justify-between mb-3 gap-2">
                <AchievementBadgeIcon
                  id={item.id}
                  isUnlocked={item.isUnlocked}
                  progressPercent={item.progressPercent}
                  size={48}
                />

                {item.isUnlocked ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Validé</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/80 text-[#64748B] border border-[#E2E8F0] shadow-2xs">
                    <Lock className="w-2.5 h-2.5" />
                    <span>En cours</span>
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h4
                className={cn(
                  "text-xs font-bold tracking-tight",
                  item.isUnlocked ? "text-[#111A2E]" : "text-[#475569]"
                )}
              >
                {item.title}
              </h4>
              <p className="text-[11px] text-[#68748A] mt-1 leading-snug">
                {item.description}
              </p>
            </div>

            {/* Bottom Row: Progress Indicator */}
            <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#64748B]">{item.progressLabel}</span>
                <span
                  className={cn(
                    "font-bold",
                    item.isUnlocked ? "text-emerald-700" : "text-[#2855D9]"
                  )}
                >
                  {item.progressPercent}%
                </span>
              </div>

              <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${item.progressPercent}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    item.isUnlocked ? "bg-emerald-500" : "bg-[#2855D9]"
                  )}
                />
              </div>

              {item.isUnlocked && item.unlockedReward && (
                <div className="text-[9px] font-mono text-emerald-700 font-semibold truncate pt-0.5">
                  ✦ {item.unlockedReward}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
