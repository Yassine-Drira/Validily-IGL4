import type { Subject } from "@/types/database";

export type PlannerColorKey =
  | "cobalt"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "cyan"
  | "slate";

export interface PlannerColorOption {
  key: PlannerColorKey;
  label: string;
  dotColor: string;
  ringColor: string;
  description: string;
}

export const PLANNER_COLOR_OPTIONS: PlannerColorOption[] = [
  {
    key: "cobalt",
    label: "Cobalt",
    dotColor: "#2563EB",
    ringColor: "ring-blue-500",
    description: "Cours, Théorie & Révision Standard",
  },
  {
    key: "emerald",
    label: "Émeraude",
    dotColor: "#059669",
    ringColor: "ring-emerald-500",
    description: "TD, TP, Séries d'exercices & Labs",
  },
  {
    key: "violet",
    label: "Violet",
    dotColor: "#7C3AED",
    ringColor: "ring-purple-500",
    description: "Deep Work, Architecture & IA",
  },
  {
    key: "amber",
    label: "Ambre",
    dotColor: "#D97706",
    ringColor: "ring-amber-500",
    description: "Rendus urgents & Deadlines",
  },
  {
    key: "rose",
    label: "Corail / Rose",
    dotColor: "#E11D48",
    ringColor: "ring-rose-500",
    description: "Préparation d'Examens & Fiches",
  },
  {
    key: "cyan",
    label: "Cyan",
    dotColor: "#0284C7",
    ringColor: "ring-cyan-500",
    description: "Projets de groupe & Soutenances",
  },
  {
    key: "slate",
    label: "Ardoise",
    dotColor: "#475569",
    ringColor: "ring-slate-500",
    description: "Lectures, Documentation & Synthèses",
  },
];

export interface PlannerColorClasses {
  cardBorder: string;
  cardBg: string;
  cardGlow: string;
  accentBar: string;
  titleText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  checkboxStroke: string;
  dotColor: string;
}

export const PLANNER_THEME_MAP: Record<PlannerColorKey, PlannerColorClasses> = {
  cobalt: {
    cardBorder: "border-blue-400/40 hover:border-blue-600/70",
    cardBg:
      "bg-gradient-to-br from-blue-50/90 via-white/95 to-blue-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(37,99,235,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(37,99,235,0.18)]",
    accentBar: "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]",
    titleText: "text-blue-950 font-bold",
    badgeBg: "bg-blue-100/80",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-300/40",
    checkboxStroke: "hover:stroke-blue-600",
    dotColor: "#2563EB",
  },
  emerald: {
    cardBorder: "border-emerald-400/40 hover:border-emerald-600/70",
    cardBg:
      "bg-gradient-to-br from-emerald-50/90 via-white/95 to-emerald-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(5,150,105,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(5,150,105,0.18)]",
    accentBar: "bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]",
    titleText: "text-emerald-950 font-bold",
    badgeBg: "bg-emerald-100/80",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-300/40",
    checkboxStroke: "hover:stroke-emerald-600",
    dotColor: "#059669",
  },
  violet: {
    cardBorder: "border-purple-400/40 hover:border-purple-600/70",
    cardBg:
      "bg-gradient-to-br from-purple-50/90 via-white/95 to-purple-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(124,58,237,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(124,58,237,0.18)]",
    accentBar: "bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]",
    titleText: "text-purple-950 font-bold",
    badgeBg: "bg-purple-100/80",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-300/40",
    checkboxStroke: "hover:stroke-purple-600",
    dotColor: "#7C3AED",
  },
  amber: {
    cardBorder: "border-amber-400/40 hover:border-amber-600/70",
    cardBg:
      "bg-gradient-to-br from-amber-50/90 via-white/95 to-amber-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(217,119,6,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(217,119,6,0.18)]",
    accentBar: "bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.4)]",
    titleText: "text-amber-950 font-bold",
    badgeBg: "bg-amber-100/80",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-300/40",
    checkboxStroke: "hover:stroke-amber-600",
    dotColor: "#D97706",
  },
  rose: {
    cardBorder: "border-rose-400/40 hover:border-rose-600/70",
    cardBg:
      "bg-gradient-to-br from-rose-50/90 via-white/95 to-rose-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(225,29,72,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(225,29,72,0.18)]",
    accentBar: "bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]",
    titleText: "text-rose-950 font-bold",
    badgeBg: "bg-rose-100/80",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-300/40",
    checkboxStroke: "hover:stroke-rose-600",
    dotColor: "#E11D48",
  },
  cyan: {
    cardBorder: "border-cyan-400/40 hover:border-cyan-600/70",
    cardBg:
      "bg-gradient-to-br from-cyan-50/90 via-white/95 to-cyan-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(8,145,178,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(8,145,178,0.18)]",
    accentBar: "bg-cyan-600 shadow-[0_0_8px_rgba(8,145,178,0.4)]",
    titleText: "text-cyan-950 font-bold",
    badgeBg: "bg-cyan-100/80",
    badgeText: "text-cyan-800",
    badgeBorder: "border-cyan-300/40",
    checkboxStroke: "hover:stroke-cyan-600",
    dotColor: "#0284C7",
  },
  slate: {
    cardBorder: "border-slate-300/60 hover:border-slate-500/70",
    cardBg:
      "bg-gradient-to-br from-slate-50/90 via-white/95 to-slate-50/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(71,85,105,0.06)]",
    cardGlow: "hover:shadow-[0_8px_22px_-3px_rgba(71,85,105,0.18)]",
    accentBar: "bg-slate-600 shadow-[0_0_8px_rgba(71,85,105,0.4)]",
    titleText: "text-slate-900 font-bold",
    badgeBg: "bg-slate-100/80",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-300/40",
    checkboxStroke: "hover:stroke-slate-600",
    dotColor: "#475569",
  },
};

/**
 * Extracts a custom color key from notes string formatted as `[color:key]`
 * and returns the cleaned notes for display.
 */
export function parseNotesAndColor(rawNotes?: string | null): {
  colorKey: PlannerColorKey | null;
  displayNotes: string | null;
} {
  if (!rawNotes) return { colorKey: null, displayNotes: null };

  const match = rawNotes.match(/\[color:([a-z]+)\]/i);
  if (match) {
    const rawKey = match[1].toLowerCase() as PlannerColorKey;
    const isValid = rawKey in PLANNER_THEME_MAP;
    const cleaned = rawNotes.replace(/\[color:[a-z]+\]/gi, "").trim();
    return {
      colorKey: isValid ? rawKey : null,
      displayNotes: cleaned.length > 0 ? cleaned : null,
    };
  }

  return { colorKey: null, displayNotes: rawNotes };
}

/**
 * Encodes a chosen color key into notes text.
 */
export function formatNotesWithColor(
  cleanNotes: string | null | undefined,
  colorKey?: PlannerColorKey | null
): string | null {
  const base = (cleanNotes || "").replace(/\[color:[a-z]+\]/gi, "").trim();
  if (!colorKey) return base.length > 0 ? base : null;
  return base.length > 0 ? `${base} [color:${colorKey}]` : `[color:${colorKey}]`;
}

/**
 * Deterministically resolves the color key for a task or timeblock
 * based on custom color tag, subject slug/name, or category.
 */
export function resolvePlannerColorKey(
  customKey?: PlannerColorKey | null,
  subject?: Subject | null,
  category?: string | null
): PlannerColorKey {
  if (customKey && customKey in PLANNER_THEME_MAP) {
    return customKey;
  }

  const slug = (subject?.slug || "").toLowerCase();
  const name = (subject?.name || "").toLowerCase();

  if (slug.includes("blockchain") || name.includes("blockchain")) return "violet";
  if (slug.includes("cyber") || name.includes("cyber") || slug.includes("secur"))
    return "emerald";
  if (slug.includes("artific") || slug.includes("ai") || name.includes("intel"))
    return "rose";
  if (slug.includes("parallel") || slug.includes("algo") || name.includes("parall"))
    return "cobalt";
  if (slug.includes("project") || slug.includes("manage") || name.includes("gest"))
    return "amber";
  if (slug.includes("cloud") || slug.includes("flutter") || slug.includes("distrib"))
    return "cyan";
  if (slug.includes("stoch") || slug.includes("math") || slug.includes("optim"))
    return "slate";

  if (category === "exam") return "rose";
  if (category === "td_tp") return "emerald";
  if (category === "project") return "amber";

  return "cobalt";
}

/**
 * Deterministically resolves the best glassmorphic theme for a task or timeblock
 * based on custom color tag, subject slug/name, or priority.
 */
export function resolvePlannerTheme(
  colorKey?: PlannerColorKey | null,
  subject?: Subject | null,
  category?: string | null
): PlannerColorClasses {
  const key = resolvePlannerColorKey(colorKey, subject, category);
  return PLANNER_THEME_MAP[key];
}
