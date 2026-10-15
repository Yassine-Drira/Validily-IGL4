"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  FolderArchive,
  Bookmark,
  FileEdit,
  GraduationCap,
  Layers,
  ChevronDown,
  Sparkles,
  Settings,
  User,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Subject } from "@/types/database";
import { ValidilyLogo } from "@/components/brand/validily-logo";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { useSidebar } from "./workspace-shell";

const navItems = [
  { label: "Accueil", href: "/", icon: LayoutDashboard },
  { label: "Semestres", href: "/semesters", icon: Calendar },
  { label: "Matières", href: "/subjects", icon: BookOpen },
  { label: "Examens", href: "/library?category=exams", icon: GraduationCap },
  { label: "Bibliothèque", href: "/library", icon: FolderArchive },
  { label: "Quiz & QCM", href: "/quizzes", icon: Sparkles },
  { label: "Fiches de révision", href: "/notes", icon: FileEdit },
  { label: "Favoris", href: "/bookmarks", icon: Bookmark },
  { label: "Mon Espace", href: "/my-space", icon: User },
  { label: "Paramètres", href: "/admin", icon: Settings },
];

interface AppSidebarProps {
  subjects?: Subject[];
  isAdmin?: boolean;
}

export function AppSidebar({ subjects = [], isAdmin = false }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobileOpen, closeMobile } = useSidebar();

  const [s1Expanded, setS1Expanded] = useState(true);
  const [s2Expanded, setS2Expanded] = useState(true);

  const currentCategory = searchParams.get("category") || searchParams.get("categoryId");

  // Segregate S1 and S2 subjects dynamically
  const s2Subjects = subjects.filter(
    (s) =>
      s.semester_id === "22222222-2222-2222-2222-222222222222" ||
      s.semester?.name?.includes("2")
  );
  const s1Subjects = subjects.filter(
    (s) =>
      !s2Subjects.some((s2) => s2.id === s.id)
  );

  const renderNavContent = () => (
    <>
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Main Workspace Navigation */}
        <div className="space-y-0.5">
          <div className="px-3 pb-2 text-[10px] font-semibold text-[#68748A] uppercase tracking-wider font-mono">
            Navigation
          </div>
          {navItems
            .filter((item) => {
              if (item.href === "/admin" && !isAdmin) {
                return false;
              }
              return true;
            })
            .map((item) => {
            const Icon = item.icon;
            const isExamItem = item.label === "Examens";
            const isLibraryItem = item.label === "Bibliothèque" || item.label === "Fichiers";

            let isActive = false;
            if (item.href === "/") {
              isActive = pathname === "/";
            } else if (isExamItem) {
              isActive =
                pathname === "/library" &&
                (currentCategory === "exams" ||
                  currentCategory === "cat-exam" ||
                  currentCategory === "cat-exams");
            } else if (isLibraryItem) {
              isActive = pathname === "/library" && !currentCategory;
            } else {
              isActive =
                pathname === item.href ||
                (item.href !== "/" &&
                  !item.href.includes("?") &&
                  pathname.startsWith(item.href));
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all relative cursor-pointer",
                  isActive
                    ? "bg-[#2855D9] text-white font-semibold shadow-xs"
                    : "text-[#182235] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-[#68748A]"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Dynamic Semester 1 Subject Directory */}
        {s1Subjects.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setS1Expanded(!s1Expanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[#68748A] uppercase tracking-wider font-mono hover:text-[#111A2E] transition-colors cursor-pointer"
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
                {s1Subjects.map((sub) => {
                  const subHref = `/subjects/${sub.slug || sub.id}`;
                  const isSubActive =
                    pathname === subHref || pathname === `/subjects/${sub.id}`;

                  return (
                    <Link
                      key={sub.id}
                      href={subHref}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer group",
                        isSubActive
                          ? "bg-[#EDF2FF] text-[#2855D9] font-medium"
                          : "text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA]"
                      )}
                    >
                      <div className="flex items-center space-x-2 truncate pr-1">
                        <SubjectIcon name={sub.name} slug={sub.slug} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.name}</span>
                      </div>
                      <span className="text-[10px] text-[#68748A] font-mono font-tabular shrink-0">
                        {sub.resource_count ?? 0}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Semester 2 Subject Directory (if exists) */}
        {s2Subjects.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setS2Expanded(!s2Expanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[#68748A] uppercase tracking-wider font-mono hover:text-[#111A2E] transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Modules Semestre 2</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform text-[#68748A]",
                  s2Expanded ? "transform rotate-0" : "transform -rotate-90"
                )}
              />
            </button>

            {s2Expanded && (
              <div className="space-y-0.5 pl-2 pt-1">
                {s2Subjects.map((sub) => {
                  const subHref = `/subjects/${sub.slug || sub.id}`;
                  const isSubActive =
                    pathname === subHref || pathname === `/subjects/${sub.id}`;

                  return (
                    <Link
                      key={sub.id}
                      href={subHref}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer group",
                        isSubActive
                          ? "bg-[#EDF2FF] text-[#2855D9] font-medium"
                          : "text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA]"
                      )}
                    >
                      <div className="flex items-center space-x-2 truncate pr-1">
                        <SubjectIcon name={sub.name} slug={sub.slug} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.name}</span>
                      </div>
                      <span className="text-[10px] text-[#68748A] font-mono font-tabular shrink-0">
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

      {/* Footer Student Status (Fully Clickable to Auth/Account) */}
      <Link
        href="/login"
        onClick={closeMobile}
        className="p-3 border-t border-[#E4E8F0] bg-white hover:bg-[#F4F6FA] transition-colors cursor-pointer group block"
        title="Accéder au compte étudiant"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#EDF2FF] border border-[#2855D9]/30 flex items-center justify-center text-[#2855D9] group-hover:scale-105 transition-transform">
                <User className="w-4 h-4 text-[#2855D9]" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111A2E] leading-tight group-hover:text-[#2855D9] transition-colors">
                Étudiant
              </div>
              <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>En ligne</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#68748A] bg-[#F4F6FA] px-2 py-0.5 rounded border border-[#E4E8F0] group-hover:border-[#2855D9]/30 transition-colors">
            IGL4
          </div>
        </div>
      </Link>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[#E4E8F0] bg-[#FAFAF7] flex-col h-screen shrink-0 sticky top-0 z-20">
        {/* Brand Header */}
        <div className="h-14 px-5 border-b border-[#E4E8F0] flex items-center justify-between bg-white shrink-0">
          <ValidilyLogo size="md" subtitle="Bibliothèque Académique" />
          <span className="sr-only">validily-IGL4</span>
        </div>

        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-out Menu */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Drawer Pane */}
          <aside className="relative w-72 max-w-[85vw] bg-[#FAFAF7] border-r border-[#E4E8F0] flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header with Close Button */}
            <div className="h-14 px-5 border-b border-[#E4E8F0] flex items-center justify-between bg-white shrink-0">
              <ValidilyLogo size="md" subtitle="Bibliothèque Académique" />
              <button
                type="button"
                onClick={closeMobile}
                className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] transition-colors cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
}
