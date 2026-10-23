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
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E4E8F0] text-[#1E293B] shadow-2xs">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-semibold text-[#111A2E]">{telemetry.provider}</span>
        <span className="text-[#94A3B8]">·</span>
        <span className="text-[#059669] font-bold">{telemetry.latencyMs} ms</span>
      </div>

      {/* Cache Status */}
      <div
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
          telemetry.cacheHit
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-slate-100 border-[#E4E8F0] text-[#68748A]"
        }`}
      >
        <Database className="w-3 h-3 text-[#2855D9]" />
        <span>{telemetry.cacheHit ? "Cache HIT (<1ms)" : "Calcul dynamique"}</span>
      </div>

      {/* Fallback / Local mode indicator */}
      {telemetry.isFallback && (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] text-[11px] font-semibold">
          <CheckCircle2 className="w-3 h-3 text-[#2855D9]" />
          <span>100% Local / Zero Egress</span>
        </div>
      )}

      {/* Refresh trigger */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E4E8F0] text-[#111A2E] transition-colors text-[11px] font-semibold flex items-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer"
          title="Forcer le recalcul du plan"
        >
          {isRefreshing ? (
            <>
              <span className="w-2.5 h-2.5 border-2 border-[#2855D9] border-t-transparent rounded-full animate-spin" />
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
