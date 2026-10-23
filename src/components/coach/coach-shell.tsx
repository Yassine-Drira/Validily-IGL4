"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Calendar,
  Brain,
  Layers,
  Clock,
  ArrowRight,
  RefreshCw,
  Flame,
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
import { useFocus } from "@/components/focus/focus-provider";
import Link from "next/link";

interface CoachShellProps {
  initialPlan: AIPlanResponse;
}

export function CoachShell({ initialPlan }: CoachShellProps) {
  const [plan, setPlan] = useState<AIPlanResponse>(initialPlan);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"coach" | "weaknesses">("coach");

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [activeDrill, setActiveDrill] = useState<AdaptiveDrill | null>(null);
  const [isDrillLoading, setIsDrillLoading] = useState(false);

  // Focus provider
  const { setIsModalOpen: openFocusModal } = useFocus();

  // Refresh plan
  const handleRefresh = async (force: boolean = true) => {
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Telemetry Bar */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Coach IA & Tuteur Personnel</h1>
          </div>
          <p className="text-xs text-slate-400">
            {plan.overview}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <TelemetryBadge
            telemetry={plan.telemetry}
            onRefresh={() => handleRefresh(true)}
            isRefreshing={isRefreshing}
          />
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/planner"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ouvrir l'Emploi du Temps</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("coach")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "coach"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Aujourd'hui & Plan d'Action</span>
        </button>

        <button
          onClick={() => setActiveTab("weaknesses")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "weaknesses"
              ? "bg-amber-600/20 text-amber-300 border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Points Faibles & Rétention ({plan.weakPoints.length})</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === "coach" ? (
        <div className="space-y-6">
          {/* Today Timeline & Availability Gauge */}
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

          {/* Coaching Recommendations */}
          <CoachingCards
            recommendations={plan.recommendations}
            onActionClick={handleRecommendationAction}
            isLoading={isRefreshing}
          />
        </div>
      ) : (
        /* Weakness & Spaced Repetition Matrix */
        <WeaknessMatrix
          masteryList={plan.weakPoints}
          onStartDrill={(subId) => handleStartDrill(subId)}
        />
      )}

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
