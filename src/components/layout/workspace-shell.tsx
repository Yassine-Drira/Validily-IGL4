"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleMobile: () => {},
  closeMobile: () => {},
  isCollapsed: false,
  setIsCollapsed: () => {},
  toggleCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function WorkspaceShell({
  sidebar,
  header,
  children,
}: {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsedState] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Load persisted desktop collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("validily_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsedState(saved === "true");
      }
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem("validily_sidebar_collapsed", String(collapsed));
    } catch {
      // Ignore
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("validily_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Automatically close mobile drawer when navigating
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile: () => setIsMobileOpen((prev) => !prev),
        closeMobile: () => setIsMobileOpen(false),
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
      }}
    >
      <div className="flex min-h-screen bg-[#F4F6FA] relative" data-workspace-shell="true">
        <React.Fragment key="shell-sidebar">{sidebar}</React.Fragment>
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <React.Fragment key="shell-header">{header}</React.Fragment>
          <main key="shell-main" className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
