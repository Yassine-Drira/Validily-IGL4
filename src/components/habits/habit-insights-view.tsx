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
} from "lucide-react";
import type {
  HabitWithTodayState,
  HabitAnalyticsSummary,
  HabitDiagnostic,
  AcademicGoal,
} from "@/types/database";
import { HabitIcon } from "./habit-icon";
import {
  getHabitAnalyticsAction,
  applyDiagnosticAdjustmentAction,
} from "@/lib/actions/habit-actions";

interface HabitInsightsViewProps {
  habits: HabitWithTodayState[];
  goals: AcademicGoal[];
  onRefresh: () => void;
}

const WEEKDAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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
          // Reload current analytics
          const updatedAnalytics = await getHabitAnalyticsAction(
            activeHabit.id,
            rangeDays
          );
          if (updatedAnalytics.success && updatedAnalytics.data) {
            setAnalytics(updatedAnalytics.data);
          }
        }
      } finally {
        setApplyingDiagId(null);
      }
    }
  };

  if (habits.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-12 text-center shadow-xs">
        <Activity className="w-10 h-10 text-[#68748A] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#111A2E]">
          Aucune donnée analytique disponible
        </h3>
        <p className="text-xs text-[#68748A] mt-1">
          Créez une première habitude pour activer les diagnostics comportementaux et l'analyse de régularité.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Habit Selector & Time Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs">
        {/* Habit Selector Dropdown */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <label className="text-xs font-semibold text-[#68748A] shrink-0">
            Habitude analysée :
          </label>
          <select
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg text-[#182235] font-semibold focus:outline-none focus:border-[#2855D9] max-w-xs truncate"
          >
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.currentStreak}j de série)
              </option>
            ))}
          </select>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-lg border border-[#E4E8F0] text-xs font-semibold shrink-0">
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
              {days} jours
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#68748A] font-semibold">
            <span>Taux de régularité</span>
            <CheckCircle2 className="w-4 h-4 text-[#2855D9]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#111A2E] font-tabular">
              {analytics ? `${analytics.completionRate}%` : "—"}
            </span>
            {analytics && analytics.trendComparedToPreviousPeriod !== 0 && (
              <span
                className={`text-[11px] font-mono font-bold flex items-center gap-0.5 ${
                  analytics.trendComparedToPreviousPeriod > 0
                    ? "text-[#059669]"
                    : "text-[#DC2626]"
                }`}
              >
                {analytics.trendComparedToPreviousPeriod > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {analytics.trendComparedToPreviousPeriod > 0 ? "+" : ""}
                  {analytics.trendComparedToPreviousPeriod}%
                </span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#68748A]">
            {analytics
              ? `${analytics.completedDays} validés sur ${analytics.totalEligibleDays} jours programmés`
              : "Chargement..."}
          </p>
        </div>

        {/* Current & Longest Streak */}
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#68748A] font-semibold">
            <span>Série actuelle / Record</span>
            <Flame className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#D97706] font-tabular">
              {analytics ? `${analytics.currentStreak} j` : "—"}
            </span>
            <span className="text-xs text-[#68748A] font-mono">
              / max {analytics ? `${analytics.longestStreak} j` : "—"}
            </span>
          </div>
          <p className="text-[11px] text-[#68748A]">
            Jours consécutifs d'exécution sans rupture
          </p>
        </div>

        {/* Recovery Resilience Rate */}
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#68748A] font-semibold">
            <span>Capacité de rebond</span>
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#059669] font-tabular">
              {analytics ? `${analytics.recoveryRate}%` : "—"}
            </span>
          </div>
          <p className="text-[11px] text-[#68748A]">
            Reprise immédiate le lendemain d'une session manquée
          </p>
        </div>

        {/* Sessions Completed */}
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#68748A] font-semibold">
            <span>Volume d'effort</span>
            <Activity className="w-4 h-4 text-[#4776F2]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#111A2E] font-tabular">
              {analytics ? analytics.completedDays : "—"}
            </span>
            <span className="text-xs text-[#68748A]">sessions</span>
          </div>
          <p className="text-[11px] text-[#68748A]">
            Sur les {rangeDays} derniers jours calendaires
          </p>
        </div>
      </div>

      {/* 3. Day of Week Consistency Analysis */}
      {analytics && (
        <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#111A2E] tracking-tight">
              Régularité par Jour de la Semaine
            </h3>
            <p className="text-xs text-[#68748A] mt-0.5">
              Identifiez vos journées les plus productives et les créneaux soumis à des frictions.
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
              const rate = analytics.weekdayRates[dayIdx] || 0;
              const isBest = rate >= 75;
              const isFriction = rate <= 30 && rate > 0;

              return (
                <div
                  key={dayIdx}
                  className="flex flex-col items-center p-2.5 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg text-center"
                >
                  <span className="text-xs font-bold text-[#182235]">
                    {WEEKDAY_SHORT[dayIdx]}
                  </span>
                  <div className="w-full h-16 bg-[#EDF2FF] rounded-md my-2 flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-xs transition-all duration-500 ${
                        rate >= 70
                          ? "bg-[#059669]"
                          : rate >= 40
                          ? "bg-[#2855D9]"
                          : rate > 0
                          ? "bg-[#D97706]"
                          : "bg-transparent"
                      }`}
                      style={{ height: `${Math.max(4, rate)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#182235]">
                    {rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Grounded Consistency Diagnostics */}
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
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
          <div className="space-y-3 pt-2">
            {analytics?.diagnostics.map((diag) => {
              const isObserved = diag.type === "observed";
              const isExplanation = diag.type === "explanation";
              const isAdjustment = diag.type === "adjustment";

              return (
                <div
                  key={diag.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isObserved
                      ? "bg-[#F0FDF4] border-[#BBF7D0]"
                      : isExplanation
                      ? "bg-[#FFFBEB] border-[#FDE68A]"
                      : "bg-[#EFF6FF] border-[#BFDBFE]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            isObserved
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : isExplanation
                              ? "bg-[#FEF3C7] text-[#92400E]"
                              : "bg-[#DBEAFE] text-[#1E40AF]"
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
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {diag.description}
                      </p>
                    </div>

                    {diag.actionable && (
                      <button
                        onClick={() => handleApplyAdjustment(diag)}
                        disabled={applyingDiagId === diag.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer shrink-0"
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
