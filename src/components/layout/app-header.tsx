"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, UploadCloud, User, Menu, LogOut, Bookmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./workspace-shell";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }: any) => {
        if (data?.user) {
          setUser({
            id: data.user.id,
            name:
              data.user.user_metadata?.display_name ||
              data.user.email?.split("@")[0] ||
              "Étudiant",
            email: data.user.email,
          });
        }
      });
    } catch {
      // Guest mode
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/library?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setIsDropdownOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setUser(null);
    }
  };

  return (
    <header className="h-14 border-b border-[#E4E8F0] bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 gap-3">
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={toggleMobile}
        className="md:hidden p-2 -ml-1 text-[#182235] hover:bg-[#F4F6FA] rounded-lg transition-colors cursor-pointer shrink-0"
        aria-label="Open navigation sidebar"
      >
        <Menu className="w-5 h-5 text-[#182235]" />
      </button>

      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher matières, cours, examens ou fiches..."
          className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#182235] placeholder:text-[#68748A] focus:outline-none focus:border-[#2855D9] focus:bg-white transition-all"
        />
      </form>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Semester quick selector */}
        <div className="hidden sm:flex items-center space-x-1 bg-[#F4F6FA] p-0.5 rounded-lg border border-[#E4E8F0] text-xs">
          <Link
            href="/semesters/sem-1"
            className="px-2.5 py-1 rounded font-medium text-[#2855D9] bg-white shadow-2xs border border-[#E4E8F0]"
          >
            S1
          </Link>
          <Link
            href="/semesters/sem-2"
            className="px-2.5 py-1 rounded text-[#68748A] hover:text-[#182235] transition-colors"
          >
            S2
          </Link>
        </div>

        {/* Upload Resource Button */}
        <Link href="/library?action=upload">
          <Button size="sm" variant="outline" className="text-xs">
            <UploadCloud className="w-3.5 h-3.5 text-[#2855D9]" />
            <span className="hidden md:inline">Ajouter un document</span>
          </Button>
        </Link>

        {/* User Account / Dropdown */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#F4F6FA] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] font-bold text-xs flex items-center justify-center">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-[#182235] hidden sm:inline max-w-[100px] truncate">
                {user.name}
              </span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E4E8F0] rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[#F1F4F9]">
                  <div className="font-bold text-[#111A2E] truncate">{user.name}</div>
                  <div className="text-[11px] text-[#68748A] truncate">{user.email}</div>
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
