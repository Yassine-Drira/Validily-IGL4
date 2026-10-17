import React from "react";
import {
  Folder,
  BookOpen,
  Code,
  Terminal,
  FileText,
  Sparkles,
  Layers,
  Cpu,
  Database,
  Bookmark,
  GraduationCap,
  Globe,
  FolderOpen,
} from "lucide-react";

export interface FolderPaletteColor {
  id: string;
  label: string;
  hex: string;
  bg: string;
  border: string;
  text: string;
  fill: string;
  badgeBg: string;
}

export const FOLDER_COLOR_PALETTE: FolderPaletteColor[] = [
  {
    id: "blue",
    label: "Bleu Océan",
    hex: "#2855D9",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-[#2855D9]",
    fill: "fill-[#2855D9]/20",
    badgeBg: "bg-blue-100/60 text-[#2855D9] border-blue-200",
  },
  {
    id: "indigo",
    label: "Indigo",
    hex: "#4F46E5",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-600",
    fill: "fill-indigo-600/20",
    badgeBg: "bg-indigo-100/60 text-indigo-700 border-indigo-200",
  },
  {
    id: "emerald",
    label: "Émeraude",
    hex: "#059669",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-600",
    fill: "fill-emerald-600/20",
    badgeBg: "bg-emerald-100/60 text-emerald-700 border-emerald-200",
  },
  {
    id: "teal",
    label: "Sarcelle",
    hex: "#0D9488",
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-600",
    fill: "fill-teal-600/20",
    badgeBg: "bg-teal-100/60 text-teal-700 border-teal-200",
  },
  {
    id: "amber",
    label: "Ambre",
    hex: "#D97706",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-600",
    fill: "fill-amber-600/20",
    badgeBg: "bg-amber-100/60 text-amber-700 border-amber-200",
  },
  {
    id: "rose",
    label: "Rose Corail",
    hex: "#E11D48",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-600",
    fill: "fill-rose-600/20",
    badgeBg: "bg-rose-100/60 text-rose-700 border-rose-200",
  },
  {
    id: "violet",
    label: "Violet",
    hex: "#7C3AED",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-600",
    fill: "fill-purple-600/20",
    badgeBg: "bg-purple-100/60 text-purple-700 border-purple-200",
  },
  {
    id: "slate",
    label: "Ardoise",
    hex: "#475569",
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    fill: "fill-slate-600/20",
    badgeBg: "bg-slate-200/60 text-slate-700 border-slate-300",
  },
];

export interface FolderIconOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const FOLDER_ICON_OPTIONS: FolderIconOption[] = [
  { id: "folder", label: "Dossier", icon: Folder },
  { id: "book-open", label: "Cours", icon: BookOpen },
  { id: "code", label: "Code", icon: Code },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "file-text", label: "Documents", icon: FileText },
  { id: "sparkles", label: "Essentiel", icon: Sparkles },
  { id: "layers", label: "Modules", icon: Layers },
  { id: "cpu", label: "Systèmes", icon: Cpu },
  { id: "database", label: "Données", icon: Database },
  { id: "bookmark", label: "Important", icon: Bookmark },
  { id: "graduation-cap", label: "Examens", icon: GraduationCap },
  { id: "globe", label: "Web", icon: Globe },
];

export function getFolderVisual(colorKey?: string, iconKey?: string) {
  const color =
    FOLDER_COLOR_PALETTE.find((c) => c.id === colorKey) || FOLDER_COLOR_PALETTE[0];
  const iconOption =
    FOLDER_ICON_OPTIONS.find((i) => i.id === iconKey) || FOLDER_ICON_OPTIONS[0];

  return {
    color,
    Icon: iconOption.icon,
    label: iconOption.label,
  };
}
