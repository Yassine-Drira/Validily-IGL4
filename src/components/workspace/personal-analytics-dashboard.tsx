"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFocusTimer } from "@/components/focus/focus-provider";
import { getUserStudyGoals, saveUserStudyGoals } from "@/lib/actions/analytics-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Award,
  Clock,
  Flame,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  BookOpen,
  FileEdit,
  Lock,
  Play,
  RotateCcw,
  Settings2,
  Sliders,
  Check,
  AlertCircle,
  HelpCircle,
  BarChart3,
  PieChart,
  Trees,
} from "lucide-react";

export interface DayActivity {
  dateStr: string;
  dayLabel: string;
  count: number;
}

export interface UserGoals {
  dailyFocusMinutes: number;
  weeklyQuizzes: number;
  targetScore: number;
}

const DEFAULT_GOALS: UserGoals = {
  dailyFocusMinutes: 45,
  weeklyQuizzes: 5,
  targetScore: 80,
};

// Harmonious subject palette
const SUBJECT_COLORS = [
  "#2855D9", // Cobalt
  "#8B5CF6", // Violet
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#84CC16", // Lime
];

import { UserOverallRevisionMetrics } from "@/lib/actions/resource-actions";

interface PersonalAnalyticsDashboardProps {
  user: {
    id: string;
    name: string;
    email?: string;
  } | null;
  userAttempts: any[];
  userBookmarksCount: number;
  mistakesCount?: number;
  streak: number;
  averageScore: number | null;
  last7Days: DayActivity[];
  initialDailyFocusMap?: { [dateStr: string]: number };
  initialGoals?: UserGoals;
  practicedSubjectIds?: string[];
  allSubjects?: any[];
  weakAttempt?: any;
  recentAttempt?: any;
  revisionProgress?: UserOverallRevisionMetrics | null;
}

export function PersonalAnalyticsDashboard({
  user,
  userAttempts,
  userBookmarksCount,
  mistakesCount = 0,
  streak,
  averageScore,
  last7Days,
  initialDailyFocusMap,
  initialGoals,
  practicedSubjectIds = [],
  allSubjects = [],
  weakAttempt,
  recentAttempt,
  revisionProgress,
}: PersonalAnalyticsDashboardProps) {
  const { totalFocusSecondsToday, isRunning, toggleTimer, setIsModalOpen } = useFocusTimer();

  // Goals State (Persistent in DB per user + cached locally)
  const [goals, setGoals] = useState<UserGoals>(initialGoals || DEFAULT_GOALS);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState<UserGoals>(initialGoals || DEFAULT_GOALS);
  const [goalSavedToast, setGoalSavedToast] = useState(false);

  // Chart view modes
  const [donutView, setDonutView] = useState<"goal" | "subjects">("goal");
  const [curveMetric, setCurveMetric] = useState<"focus" | "quizzes">("focus");
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // Real 7-day focus minutes loaded from DB + live timer
  const [dailyFocusMap, setDailyFocusMap] = useState<{ [dateStr: string]: number }>(
    initialDailyFocusMap || {}
  );

  // 1. Load user goals on mount (scoped strictly to authenticated student)
  useEffect(() => {
    if (initialGoals && initialGoals.dailyFocusMinutes) {
      setGoals(initialGoals);
      setTempGoals(initialGoals);
    }
    if (!user?.id) return;

    // Revalidate against DB server action with local cache fallback
    getUserStudyGoals(user.id)
      .then((serverGoals) => {
        if (serverGoals && serverGoals.dailyFocusMinutes) {
          setGoals(serverGoals);
          setTempGoals(serverGoals);
          try {
            localStorage.setItem(`validily_goals_${user.id}`, JSON.stringify(serverGoals));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const storageKey = `validily_goals_${user.id}`;
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.dailyFocusMinutes) {
              setGoals(parsed);
              setTempGoals(parsed);
            }
          }
        } catch {}
      });
  }, [user?.id, initialGoals]);

  // 2. Load 7-day focus history combining server DB records and live running timer
  useEffect(() => {
    const focusMap: { [dateStr: string]: number } = { ...(initialDailyFocusMap || {}) };
    last7Days.forEach((d) => {
      if (focusMap[d.dateStr] === undefined) {
        focusMap[d.dateStr] = 0;
      }
      if (user?.id) {
        try {
          const saved = localStorage.getItem(`validily_focus_${user.id}_${d.dateStr}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            const localMins =
              parsed.totalFocusMinutes || Math.floor((parsed.totalFocusSeconds || 0) / 60);
            focusMap[d.dateStr] = Math.max(focusMap[d.dateStr], localMins);
          }
        } catch {}
      }
    });

    // Merge live today seconds
    const todayStr = new Date().toISOString().split("T")[0];
    const liveMins = Math.floor(totalFocusSecondsToday / 60);
    focusMap[todayStr] = Math.max(focusMap[todayStr] || 0, liveMins);

    setDailyFocusMap(focusMap);
  }, [last7Days, totalFocusSecondsToday, user?.id, initialDailyFocusMap]);

  // Save customized goals persistently to Supabase DB
  const handleSaveGoals = async () => {
    if (!user?.id) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    try {
      const storageKey = `validily_goals_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(tempGoals));
      setGoals(tempGoals);
      setIsEditingGoals(false);
      setGoalSavedToast(true);
      setTimeout(() => setGoalSavedToast(false), 3000);

      // Persist to Supabase notes table
      await saveUserStudyGoals(tempGoals);
    } catch {
      setIsEditingGoals(false);
    }
  };

  // --- Real Formatted Time Helper ---
  const formatSeconds = (totalSec: number) => {
    if (totalSec <= 0) return "0 min";
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const remSec = totalSec % 60;
    if (mins < 60) {
      return remSec > 0 ? `${mins}m ${remSec}s` : `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const dbTodaySeconds = (dailyFocusMap[todayStr] || 0) * 60;
  const effectiveTodayFocusSeconds = Math.max(totalFocusSecondsToday, dbTodaySeconds);
  const todayFocusMinutes = Math.floor(effectiveTodayFocusSeconds / 60);
  const formattedTodayFocus = formatSeconds(effectiveTodayFocusSeconds);

  // Goal Progress (100% Dynamic & Continuous Past Goal Reached)
  const targetFocusSeconds = goals.dailyFocusMinutes * 60;
  const rawGoalPercent = Math.round((effectiveTodayFocusSeconds / (targetFocusSeconds || 1)) * 100);
  const goalProgressPercent = rawGoalPercent;
  const visualRingPercent = Math.min(100, rawGoalPercent);
  const isGoalReached = effectiveTodayFocusSeconds >= targetFocusSeconds;
  const isGoalExceeded = effectiveTodayFocusSeconds > targetFocusSeconds;
  const surplusFocusSeconds = Math.max(0, effectiveTodayFocusSeconds - targetFocusSeconds);
  const remainingFocusSeconds = Math.max(0, targetFocusSeconds - effectiveTodayFocusSeconds);

  // --- Real Subject Breakdown (Combines Quizzes, Revisions & Study Activity) ---
  const subjectDistribution = useMemo(() => {
    const counts: { [name: string]: { count: number; slug?: string } } = {};

    // 1. Revision progress per subject
    if (revisionProgress?.subjects) {
      revisionProgress.subjects.forEach((s) => {
        const engagedCount = (s.revisedCount || 0) + (s.inProgressCount || 0);
        if (engagedCount > 0) {
          counts[s.subjectName] = {
            count: engagedCount,
            slug: s.subjectSlug || s.subjectId,
          };
        }
      });
    }

    // 2. Quiz attempts per subject
    userAttempts.forEach((a) => {
      const sub = a.quiz?.subject;
      const subName = sub?.name || "Matière non classée";
      const slug = sub?.slug || a.quiz?.subject_id;
      if (!counts[subName]) {
        counts[subName] = { count: 0, slug };
      }
      counts[subName].count += 1;
    });

    const entries = Object.entries(counts);
    const total = entries.reduce((acc, [, data]) => acc + data.count, 0);
    if (total === 0) return [];

    return entries
      .map(([name, data], idx) => ({
        name,
        slug: data.slug,
        count: data.count,
        percent: Math.round((data.count / total) * 100),
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [userAttempts, revisionProgress]);

  // Subjects completed with 100% progression (strictly per user)
  const completedSubjects = useMemo(() => {
    if (!revisionProgress?.subjects) return new Set<string>();
    const completed = new Set<string>();
    revisionProgress.subjects.forEach((s) => {
      if (s.totalResources > 0 && s.percentage === 100) {
        completed.add(s.subjectId);
        if (s.subjectSlug) completed.add(s.subjectSlug);
      }
    });
    return completed;
  }, [revisionProgress]);

  // Subjects in progress (pending "en cours", strictly < 100% but started)
  const inProgressSubjects = useMemo(() => {
    if (!revisionProgress?.subjects) return new Set<string>();
    const inProgress = new Set<string>();
    revisionProgress.subjects.forEach((s) => {
      if (
        s.totalResources > 0 &&
        s.percentage < 100 &&
        (s.inProgressCount > 0 || (s.revisedCount > 0 && s.percentage < 100))
      ) {
        inProgress.add(s.subjectId);
        if (s.subjectSlug) inProgress.add(s.subjectSlug);
      }
    });
    return inProgress;
  }, [revisionProgress]);

  const completedSubjectsCount = useMemo(() => {
    if (completedSubjects.size === 0) return 0;
    if (allSubjects.length > 0) {
      let count = 0;
      allSubjects.forEach((s) => {
        if (completedSubjects.has(s.id) || (s.slug && completedSubjects.has(s.slug))) {
          count++;
        }
      });
      return count;
    }
    return (
      revisionProgress?.subjects?.filter((s) => s.totalResources > 0 && s.percentage === 100).length || 0
    );
  }, [completedSubjects, allSubjects, revisionProgress]);

  const inProgressSubjectsCount = useMemo(() => {
    if (inProgressSubjects.size === 0) return 0;
    if (allSubjects.length > 0) {
      let count = 0;
      allSubjects.forEach((s) => {
        if (inProgressSubjects.has(s.id) || (s.slug && inProgressSubjects.has(s.slug))) {
          count++;
        }
      });
      return count;
    }
    return (
      revisionProgress?.subjects?.filter(
        (s) =>
          s.totalResources > 0 &&
          s.percentage < 100 &&
          (s.inProgressCount > 0 || (s.revisedCount > 0 && s.percentage < 100))
      ).length || 0
    );
  }, [inProgressSubjects, allSubjects, revisionProgress]);

  // Distinct subjects practiced out of available (combining Revisions, Quizzes & Focus sessions)
  const practicedSubjects = useMemo(() => {
    const keys = new Set<string>(practicedSubjectIds || []);
    if (revisionProgress?.subjects) {
      revisionProgress.subjects.forEach((s) => {
        if (s.revisedCount > 0 || s.inProgressCount > 0) {
          keys.add(s.subjectId);
          if (s.subjectSlug) keys.add(s.subjectSlug);
        }
      });
    }
    userAttempts.forEach((a) => {
      const subKey = a.quiz?.subject_id || a.quiz?.subject?.id;
      if (subKey) keys.add(subKey);
      const slug = a.quiz?.subject?.slug;
      if (slug) keys.add(slug);
    });

    const matched = new Set<string>();
    allSubjects.forEach((s) => {
      if (keys.has(s.id) || (s.slug && keys.has(s.slug))) {
        matched.add(s.id);
      }
    });
    return matched;
  }, [userAttempts, practicedSubjectIds, revisionProgress, allSubjects]);

  // Semester syllabus coverage strictly counts subjects with 100% completed progression
  const uniqueSubjectsCount = completedSubjectsCount;
  const totalAvailableSubjects = Math.max(1, allSubjects.length || 11);
  const syllabusCoveragePercent = Math.min(
    100,
    Math.round((uniqueSubjectsCount / totalAvailableSubjects) * 100)
  );

  // --- SVG Donut Calculations (100% Dynamic) ---
  const circleCircumference = 251.32; // 2 * pi * 40
  const donutGoalDash = (visualRingPercent / 100) * circleCircumference;

  // Multi-slice donut calculations for subject breakdown
  const subjectSlices = useMemo(() => {
    if (subjectDistribution.length === 0) return [];
    let accumulatedOffset = 0;
    return subjectDistribution.map((sub) => {
      const dash = (sub.percent / 100) * circleCircumference;
      const slice = {
        ...sub,
        dash,
        offset: accumulatedOffset,
      };
      accumulatedOffset -= dash;
      return slice;
    });
  }, [subjectDistribution, circleCircumference]);

  // --- 7-Day Hybrid Velocity Curve (100% Dynamic) ---
  const curveDataPoints = useMemo(() => {
    const todayIso = new Date().toISOString().split("T")[0];
    return last7Days.map((d) => {
      const isToday = d.dateStr === todayIso;
      const baseSec = (dailyFocusMap[d.dateStr] || 0) * 60;
      const daySec = isToday ? Math.max(effectiveTodayFocusSeconds, baseSec) : baseSec;
      const focusMins = Math.floor(daySec / 60);
      const focusVal = focusMins > 0 ? focusMins : daySec > 0 ? Math.round((daySec / 60) * 10) / 10 : 0;
      const quizVal = d.count || 0;
      const activeVal = curveMetric === "focus" ? focusVal : quizVal;
      return {
        ...d,
        focusSeconds: daySec,
        focusMinutes: focusMins,
        quizCount: quizVal,
        val: activeVal,
      };
    });
  }, [last7Days, dailyFocusMap, curveMetric, effectiveTodayFocusSeconds]);

  const maxCurveVal = Math.max(1, ...curveDataPoints.map((p) => p.val));

  // Compute SVG Points (viewBox: 0 0 280 100)
  const svgCurvePoints = curveDataPoints.map((pt, i) => {
    const x = 20 + i * 40; // 7 points spaced evenly across 240px
    const y = 85 - (pt.val / maxCurveVal) * 60;
    return { ...pt, x, y };
  });

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const smoothCurvePath = buildSmoothPath(svgCurvePoints);
  const areaPath =
    svgCurvePoints.length > 0
      ? `${smoothCurvePath} L ${svgCurvePoints[svgCurvePoints.length - 1].x} 95 L ${svgCurvePoints[0].x} 95 Z`
      : "";

  // Weekly Quiz Count
  const weeklyQuizzesCompleted = useMemo(() => {
    return last7Days.reduce((acc, d) => acc + (d.count || 0), 0);
  }, [last7Days]);

  const isGuest = !user;
  const displayName = user ? user.name : "Session Étudiant (Locale)";

  return (
    <section className="bg-white border border-[#E4E8F0] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Guest Mode Synchronization Ribbon */}
      {isGuest && (
        <div className="bg-[#EDF2FF]/70 border border-[#BACDFE] rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#1E3A8A] animate-in fade-in duration-300">
          <div className="flex items-center space-x-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#2855D9] shrink-0" />
            <span className="text-xs leading-relaxed">
              Vos sessions Focus et objectifs d&apos;étude sont conservés localement. Connectez-vous pour synchroniser vos quiz cloud.
            </span>
          </div>
          <Link
            href="/login"
            className="shrink-0 inline-flex items-center space-x-1 font-bold text-[#2855D9] hover:text-[#1E40AF] hover:underline text-xs"
          >
            <span>Se connecter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 1. Header Bar: Identity + Privacy + Goals Customizer Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E8F0]">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EDF2FF] to-[#DCE7FF] text-[#2855D9] flex items-center justify-center border border-[#BACDFE] shadow-2xs shrink-0">
            <Target className="w-5 h-5 text-[#2855D9]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-[#111A2E] tracking-tight">
                Tableau de Bord Personnel • {displayName}
              </h2>
              {isGuest ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#475569] border border-[#E2E8F0] shrink-0">
                  <span>Mode Local</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Strictement Privé</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#68748A] mt-0.5">
              Métriques dynamiques 100% calculées à partir de vos sessions réelles.
            </p>
          </div>
        </div>

        {/* Action Controls: 2x2 grid on mobile, flex row on sm+ */}
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:space-x-2 sm:w-auto shrink-0 pt-1 sm:pt-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditingGoals(!isEditingGoals)}
            className={cn(
              "text-xs h-8 px-2.5 sm:px-3 rounded-xl border-[#E4E8F0] font-semibold transition-all cursor-pointer w-full justify-center",
              isEditingGoals ? "bg-blue-50 text-[#2855D9] border-[#2855D9]" : "bg-[#FAFBFD] text-[#182235] hover:bg-[#F4F6FA]"
            )}
            title="Personnaliser vos objectifs quotidiens et hebdomadaires"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5 text-[#2855D9]" />
            <span>Mes Objectifs</span>
          </Button>

          <Link
            href="/forest"
            className="text-xs h-8 px-2.5 sm:px-3 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center space-x-1.5 transition-colors w-full"
            title="Consulter votre Bosquet Focus permanent"
          >
            <Trees className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bosquet</span>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="text-xs h-8 px-2.5 sm:px-3 rounded-xl border-[#E4E8F0] bg-[#FAFBFD] hover:bg-[#F4F6FA] text-[#182235] font-semibold w-full justify-center"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-[#2855D9]" />
            <span>Focus Hub</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={toggleTimer}
            className={cn(
              "text-xs h-8 px-2.5 sm:px-3.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer w-full justify-center",
              isRunning
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-[#2855D9] hover:bg-[#1E40AF] text-white"
            )}
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3 h-3 mr-1" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1 fill-current" />
                <span>Lancer Focus</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Goal Customization Drawer (Expandable) */}
      {isEditingGoals && (
        <div className="bg-[#FAFBFD] border border-[#BACDFE] rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#2855D9]" />
              <h3 className="text-xs font-bold text-[#111A2E] uppercase tracking-wider">
                Personnalisation de Vos Objectifs d&apos;Étude
              </h3>
            </div>
            <span className="text-[11px] text-[#68748A]">
              Modifiez vos cibles pour adapter les anneaux et indicateurs de performance.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target 1: Daily Focus */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E4E8F0] space-y-2.5">
              <label className="text-xs font-semibold text-[#182235] flex items-center justify-between">
                <span>Objectif Focus Quotidien</span>
                <span className="font-mono text-[#2855D9] font-bold text-sm">{tempGoals.dailyFocusMinutes} min</span>
              </label>
              <input
                type="range"
                min="10"
                max="180"
                step="5"
                value={tempGoals.dailyFocusMinutes}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, dailyFocusMinutes: Number(e.target.value) }))}
                className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#2855D9]"
              />
              <div className="flex items-center space-x-1">
                {[15, 25, 45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTempGoals((prev) => ({ ...prev, dailyFocusMinutes: mins }))}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded border transition-all cursor-pointer",
                      tempGoals.dailyFocusMinutes === mins
                        ? "bg-[#2855D9] text-white border-[#2855D9] font-bold"
                        : "bg-[#FAFAF7] border-[#E4E8F0] text-[#68748A] hover:bg-white"
                    )}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Target 2: Weekly Quizzes */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E4E8F0] space-y-2.5">
              <label className="text-xs font-semibold text-[#182235] flex items-center justify-between">
                <span>Objectif Quiz Hebdomadaire</span>
                <span className="font-mono text-[#2855D9] font-bold text-sm">{tempGoals.weeklyQuizzes} quiz</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={tempGoals.weeklyQuizzes}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, weeklyQuizzes: Number(e.target.value) }))}
                className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#2855D9]"
              />
              <div className="flex items-center space-x-1">
                {[3, 5, 7, 10, 15].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTempGoals((prev) => ({ ...prev, weeklyQuizzes: count }))}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded border transition-all cursor-pointer",
                      tempGoals.weeklyQuizzes === count
                        ? "bg-[#2855D9] text-white border-[#2855D9] font-bold"
                        : "bg-[#FAFAF7] border-[#E4E8F0] text-[#68748A] hover:bg-white"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Target 3: Target Accuracy */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E4E8F0] space-y-2.5">
              <label className="text-xs font-semibold text-[#182235] flex items-center justify-between">
                <span>Score Cible Examens</span>
                <span className="font-mono text-emerald-700 font-bold text-sm">{tempGoals.targetScore}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={tempGoals.targetScore}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, targetScore: Number(e.target.value) }))}
                className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex items-center space-x-1">
                {[70, 75, 80, 85, 90].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setTempGoals((prev) => ({ ...prev, targetScore: score }))}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded border transition-all cursor-pointer",
                      tempGoals.targetScore === score
                        ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                        : "bg-[#FAFAF7] border-[#E4E8F0] text-[#68748A] hover:bg-white"
                    )}
                  >
                    {score}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4E8F0]">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingGoals(false)}
              className="text-xs h-8 px-3"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveGoals}
              className="text-xs h-8 px-4 bg-[#2855D9] hover:bg-[#1E40AF]"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Enregistrer mes objectifs</span>
            </Button>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {goalSavedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Objectifs personnalisés mis à jour et sauvegardés avec succès.</span>
        </div>
      )}

      {/* 2. Visuals Center: Multi-Dimensional Dynamic Charts (Donut + Spline Curve + KPIs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Dynamic Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#D0D7E5] transition-all">
          {/* Header & View Switcher */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition-colors border",
                  donutView === "goal"
                    ? isGoalReached
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200/70"
                      : "bg-blue-50 text-[#2855D9] border-blue-200/70"
                    : "bg-indigo-50 text-indigo-600 border-indigo-200/70"
                )}
              >
                {donutView === "goal" ? (
                  <Target className="w-3.5 h-3.5" />
                ) : (
                  <PieChart className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-[11px] font-bold text-[#111A2E] uppercase tracking-wider font-mono">
                {donutView === "goal" ? "Objectif Journalier" : "Répartition par Matière"}
              </span>
            </div>

            {/* Toggle Donut View */}
            <div className="flex items-center bg-[#F1F4F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDonutView("goal")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer",
                  donutView === "goal"
                    ? "bg-white text-[#2855D9] shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Afficher l'anneau d'accomplissement de votre objectif du jour"
              >
                Objectif
              </button>
              <button
                type="button"
                onClick={() => setDonutView("subjects")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer",
                  donutView === "subjects"
                    ? "bg-white text-[#2855D9] shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Afficher la ventilation réelle de vos quiz par matière"
              >
                Matières
              </button>
            </div>
          </div>

          {/* SVG Donut Ring */}
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto my-2.5 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 drop-shadow-2xs" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="goalProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="primaryProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>

              {/* Background Track */}
              <circle cx="50" cy="50" r="40" stroke="#F1F4F9" strokeWidth="9" fill="none" />

              {donutView === "goal" ? (
                /* Mode 1: Daily Focus Goal Ring */
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={isGoalReached ? "url(#goalProgressGradient)" : "url(#primaryProgressGradient)"}
                  strokeWidth="9"
                  strokeDasharray={`${donutGoalDash} ${circleCircumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-700 ease-out"
                />
              ) : (
                /* Mode 2: Real Subject Breakdown Slices (100% Dynamic) */
                subjectSlices.length > 0 ? (
                  subjectSlices.map((slice, idx) => (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={slice.color}
                      strokeWidth="9"
                      strokeDasharray={`${slice.dash} ${circleCircumference}`}
                      strokeDashoffset={slice.offset}
                      fill="none"
                      className="transition-all duration-700"
                    />
                  ))
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#CBD5E1"
                    strokeWidth="9"
                    strokeDasharray="10 5"
                    fill="none"
                  />
                )
              )}
            </svg>

            {/* Inner Center Label (Clickable & Symmetrically Padded) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 select-none">
              {donutView === "goal" ? (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex flex-col items-center justify-center cursor-pointer group hover:scale-[1.03] transition-transform w-full max-w-[130px]"
                  title="Cliquer pour ouvrir le Focus Hub"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68748A]">
                    Focus Aujourd&apos;hui
                  </span>
                  <span className="text-2xl sm:text-[26px] font-black font-mono text-[#111A2E] group-hover:text-[#2855D9] transition-colors tracking-tight font-tabular leading-tight my-0.5">
                    {formattedTodayFocus}
                  </span>
                  <div
                    className={cn(
                      "inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-all mt-0.5 shadow-2xs",
                      isGoalExceeded
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : isGoalReached
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : "bg-blue-50 text-[#2855D9] border-blue-200/80"
                    )}
                  >
                    {isGoalExceeded ? (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>{rawGoalPercent}%</span>
                        <span className="text-[9px] font-sans font-medium text-emerald-600">atteint</span>
                      </>
                    ) : isGoalReached ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>100%</span>
                      </>
                    ) : (
                      <span>{rawGoalPercent}%</span>
                    )}
                  </div>
                </button>
              ) : (
                <Link
                  href="/quizzes"
                  className="flex flex-col items-center justify-center cursor-pointer group hover:scale-[1.03] transition-transform w-full max-w-[130px]"
                  title="Accéder aux quiz"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68748A]">
                    Quiz Enregistrés
                  </span>
                  <span className="text-2xl sm:text-[26px] font-black font-mono text-[#111A2E] group-hover:text-[#2855D9] transition-colors tracking-tight font-tabular leading-tight my-0.5">
                    {userAttempts.length}
                  </span>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-[#475569] border border-slate-200 mt-0.5 shadow-2xs">
                    <span>
                      {subjectDistribution.length} matière{subjectDistribution.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Dynamic Legend */}
          <div className="pt-3 border-t border-[#E4E8F0]">
            {donutView === "goal" ? (
              <div
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#F8FAFC] p-2 rounded-xl transition-all group border border-transparent hover:border-[#E2E8F0]"
                title="Cliquer pour configurer l'objectif dans le Focus Hub"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-110",
                      isGoalExceeded
                        ? "bg-emerald-500 ring-4 ring-emerald-100"
                        : isGoalReached
                        ? "bg-emerald-500 ring-4 ring-emerald-100"
                        : "bg-[#2855D9] ring-4 ring-blue-100"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span
                      className={cn(
                        "text-[11px] font-bold truncate",
                        isGoalExceeded
                          ? "text-emerald-700"
                          : isGoalReached
                          ? "text-emerald-700"
                          : "text-[#182235]"
                      )}
                    >
                      {isGoalExceeded
                        ? `Objectif dépassé (+${formatSeconds(surplusFocusSeconds)})`
                        : isGoalReached
                        ? "Objectif journalier atteint !"
                        : `Temps restant : ${formatSeconds(remainingFocusSeconds)}`}
                    </span>
                    <span className="text-[10px] text-[#68748A]">
                      {isGoalExceeded
                        ? "Rythme excellent aujourd'hui"
                        : isGoalReached
                        ? "Séance validée avec succès"
                        : "Continuez sur cette lancée"}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="text-[9px] text-[#94A3B8] uppercase font-mono tracking-wider block">
                    Cible
                  </span>
                  <span className="font-mono font-bold text-xs text-[#111A2E]">
                    {goals.dailyFocusMinutes}m
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-20 overflow-y-auto scrollbar-thin pr-1">
                {subjectDistribution.length > 0 ? (
                  subjectDistribution.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] group">
                      <Link
                        href={sub.slug ? `/subjects/${sub.slug}` : "/subjects"}
                        className="flex items-center space-x-1.5 min-w-0 hover:text-[#2855D9] transition-colors"
                        title={`Consulter le cours et ressources de ${sub.name}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="text-[#182235] group-hover:text-[#2855D9] truncate font-medium">
                          {sub.name}
                        </span>
                      </Link>
                      <span className="font-mono text-[#68748A] font-semibold text-[10px] shrink-0 ml-2">
                        {sub.count} ({sub.percent}%)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#94A3B8] italic text-center py-1">
                    Aucun quiz effectué pour le moment.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Dynamic 7-Day Hybrid Velocity Curve (5 cols) */}
        <div className="lg:col-span-5 bg-[#FAFBFD] border border-[#E4E8F0] rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[11px] font-bold text-[#68748A] uppercase tracking-wider block">
                Courbe d&apos;Activité Dynamique (7 Jours)
              </span>
              <span className="text-[11px] text-[#111A2E] font-medium">
                {curveMetric === "focus" ? (
                  (() => {
                    const totalSec = curveDataPoints.reduce((acc, p) => acc + (p.focusSeconds || 0), 0);
                    return totalSec >= 60
                      ? `${Math.round(totalSec / 60)} min au total cette semaine`
                      : totalSec > 0
                      ? `${formatSeconds(totalSec)} au total cette semaine`
                      : "0 min au total cette semaine";
                  })()
                ) : (
                  `${weeklyQuizzesCompleted} quiz réalisés cette semaine`
                )}
              </span>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-[#EAEFF8] p-0.5 rounded-lg border border-[#D5E0F2]">
              <button
                type="button"
                onClick={() => setCurveMetric("focus")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer",
                  curveMetric === "focus" ? "bg-white text-[#2855D9] shadow-2xs font-bold" : "text-[#68748A]"
                )}
              >
                Focus (min)
              </button>
              <button
                type="button"
                onClick={() => setCurveMetric("quizzes")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer",
                  curveMetric === "quizzes" ? "bg-white text-[#2855D9] shadow-2xs font-bold" : "text-[#68748A]"
                )}
              >
                Quiz
              </button>
            </div>
          </div>

          {/* SVG Smooth Area Bezier Chart */}
          <div className="relative h-36 w-full my-auto flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 280 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2855D9" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2855D9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Guides */}
              <line x1="20" y1="25" x2="260" y2="25" stroke="#E4E8F0" strokeDasharray="3 3" />
              <line x1="20" y1="55" x2="260" y2="55" stroke="#E4E8F0" strokeDasharray="3 3" />
              <line x1="20" y1="85" x2="260" y2="85" stroke="#E4E8F0" />

              {/* Filled Area Gradient */}
              {areaPath && <path d={areaPath} fill="url(#curveGradient)" />}

              {/* Smooth Spline Curve */}
              {smoothCurvePath && (
                <path
                  d={smoothCurvePath}
                  fill="none"
                  stroke="#2855D9"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              )}

              {/* Interactive Point Nodes */}
              {svgCurvePoints.map((pt, idx) => (
                <g key={idx} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.val > 0 ? (hoveredDayIndex === idx ? 6 : 4.5) : 3}
                    className={cn(
                      "transition-all duration-200",
                      pt.val > 0
                        ? "fill-[#2855D9] stroke-white stroke-2"
                        : "fill-[#CBD5E1]"
                    )}
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                  />
                </g>
              ))}
            </svg>

            {/* Floating Day Tooltip */}
            {hoveredDayIndex !== null && (
              <div className="absolute top-1 right-2 bg-[#111A2E] text-white text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none space-y-0.5 border border-[#334155]">
                <div className="font-bold text-[#93C5FD]">
                  {svgCurvePoints[hoveredDayIndex].dayLabel} ({svgCurvePoints[hoveredDayIndex].dateStr})
                </div>
                <div>⏱️ Focus : {svgCurvePoints[hoveredDayIndex].focusSeconds > 0 ? formatSeconds(svgCurvePoints[hoveredDayIndex].focusSeconds) : "0 min"}</div>
                <div>🎯 Quiz : {svgCurvePoints[hoveredDayIndex].quizCount} complété(s)</div>
              </div>
            )}
          </div>

          {/* Days Labels X-Axis */}
          <div className="grid grid-cols-7 gap-1 pt-2 border-t border-[#E4E8F0] text-center">
            {svgCurvePoints.map((d, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoveredDayIndex(i)}
                onMouseLeave={() => setHoveredDayIndex(null)}
                className="flex flex-col items-center cursor-pointer"
              >
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium transition-colors",
                    d.val > 0 ? "text-[#2855D9] font-bold" : "text-[#94A3B8]"
                  )}
                >
                  {d.dayLabel}
                </span>
                <span className="text-[9px] font-mono text-[#68748A]">
                  {curveMetric === "focus"
                    ? d.focusMinutes > 0
                      ? `${d.focusMinutes}m`
                      : d.focusSeconds > 0
                      ? `${d.focusSeconds}s`
                      : "0m"
                    : d.quizCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actionable, Non-Redundant KPIs (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-3">
          {/* KPI 1: Goal Velocity & Completion + 7-Day Consistency Matrix */}
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#68748A] uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="hover:text-[#2855D9] transition-colors cursor-pointer text-left"
                title="Ouvrir le Focus Hub"
              >
                Objectif Quotidien
              </button>
              <span
                className={cn(
                  "font-mono font-bold",
                  isGoalExceeded
                    ? "text-emerald-700"
                    : isGoalReached
                    ? "text-emerald-600"
                    : "text-[#2855D9]"
                )}
              >
                {rawGoalPercent}%
              </span>
            </div>
            <div
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#E4E8F0] rounded-full h-2 overflow-hidden cursor-pointer"
              title="Cliquer pour configurer votre temps dans le Focus Hub"
            >
              <div
                style={{ width: `${Math.min(100, rawGoalPercent)}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isGoalExceeded
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                    : isGoalReached
                    ? "bg-emerald-500"
                    : rawGoalPercent >= 50
                    ? "bg-[#2855D9]"
                    : "bg-amber-500"
                )}
              />
            </div>
            <p className="text-[11px] text-[#68748A]">
              {isGoalExceeded ? (
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Objectif validé (+{formatSeconds(surplusFocusSeconds)} en surplus !)</span>
                </span>
              ) : isGoalReached ? (
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Objectif validé aujourd&apos;hui !</span>
                </span>
              ) : (
                <span>Plus que {formatSeconds(remainingFocusSeconds)} pour valider.</span>
              )}
            </p>

            {/* 7-Day Consistency Dot Matrix */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EAEFF8]">
              <span className="text-[10px] font-medium text-[#68748A]">Régularité 7J :</span>
              <div className="flex items-center space-x-1.5">
                {last7Days.map((d, i) => {
                  const active = (dailyFocusMap[d.dateStr] || 0) > 0 || (d.count || 0) > 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setHoveredDayIndex(i)}
                      title={`${d.dayLabel} (${d.dateStr}) : ${dailyFocusMap[d.dateStr] || 0}m focus, ${d.count || 0} quiz`}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all cursor-pointer focus:outline-hidden",
                        active
                          ? "bg-emerald-500 ring-2 ring-emerald-100 shadow-2xs hover:scale-125"
                          : "bg-[#CBD5E1] hover:bg-[#94A3B8]"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* KPI 2: Academic Mastery & Accuracy vs Custom Target */}
          <Link
            href="/quizzes"
            className="bg-[#FAFBFD] hover:bg-[#F4F7FC] border border-[#E4E8F0] hover:border-[#BACDFE] rounded-2xl p-4 shadow-2xs transition-all cursor-pointer block group"
            title="S'entraîner sur les quiz"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#68748A] group-hover:text-[#2855D9] uppercase tracking-wider block transition-colors">
                  Précision Académique
                </span>
                <span className="text-2xl font-bold font-mono text-[#111A2E] mt-0.5 block font-tabular">
                  {averageScore !== null ? `${averageScore}%` : "—"}
                </span>
                <span className="text-[10px] font-mono mt-0.5 block">
                  {averageScore !== null ? (
                    averageScore >= goals.targetScore ? (
                      <span className="text-emerald-700 font-semibold">✓ Cible atteinte ({goals.targetScore}%)</span>
                    ) : (
                      <span className="text-amber-700 font-medium">À {goals.targetScore - averageScore}% de la cible ({goals.targetScore}%)</span>
                    )
                  ) : (
                    <span className="text-[#68748A]">Cible : {goals.targetScore}% (Aucun quiz complété)</span>
                  )}
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* KPI 3: Syllabus Coverage & Weakness Alert */}
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-2xl p-4 shadow-2xs space-y-1.5">
            <Link
              href="/subjects"
              className="flex items-center justify-between text-[10px] font-bold text-[#68748A] hover:text-[#2855D9] uppercase tracking-wider transition-colors"
              title="Voir toutes les matières du semestre"
            >
              <span>Couverture du Semestre</span>
              <span className="font-mono text-[#2855D9]">{syllabusCoveragePercent}%</span>
            </Link>
            <Link
              href="/subjects"
              className="text-base font-bold font-mono text-[#111A2E] hover:text-[#2855D9] transition-colors block"
              title="Explorer les matières"
            >
              {uniqueSubjectsCount} / {totalAvailableSubjects} matières
            </Link>
            <div className="text-[11px]">
              {mistakesCount > 0 ? (
                <Link
                  href="/my-space"
                  className="text-amber-700 font-semibold hover:underline flex items-center space-x-1"
                  title="Accéder aux questions manquées dans Mon Espace"
                >
                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{mistakesCount} erreur(s) à réviser</span>
                </Link>
              ) : revisionProgress && (revisionProgress.totalRevised > 0 || inProgressSubjectsCount > 0) ? (
                <Link
                  href="/my-space"
                  className="text-emerald-700 font-medium flex items-center space-x-1 hover:underline"
                  title="Accéder à Mes Révisions"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {revisionProgress.totalRevised > 0 ? (
                      <>
                        {revisionProgress.totalRevised} cours validé{revisionProgress.totalRevised > 1 ? "s" : ""} ({revisionProgress.overallPercentage}%)
                        {inProgressSubjectsCount > 0 && (
                          <span className="text-[#68748A] font-normal">
                            {" "}• {inProgressSubjectsCount} en cours
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[#2855D9]">
                        {inProgressSubjectsCount} matière{inProgressSubjectsCount > 1 ? "s" : ""} en cours
                      </span>
                    )}
                  </span>
                </Link>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Aucune erreur active</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
