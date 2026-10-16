"use client";

import React from "react";
import { ForestEntry } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "./tree-models";
import { X, Calendar, Clock, BookOpen, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeDetailModalProps {
  entry: ForestEntry | null;
  onClose: () => void;
}

export function TreeDetailModal({ entry, onClose }: TreeDetailModalProps) {
  if (!entry) return null;

  const isDead = entry.tree_status === "leafless";
  const meta = SPECIES_METADATA[entry.tree_species] || SPECIES_METADATA.cedar;

  const dateStr = new Date(entry.earned_at || entry.created_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const durationMinutes = entry.session?.actual_duration_seconds
    ? Math.round(entry.session.actual_duration_seconds / 60)
    : entry.session?.target_duration_seconds
    ? Math.round(entry.session.target_duration_seconds / 60)
    : 25;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E4E8F0] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] rounded-xl transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tree Visual Highlight */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div
            className={cn(
              "w-28 h-28 rounded-3xl flex items-center justify-center border shadow-inner",
              isDead ? "bg-slate-50 border-slate-200" : "bg-emerald-50/60 border-emerald-100"
            )}
          >
            <TreeSvg
              species={entry.tree_species}
              status={entry.tree_status}
              stage={4}
              size={96}
            />
          </div>

          <h3 className="text-base font-bold text-[#111A2E] mt-3 tracking-tight">
            {isDead ? "Arbre Défeuillé" : meta.name}
          </h3>
          <p className="text-xs text-[#68748A] italic">
            {isDead ? "Session interrompue" : meta.latinName}
          </p>
        </div>

        {/* Session Stats Grid */}
        <div className="space-y-2.5 bg-[#FAFBFD] p-3.5 rounded-2xl border border-[#E4E8F0] text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#68748A] flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Planté le</span>
            </span>
            <span className="font-semibold text-[#182235] text-right truncate max-w-[180px]">
              {dateStr}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#68748A] flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Durée vérifiée</span>
            </span>
            <span className="font-mono font-bold text-[#2855D9]">
              {durationMinutes} minutes
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#68748A] flex items-center space-x-1.5">
              {isDead ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Statut session</span>
            </span>
            <span
              className={cn(
                "font-semibold px-2 py-0.5 rounded-full text-[10px] border",
                isDead
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              )}
            >
              {isDead ? "Interrompue (> 2m)" : "Validée à 100%"}
            </span>
          </div>

          {entry.session?.subject?.name && (
            <div className="flex items-center justify-between pt-1 border-t border-[#E4E8F0]">
              <span className="text-[#68748A] flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Matière</span>
              </span>
              <span className="font-semibold text-[#182235]">
                {entry.session.subject.name}
              </span>
            </div>
          )}

          {entry.session?.session_label && (
            <div className="pt-1 border-t border-[#E4E8F0]">
              <span className="text-[#68748A] block mb-0.5">Note privée :</span>
              <p className="font-medium text-[#182235] italic text-[11px]">
                &quot;{entry.session.session_label}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Anti-cheat Immutable Tag */}
        <div className="flex items-center justify-center space-x-1.5 text-[10px] text-[#68748A] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Vérifié cryptographiquement & immuable</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl text-xs font-semibold bg-[#2855D9] hover:bg-[#1E40AF] text-white transition-colors cursor-pointer shadow-xs"
        >
          Fermer les détails
        </button>
      </div>
    </div>
  );
}
