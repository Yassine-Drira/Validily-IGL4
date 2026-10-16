"use client";

import React, { useMemo } from "react";
import { TreeSpecies, TreeStatus } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "./tree-models";
import { cn } from "@/lib/utils";
import { Sparkles, Sprout, AlertTriangle, CheckCircle2 } from "lucide-react";

interface LiveTreeGrowthProps {
  species: TreeSpecies;
  onSelectSpecies?: (species: TreeSpecies) => void;
  progressPercent: number; // 0 to 100
  isRunning: boolean;
  status?: TreeStatus | "growing";
  canChangeSpecies?: boolean;
  className?: string;
  isCelebrating?: boolean;
  onDismissCelebration?: () => void;
}

export function LiveTreeGrowth({
  species,
  onSelectSpecies,
  progressPercent,
  isRunning,
  status = "growing",
  canChangeSpecies = true,
  className = "",
  isCelebrating = false,
  onDismissCelebration,
}: LiveTreeGrowthProps) {
  // Determine growth stage from progress percentage (0-100%)
  const growthStage = useMemo(() => {
    if (status === "leafless") return 4;
    if (progressPercent >= 100) return 4;
    if (progressPercent >= 75) return 3;
    if (progressPercent >= 50) return 2;
    if (progressPercent >= 25) return 1;
    return 0;
  }, [progressPercent, status]);

  const meta = SPECIES_METADATA[species] || SPECIES_METADATA.cedar;

  const stageLabel = useMemo(() => {
    if (status === "leafless") return "Session interrompue";
    if (progressPercent >= 100) return "Arbre mature & pérenne";
    if (progressPercent >= 75) return "Arbuste vigoureux (75%)";
    if (progressPercent >= 50) return "Jeune plant ramifié (50%)";
    if (progressPercent >= 25) return "Pousse feuillue (25%)";
    return "Germination naissante";
  }, [progressPercent, status]);

  const availableSpecies: TreeSpecies[] = [
    "cedar",
    "oak",
    "pine",
    "willow",
    "jacaranda",
    "sakura",
  ];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-b from-[#F9FBFC] to-[#F1F5F9] border border-[#E4E8F0] relative overflow-hidden",
        className
      )}
    >
      {/* Soft atmospheric radial glow behind the tree */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000",
          status === "leafless"
            ? "bg-slate-400"
            : isCelebrating
            ? "bg-amber-300 opacity-40 scale-125"
            : species === "jacaranda"
            ? "bg-indigo-400 opacity-30"
            : species === "sakura"
            ? "bg-pink-400 opacity-30"
            : "bg-emerald-400"
        )}
      />

      {/* Celebration Banner Overlay if completed */}
      {isCelebrating && (
        <div className="absolute top-3 inset-x-3 z-10 animate-in fade-in slide-in-from-top-2 duration-300 bg-emerald-600 text-white rounded-2xl p-2.5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <div>
              <p className="text-xs font-bold leading-tight">Arbre planté avec succès !</p>
              <p className="text-[10px] text-emerald-100">Votre forêt compte un nouveau spécimen.</p>
            </div>
          </div>
          {onDismissCelebration && (
            <button
              type="button"
              onClick={onDismissCelebration}
              className="text-xs bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 rounded-xl text-white font-medium cursor-pointer transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      )}

      {/* Main Tree Graphic */}
      <div className="relative py-2 flex flex-col items-center justify-center">
        <div
          className={cn(
            "transition-all duration-700 ease-out transform",
            isRunning && "motion-safe:animate-pulse",
            isCelebrating && "scale-110 drop-shadow-xl"
          )}
        >
          <TreeSvg
            species={species}
            status={status === "leafless" ? "leafless" : "healthy"}
            stage={growthStage}
            size={140}
            highlighted={isCelebrating}
          />
        </div>

        {/* Growth Progress Indicator Badge */}
        <div className="mt-2 flex items-center space-x-2">
          <span
            className={cn(
              "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 shadow-2xs font-mono",
              status === "leafless"
                ? "bg-slate-100 text-slate-700 border-slate-300"
                : isCelebrating
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : meta.badgeBg
            )}
          >
            {status === "leafless" ? (
              <AlertTriangle className="w-3 h-3 text-slate-600" />
            ) : isCelebrating ? (
              <Sparkles className="w-3 h-3 text-amber-600" />
            ) : (
              <Sprout className="w-3 h-3 text-emerald-600" />
            )}
            <span>{stageLabel}</span>
          </span>

          <span className="text-[11px] font-mono font-bold text-[#68748A]">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* Species Selector (available before session starts) */}
      {canChangeSpecies && !isRunning && (
        <div className="w-full mt-3 pt-3 border-t border-[#E4E8F0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#182235]">
              Espèce à cultiver :
            </span>
            <span className="text-[10px] text-[#68748A] italic">
              {meta.name} ({meta.latinName})
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {availableSpecies.map((sp) => {
              const itemMeta = SPECIES_METADATA[sp];
              const isSelected = sp === species;
              const shortName =
                sp === "jacaranda"
                  ? "Jacaranda"
                  : sp === "sakura"
                  ? "Sakura"
                  : itemMeta.name.split(" ")[0];

              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => onSelectSpecies?.(sp)}
                  className={cn(
                    "p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center group",
                    isSelected
                      ? "bg-white border-[#2855D9] shadow-sm ring-2 ring-[#2855D9]/25 scale-[1.02]"
                      : "bg-[#FAFAF7] border-[#E4E8F0] hover:bg-white text-[#68748A] hover:border-slate-300"
                  )}
                  title={`${itemMeta.name} (${itemMeta.latinName})`}
                >
                  <TreeSvg
                    species={sp}
                    status="healthy"
                    stage={4}
                    size={38}
                    showMound={false}
                  />
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] font-semibold leading-tight mt-1.5 truncate max-w-full",
                      isSelected ? "text-[#2855D9]" : "text-[#182235]"
                    )}
                  >
                    {shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
