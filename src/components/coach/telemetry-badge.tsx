"use client";

import React from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import type { PlanTelemetry } from "@/lib/ai/types";

interface TelemetryBadgeProps {
  telemetry?: PlanTelemetry;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TelemetryBadge({ onRefresh, isRefreshing }: TelemetryBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Discreet Live Sync Status */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Données synchronisées</span>
      </div>

      {/* Clean User Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E4E8F0] text-[#111A2E] hover:text-[#2855D9] transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          title="Actualiser les recommandations et l'emploi du temps"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#2855D9] ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Actualisation..." : "Actualiser"}</span>
        </button>
      )}
    </div>
  );
}
