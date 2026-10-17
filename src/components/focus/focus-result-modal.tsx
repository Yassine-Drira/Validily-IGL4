"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { TreeSpecies } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "@/components/forest/tree-models";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trees,
  RotateCcw,
  X,
  Clock,
  PauseCircle,
  ShieldAlert,
} from "lucide-react";

export interface FocusResultData {
  type: "success" | "failure";
  sessionTitle?: string;
  treeSpecies: TreeSpecies;
  eligibleSeconds: number;
  targetSeconds: number;
  totalPausedSeconds?: number;
  pauseCount?: number;
  treeId?: string;
  reason?: string;
}

interface FocusResultModalProps {
  data: FocusResultData | null;
  isOpen: boolean;
  onClose: () => void;
  onRestartFocus?: () => void;
}

export function FocusResultModal({
  data,
  isOpen,
  onClose,
  onRestartFocus,
}: FocusResultModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const isSuccess = data.type === "success";
  const speciesMeta =
    SPECIES_METADATA[data.treeSpecies] || SPECIES_METADATA.cedar;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    if (mins === 0) return `${remaining}s`;
    return remaining > 0 ? `${mins}m ${remaining}s` : `${mins} min`;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-modal-title"
    >
      <div
        className={cn(
          "relative bg-white rounded-3xl border max-w-lg w-full shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200",
          isSuccess
            ? "border-emerald-200 shadow-emerald-500/10"
            : "border-rose-200 shadow-rose-500/10"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-2",
            isSuccess
              ? "bg-gradient-to-r from-emerald-400 via-teal-500 to-[#2855D9]"
              : "bg-gradient-to-r from-amber-500 via-rose-500 to-red-600"
          )}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] rounded-xl transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Tag */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          {isSuccess ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-7 h-7 text-emerald-600 fill-emerald-600/20 animate-pulse" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-7 h-7 text-rose-600" />
            </div>
          )}

          <div
            className={cn(
              "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
              isSuccess
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            )}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Session Certifiée & Validée</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Pénalité Académique Appliquée</span>
              </>
            )}
          </div>

          <h2
            id="result-modal-title"
            className="text-2xl font-extrabold text-[#111A2E] tracking-tight"
          >
            {isSuccess
              ? "Session de concentration accomplie !"
              : "Session interrompue prématurément"}
          </h2>

          <p className="text-xs text-[#68748A] max-w-sm leading-relaxed">
            {isSuccess
              ? "Félicitations, vous avez honoré votre engagement jusqu'au bout. Votre arbre vigoureux s'épanouit dans votre Bosquet."
              : "Le temps exigé n'a pas été complété. Conformément aux règles de rigueur de l'IGL4, un arbre mort pérenne a été planté."}
          </p>
        </div>

        {/* Center Tree Artwork Showcase */}
        <div className="flex flex-col items-center justify-center py-2">
          <div
            className={cn(
              "relative w-36 h-36 rounded-3xl border flex items-center justify-center p-3 shadow-inner transition-transform",
              isSuccess
                ? "bg-gradient-to-b from-emerald-50/70 to-teal-50/40 border-emerald-100"
                : "bg-gradient-to-b from-slate-100 to-amber-50/30 border-slate-200"
            )}
          >
            <TreeSvg
              species={data.treeSpecies}
              status={isSuccess ? "healthy" : "leafless"}
              size={96}
              stage={4}
              showMound={true}
              highlighted={isSuccess}
            />
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs font-bold text-[#111A2E]">
              {isSuccess ? speciesMeta.name : `Arbre défeuillé (${speciesMeta.name})`}
            </span>
            <p className="text-[11px] text-[#64748B] italic">
              {isSuccess ? speciesMeta.latinName : data.reason || "Interruption manuelle"}
            </p>
          </div>
        </div>

        {/* Audit Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] text-center text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-[#2855D9]" />
              Focus effectif
            </span>
            <span className="font-mono font-bold text-[#111A2E]">
              {formatSeconds(data.eligibleSeconds)}
            </span>
          </div>

          <div className="space-y-0.5 border-x border-[#E2E8F0]">
            <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-semibold flex items-center justify-center gap-1">
              <PauseCircle className="w-3 h-3 text-amber-600" />
              Pauses
            </span>
            <span className="font-mono font-bold text-[#111A2E]">
              {data.pauseCount && data.pauseCount > 0
                ? `${data.pauseCount} (${formatSeconds(data.totalPausedSeconds || 0)})`
                : "0"}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-semibold flex items-center justify-center gap-1">
              <Trees className="w-3 h-3 text-emerald-600" />
              Statut
            </span>
            <span
              className={cn(
                "font-bold",
                isSuccess ? "text-emerald-700" : "text-rose-700"
              )}
            >
              {isSuccess ? "Arbre Sain" : "Arbre Mort"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <Link
            href="/forest"
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#111A2E] hover:bg-[#1E293B] text-white flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer"
          >
            <Trees className="w-4 h-4 text-emerald-400" />
            <span>Voir dans mon Bosquet</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              if (onRestartFocus) {
                onRestartFocus();
              }
            }}
            className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-bold text-[#111A2E] border-[#E4E8F0] hover:bg-[#F4F6FA] flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>{isSuccess ? "Continuer" : "Prendre ma revanche"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
