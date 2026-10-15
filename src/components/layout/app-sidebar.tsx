"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  FolderArchive,
  Bookmark,
  FileEdit,
  GraduationCap,
  Shield,
  Layers,
  ChevronDown,
  Sparkles,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Subject } from "@/types/database";

import { ValidilyLogo } from "@/components/brand/validily-logo";

const navItems = [
  { label: "Accueil", href: "/", icon: LayoutDashboard },
  { label: "Semestres", href: "/semesters", icon: Calendar },
  { label: "Matières", href: "/subjects", icon: BookOpen },
  { label: "Examens", href: "/library?category=cat-exam", icon: GraduationCap },
  { label: "Fichiers", href: "/library", icon: FolderArchive },
  { label: "Quiz & QCM", href: "/quizzes", icon: Sparkles },
  { label: "Fiches de révision", href: "/notes", icon: FileEdit },
  { label: "Mes espaces", href: "/bookmarks", icon: Bookmark },
  { label: "Paramètres", href: "/admin", icon: Settings },
];

interface AppSidebarProps {
  subjects?: Subject[];
}

export function AppSidebar({ subjects = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const [s1Expanded, setS1Expanded] = useState(true);

  return (
    <aside className="w-64 border-r border-[#E4E8F0] bg-[#FAFAF7] flex flex-col h-screen shrink-0 sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#E4E8F0] flex items-center justify-between bg-white">
        <ValidilyLogo size="md" subtitle="Bibliothèque Académique" />
        <span className="sr-only">validily-IGL4</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Main Workspace Navigation */}
        <div className="space-y-0.5">
          <div className="px-3 pb-2 text-[10px] font-semibold text-[#68748A] uppercase tracking-wider font-mono">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || (item.href !== "/" && !item.href.includes("?") && pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all relative",
                  isActive
                    ? "bg-[#2855D9] text-white font-semibold shadow-xs"
                    : "text-[#182235] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-white" : "text-[#68748A]"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Dynamic Semester 1 Subject Directory */}
        {subjects.length > 0 && (
          <div className="space-y-1">
            <button
              onClick={() => setS1Expanded(!s1Expanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[#68748A] uppercase tracking-wider font-mono hover:text-[#111A2E] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-[#2855D9]" />
                <span>Modules Semestre 1</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform text-[#68748A]",
                  s1Expanded ? "transform rotate-0" : "transform -rotate-90"
                )}
              />
            </button>

            {s1Expanded && (
              <div className="space-y-0.5 pl-2 pt-1">
                {subjects.map((sub) => {
                  const subHref = `/subjects/${sub.slug}`;
                  const isSubActive = pathname === subHref;

                  return (
                    <Link
                      key={sub.id}
                      href={subHref}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors",
                        isSubActive
                          ? "bg-[#EDF2FF] text-[#2855D9] font-medium"
                          : "text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA]"
                      )}
                    >
                      <span className="truncate pr-1">{sub.name}</span>
                      <span className="text-[10px] text-[#68748A] font-mono font-tabular">
                        {sub.resource_count ?? 0}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Student Status (Direct from Mockup) */}
      <div className="p-3 border-t border-[#E4E8F0] bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#EDF2FF] border border-[#2855D9]/30 flex items-center justify-center text-[#2855D9]">
                <User className="w-4 h-4 text-[#2855D9]" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111A2E] leading-tight">
                Étudiant
              </div>
              <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>En ligne</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#68748A] bg-[#F4F6FA] px-2 py-0.5 rounded border border-[#E4E8F0]">
            IGL4
          </div>
        </div>
      </div>
    </aside>
  );
}
