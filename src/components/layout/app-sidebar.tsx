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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Subject } from "@/types/database";

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Semesters", href: "/semesters", icon: Calendar },
  { label: "Subjects", href: "/subjects", icon: BookOpen },
  { label: "Resource Library", href: "/library", icon: FolderArchive },
  { label: "Cheat Sheets & Notes", href: "/notes", icon: FileEdit },
  { label: "Quizzes", href: "/quizzes", icon: GraduationCap },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
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
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#2855D9] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs group-hover:bg-[#111A2E] transition-colors">
            V
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-[#111A2E]">
              validily-IGL4
            </span>
            <span className="text-[11px] text-[#68748A] font-sans">
              Academic Library
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {/* Main Workspace Navigation */}
        <div className="space-y-0.5">
          <div className="px-3 pb-2 text-[10px] font-semibold text-[#68748A] uppercase tracking-wider font-mono">
            Platform Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all relative",
                  isActive
                    ? "bg-[#EDF2FF] text-[#2855D9] font-semibold shadow-2xs"
                    : "text-[#182235] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#2855D9] rounded-r" />
                )}
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-[#2855D9]" : "text-[#68748A]"
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
                <span>Semester 1 Modules</span>
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

        {/* Admin Link */}
        <div className="pt-3 border-t border-[#E4E8F0]">
          <Link
            href="/admin"
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-[#EDF2FF] text-[#2855D9] font-semibold"
                : "text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
            )}
          >
            <Shield className="w-4 h-4 text-[#68748A]" />
            <span>Admin Console</span>
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-[#E4E8F0] text-[11px] text-[#68748A] bg-white">
        <div className="flex items-center justify-between font-mono">
          <span>AY 2024–2025</span>
          <span className="text-emerald-700 font-medium flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-sans">IGL4 Track</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
