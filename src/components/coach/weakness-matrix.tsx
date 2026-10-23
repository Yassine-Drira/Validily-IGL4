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
      <div className="bg-white rounded-3xl border border-[#E4E8F0] p-8 text-center text-[#68748A] text-xs shadow-xs">
        Aucune donnée d'évaluation enregistrée pour le moment. Passez un premier quiz pour cartographier vos forces et faiblesses.
      </div>
    );
  }

  const getUrgencyBadge = (level: UrgencyLevel) => {
    switch (level) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs font-mono">
            <Flame className="w-3 h-3 text-rose-500" />
            Critique (&lt; 45%)
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs font-mono">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Vigilance (&lt; 65%)
          </span>
        );
      case "mastered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Maîtrisé (≥ 85%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] shadow-2xs font-mono">
            Modéré
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111A2E] flex items-center gap-2">
          <Brain className="w-4 h-4 text-amber-500" />
          <span>Matrice Synaptique & Répétition Espacée</span>
        </h3>
        <span className="text-[11px] text-[#68748A]">Modèle Ebbinghaus</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {masteryList.map((item) => (
          <div
            key={item.subjectId}
            className="bg-white rounded-2xl border border-[#E4E8F0] p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-300 transition-all duration-150"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-[#111A2E] tracking-tight line-clamp-1">
                  {item.subjectName}
                </h4>
                {getUrgencyBadge(item.urgencyLevel)}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E4E8F0]">
                  <div className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider">Exactitude</div>
                  <div className="font-bold text-[#111A2E] mt-0.5 font-tabular">
                    {Math.round(item.accuracyRate * 100)}%
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E4E8F0]">
                  <div className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider">Rétention</div>
                  <div className="font-bold text-amber-700 mt-0.5 font-tabular">
                    {item.masteryScore} / 100
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#68748A] pl-0.5">
                {item.lastPracticedAt ? (
                  <span>
                    Dernière pratique : <strong className="text-[#111A2E]">{item.daysSinceLastReview} jour(s)</strong>
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">Diagnostic initial conseillé</span>
                )}
              </div>
            </div>

            {/* Drill Trigger */}
            <div className="pt-2 border-t border-[#E4E8F0]">
              <button
                onClick={() => onStartDrill(item.subjectId, item.subjectName)}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
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
