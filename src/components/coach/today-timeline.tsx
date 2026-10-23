"use client";

import React from "react";
import { Clock, AlertTriangle, Calendar, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import type { TimeSlot, TimeConflict } from "@/lib/ai/types";
import type { CalendarTimeblock } from "@/types/database";

interface TodayTimelineProps {
  date: string;
  availableMinutes: number;
  bookedMinutes: number;
  freeSlots: TimeSlot[];
  existingBlocks: CalendarTimeblock[];
  conflicts: TimeConflict[];
  onSelectDate?: (dateStr: string) => void;
  onOpenScheduleProposal?: () => void;
  proposedCount?: number;
}

export function TodayTimeline({
  date,
  availableMinutes,
  bookedMinutes,
  freeSlots,
  existingBlocks,
  conflicts,
  onSelectDate,
  onOpenScheduleProposal,
  proposedCount = 0,
}: TodayTimelineProps) {
  const totalMinutes = availableMinutes + bookedMinutes;
  const bookedPercent = totalMinutes > 0 ? Math.round((bookedMinutes / totalMinutes) * 100) : 0;
  const freePercent = 100 - bookedPercent;

  // Format date in human French
  const dateObj = new Date(date + "T12:00:00");
  const formattedDate = dateObj.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-3xl border border-[#E4E8F0] p-5 shadow-xs space-y-4">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9] shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111A2E] capitalize">{formattedDate}</h2>
            <p className="text-xs text-[#68748A]">Cartographie de disponibilité & créneaux</p>
          </div>
        </div>

        {/* Proposed Schedule Action Banner */}
        {proposedCount > 0 && onOpenScheduleProposal && (
          <button
            onClick={onOpenScheduleProposal}
            className="px-3.5 py-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Voir planning proposé ({proposedCount})</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E4E8F0]">
          <div className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider">Temps Libre Restant</div>
          <div className="text-lg font-bold text-[#059669] mt-1 font-tabular flex items-baseline gap-1">
            <span>{Math.floor(availableMinutes / 60)}h {availableMinutes % 60}m</span>
            <span className="text-[11px] text-[#68748A] font-normal">({freeSlots.length} créneaux)</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E4E8F0]">
          <div className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider">Temps Occupé</div>
          <div className="text-lg font-bold text-[#2855D9] mt-1 font-tabular flex items-baseline gap-1">
            <span>{Math.floor(bookedMinutes / 60)}h {bookedMinutes % 60}m</span>
            <span className="text-[11px] text-[#68748A] font-normal">({existingBlocks.length} cours)</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E4E8F0]">
          <div className="text-[10px] font-bold text-[#68748A] uppercase tracking-wider">Conflits d'Agenda</div>
          <div className={`text-lg font-bold mt-1 font-tabular flex items-center gap-1.5 ${conflicts.length > 0 ? "text-rose-600" : "text-[#111A2E]"}`}>
            {conflicts.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{conflicts.length} alerte(s)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span className="text-xs font-semibold text-[#059669]">0 chevauchement</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Availability Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] text-[#68748A]">
          <span>Distribution de la journée</span>
          <span className="font-tabular font-medium">{bookedPercent}% occupé • {freePercent}% libre</span>
        </div>
        <div className="w-full h-2.5 bg-[#EDF2FF] rounded-full overflow-hidden flex border border-[#E4E8F0]">
          <div
            className="bg-[#2855D9] transition-all duration-500"
            style={{ width: `${bookedPercent}%` }}
            title={`Occupé : ${bookedMinutes} min`}
          />
          <div
            className="bg-[#059669] transition-all duration-500"
            style={{ width: `${freePercent}%` }}
            title={`Libre : ${availableMinutes} min`}
          />
        </div>
      </div>

      {/* Free Slots Grid */}
      <div className="pt-2">
        <div className="text-xs font-bold text-[#111A2E] mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#059669]" />
          <span>Créneaux libres certifiés pour révision & focus :</span>
        </div>
        {freeSlots.length === 0 ? (
          <div className="text-xs text-[#68748A] italic bg-[#F8FAFC] p-3 rounded-xl border border-[#E4E8F0]">
            Aucun créneau libre restant d'au moins 15 minutes détecté pour aujourd'hui (créneaux passés ou occupés).
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {freeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs shadow-2xs font-tabular"
              >
                <span className="font-bold">{slot.start} - {slot.end}</span>
                <span className="text-emerald-600 font-medium">({slot.durationMinutes} min)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Warning Box */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Attention : Détection de chevauchement d'horaires</span>
          </div>
          {conflicts.map((c, idx) => (
            <p key={idx} className="pl-5 text-[11px] text-rose-700 leading-snug">
              • "{c.title}" ({c.startTime} - {c.endTime}) entre en conflit avec une autre réservation.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
