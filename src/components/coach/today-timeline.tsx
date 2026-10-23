"use client";

import React from "react";
import { Clock, AlertTriangle, Calendar, Sparkles, CheckCircle2 } from "lucide-react";
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
    <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 capitalize">{formattedDate}</h2>
            <p className="text-xs text-slate-400">Bilan de disponibilité et gestion des créneaux</p>
          </div>
        </div>

        {/* Proposed Schedule Action Banner */}
        {proposedCount > 0 && onOpenScheduleProposal && (
          <button
            onClick={onOpenScheduleProposal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Voir le planning proposé ({proposedCount} blocs)</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#182234] border border-[#23334d] rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Temps Disponible</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 flex items-baseline gap-1">
            <span>{Math.floor(availableMinutes / 60)}h {availableMinutes % 60}m</span>
            <span className="text-xs text-slate-400 font-normal">({freeSlots.length} créneaux)</span>
          </div>
        </div>

        <div className="bg-[#182234] border border-[#23334d] rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Temps Occupé</div>
          <div className="text-xl font-bold text-indigo-400 mt-1 flex items-baseline gap-1">
            <span>{Math.floor(bookedMinutes / 60)}h {bookedMinutes % 60}m</span>
            <span className="text-xs text-slate-400 font-normal">({existingBlocks.length} événements)</span>
          </div>
        </div>

        <div className="bg-[#182234] border border-[#23334d] rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Conflits d'horaire</div>
          <div className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${conflicts.length > 0 ? "text-rose-400" : "text-slate-400"}`}>
            {conflicts.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{conflicts.length} conflit(s)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-300">Aucun chevauchement</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Availability Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Occupation de la journée</span>
          <span>{bookedPercent}% occupé / {freePercent}% libre</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/60">
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
        <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Créneaux libres exploitables pour révision & focus :</span>
        </div>
        {freeSlots.length === 0 ? (
          <div className="text-xs text-slate-400 italic bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            Aucun créneau libre d'au moins 15 minutes détecté sur vos horaires configurés.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {freeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs"
              >
                <span className="font-semibold">{slot.start} - {slot.end}</span>
                <span className="text-emerald-500 font-mono">({slot.durationMinutes} min)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Warning Box */}
      {conflicts.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Attention : Détection de chevauchement d'horaires</span>
          </div>
          {conflicts.map((c, idx) => (
            <p key={idx} className="pl-5 text-[11px] text-rose-300/90">
              • "{c.title}" ({c.startTime} - {c.endTime}) entre en conflit avec une autre réservation.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
