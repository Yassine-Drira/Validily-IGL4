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
    <div className="luxury-glass rounded-3xl border border-white/10 p-5 shadow-2xl space-y-4 backdrop-blur-2xl">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-indigo-400 shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white capitalize">{formattedDate}</h2>
            <p className="text-xs text-slate-400">Cartographie de disponibilité & créneaux</p>
          </div>
        </div>

        {/* Proposed Schedule Action Banner */}
        {proposedCount > 0 && onOpenScheduleProposal && (
          <button
            onClick={onOpenScheduleProposal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Voir planning proposé ({proposedCount})</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="luxury-card rounded-2xl p-3 border border-white/[0.06]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temps Libre Restant</div>
          <div className="text-lg font-extrabold text-emerald-400 mt-1 font-tabular flex items-baseline gap-1">
            <span>{Math.floor(availableMinutes / 60)}h {availableMinutes % 60}m</span>
            <span className="text-[11px] text-slate-400 font-normal">({freeSlots.length} créneaux)</span>
          </div>
        </div>

        <div className="luxury-card rounded-2xl p-3 border border-white/[0.06]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temps Occupé</div>
          <div className="text-lg font-extrabold text-indigo-400 mt-1 font-tabular flex items-baseline gap-1">
            <span>{Math.floor(bookedMinutes / 60)}h {bookedMinutes % 60}m</span>
            <span className="text-[11px] text-slate-400 font-normal">({existingBlocks.length} cours)</span>
          </div>
        </div>

        <div className="luxury-card rounded-2xl p-3 border border-white/[0.06]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conflits d'Agenda</div>
          <div className={`text-lg font-extrabold mt-1 font-tabular flex items-center gap-1.5 ${conflicts.length > 0 ? "text-rose-400" : "text-slate-300"}`}>
            {conflicts.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{conflicts.length} alerte(s)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">0 chevauchement</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Availability Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Distribution de la journée</span>
          <span className="font-tabular font-medium">{bookedPercent}% occupé • {freePercent}% libre</span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
          <div
            className="bg-indigo-500 transition-all duration-500"
            style={{ width: `${bookedPercent}%` }}
            title={`Occupé : ${bookedMinutes} min`}
          />
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${freePercent}%` }}
            title={`Libre : ${availableMinutes} min`}
          />
        </div>
      </div>

      {/* Free Slots Grid */}
      <div className="pt-2">
        <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Créneaux libres certifiés pour révision & focus :</span>
        </div>
        {freeSlots.length === 0 ? (
          <div className="text-xs text-slate-400 italic bg-slate-950/40 p-3 rounded-xl border border-white/[0.06]">
            Aucun créneau libre restant d'au moins 15 minutes détecté pour aujourd'hui (créneaux passés ou occupés).
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {freeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs shadow-sm font-tabular"
              >
                <span className="font-bold">{slot.start} - {slot.end}</span>
                <span className="text-emerald-400/80 font-medium">({slot.durationMinutes} min)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Warning Box */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Attention : Détection de chevauchement d'horaires</span>
          </div>
          {conflicts.map((c, idx) => (
            <p key={idx} className="pl-5 text-[11px] text-rose-300/90 leading-snug">
              • "{c.title}" ({c.startTime} - {c.endTime}) entre en conflit avec une autre réservation.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
