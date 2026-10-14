"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, UploadCloud, User, LogIn, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/subjects?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-14 border-b border-[#e6e3da] bg-[#fbfbfa]/90 backdrop-blur-xs px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subjects, lecture notes, exams, or cheat sheets..."
          className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md pl-9 pr-4 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
        />
      </form>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Semester selector pill */}
        <div className="hidden sm:flex items-center space-x-1 bg-[#f4f3ed] p-0.5 rounded-md border border-[#dedad0] text-xs">
          <Link
            href="/semesters/sem-1"
            className="px-2.5 py-1 rounded font-medium text-stone-900 bg-white shadow-2xs"
          >
            S1
          </Link>
          <Link
            href="/semesters/sem-2"
            className="px-2.5 py-1 rounded text-stone-500 hover:text-stone-900 transition-colors"
          >
            S2
          </Link>
        </div>

        {/* Upload Resource Button */}
        <Link href="/library?action=upload">
          <Button size="sm" variant="outline" className="text-xs">
            <UploadCloud className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden md:inline">Upload Resource</span>
          </Button>
        </Link>

        {/* User Account / Sign In */}
        <Link href="/login">
          <Button size="sm" variant="ghost" className="text-xs">
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
