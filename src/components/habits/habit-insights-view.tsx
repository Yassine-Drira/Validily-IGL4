"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Flame,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Info,
  Lock,
} from "lucide-react";
import type {
  HabitWithTodayState,
  HabitAnalyticsSummary,
  HabitDiagnostic,
  AcademicGoal,
} from "@/types/database";
import { CircularHabitDial } from "./circular-habit-dial";
import {
  getHabitAnalyticsAction,
  applyDiagnosticAdjustmentAction,
} from "@/lib/actions/habit-actions";

interface HabitInsightsViewProps {
  habits: HabitWithTodayState[];
  goals: AcademicGoal[];
  onRefresh: () => void;
}

// Locale order: Monday to Sunday (1, 2, 3, 4, 5, 6, 0)
const WEEKDAY_LOCALE_ORDER = [
  { index: 1, label: "Lun", fullName: "Lundi" },
  { index: 2, label: "Mar", fullName: "Mardi" },
  { index: 3, label: "Mer", fullName: "Mercredi" },
  { index: 4, label: "Jeu", fullName: "Jeudi" },
  { index: 5, label: "Ven", fullName: "Vendredi" },
  { index: 6, label: "Sam", fullName: "Samedi" },
  { index: 0, label: "Dim", fullName: "Dimanche" },
];

export function HabitInsightsView({
  habits,
  goals,
  onRefresh,
}: HabitInsightsViewProps) {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [selectedHabitId, setSelectedHabitId] = useState<string>(
    habits[0]?.id || ""
  );
  const [analytics, setAnalytics] = useState<HabitAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [applyingDiagId, setApplyingDiagId] = useState<string | null>(null);

  // Sync selectedHabitId if habits change
  useEffect(() => {
    if (!selectedHabitId && habits.length > 0) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  // Load analytics when habit or range changes
  useEffect(() => {
    if (!selectedHabitId) return;
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const res = await getHabitAnalyticsAction(selectedHabitId, rangeDays);
        if (!isCancelled && res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [selectedHabitId, rangeDays]);

  const activeHabit = habits.find((h) => h.id === selectedHabitId) || habits[0];

  // Apply diagnostic adjustment action
  const handleApplyAdjustment = async (diag: HabitDiagnostic) => {
    if (!diag.actionType || !activeHabit) return;
    if (confirm(`Appliquer la recommandation : "${diag.title}" ?`)) {
      setApplyingDiagId(diag.id);
      try {
        const res = await applyDiagnosticAdjustmentAction(
          activeHabit.id,
          diag.actionType,
          diag.actionPayload || {}
        );
        if (res.success) {
          onRefresh();
          const updated = await getHabitAnalyticsAction(activeHabit.id, rangeDays);
          if (updated.success && updated.data) {
            setAnalytics(updated.data);
          }
        }
      } finally {
        setApplyingDiagId(null);
      }
    }
  };

  if (habits.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-12 text-center shadow-xs">
        <Activity className="w-10 h-10 text-[#68748A] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#111A2E]">
          Aucune donnée analytique disponible
        </h3>
        <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
          Créez une première habitude pour activer le cadran circulaire et les diagnostics de constance.
        </p>
      </div>
    );
  }

  // Find strongest weekday
  const strongestDayIndex = React.useMemo(() => {
    if (!analytics) return -1;
    let best = -1;
    let maxRate = 0;
    for (const item of WEEKDAY_LOCALE_ORDER) {
      const rate = analytics.weekdayRates[item.index] || 0;
      if (rate > maxRate && rate >= 50) {
        maxRate = rate;
        best = item.index;
      }
    }
    return best;
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* 1. Compact Editorial Header & Controls Bar */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#68748A]">
            <Sparkles className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Intelligence Comportementale</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#059669]">
              <Lock className="w-3 h-3" />
              <span>Données privées & chiffrées</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#111A2E] tracking-tight mt-0.5">
            Cadran & Statistiques de Régularité
          </h2>
        </div>

        {/* Filters: Habit Dropdown & Segmented Period Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#68748A] shrink-0">
              Routine :
            </label>
            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg text-[#182235] font-semibold focus:outline-none focus:border-[#2855D9] max-w-[200px] truncate"
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-lg border border-[#E4E8F0] text-xs font-semibold">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  rangeDays === days
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#182235]"
                }`}
              >
                {days} j
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Unified KPI Horizontal Strip (No redundant identical boxes) */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E8F0]">
          {/* KPI 1: Completion Rate (with mini circular SVG arc) */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
                Taux de Régularité
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-[#111A2E] font-tabular">
                  {analytics ? `${analytics.completionRate}%` : "—"}
                </span>
                {analytics && analytics.trendComparedToPreviousPeriod !== 0 && (
                  <span
                    className={`text-[11px] font-mono font-bold flex items-center ${
                      analytics.trendComparedToPreviousPeriod > 0
                        ? "text-[#059669]"
                        : "text-[#DC2626]"
                    }`}
                  >
                    {analytics.trendComparedToPreviousPeriod > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    <span>
                      {analytics.trendComparedToPreviousPeriod > 0 ? "+" : ""}
                      {analytics.trendComparedToPreviousPeriod}%
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#68748A] mt-0.5">
                {analytics
                  ? `${analytics.completedDays} sur ${analytics.totalEligibleDays} sessions prévues`
                  : "Calcul..."}
              </p>
            </div>

            {/* Subtle Mini SVG Ring */}
            <div className="w-11 h-11 shrink-0 relative flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                <path
                  className="text-[#EDF2FF]"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#2855D9] transition-all duration-700 ease-out"
                  strokeDasharray={`${analytics?.completionRate || 0}, 100`}
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          {/* KPI 2: Current & Longest Streak */}
          <div className="p-5 flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
              Série Active
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#D97706] font-tabular flex items-center gap-1">
                <Flame className="w-6 h-6 fill-current inline" />
                <span>{analytics ? analytics.currentStreak : 0} j</span>
              </span>
              <span className="text-xs text-[#68748A] font-mono">
                / max {analytics?.longestStreak || 0} j
              </span>
            </div>
            <p className="text-[11px] text-[#68748A] mt-0.5">
              Jours consécutifs sans rupture de rythme
            </p>
          </div>

          {/* KPI 3: Capacité de Rebond */}
          <div className="p-5 flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
              Capacité de Rebond
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#059669] font-tabular">
                {analytics ? `${analytics.recoveryRate}%` : "—"}
              </span>
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
            </div>
            <p className="text-[11px] text-[#68748A] mt-0.5">
              Reprise immédiate le jour suivant un manquement
            </p>
          </div>

          {/* KPI 4: Volume d'Effort */}
          <div className="p-5 flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
              Volume Validé
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#111A2E] font-tabular">
                {analytics ? analytics.completedDays : 0}
              </span>
              <span className="text-xs text-[#68748A] font-semibold">sessions</span>
            </div>
            <p className="text-[11px] text-[#68748A] mt-0.5">
              Sur la fenêtre sélectionnée ({rangeDays} jours)
            </p>
          </div>
        </div>
      </div>

      {/* 3. The Centerpiece: Interactive Circular Habit Tracker (Radial Polar Wheel) */}
      <CircularHabitDial
        habits={habits}
        selectedHabitId={selectedHabitId}
        onSelectHabit={setSelectedHabitId}
        rangeDays={rangeDays}
      />

      {/* 4. Transformed Weekday Consistency Visualization (7 Ultra-Fine Pillar Tracks) */}
      {analytics && (
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#111A2E] tracking-tight flex items-center gap-2">
                <span>Profil de Régularité Hebdomadaire</span>
              </h3>
              <p className="text-xs text-[#68748A] mt-0.5">
                Distribution fine des taux de succès du Lundi au Dimanche pour détecter vos zones de friction.
              </p>
            </div>

            {strongestDayIndex !== -1 && (
              <span className="text-[11px] font-mono font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0] w-fit">
                ★ Point fort : {WEEKDAY_LOCALE_ORDER.find((w) => w.index === strongestDayIndex)?.fullName} ({analytics.weekdayRates[strongestDayIndex]}%)
              </span>
            )}
          </div>

          {/* 7 Compact Vertical Pillar Tracks */}
          <div className="pt-2">
            <div className="grid grid-cols-7 gap-3 sm:gap-6 max-w-2xl mx-auto items-end py-4">
              {WEEKDAY_LOCALE_ORDER.map(({ index: dayIdx, label, fullName }) => {
                const rate = analytics.weekdayRates[dayIdx] || 0;
                const isStrongest = dayIdx === strongestDayIndex;
                const isZero = rate === 0;

                return (
                  <div
                    key={dayIdx}
                    className="group flex flex-col items-center gap-2 relative"
                    title={`${fullName} : ${rate}% de complétion`}
                  >
                    {/* Tooltip on Hover */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-mono font-bold bg-[#111A2E] text-white px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10">
                      {rate}%
                    </span>

                    {/* Fine 6px Vertical Pillar Track */}
                    <div className="w-2 sm:w-2.5 h-28 bg-[#F4F6FA] rounded-full flex flex-col justify-end p-0.5 overflow-hidden border border-[#E4E8F0]">
                      <div
                        className={`w-full rounded-full transition-all duration-700 ease-out ${
                          isStrongest
                            ? "bg-gradient-to-t from-[#059669] to-[#10B981]"
                            : rate > 50
                            ? "bg-gradient-to-t from-[#2855D9] to-[#4776F2]"
                            : rate > 0
                            ? "bg-gradient-to-t from-[#D97706] to-[#F59E0B]"
                            : "bg-transparent"
                        }`}
                        style={{ height: `${Math.max(0, rate)}%` }}
                      />
                    </div>

                    {/* Day Label */}
                    <div className="text-center">
                      <span
                        className={`text-[11px] font-mono font-bold block ${
                          isStrongest ? "text-[#059669]" : "text-[#182235]"
                        }`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-tabular ${
                          isZero ? "text-[#A0AEC0]" : "text-[#68748A]"
                        }`}
                      >
                        {rate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Behavioral Diagnostics Cards (Refined & Actionable) */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#111A2E] tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2855D9]" />
            <span>Diagnostics Comportementaux & Recommandations Factuelles</span>
          </h3>
          <p className="text-xs text-[#68748A] mt-0.5">
            Analyses objectives issues de vos données réelles. Nous distinguons strictement faits observés, hypothèses et ajustements pratiques.
          </p>
        </div>

        {analytics && analytics.diagnostics.length === 0 ? (
          <p className="text-xs text-[#68748A] py-4 text-center">
            Historique insuffisant pour établir un diagnostic comportemental fiable. Continuez d'enregistrer vos sessions.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {analytics?.diagnostics.map((diag) => {
              const isObserved = diag.type === "observed";
              const isExplanation = diag.type === "explanation";
              const isAdjustment = diag.type === "adjustment";

              return (
                <div
                  key={diag.id}
                  className="bg-white border border-[#E4E8F0] hover:border-[#D8DFEB] rounded-xl p-4 transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            isObserved
                              ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                              : isExplanation
                              ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                              : "bg-[#EDF2FF] text-[#2855D9] border border-[#BFDBFE]"
                          }`}
                        >
                          {isObserved
                            ? "Fait Observé"
                            : isExplanation
                            ? "Hypothèse Comportementale"
                            : "Ajustement Conseillé"}
                        </span>
                        <h4 className="text-xs font-bold text-[#111A2E]">
                          {diag.title}
                        </h4>
                      </div>
                      <p className="text-xs text-[#68748A] leading-relaxed">
                        {diag.description}
                      </p>
                    </div>

                    {diag.actionable && (
                      <button
                        onClick={() => handleApplyAdjustment(diag)}
                        disabled={applyingDiagId === diag.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer shrink-0 w-fit"
                      >
                        {applyingDiagId === diag.id ? (
                          <span>Application...</span>
                        ) : (
                          <>
                            <span>Appliquer</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
