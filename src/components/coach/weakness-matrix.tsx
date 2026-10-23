"use client";

import React from "react";
import { Brain, Flame, AlertCircle, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import type { SubjectMasterySummary, UrgencyLevel } from "@/lib/ai/types";

interface WeaknessMatrixProps {
  masteryList: SubjectMasterySummary[];
  onStartDrill: (subjectId: string, subjectName: string) => void;
}

export function WeaknessMatrix({ masteryList, onStartDrill }: WeaknessMatrixProps) {
  if (masteryList.length === 0) {
    return (
      <div className="luxury-glass rounded-3xl border border-white/10 p-8 text-center text-slate-400 text-xs">
        Aucune donnée d'évaluation enregistrée pour le moment. Passez un premier quiz pour cartographier vos forces et faiblesses.
      </div>
    );
  }

  const getUrgencyBadge = (level: UrgencyLevel) => {
    switch (level) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-950/60 border border-rose-500/40 text-rose-300 shadow-sm">
            <Flame className="w-3 h-3 text-rose-400" />
            Critique (&lt; 45%)
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-sm">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Vigilance (&lt; 65%)
          </span>
        );
      case "mastered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Maîtrisé (≥ 85%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-950/60 border border-blue-500/40 text-blue-300 shadow-sm">
            Modéré
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Brain className="w-4 h-4 text-amber-400" />
          <span>Matrice Synaptique & Répétition Espacée</span>
        </h3>
        <span className="text-[11px] text-slate-400">Modèle Ebbinghaus</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {masteryList.map((item) => (
          <div
            key={item.subjectId}
            className="luxury-glass rounded-2xl border border-white/10 p-4 shadow-xl flex flex-col justify-between space-y-3 hover:border-amber-500/30 transition-all duration-200"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-extrabold text-white tracking-tight line-clamp-1">
                  {item.subjectName}
                </h4>
                {getUrgencyBadge(item.urgencyLevel)}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="luxury-card p-2.5 rounded-xl border border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exactitude</div>
                  <div className="font-extrabold text-white mt-0.5 font-tabular">
                    {Math.round(item.accuracyRate * 100)}%
                  </div>
                </div>

                <div className="luxury-card p-2.5 rounded-xl border border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rétention</div>
                  <div className="font-extrabold text-amber-300 mt-0.5 font-tabular">
                    {item.masteryScore} / 100
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pl-0.5">
                {item.lastPracticedAt ? (
                  <span>
                    Dernière pratique : <strong className="text-slate-200">{item.daysSinceLastReview} jour(s)</strong>
                  </span>
                ) : (
                  <span className="text-amber-400/90 font-medium">Diagnostic initial conseillé</span>
                )}
              </div>
            </div>

            {/* Drill Trigger */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => onStartDrill(item.subjectId, item.subjectName)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/40 hover:to-orange-600/40 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Lancer un entraînement ciblé</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
