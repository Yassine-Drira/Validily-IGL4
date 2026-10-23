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

  return (
    <div className="space-y-6">
      {/* Top Banner & Telemetry Bar */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Coach IA & Tuteur Personnel</h1>
              <p className="text-xs text-slate-400">
                Assistant conversationnel contextuel & planification autonome pour l'IGL4
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <TelemetryBadge
            telemetry={plan.telemetry}
            onRefresh={() => handleRefresh(true)}
            isRefreshing={isRefreshing}
          />
          <Link
            href="/planner"
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ouvrir l'Emploi du Temps</span>
          </Link>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on < lg screens) */}
      <div className="lg:hidden flex items-center gap-1.5 border-b border-slate-800 pb-2">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "chat"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat Coach IA</span>
        </button>

        <button
          onClick={() => setMobileTab("timeline")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "timeline"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Aujourd'hui ({plan.freeSlots.length} créneaux)</span>
        </button>

        <button
          onClick={() => setMobileTab("weaknesses")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "weaknesses"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Faiblesses ({plan.weakPoints.length})</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Conversational Workspace (Col 7 or 8 on desktop, or mobileTab === "chat") */}
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
          {/* Sidebar Tabs */}
          <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setSidebarTab("timeline")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                sidebarTab === "timeline"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Emploi du temps</span>
            </button>

            <button
              onClick={() => setSidebarTab("weaknesses")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                sidebarTab === "weaknesses"
                  ? "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Brain className="w-3 h-3" />
              <span>Points faibles ({plan.weakPoints.length})</span>
            </button>

            <button
              onClick={() => setSidebarTab("recommendations")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                sidebarTab === "recommendations"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ListTodo className="w-3 h-3" />
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
