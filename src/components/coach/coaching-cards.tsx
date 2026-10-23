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
      <div className="luxury-glass rounded-3xl border border-white/10 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-extrabold text-white">Tout est sous contrôle !</h3>
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-950/60 border border-rose-500/40 text-rose-300 shadow-sm">
            <Flame className="w-3 h-3 text-rose-400" />
            Urgence Haute
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-sm">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Priorité Moyenne
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-950/60 border border-blue-500/40 text-blue-300 shadow-sm">
            Conseil Révision
          </span>
        );
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "urgent_task":
        return <Target className="w-4 h-4 text-rose-400" />;
      case "weak_point_drill":
        return <Brain className="w-4 h-4 text-amber-400" />;
      case "schedule_adjustment":
        return <Timer className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Recommandations d'Arbitrage ({recommendations.length})</span>
        </h3>
        <span className="text-[11px] text-slate-400">Classées par impact</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="luxury-glass rounded-2xl border border-white/10 p-4 shadow-xl transition-all flex flex-col justify-between space-y-3 group hover:border-indigo-500/40"
          >
            {/* Header: Icon, Title & Priority */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center flex-shrink-0">
                    {getIcon(rec.type)}
                  </div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-tight line-clamp-1">
                    {rec.title}
                  </h4>
                </div>
                {getPriorityBadge(rec.priority)}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed pl-0.5">{rec.description}</p>

              {/* Factual Evidence Box */}
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06] text-[11px] text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-semibold text-indigo-300">Arbitrage factuel : </span>
                  <span className="text-slate-300">{rec.reasoning}</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={() => onActionClick(rec)}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
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
