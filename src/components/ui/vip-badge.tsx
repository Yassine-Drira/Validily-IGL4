"use client";

import React from "react";
import { Sparkles, CheckCircle2, Crown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VipBadgeProps {
  variant?: "compact" | "full" | "avatar-badge" | "pill";
  remainingDays?: number;
  className?: string;
  showTooltip?: boolean;
}

export function VipBadge({
  variant = "compact",
  remainingDays,
  className = "",
  showTooltip = true,
}: VipBadgeProps) {
  const tooltipText = remainingDays !== undefined && remainingDays > 0
    ? `Membre VIP Vérifié • Expérience Premium (${remainingDays} jours restants)`
    : "Membre VIP Vérifié • Expérience Premium Validily IGL4";

  if (variant === "avatar-badge") {
    return (
      <div
        className={cn(
          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-white shadow-xs flex items-center justify-center text-white",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <CheckCircle2 className="w-2.5 h-2.5 fill-current text-amber-950" />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 text-amber-700 border border-amber-300 text-[10px] font-bold tracking-tight shadow-2xs select-none transition-transform hover:scale-105",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <Crown className="w-3 h-3 text-amber-600 fill-amber-500/40 animate-pulse" />
        <span className="font-mono uppercase text-[9px] tracking-wider">VIP</span>
        <CheckCircle2 className="w-2.5 h-2.5 text-amber-600" />
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-400/15 to-amber-500/10 border border-amber-300/80 text-amber-900 text-xs font-bold shadow-2xs",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-400/40" />
        <span>VIP Vérifié</span>
        {remainingDays !== undefined && remainingDays > 0 && (
          <span className="text-[10px] text-amber-700 font-mono font-normal">
            ({remainingDays}j)
          </span>
        )}
      </span>
    );
  }

  // "full" variant: Luxury diorama & profile presentation
  return (
    <div
      className={cn(
        "inline-flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-300/90 text-amber-950 shadow-sm transition-all select-none",
        className
      )}
      title={showTooltip ? tooltipText : undefined}
    >
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-2xs shrink-0">
        <Crown className="w-3.5 h-3.5 fill-current text-amber-950" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center space-x-1 text-xs font-extrabold tracking-tight text-amber-950">
          <span>Membre VIP Vérifié</span>
          <CheckCircle2 className="w-3 h-3 text-amber-600 fill-amber-200" />
        </div>
        <div className="text-[10px] text-amber-800/80 font-mono flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
          <span>Soundscapes Étendus</span>
          {remainingDays !== undefined && remainingDays > 0 && (
            <span>• {remainingDays}j restants</span>
          )}
        </div>
      </div>
    </div>
  );
}
