"use client";

import React from "react";
import { Zap, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import type { PlanTelemetry } from "@/lib/ai/types";

interface TelemetryBadgeProps {
  telemetry: PlanTelemetry;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TelemetryBadge({ telemetry, onRefresh, isRefreshing }: TelemetryBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
      {/* Provider & Latency */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#182234] border border-[#23334d] text-[#93c5fd]">
        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="font-medium text-slate-200">{telemetry.provider}</span>
        <span className="text-[#64748b]">·</span>
        <span className="text-emerald-400 font-semibold">{telemetry.latencyMs} ms</span>
      </div>

      {/* Cache Status */}
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${
          telemetry.cacheHit
            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
            : "bg-slate-800/40 border-slate-700/60 text-slate-300"
        }`}
      >
        <Database className="w-3 h-3" />
        <span>{telemetry.cacheHit ? "Cache HIT (<1ms)" : "Calcul dynamique"}</span>
      </div>

      {/* Fallback / Local mode indicator */}
      {telemetry.isFallback && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/40 border border-blue-800/60 text-blue-300 text-[11px]">
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          <span>100% Local / Zero Egress</span>
        </div>
      )}

      {/* Refresh trigger */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 transition-colors text-[11px] flex items-center gap-1 disabled:opacity-50"
          title="Forcer le recalcul du plan"
        >
          {isRefreshing ? (
            <>
              <span className="w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Actualisation...</span>
            </>
          ) : (
            <span>Recalculer ↻</span>
          )}
        </button>
      )}
    </div>
  );
}
