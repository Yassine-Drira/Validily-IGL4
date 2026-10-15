import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FlaskConical,
  FileText,
  GraduationCap,
  Sparkles,
  Layers,
  Folder,
  CheckCircle2,
  LucideIcon,
} from "lucide-react";

export interface CategoryVisual {
  frenchLabel: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeVariant: "default" | "secondary" | "outline" | "success" | "warning" | "indigo";
}

export function getCategoryVisual(slug: string = "", fallbackName: string = ""): CategoryVisual {
  const s = (slug || "").toLowerCase();
  const n = (fallbackName || "").toLowerCase();

  if (s.includes("course") || n.includes("course") || s === "courses-notes") {
    return {
      frenchLabel: "Cours & Polycopiés",
      icon: BookOpen,
      color: "text-[#2855D9]",
      bgColor: "bg-[#EDF2FF]",
      borderColor: "border-[#2855D9]/20",
      badgeVariant: "indigo",
    };
  }

  if (s.includes("tp") || n.includes("practical") || s === "tp-practical") {
    return {
      frenchLabel: "Travaux Pratiques (TP)",
      icon: FlaskConical,
      color: "text-[#059669]",
      bgColor: "bg-[#ECFDF5]",
      borderColor: "border-[#A7F3D0]",
      badgeVariant: "success",
    };
  }

  if (s.includes("ds") || n.includes("continuous") || s === "ds-continuous") {
    return {
      frenchLabel: "Devoirs Surveillés (DS)",
      icon: FileText,
      color: "text-[#D97706]",
      bgColor: "bg-[#FFFBEB]",
      borderColor: "border-[#FDE68A]",
      badgeVariant: "warning",
    };
  }

  if (s.includes("exam") || n.includes("exam") || s === "exams") {
    return {
      frenchLabel: "Examens & Évaluations",
      icon: GraduationCap,
      color: "text-[#DC2626]",
      bgColor: "bg-[#FEF2F2]",
      borderColor: "border-[#FECACA]",
      badgeVariant: "warning",
    };
  }

  if (s.includes("summary") || n.includes("summaries") || s === "summaries") {
    return {
      frenchLabel: "Résumés & Synthèses",
      icon: Layers,
      color: "text-[#7C3AED]",
      bgColor: "bg-[#F5F3FF]",
      borderColor: "border-[#DDD6FE]",
      badgeVariant: "secondary",
    };
  }

  if (s.includes("cheat") || n.includes("cheat") || s === "cheat-sheets") {
    return {
      frenchLabel: "Fiches Mémo & Formules",
      icon: Sparkles,
      color: "text-[#EA580C]",
      bgColor: "bg-[#FFF7ED]",
      borderColor: "border-[#FED7AA]",
      badgeVariant: "outline",
    };
  }

  if (s.includes("exercise") || n.includes("solution") || s === "exercises-solutions") {
    return {
      frenchLabel: "Exercices & Corrigés",
      icon: CheckCircle2,
      color: "text-[#0284C7]",
      bgColor: "bg-[#F0F9FF]",
      borderColor: "border-[#BAE6FD]",
      badgeVariant: "secondary",
    };
  }

  return {
    frenchLabel: fallbackName || "Autres Ressources",
    icon: Folder,
    color: "text-[#68748A]",
    bgColor: "bg-[#F4F6FA]",
    borderColor: "border-[#E4E8F0]",
    badgeVariant: "secondary",
  };
}

interface CategoryBadgeProps {
  slug?: string;
  name: string;
  className?: string;
}

export function CategoryBadge({ slug, name, className }: CategoryBadgeProps) {
  const visual = getCategoryVisual(slug, name);
  return (
    <Badge variant={visual.badgeVariant} className={className}>
      {visual.frenchLabel}
    </Badge>
  );
}
