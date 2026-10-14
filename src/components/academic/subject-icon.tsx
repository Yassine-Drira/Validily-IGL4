import React from "react";
import {
  Smartphone,
  Link as LinkIcon,
  Cpu,
  Brain,
  ShieldCheck,
  Kanban,
  Building2,
  Cloud,
  Network,
  TrendingUp,
  BookOpen,
  Folder,
  FileText,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

interface SubjectIconProps {
  name: string | null;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Smartphone,
  Link: LinkIcon,
  Cpu,
  Brain,
  ShieldCheck,
  Kanban,
  Building2,
  Cloud,
  Network,
  TrendingUp,
  BookOpen,
  Folder,
  FileText,
};

export function SubjectIcon({ name, className = "w-5 h-5" }: SubjectIconProps) {
  if (!name || !iconMap[name]) {
    return <Folder className={className} />;
  }
  const IconComponent = iconMap[name];
  return <IconComponent className={className} />;
}
