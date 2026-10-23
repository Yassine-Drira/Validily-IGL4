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
  Layers,
  ChevronDown,
  Sparkles,
  Settings,
  User,
  X,
  ArrowRight,
  Trees,
  CalendarCheck2,
  UploadCloud,
  Bot,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Subject } from "@/types/database";
import { ValidilyLogo, ValidilySymbol } from "@/components/brand/validily-logo";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { useSidebar } from "./workspace-shell";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  adminOnly?: boolean;
}

export interface NavSectionConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const navSections: NavSectionConfig[] = [
  {
    id: "workspace",
    title: "Espace de Travail",
    items: [
      { label: "Accueil", href: "/", icon: LayoutDashboard },
      { label: "Mon Espace", href: "/my-space", icon: User },
    ],
  },
  {
    id: "productivity",
    title: "Productivité & IA",
    items: [
      { label: "Coach IA & Tuteur", href: "/coach", icon: Bot, badge: "IA" },
      { label: "Planning & Tâches", href: "/planner", icon: CalendarCheck2 },
      { label: "Habitudes & Routine", href: "/habits", icon: Flame },
      { label: "Bosquet Focus", href: "/forest", icon: Trees },
    ],
  },
  {
    id: "academic",
    title: "Ressources & Études",
    items: [
      { label: "Matières", href: "/subjects", icon: BookOpen },
      { label: "Semestres", href: "/semesters", icon: Calendar },
      { label: "Bibliothèque", href: "/library", icon: FolderArchive },
      { label: "Quiz & QCM", href: "/quizzes", icon: Sparkles },
      { label: "Fiches de révision", href: "/notes", icon: FileEdit },
      { label: "Favoris", href: "/bookmarks", icon: Bookmark },
    ],
  },
  {
    id: "system",
    title: "Système",
    items: [
      { label: "Paramètres", href: "/admin", icon: Settings, adminOnly: true },
    ],
  },
];

// Flat export preserving backward compatibility and strict test contracts
export const navItems = [
  { label: "Accueil", href: "/", icon: LayoutDashboard },
  { label: "Coach IA & Tuteur", href: "/coach", icon: Bot },
  { label: "Planning & Tâches", href: "/planner", icon: CalendarCheck2 },
  { label: "Habitudes & Routine", href: "/habits", icon: Flame },
  { label: "Semestres", href: "/semesters", icon: Calendar },
  { label: "Matières", href: "/subjects", icon: BookOpen },
  { label: "Bibliothèque", href: "/library", icon: FolderArchive },
  { label: "Quiz & QCM", href: "/quizzes", icon: Sparkles },
  { label: "Fiches de révision", href: "/notes", icon: FileEdit },
  { label: "Bosquet Focus", href: "/forest", icon: Trees },
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
  const { isMobileOpen, closeMobile, isCollapsed, toggleCollapsed } = useSidebar();

  const [s1Expanded, setS1Expanded] = useState(true);
  const [s2Expanded, setS2Expanded] = useState(true);

  // Segregate S1 and S2 subjects dynamically
  const s2Subjects = subjects.filter(
    (s) =>
      s.semester_id === "22222222-2222-2222-2222-222222222222" ||
      s.semester?.name?.includes("2")
  );
  const s1Subjects = subjects.filter(
    (s) => !s2Subjects.some((s2) => s2.id === s.id)
  );

  const checkIsActive = (href: string, label: string) => {
    const isLibraryItem = label === "Bibliothèque" || label === "Fichiers";
    if (href === "/") {
      return pathname === "/";
    }
    if (isLibraryItem) {
      return pathname === "/library" || pathname.startsWith("/library/");
    }
    return (
      pathname === href ||
      (href !== "/" && !href.includes("?") && pathname.startsWith(href))
    );
  };

  const renderNavContent = (collapsed: boolean = false) => (
    <div className={cn("flex-1 overflow-y-auto py-3 space-y-4", collapsed ? "px-2" : "px-3")}>
      {navSections.map((section, idx) => {
        const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.id} className="space-y-1">
            {/* Section Header or Divider */}
            {collapsed ? (
              idx > 0 && <div className="my-2 border-t border-[#E4E8F0]/70 mx-1.5" />
            ) : (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider font-mono select-none flex items-center justify-between">
                <span>{section.title}</span>
              </div>
            )}

            {/* Section Nav Items */}
            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = checkIsActive(item.href, item.label);

                if (collapsed) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={closeMobile}
                      title={item.label}
                      className={cn(
                        "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all cursor-pointer relative group",
                        isActive
                          ? "bg-[#2855D9] text-white shadow-xs"
                          : "text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.badge && !isActive && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#2855D9]" />
                      )}
                      {/* Hover Tooltip for Collapsed Rail */}
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMobile}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all relative cursor-pointer group",
                      isActive
                        ? "bg-[#2855D9] text-white font-semibold shadow-xs"
                        : "text-[#182235] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
                    )}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-white" : "text-[#68748A] group-hover:text-[#182235]"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider border shrink-0",
                          isActive
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-[#EDF2FF] text-[#2855D9] border-[#2855D9]/20"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Dynamic Semester 1 Subject Directory */}
      {s1Subjects.length > 0 && (
        <div className="space-y-1 pt-1">
          {collapsed ? (
            <div className="pt-2">
              <div className="my-2 border-t border-[#E4E8F0]/70 mx-1.5" />
              <Link
                href="/subjects"
                title={`Modules Semestre 1 (${s1Subjects.length})`}
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-[#2855D9] hover:bg-[#EDF2FF] transition-colors"
              >
                <Layers className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setS1Expanded(!s1Expanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider font-mono hover:text-[#111A2E] transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-[#2855D9]" />
                  <span>Modules Semestre 1</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-[#68748A] font-mono font-normal">
                    {s1Subjects.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform text-[#68748A]",
                      s1Expanded ? "transform rotate-0" : "transform -rotate-90"
                    )}
                  />
                </div>
              </button>

              {s1Expanded && (
                <div className="space-y-0.5 pl-2 pt-0.5">
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
            </>
          )}
        </div>
      )}

      {/* Dynamic Semester 2 Subject Directory (if exists) */}
      {s2Subjects.length > 0 && (
        <div className="space-y-1">
          {collapsed ? (
            <Link
              href="/subjects"
              title={`Modules Semestre 2 (${s2Subjects.length})`}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-indigo-500 hover:bg-[#EDF2FF] transition-colors"
            >
              <Layers className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setS2Expanded(!s2Expanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider font-mono hover:text-[#111A2E] transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Modules Semestre 2</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-[#68748A] font-mono font-normal">
                    {s2Subjects.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform text-[#68748A]",
                      s2Expanded ? "transform rotate-0" : "transform -rotate-90"
                    )}
                  />
                </div>
              </button>

              {s2Expanded && (
                <div className="space-y-0.5 pl-2 pt-0.5">
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
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent / Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:flex border-r border-[#E4E8F0] bg-[#FAFAF7] flex-col h-screen shrink-0 sticky top-0 z-20 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Brand Header with Integrated Closer */}
        <div
          className={cn(
            "h-14 border-b border-[#E4E8F0] flex items-center bg-white shrink-0 transition-all duration-300",
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {isCollapsed ? (
            <Link
              href="/"
              className="flex items-center justify-center p-1.5 rounded-lg hover:bg-[#F4F6FA] transition-colors group"
              title="validily-IGL4"
              aria-label="Accueil validily-IGL4"
            >
              <ValidilySymbol size="sm" className="group-hover:scale-105 transition-transform" />
            </Link>
          ) : (
            <>
              <ValidilyLogo size="md" subtitle="Bibliothèque Académique" />
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] active:bg-[#EDF2FF] transition-all cursor-pointer group"
                title="Réduire la barre latérale (Ctrl+B)"
                aria-label="Réduire la barre latérale"
              >
                <PanelLeftClose className="w-5 h-5 text-[#68748A] group-hover:text-[#182235] transition-colors" />
              </button>
            </>
          )}
        </div>

        {/* Desktop Navigation Content */}
        {renderNavContent(isCollapsed)}
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

            {/* Mobile Fast Action */}
            <div className="px-4 py-2.5 bg-white border-b border-[#E4E8F0]">
              <Link
                href="/library?action=upload"
                onClick={closeMobile}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E42AC] active:scale-95 transition-all shadow-xs"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Ajouter un document</span>
              </Link>
            </div>

            {renderNavContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
