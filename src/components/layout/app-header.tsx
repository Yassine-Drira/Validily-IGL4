"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, UploadCloud, User, Menu, LogOut, Bookmark, Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./workspace-shell";
import { createClient } from "@/lib/supabase/client";
import { flushAuthCookiesClient } from "@/lib/auth/cookie-utils";
import { serverLogoutAction } from "@/lib/auth/logout-action";
import { FocusHeaderWidget } from "@/components/focus/focus-header-widget";
import { NotificationBell } from "@/components/notifications/notification-bell";

import { VipBadge } from "@/components/ui/vip-badge";

export interface HeaderUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  role?: string;
  isVip?: boolean;
  isTemporaryAdmin?: boolean;
}

export function AppHeader({ initialUser }: { initialUser?: HeaderUser | null }) {
  const router = useRouter();
  const { toggleMobile, toggleCollapsed, isCollapsed } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<HeaderUser | null>(initialUser ?? null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      return;
    }

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }: any) => {
        if (data?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", data.user.id)
            .maybeSingle();

          setUser({
            id: data.user.id,
            name:
              profile?.display_name ||
              data.user.user_metadata?.display_name ||
              data.user.email?.split("@")[0] ||
              "Étudiant",
            email: data.user.email,
            avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || null,
          });
        }
      });
    } catch {
      // Guest mode
    }
  }, [initialUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/library?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Invalidate server session, cookies and in-memory caches
      try {
        await serverLogoutAction();
      } catch {
        // Safe fallback if offline
      }

      // 2. Client-side Supabase signOut
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }

      // 3. Flush client-accessible auth cookies
      flushAuthCookiesClient();

      // 4. Purge all localStorage and sessionStorage caches to prevent data bleed
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
        } catch {
          // Ignore
        }
        try {
          sessionStorage.clear();
        } catch {
          // Ignore
        }
      }

      setUser(null);
      setIsDropdownOpen(false);

      // 5. Hard refresh and redirect to login
      window.location.href = "/login?logged_out=1";
    } catch {
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <header className="h-14 border-b border-[#E4E8F0] bg-white/95 backdrop-blur-xs px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 gap-2 sm:gap-3">
      {/* Mobile Menu Button with 40px+ Touch Target */}
      <button
        type="button"
        onClick={toggleMobile}
        className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center p-2 -ml-1 text-[#182235] hover:bg-[#F4F6FA] active:bg-[#EDF2FF] rounded-xl transition-all cursor-pointer shrink-0"
        aria-label="Ouvrir le menu de navigation"
      >
        <Menu className="w-5 h-5 text-[#182235]" />
      </button>

      {/* Desktop Sidebar Opener Button — only shown when sidebar is collapsed/closed */}
      {isCollapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden md:flex min-w-[36px] min-h-[36px] items-center justify-center p-2 text-[#68748A] hover:text-[#2855D9] hover:bg-[#F4F6FA] active:bg-[#EDF2FF] rounded-xl transition-all cursor-pointer shrink-0 animate-in fade-in duration-150"
          title="Développer la barre latérale (Ctrl+B)"
          aria-label="Développer la barre latérale"
        >
          <PanelLeftOpen className="w-5 h-5 text-[#2855D9]" />
        </button>
      )}

      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="relative flex-1 min-w-[100px] max-w-md">
        <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher cours, matières, fiches..."
          className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#182235] placeholder:text-[#68748A] focus:outline-none focus:border-[#2855D9] focus:bg-white transition-all"
        />
      </form>

      {/* Right controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Persistent Focus / Pomodoro Timer & Soundscapes */}
        <FocusHeaderWidget />

        {/* Upload Resource Button: members upload, visitors redirected to login */}
        <Link href={user ? "/library?action=upload" : "/login?next=/library?action=upload"} className="hidden sm:inline-flex shrink-0">
          <Button size="sm" variant="outline" className="text-xs">
            <UploadCloud className="w-3.5 h-3.5 text-[#2855D9]" />
            <span className="hidden md:inline">Ajouter un document</span>
          </Button>
        </Link>

        {/* Notifications Center */}
        {user && <NotificationBell user={user} />}

        {/* User Account / Dropdown */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 min-h-[40px] rounded-xl hover:bg-[#F4F6FA] active:scale-95 transition-all cursor-pointer"
            >
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-7 h-7 rounded-lg object-cover border border-[#2855D9]/20 shadow-2xs"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] font-bold text-xs flex items-center justify-center">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-[#182235] hidden sm:inline max-w-[100px] truncate">
                {user.name}
              </span>
              {user.isVip && <VipBadge variant="compact" className="hidden sm:inline-flex" />}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E4E8F0] rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[#F1F4F9] space-y-1">
                  <div className="font-bold text-[#111A2E] truncate">{user.name}</div>
                  <div className="text-[11px] text-[#68748A] truncate">{user.email}</div>
                  {user.isTemporaryAdmin && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                      👑 Admin Délégué
                    </span>
                  )}
                </div>

                <Link
                  href="/my-space"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-[#182235] hover:bg-[#F4F6FA] transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#2855D9]" />
                  <span>Mon Espace Étudiant</span>
                </Link>

                <Link
                  href="/bookmarks"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-[#182235] hover:bg-[#F4F6FA] transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Mes Favoris</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    window.dispatchEvent(new CustomEvent("validily-replay-intro"));
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-[#182235] hover:bg-[#F4F6FA] transition-colors cursor-pointer text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D4A346]" />
                  <span>Revoir l&apos;intro VIP</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="ghost" className="text-xs">
              <User className="w-3.5 h-3.5 text-[#68748A]" />
              <span>Connexion</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
