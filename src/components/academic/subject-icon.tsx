import React from "react";
import {
  Smartphone,
  Cpu,
  Brain,
  ShieldCheck,
  Kanban,
  Building2,
  Cloud,
  Network,
  TrendingUp,
  Folder,
  Code2,
  Boxes,
  Calendar,
  Layers,
  Database,
  Terminal,
  Sparkles,
  BookOpen,
  Atom,
  Globe,
  Lock,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubjectVisual {
  color: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  icon: (props: { className?: string }) => React.ReactElement;
  displayName: string;
}

export const AVAILABLE_SUBJECT_ICONS = [
  { name: "Brain", label: "Intelligence Artificielle", icon: Brain },
  { name: "Cpu", label: "Algorithmique & CPU", icon: Cpu },
  { name: "Smartphone", label: "Mobile / Flutter", icon: Smartphone },
  { name: "ShieldCheck", label: "Cybersécurité & Défense", icon: ShieldCheck },
  { name: "Cloud", label: "Cloud & Virtualisation", icon: Cloud },
  { name: "Database", label: "Bases de Données & SQL", icon: Database },
  { name: "Network", label: "Réseaux & Optimisation", icon: Network },
  { name: "Code2", label: "Génie Logiciel / Code", icon: Code2 },
  { name: "Building2", label: "Entreprise & Organisation", icon: Building2 },
  { name: "Calendar", label: "Gestion de Projet / Agile", icon: Calendar },
  { name: "TrendingUp", label: "Processus Stochastiques", icon: TrendingUp },
  { name: "Boxes", label: "Architecture / Microservices", icon: Boxes },
  { name: "Layers", label: "Systèmes Distribués", icon: Layers },
  { name: "Terminal", label: "Systèmes & Shell", icon: Terminal },
  { name: "Sparkles", label: "Atelier & Innovation", icon: Sparkles },
  { name: "BookOpen", label: "Théorie & Fondamentaux", icon: BookOpen },
  { name: "Atom", label: "Sciences & Recherche", icon: Atom },
  { name: "Globe", label: "Technologies Web & Réseaux", icon: Globe },
  { name: "Lock", label: "Sécurité & Chiffrement", icon: Lock },
  { name: "Folder", label: "Module Général", icon: Folder },
];

export const PRESET_ACCESSIBLE_COLORS = [
  { name: "Bleu Océan", hex: "#2563EB", textClass: "text-[#2563EB]", bgLight: "bg-[#EFF6FF]", borderLight: "border-[#BFDBFE]" },
  { name: "Indigo", hex: "#4F46E5", textClass: "text-[#4F46E5]", bgLight: "bg-[#EEF2FF]", borderLight: "border-[#C7D2FE]" },
  { name: "Émeraude", hex: "#059669", textClass: "text-[#059669]", bgLight: "bg-[#ECFDF5]", borderLight: "border-[#A7F3D0]" },
  { name: "Violet", hex: "#7C3AED", textClass: "text-[#7C3AED]", bgLight: "bg-[#F5F3FF]", borderLight: "border-[#DDD6FE]" },
  { name: "Cyan", hex: "#0284C7", textClass: "text-[#0284C7]", bgLight: "bg-[#E0F2FE]", borderLight: "border-[#BAE6FD]" },
  { name: "Ambre", hex: "#D97706", textClass: "text-[#D97706]", bgLight: "bg-[#FFFBEB]", borderLight: "border-[#FDE68A]" },
  { name: "Rose", hex: "#E11D48", textClass: "text-[#E11D48]", bgLight: "bg-[#FFF1F2]", borderLight: "border-[#FECDD3]" },
  { name: "Ardoise", hex: "#475569", textClass: "text-[#475569]", bgLight: "bg-[#F8FAFC]", borderLight: "border-[#E2E8F0]" },
];

export function FlutterGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.3 2.5L5.7 11.1L8.7 14.1L20.3 2.5H14.3Z"
        fill="#54C5F8"
      />
      <path
        d="M14.3 12.3L9.5 17.1L12.5 20.1L20.3 12.3H14.3Z"
        fill="#01579B"
      />
      <path
        d="M12.5 20.1L15.5 23.1H21.5L15.5 17.1L12.5 20.1Z"
        fill="#29B6F6"
      />
    </svg>
  );
}

export function ParallelGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  );
}

export function BlockchainGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.12" />
      <rect x="14" y="2" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.12" />
      <rect x="8" y="14" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.12" />
      <line x1="10" y1="6" x2="14" y2="6" />
      <line x1="6" y1="10" x2="10" y2="14" />
      <line x1="18" y1="10" x2="14" y2="14" />
    </svg>
  );
}

export function OptimizationGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity="0.12" />
      <circle cx="5" cy="18" r="3" fill="currentColor" fillOpacity="0.12" />
      <circle cx="19" cy="18" r="3" fill="currentColor" fillOpacity="0.12" />
      <line x1="12" y1="8" x2="5" y2="15" />
      <line x1="12" y1="8" x2="19" y2="15" />
      <line x1="8" y1="18" x2="16" y2="18" strokeDasharray="2 2" />
    </svg>
  );
}

export function getSubjectVisual(
  slugOrName: string = "",
  customConfig?: string | null
): SubjectVisual {
  // 1. If customConfig is provided (e.g. "Brain:#4F46E5", "Cpu", or JSON)
  if (customConfig && typeof customConfig === "string") {
    let iconName = customConfig.trim();
    let hexColor: string | null = null;

    if (customConfig.includes(":")) {
      const parts = customConfig.split(":");
      iconName = parts[0].trim();
      hexColor = parts[1].trim();
    } else if (customConfig.startsWith("{")) {
      try {
        const parsed = JSON.parse(customConfig);
        iconName = parsed.icon || iconName;
        hexColor = parsed.color || null;
      } catch {
        // Fall back
      }
    }

    const matchedIcon = AVAILABLE_SUBJECT_ICONS.find(
      (item) => item.name.toLowerCase() === iconName.toLowerCase()
    );

    const matchedPalette = hexColor
      ? PRESET_ACCESSIBLE_COLORS.find(
          (p) => p.hex.toLowerCase() === hexColor!.toLowerCase()
        )
      : null;

    if (matchedIcon) {
      const IconComponent = matchedIcon.icon;
      const palette = matchedPalette || PRESET_ACCESSIBLE_COLORS[0];
      return {
        color: palette.textClass,
        bgLight: palette.bgLight,
        borderLight: palette.borderLight,
        badgeBg: `${palette.bgLight} ${palette.textClass}`,
        icon: (props) => <IconComponent {...props} />,
        displayName: slugOrName || matchedIcon.label,
      };
    }
  }

  const key = (slugOrName || "").toLowerCase();

  if (key.includes("flutter")) {
    return {
      color: "text-[#0284C7]",
      bgLight: "bg-[#E0F2FE]",
      borderLight: "border-[#BAE6FD]",
      badgeBg: "bg-[#E0F2FE]/70 text-[#0284C7]",
      icon: (props) => <FlutterGlyph {...props} />,
      displayName: "Flutter",
    };
  }

  if (key.includes("blockchain")) {
    return {
      color: "text-[#2563EB]",
      bgLight: "bg-[#EFF6FF]",
      borderLight: "border-[#BFDBFE]",
      badgeBg: "bg-[#EFF6FF] text-[#2563EB]",
      icon: (props) => <BlockchainGlyph {...props} />,
      displayName: "Blockchain",
    };
  }

  if (key.includes("parallel") || key.includes("algo")) {
    return {
      color: "text-[#7C3AED]",
      bgLight: "bg-[#F5F3FF]",
      borderLight: "border-[#DDD6FE]",
      badgeBg: "bg-[#F5F3FF] text-[#7C3AED]",
      icon: (props) => <ParallelGlyph {...props} />,
      displayName: "Algo Parallèle",
    };
  }

  if (key.includes("intelligence") || key.includes("artificial") || key === "ia" || key.includes("ia")) {
    return {
      color: "text-[#D946EF]",
      bgLight: "bg-[#FDF4FF]",
      borderLight: "border-[#F5D0FE]",
      badgeBg: "bg-[#FDF4FF] text-[#D946EF]",
      icon: (props) => <Brain {...props} />,
      displayName: "IA",
    };
  }

  if (key.includes("cyber") || key.includes("security") || key.includes("sécurité")) {
    return {
      color: "text-[#059669]",
      bgLight: "bg-[#ECFDF5]",
      borderLight: "border-[#A7F3D0]",
      badgeBg: "bg-[#ECFDF5] text-[#059669]",
      icon: (props) => <ShieldCheck {...props} />,
      displayName: "Cybersécurité",
    };
  }

  if (key.includes("project") || key.includes("gestion") || key.includes("management")) {
    return {
      color: "text-[#EA580C]",
      bgLight: "bg-[#FFF7ED]",
      borderLight: "border-[#FED7AA]",
      badgeBg: "bg-[#FFF7ED] text-[#EA580C]",
      icon: (props) => <Calendar {...props} />,
      displayName: "Gestion de projet",
    };
  }

  if (key.includes("enterprise") || key.includes("entreprise")) {
    return {
      color: "text-[#2563EB]",
      bgLight: "bg-[#EFF6FF]",
      borderLight: "border-[#BFDBFE]",
      badgeBg: "bg-[#EFF6FF] text-[#2563EB]",
      icon: (props) => <Building2 {...props} />,
      displayName: "Entreprise",
    };
  }

  if (key.includes("cloud")) {
    return {
      color: "text-[#0284C7]",
      bgLight: "bg-[#F0F9FF]",
      borderLight: "border-[#BAE6FD]",
      badgeBg: "bg-[#F0F9FF] text-[#0284C7]",
      icon: (props) => <Cloud {...props} />,
      displayName: "Cloud",
    };
  }

  if (key.includes("combinatorial") || key.includes("optimization") || key.includes("optimisation")) {
    return {
      color: "text-[#9333EA]",
      bgLight: "bg-[#FAF5FF]",
      borderLight: "border-[#E9D5FF]",
      badgeBg: "bg-[#FAF5FF] text-[#9333EA]",
      icon: (props) => <OptimizationGlyph {...props} />,
      displayName: "Optimisation combinatoire",
    };
  }

  if (key.includes("stochastic") || key.includes("stochastique")) {
    return {
      color: "text-[#3B82F6]",
      bgLight: "bg-[#EFF6FF]",
      borderLight: "border-[#BFDBFE]",
      badgeBg: "bg-[#EFF6FF] text-[#3B82F6]",
      icon: (props) => <TrendingUp {...props} />,
      displayName: "Stochastique",
    };
  }

  return {
    color: "text-[#2855D9]",
    bgLight: "bg-[#EDF2FF]",
    borderLight: "border-[#2855D9]/20",
    badgeBg: "bg-[#EDF2FF] text-[#2855D9]",
    icon: (props) => <Folder {...props} />,
    displayName: slugOrName || "Module",
  };
}

interface SubjectIconProps {
  name: string | null;
  slug?: string;
  className?: string;
}

export function SubjectIcon({ name, slug, className = "w-5 h-5" }: SubjectIconProps) {
  const visual = getSubjectVisual(slug || name || "");
  const IconRenderer = visual.icon;
  return <IconRenderer className={cn(className, visual.color)} />;
}
