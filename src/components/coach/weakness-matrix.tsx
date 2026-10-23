"use client";

import React from "react";
import { Brain, Flame, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { SubjectMasterySummary, UrgencyLevel } from "@/lib/ai/types";

interface WeaknessMatrixProps {
  masteryList: SubjectMasterySummary[];
  onStartDrill: (subjectId: string, subjectName: string) => void;
}

export function WeaknessMatrix({ masteryList, onStartDrill }: WeaknessMatrixProps) {
  if (masteryList.length === 0) {
    return (
      <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
        Aucune donnée d'évaluation enregistrée pour le moment.
      </div>
    );
  }

  const getUrgencyBadge = (level: UrgencyLevel) => {
    switch (level) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 border border-rose-800/80 text-rose-300">
            <Flame className="w-3 h-3 text-rose-400" />
            Critique (&lt; 45%)
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 border border-amber-800/80 text-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Vigilance (&lt; 65%)
          </span>
        );
      case "mastered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Maîtrisé (≥ 85%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/60 border border-blue-800/80 text-blue-300">
            Modéré
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Brain className="w-4 h-4 text-amber-400" />
          <span>Matrice de Maîtrise & Répétition Espacée</span>
        </h3>
        <span className="text-[11px] text-slate-400">Calculée selon le modèle de déclin mémoriel</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {masteryList.map((item) => (
          <div
            key={item.subjectId}
            className="bg-[#0f172a]/90 backdrop-blur-md rounded-xl border border-slate-800 hover:border-slate-700 p-4 shadow-lg flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{item.subjectName}</h4>
                {getUrgencyBadge(item.urgencyLevel)}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-[#182234] p-2 rounded-lg border border-[#23334d]">
                  <div className="text-[10px] text-slate-400 uppercase">Taux de réussite</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {Math.round(item.accuracyRate * 100)}%
                  </div>
                </div>

                <div className="bg-[#182234] p-2 rounded-lg border border-[#23334d]">
                  <div className="text-[10px] text-slate-400 uppercase">Score Rétention</div>
                  <div className="font-bold text-amber-400 mt-0.5">
                    {item.masteryScore} / 100
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pl-0.5">
                {item.lastPracticedAt ? (
                  <span>Dernier entraînement il y a <strong className="text-slate-300">{item.daysSinceLastReview} jour(s)</strong></span>
                ) : (
                  <span className="text-amber-400/80">Aucune évaluation récente enregistrée</span>
                )}
              </div>
            </div>

            {/* Drill Trigger */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => onStartDrill(item.subjectId, item.subjectName)}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Entraînement ciblé</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
