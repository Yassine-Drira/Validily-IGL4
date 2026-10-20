"use client";

import React, { useId } from "react";
import { Sparkles, Crown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * High-definition luxury 24-point golden rosette medallion matching Image 2.
 * Features a radiant metallic gold gradient, royal 3-point crown, and bold white VIP insignia.
 */
export function VipMedallion({
  size = "md",
  className = "",
  withRing = true,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  withRing?: boolean;
}) {
  const rawId = useId();
  const gradId = `vip-gold-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const sizeClasses = {
    xs: "w-[18px] h-[18px]",
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
    xl: "w-16 h-16",
    "2xl": "w-24 h-24",
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(
        "shrink-0 select-none transition-transform duration-200",
        sizeClasses[size],
        className
      )}
      style={{
        filter: "drop-shadow(0 2px 4px rgba(180, 83, 9, 0.4))",
      }}
      aria-label="VIP Gold Medal"
    >
      <defs>
        <radialGradient id={gradId} cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFF7C8" />
          <stop offset="25%" stopColor="#F5C443" />
          <stop offset="58%" stopColor="#D98A12" />
          <stop offset="85%" stopColor="#B36B00" />
          <stop offset="100%" stopColor="#7E4700" />
        </radialGradient>
      </defs>

      {/* 24-point Scalloped Rosette Seal */}
      <path
        d="M 93.00 50.00 Q 97.59 56.27 91.53 61.13 Q 94.35 68.37 87.24 71.50 Q 88.08 79.22 80.41 80.41 Q 79.22 88.08 71.50 87.24 Q 68.37 94.35 61.13 91.53 Q 56.27 97.59 50.00 93.00 Q 43.73 97.59 38.87 91.53 Q 31.63 94.35 28.50 87.24 Q 20.78 88.08 19.59 80.41 Q 11.92 79.22 12.76 71.50 Q 5.65 68.37 8.47 61.13 Q 2.41 56.27 7.00 50.00 Q 2.41 43.73 8.47 38.87 Q 5.65 31.63 12.76 28.50 Q 11.92 20.78 19.59 19.59 Q 20.78 11.92 28.50 12.76 Q 31.63 5.65 38.87 8.47 Q 43.73 2.41 50.00 7.00 Q 56.27 2.41 61.13 8.47 Q 68.37 5.65 71.50 12.76 Q 79.22 11.92 80.41 19.59 Q 88.08 20.78 87.24 28.50 Q 94.35 31.63 91.53 38.87 Q 97.59 43.73 93.00 50.00 Z"
        fill={`url(#${gradId})`}
        stroke={withRing ? "#FFFFFF" : "none"}
        strokeWidth={withRing ? "3" : "0"}
      />

      {/* Subtle Inner Bevel Ring */}
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.3"
        strokeWidth="0.8"
      />

      {/* Royal Crown (Pure White) */}
      <path
        d="M 33 43.5 L 32.5 27.5 L 41.5 33.5 L 50 27.5 L 58.5 33.5 L 67.5 27.5 L 67 43.5 Z"
        fill="#FFFFFF"
      />

      {/* Bold White VIP Lettering */}
      <text
        x="50"
        y="70"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="22"
        fontWeight="900"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="1.2"
      >
        VIP
      </text>
    </svg>
  );
}

interface VipBadgeProps {
  variant?: "compact" | "full" | "avatar-badge" | "pill" | "medallion";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  remainingDays?: number;
  className?: string;
  showTooltip?: boolean;
}

export function VipBadge({
  variant = "compact",
  size,
  remainingDays,
  className = "",
  showTooltip = true,
}: VipBadgeProps) {
  const tooltipText =
    remainingDays !== undefined && remainingDays > 0
      ? `Membre VIP Officiel • Expérience Premium Validily (${remainingDays} jours restants)`
      : "Membre VIP Officiel • Expérience Premium Validily IGL4";

  // 1. Avatar Badge: High-contrast golden rosette badge floating on avatar corner
  if (variant === "avatar-badge") {
    const medallionSize = size || "xs";
    return (
      <div
        className={cn(
          "absolute -bottom-1 -right-1 z-20 flex items-center justify-center transition-transform duration-200 hover:scale-115 cursor-default select-none",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <VipMedallion size={medallionSize} withRing={true} />
      </div>
    );
  }

  // 2. Compact Badge: Sleek pill for headers, lists, and user dropdowns
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-300/25 to-amber-500/15 text-amber-950 border border-amber-400/80 shadow-2xs select-none transition-all duration-200 hover:scale-105 hover:border-amber-500 hover:shadow-xs",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <VipMedallion size="xs" withRing={false} className="w-3.5 h-3.5" />
        <span className="font-extrabold uppercase text-[9.5px] tracking-wider text-amber-950">
          VIP
        </span>
        <Sparkles className="w-2.5 h-2.5 text-amber-600 fill-amber-400/80 animate-pulse" />
      </span>
    );
  }

  // 3. Pill Variant: Status tag with optional remaining days
  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-400/80 text-amber-950 text-xs font-extrabold shadow-2xs select-none transition-transform hover:scale-102",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <VipMedallion size="xs" withRing={false} className="w-4 h-4" />
        <span>Membre VIP</span>
        <Sparkles className="w-3 h-3 text-amber-600 fill-amber-300" />
        {remainingDays !== undefined && remainingDays > 0 && (
          <span className="text-[10px] text-amber-800 font-mono font-semibold ml-0.5">
            ({remainingDays}j)
          </span>
        )}
      </span>
    );
  }

  // 4. Standalone Medallion
  if (variant === "medallion") {
    return (
      <div
        className={cn("inline-flex items-center justify-center", className)}
        title={showTooltip ? tooltipText : undefined}
      >
        <VipMedallion size={size || "lg"} withRing={true} />
      </div>
    );
  }

  // 5. "full" variant: Sleek profile showcase card
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-400/90 text-amber-950 shadow-xs transition-all select-none hover:shadow-sm hover:border-amber-500",
        className
      )}
      title={showTooltip ? tooltipText : undefined}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs font-black tracking-tight text-amber-950">
          <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400/60" />
          <span>Membre VIP Officiel</span>
          <Sparkles className="w-3 h-3 text-amber-600 fill-amber-400" />
        </div>
        <div className="text-[10px] text-amber-900/80 font-medium flex items-center gap-1 mt-0.5">
          <span>Pass Privilégié Promotion IGL4</span>
          {remainingDays !== undefined && remainingDays > 0 && (
            <span className="font-mono font-bold">• {remainingDays}j restants</span>
          )}
          <ShieldCheck className="w-3 h-3 text-emerald-600 inline ml-1" />
        </div>
      </div>
    </div>
  );
}
