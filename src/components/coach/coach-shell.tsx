"use client";

import React, { useState, useEffect } from "react";
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
  Crown,
  AlertTriangle,
  BookOpen,
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
  generateRAGQuizAction,
  getAcademicCoachKPIsAction,
  type AcademicKPIsData,
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
  const [kpis, setKpis] = useState<AcademicKPIsData | null>(null);
  
  // Mobile / compact tab navigation: "chat" is default primary
  const [mobileTab, setMobileTab] = useState<"chat" | "timeline" | "weaknesses">("chat");
  // Sidebar tab for desktop
  const [sidebarTab, setSidebarTab] = useState<"timeline" | "weaknesses" | "recommendations">("timeline");

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [activeDrill, setActiveDrill] = useState<AdaptiveDrill | null>(null);
  const [isDrillLoading, setIsDrillLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Focus provider
  const { setIsModalOpen: openFocusModal } = useFocus();

  // Load authentic KPIs on mount & on date changes
  const loadKpis = async () => {
    try {
      const res = await getAcademicCoachKPIsAction(plan.date);
      if (res.success && res.data) {
        setKpis(res.data);
      }
    } catch (err) {
      console.error("Error loading KPIs:", err);
    }
  };

  useEffect(() => {
    loadKpis();
  }, [plan.date]);

  // Refresh plan
  const handleRefresh = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const [planRes, kpiRes] = await Promise.all([
        getCoachingPlanAction(plan.date, force),
        getAcademicCoachKPIsAction(plan.date),
      ]);
      if (planRes.success && planRes.data) {
        setPlan(planRes.data);
      }
      if (kpiRes.success && kpiRes.data) {
        setKpis(kpiRes.data);
      }
    } catch (err) {
      console.error("Refresh coach error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Launch targeted drill directly
  const handleStartDrill = async (subjectId?: string) => {
    setIsDrillModalOpen(true);
    setIsDrillLoading(true);
    setGenerationError(null);
    try {
      const res = await generateAdaptiveDrillAction(subjectId, 3);
      if (res.success && res.data) {
        setActiveDrill(res.data);
      } else {
        setGenerationError(res.error || "Échec de génération du micro-drill.");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Erreur de connexion.");
    } finally {
      setIsDrillLoading(false);
    }
  };

  // Launch dynamic RAG quiz studio
  const handleOpenQuizStudio = () => {
    setActiveDrill(null);
    setGenerationError(null);
    setIsDrillModalOpen(true);
  };

  // Generate customized RAG quiz
  const handleGenerateCustomQuiz = async (params: {
    subjectId?: string;
    questionCount: number;
    difficulty: "beginner" | "intermediate" | "advanced";
  }) => {
    setIsDrillLoading(true);
    setGenerationError(null);
    try {
      const res = await generateRAGQuizAction({
        subjectId: params.subjectId,
        questionCount: params.questionCount,
        difficulty: params.difficulty,
      });

      if (res.success && res.data) {
        setActiveDrill(res.data);
        loadKpis(); // update quota meter
      } else {
        setGenerationError(res.error || "Matériel source insuffisant pour générer ce quiz.");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Erreur lors de la génération du quiz.");
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

  const totalFreeMinutes = kpis ? kpis.availableStudyMinutes : plan.freeSlots.reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <div className="space-y-6">
      {/* Executive Intelligence Cockpit - Top Banner */}
      <div className="bg-white/95 backdrop-blur-md border border-[#E4E8F0] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-10 w-96 h-36 bg-gradient-to-br from-[#2855D9]/5 via-[#4F46E5]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2855D9] via-[#3B82F6] to-[#4F46E5] flex items-center justify-center text-white shadow-md shadow-[#2855D9]/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111A2E]">
                  Validily AI
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EDF2FF] text-[#2855D9] border border-[#2855D9]/20 shadow-2xs font-mono">
                  Cockpit Pédagogique
                </span>
                {kpis?.quota?.isVip && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs flex items-center gap-1 font-mono">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>VIP Actif</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#68748A] mt-1">
                Système d'assistance académique fondé sur vos documents de cours, rétention mémorielle et emploi du temps
              </p>
            </div>
          </div>

          {/* Quick Cockpit Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="open-rag-quiz-studio-btn"
              onClick={handleOpenQuizStudio}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Studio Quiz RAG</span>
            </button>

            <button
              onClick={() => openFocusModal(true)}
              className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Démarrer un Focus</span>
            </button>

            <Link
              href="/planner"
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#111A2E] hover:text-[#2855D9] font-semibold text-xs transition-colors flex items-center gap-2 border border-[#E4E8F0] shadow-2xs"
            >
              <Calendar className="w-4 h-4 text-[#2855D9]" />
              <span>Emploi du Temps</span>
            </Link>

            <TelemetryBadge
              telemetry={plan.telemetry}
              onRefresh={() => handleRefresh(true)}
              isRefreshing={isRefreshing}
            />
          </div>
        </div>

        {/* Authentic Academic KPIs Strip (Calculated from real records) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-[#E4E8F0] relative z-10">
          {/* KPI 1: Prochaine Échéance Critique */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] hover:border-slate-300 hover:bg-white transition-all shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#68748A] tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
              Prochaine Échéance
            </span>
            {kpis?.nextDeadline ? (
              <div className="mt-1">
                <p className="text-xs sm:text-sm font-bold text-[#111A2E] truncate" title={kpis.nextDeadline.title}>
                  {kpis.nextDeadline.title}
                </p>
                <p className={`text-[11px] font-bold ${kpis.nextDeadline.urgency === "critical" ? "text-rose-600" : "text-amber-600"}`}>
                  Dans {kpis.nextDeadline.daysRemaining} jour{kpis.nextDeadline.daysRemaining > 1 ? "s" : ""}
                </p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#68748A] mt-1">
                Aucune échéance urgente
              </p>
            )}
          </div>

          {/* KPI 2: Temps Libre d'Étude */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] hover:border-slate-300 hover:bg-white transition-all shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#68748A] tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#059669]" />
              Temps Libre Restant
            </span>
            <p className="text-sm sm:text-base font-bold text-[#111A2E] mt-1 font-tabular">
              {totalFreeMinutes > 0 ? (
                `${Math.floor(totalFreeMinutes / 60)}h ${totalFreeMinutes % 60}m`
              ) : (
                <span className="text-[#68748A] font-bold text-xs sm:text-sm">0h 0m</span>
              )}
            </p>
            <p className="text-[10px] text-[#68748A] truncate mt-0.5">
              {totalFreeMinutes > 0 ? "Créneaux exploitables aujourd'hui" : "Planning complet ou temps écoulé"}
            </p>
          </div>

          {/* KPI 3: Quota Validily AI (Rolling 24h) */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] hover:border-slate-300 hover:bg-white transition-all shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#68748A] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
              Quota Validily AI
            </span>
            {kpis?.quota?.isVip ? (
              <p className="text-xs sm:text-sm font-bold text-amber-700 mt-1 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Illimité (VIP)</span>
              </p>
            ) : (
              <div className="mt-1">
                <p className="text-xs sm:text-sm font-bold text-[#111A2E] font-tabular">
                  <span className={kpis?.quota?.remaining === 0 ? "text-rose-600 font-bold" : "text-[#059669] font-bold"}>
                    {kpis?.quota?.remaining ?? 5}
                  </span>{" "}
                  / 5 requêtes
                </p>
                <p className="text-[10px] text-[#68748A]">24h glissantes</p>
              </div>
            )}
          </div>

          {/* KPI 4: Points de Vigilance (< 65%) */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] hover:border-slate-300 hover:bg-white transition-all shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#68748A] tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              Points de Vigilance
            </span>
            {kpis && kpis.vigilanceSubjects.length > 0 ? (
              <div className="mt-1">
                <p className="text-xs sm:text-sm font-bold text-amber-700 truncate" title={kpis.vigilanceSubjects[0].name}>
                  {kpis.vigilanceSubjects[0].name} ({kpis.vigilanceSubjects[0].accuracyRate}%)
                </p>
                <p className="text-[10px] text-[#68748A]">
                  {kpis.vigilanceSubjects.length} matière(s) &lt; 65%
                </p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#059669] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Excellente maîtrise</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on < lg screens) */}
      <div className="lg:hidden flex items-center gap-2 bg-[#F1F5F9] p-1.5 rounded-2xl border border-[#E4E8F0]">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "chat"
              ? "bg-white text-[#111A2E] shadow-xs border border-[#E4E8F0]"
              : "text-[#68748A] hover:text-[#111A2E]"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#2855D9]" />
          <span>Chat Validily AI</span>
        </button>

        <button
          onClick={() => setMobileTab("timeline")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "timeline"
              ? "bg-white text-[#111A2E] shadow-xs border border-[#E4E8F0]"
              : "text-[#68748A] hover:text-[#111A2E]"
          }`}
        >
          <Calendar className="w-4 h-4 text-[#059669]" />
          <span>Agenda ({plan.freeSlots.length})</span>
        </button>

        <button
          onClick={() => setMobileTab("weaknesses")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "weaknesses"
              ? "bg-white text-[#111A2E] shadow-xs border border-[#E4E8F0]"
              : "text-[#68748A] hover:text-[#111A2E]"
          }`}
        >
          <Brain className="w-4 h-4 text-[#D97706]" />
          <span>Faiblesses ({plan.weakPoints.length})</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Conversational Workspace */}
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
            weakestSubjectName={plan.weakPoints.length > 0 ? plan.weakPoints[0].subjectName : undefined}
            freeSlotsCount={plan.freeSlots.length}
            onApplyBlock={handleApplyBlock}
            onStartDrill={handleStartDrill}
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onRefreshContext={() => handleRefresh(false)}
          />
        </div>

        {/* Supporting Context & Live Insights Sidebar */}
        <div
          className={`lg:col-span-5 xl:col-span-4 space-y-4 ${
            mobileTab === "chat" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Sidebar Segmented Control */}
          <div className="bg-[#F1F5F9] p-1.5 rounded-2xl border border-[#E4E8F0] flex items-center gap-1.5 shadow-2xs">
            <button
              onClick={() => setSidebarTab("timeline")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                sidebarTab === "timeline"
                  ? "bg-white text-[#111A2E] shadow-xs border border-[#E4E8F0]"
                  : "text-[#68748A] hover:text-[#111A2E]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Planning</span>
            </button>

            <button
              onClick={() => setSidebarTab("weaknesses")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                sidebarTab === "weaknesses"
                  ? "bg-white text-[#111A2E] shadow-xs border border-[#E4E8F0]"
                  : "text-[#68748A] hover:text-[#111A2E]"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Faiblesses ({plan.weakPoints.length})</span>
            </button>

            <button
              onClick={() => setSidebarTab("recommendations")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                sidebarTab === "recommendations"
                  ? "bg-white text-[#111A2E] shadow-xs border border-[#E4E8F0]"
                  : "text-[#68748A] hover:text-[#111A2E]"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-purple-600" />
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

      {/* Adaptive Drill & Dynamic RAG Quiz Studio Modal */}
      <AdaptiveDrillModal
        isOpen={isDrillModalOpen}
        onClose={() => setIsDrillModalOpen(false)}
        drill={activeDrill}
        isLoading={isDrillLoading}
        subjects={plan.weakPoints.map((w) => ({ id: w.subjectId, name: w.subjectName }))}
        onGenerateQuiz={handleGenerateCustomQuiz}
        generationError={generationError}
      />
    </div>
  );
}
