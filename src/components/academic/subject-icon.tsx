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

export function getSubjectVisual(slugOrName: string = ""): SubjectVisual {
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
