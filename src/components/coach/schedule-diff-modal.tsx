"use client";

import React, { useState } from "react";
import { X, Calendar, Check, AlertTriangle, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import type { ProposedTimeblock, TimeConflict } from "@/lib/ai/types";
import type { CalendarTimeblock } from "@/types/database";

interface ScheduleDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposedBlocks: ProposedTimeblock[];
  existingBlocks: CalendarTimeblock[];
  onApplyBlock: (block: ProposedTimeblock) => Promise<{ success: boolean; error?: string }>;
  onRefresh: () => void;
}

export function ScheduleDiffModal({
  isOpen,
  onClose,
  proposedBlocks,
  existingBlocks,
  onApplyBlock,
  onRefresh,
}: ScheduleDiffModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(proposedBlocks.map((b) => b.tempId))
  );
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const toggleSelect = (tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  const handleApplySelected = async () => {
    setIsApplying(true);
    setStatusMessage(null);

    const toApply = proposedBlocks.filter((b) => selectedIds.has(b.tempId));
    let successCount = 0;
    let lastError = "";

    for (const block of toApply) {
      const res = await onApplyBlock(block);
      if (res.success) {
        successCount++;
      } else {
        lastError = res.error || "Erreur lors de l'application";
      }
    }

    setIsApplying(false);

    if (lastError) {
      setStatusMessage({ text: `${successCount} bloc(s) appliqué(s). Erreur: ${lastError}`, isError: true });
    } else {
      setStatusMessage({ text: `${successCount} créneau(x) planifié(s) avec succès !`, isError: false });
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E4E8F0] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8F0] flex items-center justify-between bg-[#FAFBFD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9] shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111A2E]">Proposition d'Emploi du Temps</h3>
              <p className="text-xs text-[#68748A]">Vérifiez et validez les créneaux suggérés avant inscription au calendrier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {proposedBlocks.length === 0 ? (
            <div className="text-center py-8 text-[#68748A] text-xs">
              Aucune nouvelle proposition de créneau pour cette journée.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#68748A] px-1">
                <span>Sélectionnez les blocs à valider :</span>
                <span className="font-medium text-[#111A2E]">{selectedIds.size} / {proposedBlocks.length} sélectionné(s)</span>
              </div>

              {proposedBlocks.map((block) => {
                const isSelected = selectedIds.has(block.tempId);
                return (
                  <div
                    key={block.tempId}
                    onClick={() => toggleSelect(block.tempId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-300 shadow-2xs"
                        : "bg-[#F8FAFC] border-[#E4E8F0] hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#059669] border-[#059669] text-white"
                          : "border-[#E4E8F0] bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-[#111A2E]">{block.title}</h4>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] text-xs font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{block.startTime} - {block.endTime}</span>
                          <span className="text-[#68748A]">({block.durationMinutes}m)</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#68748A] leading-relaxed">{block.rationale}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 shadow-2xs ${
                statusMessage.isError
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#E4E8F0] bg-[#FAFBFD] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] text-xs font-bold transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            onClick={handleApplySelected}
            disabled={isApplying || selectedIds.size === 0}
            className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isApplying ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Inscription au planning...</span>
              </>
            ) : (
              <>
                <span>Appliquer {selectedIds.size} créneau(x)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
