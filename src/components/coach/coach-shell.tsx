"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Calendar,
  Brain,
  Layers,
  Clock,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  BarChart3,
  ListTodo,
  Flame,
  Zap,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import type {
  AIPlanResponse,
  CoachingRecommendation,
  ProposedTimeblock,
  AdaptiveDrill,
} from "@/lib/ai/types";
import {
  getCoachingPlanAction,
  applyProposedTimeblockAction,
  generateAdaptiveDrillAction,
} from "@/lib/actions/coach-actions";
import { TelemetryBadge } from "./telemetry-badge";
import { TodayTimeline } from "./today-timeline";
import { CoachingCards } from "./coaching-cards";
import { WeaknessMatrix } from "./weakness-matrix";
import { ScheduleDiffModal } from "./schedule-diff-modal";
import { AdaptiveDrillModal } from "./adaptive-drill-modal";
import { CoachChatThread } from "./coach-chat-thread";
import { useFocus } from "@/components/focus/focus-provider";
import Link from "next/link";

interface CoachShellProps {
  initialPlan: AIPlanResponse;
}

export function CoachShell({ initialPlan }: CoachShellProps) {
  const [plan, setPlan] = useState<AIPlanResponse>(initialPlan);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mobile / compact tab navigation: "chat" is default primary
  const [mobileTab, setMobileTab] = useState<"chat" | "timeline" | "weaknesses">("chat");
  // Sidebar tab for desktop
  const [sidebarTab, setSidebarTab] = useState<"timeline" | "weaknesses" | "recommendations">("timeline");

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [activeDrill, setActiveDrill] = useState<AdaptiveDrill | null>(null);
  const [isDrillLoading, setIsDrillLoading] = useState(false);

  // Focus provider
  const { setIsModalOpen: openFocusModal } = useFocus();

  // Refresh plan
  const handleRefresh = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await getCoachingPlanAction(plan.date, force);
      if (res.success && res.data) {
        setPlan(res.data);
      }
    } catch (err) {
      console.error("Refresh coach error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Launch targeted drill
  const handleStartDrill = async (subjectId?: string) => {
    setIsDrillModalOpen(true);
    setIsDrillLoading(true);
    try {
      const res = await generateAdaptiveDrillAction(subjectId, 3);
      if (res.success && res.data) {
        setActiveDrill(res.data);
      }
    } catch (err) {
      console.error("Error generating drill:", err);
    } finally {
      setIsDrillLoading(false);
    }
  };

  // Handle recommendation action
  const handleRecommendationAction = async (rec: CoachingRecommendation) => {
    switch (rec.action.actionType) {
      case "schedule_block":
        setIsScheduleModalOpen(true);
        break;
      case "start_drill":
        handleStartDrill(rec.relatedSubjectId || undefined);
        break;
      case "start_focus":
        openFocusModal(true);
        break;
      default:
        break;
    }
  };

  // Apply single block
  const handleApplyBlock = async (block: ProposedTimeblock) => {
    return await applyProposedTimeblockAction(block);
  };

  const weakestSubject = plan.weakPoints.length > 0 ? plan.weakPoints[0].subjectName : undefined;
  const totalFreeMinutes = plan.freeSlots.reduce((acc, s) => acc + s.durationMinutes, 0);

  // Cognitive readiness score calculation
  const cognitiveReadiness = totalFreeMinutes >= 180 ? 94 : totalFreeMinutes >= 90 ? 82 : 68;

  return (
    <div className="space-y-6">
      {/* Executive Intelligence Cockpit - Top Banner */}
      <div className="luxury-glass rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-10 w-80 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 ring-1 ring-white/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-950 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-slate-950" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  Coach IA & Tuteur Personnel
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm">
                  Executive AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Système autonome de conseil stratégique, analyse d'oubli synaptique et arbitrage d'emploi du temps
              </p>
            </div>
          </div>

          {/* Quick Cockpit Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openFocusModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Démarrer un Focus (Pomodoro)</span>
            </button>

            <Link
              href="/planner"
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-colors flex items-center gap-2 border border-white/10 shadow-sm"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Ouvrir l'Emploi du Temps</span>
            </Link>

            <TelemetryBadge
              telemetry={plan.telemetry}
              onRefresh={() => handleRefresh(true)}
              isRefreshing={isRefreshing}
            />
          </div>
        </div>

        {/* Cognitive Velocity & Readiness Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/[0.08] relative z-10">
          <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/[0.06] backdrop-blur-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Temps Libre
            </span>
            <p className="text-sm sm:text-base font-extrabold text-white mt-1 font-tabular">
              {Math.floor(totalFreeMinutes / 60)}h {totalFreeMinutes % 60}m
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/[0.06] backdrop-blur-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Indice Cognitif
            </span>
            <p className="text-sm sm:text-base font-extrabold text-emerald-300 mt-1 font-tabular flex items-center gap-1.5">
              <span>{cognitiveReadiness}%</span>
              <span className="text-[10px] font-semibold text-slate-400">
                ({cognitiveReadiness > 80 ? "Optimal" : "Saturé"})
              </span>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/[0.06] backdrop-blur-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              Sujet le Plus Fragile
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-amber-300 mt-1 truncate">
              {weakestSubject || "Aucun point critique"}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/[0.06] backdrop-blur-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Conflits Détectés
            </span>
            <p className="text-sm sm:text-base font-extrabold text-white mt-1 font-tabular">
              {plan.conflicts.length === 0 ? "0 chevauchement" : `${plan.conflicts.length} alerte(s)`}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on < lg screens) */}
      <div className="lg:hidden flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "chat"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20"
              : "bg-slate-900/80 text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat Maestro AI</span>
        </button>

        <button
          onClick={() => setMobileTab("timeline")}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "timeline"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20"
              : "bg-slate-900/80 text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda ({plan.freeSlots.length})</span>
        </button>

        <button
          onClick={() => setMobileTab("weaknesses")}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "weaknesses"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20"
              : "bg-slate-900/80 text-slate-400 hover:text-white"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Points Faibles ({plan.weakPoints.length})</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Conversational Workspace (Col 7 or 8 on desktop) */}
        <div
          className={`lg:col-span-7 xl:col-span-8 ${
            mobileTab !== "chat" ? "hidden lg:block" : "block"
          }`}
        >
          <CoachChatThread
            date={plan.date}
            availableMinutes={plan.availableMinutes}
            bookedMinutes={plan.bookedMinutes}
            activeTasksCount={plan.recommendations.length}
            weakestSubjectName={weakestSubject}
            freeSlotsCount={plan.freeSlots.length}
            onApplyBlock={handleApplyBlock}
            onStartDrill={handleStartDrill}
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onRefreshContext={() => handleRefresh(false)}
          />
        </div>

        {/* Supporting Context & Live Insights Sidebar (Col 5 or 4 on desktop) */}
        <div
          className={`lg:col-span-5 xl:col-span-4 space-y-4 ${
            mobileTab === "chat" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Sidebar Luxury Segmented Control */}
          <div className="luxury-glass p-1.5 rounded-2xl border border-white/10 flex items-center gap-1.5 backdrop-blur-xl">
            <button
              onClick={() => setSidebarTab("timeline")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                sidebarTab === "timeline"
                  ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Planning</span>
            </button>

            <button
              onClick={() => setSidebarTab("weaknesses")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                sidebarTab === "weaknesses"
                  ? "bg-amber-600/30 text-amber-200 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Faiblesses ({plan.weakPoints.length})</span>
            </button>

            <button
              onClick={() => setSidebarTab("recommendations")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                sidebarTab === "recommendations"
                  ? "bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Actions</span>
            </button>
          </div>

          {/* Sidebar Tab Content */}
          {sidebarTab === "timeline" && (
            <div className="space-y-4">
              <TodayTimeline
                date={plan.date}
                availableMinutes={plan.availableMinutes}
                bookedMinutes={plan.bookedMinutes}
                freeSlots={plan.freeSlots}
                existingBlocks={[]}
                conflicts={plan.conflicts}
                onOpenScheduleProposal={() => setIsScheduleModalOpen(true)}
                proposedCount={plan.proposedSchedule.length}
              />
            </div>
          )}

          {sidebarTab === "weaknesses" && (
            <div className="space-y-4">
              <WeaknessMatrix
                masteryList={plan.weakPoints}
                onStartDrill={(subId) => handleStartDrill(subId)}
              />
            </div>
          )}

          {sidebarTab === "recommendations" && (
            <div className="space-y-4">
              <CoachingCards
                recommendations={plan.recommendations}
                onActionClick={handleRecommendationAction}
                isLoading={isRefreshing}
              />
            </div>
          )}
        </div>
      </div>

      {/* Schedule Diff Modal */}
      <ScheduleDiffModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        proposedBlocks={plan.proposedSchedule}
        existingBlocks={[]}
        onApplyBlock={handleApplyBlock}
        onRefresh={() => handleRefresh(true)}
      />

      {/* Adaptive Drill Modal */}
      <AdaptiveDrillModal
        isOpen={isDrillModalOpen}
        onClose={() => setIsDrillModalOpen(false)}
        drill={activeDrill}
        isLoading={isDrillLoading}
      />
    </div>
  );
}
