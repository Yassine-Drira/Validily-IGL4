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
  BarChart3,
  Target,
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

  const isWeeklyTargetHabit = activeHabit?.frequency_type === "weekly_count";
  const isQuantitativeHabit = activeHabit?.habit_type === "quantitative";

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
          <div className="flex items-baseline gap-3 mt-0.5">
            <h2 className="text-lg font-bold text-[#111A2E] tracking-tight">
              Cadran & Statistiques de Régularité
            </h2>
            {analytics && (
              <span className="text-[11px] font-mono text-[#68748A]">
                {analytics.isNewHabit
                  ? `(Ligne de base : ${analytics.observationDays}j)`
                  : `(${analytics.observationDays}j réels observés)`}
              </span>
            )}
          </div>
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

      {/* 2. Unified KPI Horizontal Strip (Mathematical, Dynamic, Honest) */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E8F0]">
          {/* KPI 1: Scheduled Completion Rate (Taux de Régularité) */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
                Taux de Régularité
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-[#111A2E] font-tabular">
                  {analytics ? `${analytics.completionRate}%` : "—"}
                </span>

                {/* Trend versus previous period (percentage points) */}
                {analytics && analytics.hasPreviousPeriodBaseline && analytics.trendComparedToPreviousPeriod !== null && (
                  <span
                    className={`text-[11px] font-mono font-bold flex items-center ${
                      analytics.trendComparedToPreviousPeriod > 0
                        ? "text-[#059669]"
                        : analytics.trendComparedToPreviousPeriod < 0
                        ? "text-[#DC2626]"
                        : "text-[#68748A]"
                    }`}
                    title={`Évolution de ${analytics.trendComparedToPreviousPeriod > 0 ? "+" : ""}${analytics.trendComparedToPreviousPeriod} points par rapport à la période précédente`}
                  >
                    {analytics.trendComparedToPreviousPeriod > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : analytics.trendComparedToPreviousPeriod < 0 ? (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    ) : null}
                    <span>
                      {analytics.trendComparedToPreviousPeriod > 0 ? "+" : ""}
                      {analytics.trendComparedToPreviousPeriod} pts
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#68748A] mt-0.5">
                {analytics
                  ? analytics.isNewHabit
                    ? `${analytics.completedDays}/${analytics.evaluatedDays} validés (ligne de base)`
                    : `${analytics.completedDays} sur ${analytics.evaluatedDays} opportunités évaluées`
                  : "Calcul..."}
              </p>
            </div>

            {/* Restrained Mini SVG Ring */}
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

          {/* KPI 2: Recurrence-Aware Streak */}
          <div className="p-5 flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
              Série Active
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#D97706] font-tabular flex items-center gap-1">
                <Flame className="w-6 h-6 fill-current inline" />
                <span>
                  {analytics ? analytics.currentStreak : 0}{" "}
                  {isWeeklyTargetHabit ? "sem." : "j"}
                </span>
              </span>
              <span className="text-xs text-[#68748A] font-mono">
                / max {analytics?.longestStreak || 0} {isWeeklyTargetHabit ? "sem." : "j"}
              </span>
            </div>
            <p className="text-[11px] text-[#68748A] mt-0.5">
              {isWeeklyTargetHabit
                ? "Semaines consécutives avec cible atteinte"
                : "Jours consécutifs sans rupture de rythme"}
            </p>
          </div>

          {/* KPI 3: Capacité de Rebond (Honest Null & Baseline States) */}
          <div className="p-5 flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
              Capacité de Rebond
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#059669] font-tabular">
                {analytics?.hasRecoveryData && analytics.recoveryRate !== null
                  ? `${analytics.recoveryRate}%`
                  : analytics && analytics.missedDays === 0
                  ? "100%"
                  : "—"}
              </span>
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
            </div>
            <p className="text-[11px] text-[#68748A] mt-0.5">
              {analytics?.hasRecoveryData
                ? `${analytics.recoveryNumerator}/${analytics.recoveryDenominator} reprises après coupure`
                : analytics && analytics.missedDays === 0
                ? "Assiduité sans faute (0 interruption)"
                : "Historique de rupture insuffisant"}
            </p>
          </div>

          {/* KPI 4: Contextual Dynamic Metric (Target Attainment vs Volume vs Consistency) */}
          <div className="p-5 flex flex-col justify-center">
            {isQuantitativeHabit && analytics?.quantitativeProgress ? (
              <>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
                  Volume Réalisé
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-[#111A2E] font-tabular">
                    {analytics.quantitativeProgress.totalLogged}
                  </span>
                  <span className="text-xs text-[#68748A] font-mono">
                    / {analytics.quantitativeProgress.totalTarget} {analytics.quantitativeProgress.unit}
                  </span>
                </div>
                <p className="text-[11px] text-[#68748A] mt-0.5">
                  {analytics.quantitativeProgress.progressPercentage}% de la cible cumulée
                </p>
              </>
            ) : isWeeklyTargetHabit && analytics?.weeklyTargetAttainment ? (
              <>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
                  Cible Hebdomadaire
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-[#2855D9] font-tabular">
                    {analytics.weeklyTargetAttainment.completedThisWeek}
                  </span>
                  <span className="text-xs text-[#68748A] font-mono">
                    / {analytics.weeklyTargetAttainment.targetDaysPerWeek} sessions
                  </span>
                </div>
                <p className="text-[11px] text-[#68748A] mt-0.5">
                  {analytics.weeklyTargetAttainment.weeksMet}/{analytics.weeklyTargetAttainment.weeksObserved} sem. atteintes ({analytics.weeklyTargetAttainment.attainmentRate}%)
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#68748A] block">
                  Indice de Constance
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-[#111A2E] font-tabular">
                    {analytics ? `${analytics.consistencyScore}%` : "—"}
                  </span>
                  <Target className="w-4 h-4 text-[#2855D9]" />
                </div>
                <p className="text-[11px] text-[#68748A] mt-0.5">
                  {analytics ? `${analytics.completedDays} sessions sur ${analytics.observationDays}j` : "Calcul..."}
                </p>
              </>
            )}
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

      {/* 4. Weekday Consistency Visualization (7 Compact Pillars with Non-Scheduled Handling) */}
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
                const isScheduled =
                  activeHabit.frequency_type !== "specific_days" ||
                  activeHabit.scheduled_days.includes(dayIdx);

                const rate = analytics.weekdayRates[dayIdx] || 0;
                const isStrongest = dayIdx === strongestDayIndex && isScheduled;

                return (
                  <div
                    key={dayIdx}
                    className="group flex flex-col items-center gap-2 relative"
                    title={
                      isScheduled
                        ? `${fullName} : ${rate}% de complétion`
                        : `${fullName} : Jour non programmé`
                    }
                  >
                    {/* Tooltip on Hover */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-mono font-bold bg-[#111A2E] text-white px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10 whitespace-nowrap">
                      {isScheduled ? `${rate}%` : "Repos"}
                    </span>

                    {/* Fine 6px Vertical Pillar Track */}
                    <div className="w-2 sm:w-2.5 h-28 bg-[#F4F6FA] rounded-full flex flex-col justify-end p-0.5 overflow-hidden border border-[#E4E8F0]">
                      {isScheduled ? (
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
                      ) : (
                        <div className="w-full h-1 bg-[#CBD5E1] rounded-full self-center my-auto" />
                      )}
                    </div>

                    {/* Day Label */}
                    <div className="text-center">
                      <span
                        className={`text-[11px] font-mono font-bold block ${
                          !isScheduled
                            ? "text-[#A0AEC0]"
                            : isStrongest
                            ? "text-[#059669]"
                            : "text-[#182235]"
                        }`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-tabular ${
                          !isScheduled
                            ? "text-[#CBD5E1]"
                            : rate === 0
                            ? "text-[#A0AEC0]"
                            : "text-[#68748A]"
                        }`}
                      >
                        {isScheduled ? `${rate}%` : "—"}
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

        <div className="space-y-3">
          {analytics?.diagnostics.map((diag) => {
            const isObserved = diag.type === "observed";
            const isAdjustment = diag.type === "adjustment";
            const isExplanation = diag.type === "explanation";

            return (
              <div
                key={diag.id}
                className={`p-4 rounded-xl border transition-all ${
                  isObserved
                    ? "bg-[#FAFAF7] border-[#E4E8F0]"
                    : isAdjustment
                    ? "bg-[#EDF2FF]/60 border-[#2855D9]/20"
                    : "bg-[#FFFFFF] border-[#E4E8F0]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isObserved
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                            : isAdjustment
                            ? "bg-[#2855D9] text-white"
                            : "bg-[#F4F6FA] text-[#68748A] border border-[#E4E8F0]"
                        }`}
                      >
                        {isObserved
                          ? "Fait Observé"
                          : isAdjustment
                          ? "Ajustement Recommandé"
                          : "Hypothèse"}
                      </span>
                      <h4 className="text-xs font-bold text-[#111A2E]">
                        {diag.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#68748A] leading-relaxed">
                      {diag.description}
                    </p>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-3 shrink-0">
                    {diag.metricValue && (
                      <span className="text-xs font-mono font-bold text-[#111A2E] bg-white px-2.5 py-1 rounded-lg border border-[#E4E8F0]">
                        {diag.metricValue}
                      </span>
                    )}

                    {isAdjustment && diag.actionable && (
                      <button
                        type="button"
                        onClick={() => handleApplyAdjustment(diag)}
                        disabled={applyingDiagId === diag.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E42AC] active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span>Appliquer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
