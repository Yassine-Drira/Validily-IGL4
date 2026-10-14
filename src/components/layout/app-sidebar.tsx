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
import { INITIAL_SUBJECTS } from "@/lib/mock-data";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Semesters", href: "/semesters", icon: Calendar },
  { label: "All Subjects", href: "/subjects", icon: BookOpen },
  { label: "Personal Library", href: "/library", icon: FolderArchive },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Cheat Sheets & Notes", href: "/notes", icon: FileEdit },
  { label: "Practice Quizzes", href: "/quizzes", icon: GraduationCap },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [s1Expanded, setS1Expanded] = useState(true);

  return (
    <aside className="w-64 border-r border-[#e6e3da] bg-[#f7f6f2] flex flex-col h-screen shrink-0 sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-[#e6e3da] flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-md bg-[#3730a3] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            V
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm tracking-tight text-stone-900">
                Validily
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-stone-200/80 text-stone-700 font-semibold">
                IGL4
              </span>
            </div>
            <span className="text-[10px] text-stone-500 font-sans">
              Exam Library
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Workspace Navigation */}
        <div className="space-y-0.5">
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider font-mono">
            Navigation
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
                  "flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-[#e8e6dc] text-stone-950 font-semibold shadow-2xs"
                    : "text-stone-600 hover:text-stone-950 hover:bg-[#edebe3]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-[#3730a3]" : "text-stone-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Semester 1 Direct Subject Directory */}
        <div className="space-y-1">
          <button
            onClick={() => setS1Expanded(!s1Expanded)}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider font-mono hover:text-stone-700 transition-colors"
          >
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3 h-3 text-[#3730a3]" />
              <span>Semester 1 Subjects</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform text-stone-400",
                s1Expanded ? "transform rotate-0" : "transform -rotate-90"
              )}
            />
          </button>

          {s1Expanded && (
            <div className="space-y-0.5 pl-1 pt-0.5">
              {INITIAL_SUBJECTS.map((sub) => {
                const subHref = `/subjects/${sub.slug}`;
                const isSubActive = pathname === subHref;

                return (
                  <Link
                    key={sub.id}
                    href={subHref}
                    className={cn(
                      "flex items-center justify-between px-2 py-1 rounded text-xs transition-colors",
                      isSubActive
                        ? "bg-[#e3e0d4] text-stone-950 font-medium"
                        : "text-stone-600 hover:text-stone-900 hover:bg-[#edebe3]"
                    )}
                  >
                    <span className="truncate pr-1">{sub.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {sub.resource_count}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Link */}
        <div className="pt-2 border-t border-[#e6e3da]/80">
          <Link
            href="/admin"
            className={cn(
              "flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-[#e8e6dc] text-stone-950 font-semibold"
                : "text-stone-600 hover:text-stone-950 hover:bg-[#edebe3]"
            )}
          >
            <Shield className="w-4 h-4 text-stone-400" />
            <span>Admin Console</span>
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#e6e3da] text-[11px] text-stone-500 bg-[#f4f3ed]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-stone-400">AY 2024–2025</span>
          <span className="text-emerald-700 font-medium flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>IGL4 Track</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
