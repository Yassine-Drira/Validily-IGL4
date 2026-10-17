"use client";

import React, { useState, useMemo } from "react";
import { ForestEntry } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "./tree-models";
import { TreeDetailModal } from "./tree-detail-modal";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
} from "lucide-react";

interface ForestTimelineProps {
  entries: ForestEntry[];
  className?: string;
}

export function ForestTimeline({ entries = [], className = "" }: ForestTimelineProps) {
  const [selectedEntry, setSelectedEntry] = useState<ForestEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "leafless">("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "7d" | "30d">("all");

  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const todayIso = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let list = [...entries].sort((a, b) => {
      const timeB = new Date(b.earned_at || b.created_at || 0).getTime();
      const timeA = new Date(a.earned_at || a.created_at || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    if (statusFilter === "healthy") {
      list = list.filter((e) => e.tree_status === "healthy");
    } else if (statusFilter === "leafless") {
      list = list.filter((e) => e.tree_status === "leafless");
    }

    if (periodFilter === "today") {
      list = list.filter((e) => {
        const d = (e.earned_at || e.created_at || "").split("T")[0];
        return d === todayIso;
      });
    } else if (periodFilter === "7d") {
      list = list.filter((e) => {
        const t = new Date(e.earned_at || e.created_at || 0).getTime();
        return t >= sevenDaysAgo;
      });
    } else if (periodFilter === "30d") {
      list = list.filter((e) => {
        const t = new Date(e.earned_at || e.created_at || 0).getTime();
        return t >= thirtyDaysAgo;
      });
    }

    return list;
  }, [entries, statusFilter, periodFilter]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Tabs & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E8F0] pb-3">
        {/* Status Filters */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 text-[#68748A]">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-[#182235]">Statut :</span>
          </div>
          <div className="flex items-center space-x-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0]">
            {(
              [
                { key: "all", label: `Tous (${entries.length})` },
                {
                  key: "healthy",
                  label: `Sains (${entries.filter((e) => e.tree_status === "healthy").length})`,
                },
                {
                  key: "leafless",
                  label: `Défeuillés (${entries.filter((e) => e.tree_status === "leafless").length})`,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer",
                  statusFilter === t.key
                    ? "bg-white text-[#111A2E] shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#182235]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 text-[#68748A]">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-semibold text-[#182235]">Période :</span>
          </div>
          <div className="flex items-center space-x-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0]">
            {(
              [
                { key: "all", label: "Tout" },
                { key: "today", label: "Aujourd'hui" },
                { key: "7d", label: "7 Jours" },
                { key: "30d", label: "30 Jours" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodFilter(p.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer",
                  periodFilter === p.key
                    ? "bg-[#2855D9] text-white shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#182235]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List Table */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#E4E8F0] p-6 text-xs text-[#68748A]">
          Aucun arbre ne correspond à ce filtre.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E4E8F0] divide-y divide-[#E4E8F0] overflow-hidden shadow-2xs">
          {filteredEntries.map((entry) => {
            const isDead = entry.tree_status === "leafless";
            const meta = SPECIES_METADATA[entry.tree_species] || SPECIES_METADATA.cedar;
            const dateStr = new Date(entry.earned_at || entry.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const actualSec = entry.session?.actual_duration_seconds;
            const targetSec = entry.session?.target_duration_seconds || 1500;

            let durationDisplay = "";
            if (isDead) {
              // Interrupted session: strictly reflect actual elapsed time before abandon (e.g. 3 min), NEVER full planned 25 min!
              if (typeof actualSec === "number" && actualSec > 0) {
                if (actualSec < 60) {
                  durationDisplay = `${actualSec}s`;
                } else {
                  const mins = Math.floor(actualSec / 60);
                  const remSecs = actualSec % 60;
                  durationDisplay = remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins} min`;
                }
              } else {
                durationDisplay = "< 1 min";
              }
            } else {
              // Healthy completed session
              const effectiveSec = typeof actualSec === "number" && actualSec > 0 ? actualSec : targetSec;
              durationDisplay = `${Math.round(effectiveSec / 60)} min`;
            }

            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#FAFBFD] transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#FAFBFD] border border-[#E4E8F0] flex items-center justify-center shrink-0">
                    <TreeSvg
                      species={entry.tree_species}
                      status={entry.tree_status}
                      size={40}
                      stage={4}
                      showMound={false}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                        {isDead ? "Arbre Défeuillé" : meta.name}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center space-x-1",
                          isDead
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        )}
                      >
                        {isDead ? (
                          <>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Interrompu</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Validé</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-[#68748A] mt-1 font-mono">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-[#2855D9]" />
                        <span className="text-[#182235] font-semibold">{durationDisplay}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[#68748A] group-hover:text-[#2855D9] transition-colors">
                  <span className="text-xs font-medium hidden sm:inline">Détails</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <TreeDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
