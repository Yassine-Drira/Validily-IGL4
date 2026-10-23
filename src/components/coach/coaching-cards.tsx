"use client";

import React from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame,
  ArrowRight,
  Target,
  Brain,
  Timer,
  Zap,
} from "lucide-react";
import type { CoachingRecommendation } from "@/lib/ai/types";

interface CoachingCardsProps {
  recommendations: CoachingRecommendation[];
  onActionClick: (rec: CoachingRecommendation) => void;
  isLoading?: boolean;
}

export function CoachingCards({
  recommendations,
  onActionClick,
  isLoading = false,
}: CoachingCardsProps) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#E4E8F0] p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#111A2E]">Tout est sous contrôle !</h3>
        <p className="text-xs text-[#68748A] max-w-md mx-auto">
          Aucune tâche urgente en retard et vos révisions sont à jour selon le modèle de rétention mémorielle.
        </p>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs font-mono">
            <Flame className="w-3 h-3 text-rose-500" />
            Urgence Haute
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs font-mono">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Priorité Moyenne
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] shadow-2xs font-mono">
            Conseil Révision
          </span>
        );
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "urgent_task":
        return <Target className="w-4 h-4 text-rose-500" />;
      case "weak_point_drill":
        return <Brain className="w-4 h-4 text-amber-600" />;
      case "schedule_adjustment":
        return <Timer className="w-4 h-4 text-[#059669]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#2855D9]" />;
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111A2E] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#2855D9]" />
          <span>Recommandations d'Arbitrage ({recommendations.length})</span>
        </h3>
        <span className="text-[11px] text-[#68748A]">Classées par impact</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-2xl border border-[#E4E8F0] p-4 shadow-xs transition-all flex flex-col justify-between space-y-3 group hover:border-[#2855D9]/40"
          >
            {/* Header: Icon, Title & Priority */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] border border-[#E4E8F0] flex items-center justify-center flex-shrink-0">
                    {getIcon(rec.type)}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#111A2E] tracking-tight line-clamp-1">
                    {rec.title}
                  </h4>
                </div>
                {getPriorityBadge(rec.priority)}
              </div>

              {/* Description */}
              <p className="text-xs text-[#68748A] leading-relaxed pl-0.5">{rec.description}</p>

              {/* Factual Evidence Box */}
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E8F0] text-[11px] flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#2855D9] flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-[#2855D9]">Arbitrage factuel : </span>
                  <span className="text-[#182235]">{rec.reasoning}</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 border-t border-[#E4E8F0] flex justify-end">
              <button
                onClick={() => onActionClick(rec)}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-[#2855D9] hover:bg-[#1E42B0] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{rec.action.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
