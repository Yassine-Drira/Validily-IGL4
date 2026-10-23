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
      <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Tout est sous contrôle !</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Aucune tâche urgente en retard et vos révisions sont à jour selon le modèle de rétention mémorielle.
        </p>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 border border-rose-800/80 text-rose-300">
            <Flame className="w-3 h-3 text-rose-400" />
            Priorité Élevée
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 border border-amber-800/80 text-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Priorité Moyenne
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/60 border border-blue-800/80 text-blue-300">
            Conseil Révision
          </span>
        );
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "urgent_task":
        return <Target className="w-5 h-5 text-rose-400" />;
      case "weak_point_drill":
        return <Brain className="w-5 h-5 text-amber-400" />;
      case "schedule_adjustment":
        return <Timer className="w-5 h-5 text-emerald-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Recommandations du Coach ({recommendations.length})</span>
        </h3>
        <span className="text-[11px] text-slate-400">Classées par impact sur la réussite</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-[#0f172a]/90 backdrop-blur-md rounded-xl border border-slate-800 hover:border-slate-700 p-4 shadow-lg transition-all flex flex-col justify-between space-y-3 group"
          >
            {/* Header: Icon, Title & Priority */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:border-slate-700 transition-colors">
                    {getIcon(rec.type)}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{rec.title}</h4>
                </div>
                {getPriorityBadge(rec.priority)}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed pl-1">{rec.description}</p>

              {/* Factual Evidence Box */}
              <div className="p-2.5 rounded-lg bg-[#182234]/80 border border-[#23334d] text-[11px] text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-semibold text-indigo-300">Justification factuelle : </span>
                  <span>{rec.reasoning}</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              <button
                onClick={() => onActionClick(rec)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-950/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
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
