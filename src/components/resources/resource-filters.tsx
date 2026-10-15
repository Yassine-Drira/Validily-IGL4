"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { ResourceCategory } from "@/types/database";

interface ResourceFiltersProps {
  categories: ResourceCategory[];
  totalResults: number;
}

export function ResourceFilters({
  categories,
  totalResults,
}: ResourceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentSession = searchParams.get("session") || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const applyFilters = (updates: {
    search?: string;
    category?: string;
    session?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.search !== undefined) {
      if (updates.search) params.set("search", updates.search);
      else params.delete("search");
    }

    if (updates.category !== undefined) {
      if (updates.category) params.set("category", updates.category);
      else params.delete("category");
    }

    if (updates.session !== undefined) {
      if (updates.session) params.set("session", updates.session);
      else params.delete("session");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search: searchTerm.trim() });
  };

  const handleReset = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(currentSearch || currentCategory || currentSession);

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title, instructor, or topic..."
            className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#182235] placeholder:text-[#68748A] focus:outline-none focus:border-[#2855D9] focus:bg-white transition-all"
          />
        </form>

        {/* Exam Session Filter */}
        <select
          value={currentSession}
          onChange={(e) => applyFilters({ session: e.target.value })}
          className="w-full sm:w-auto bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-1.5 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] cursor-pointer"
        >
          <option value="">All Sessions</option>
          <option value="Principal">Principal Session</option>
          <option value="Rattrapage">Rattrapage (Resit)</option>
          <option value="DS">Continuous (DS)</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-rose-600 hover:text-rose-800 flex items-center space-x-1 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => applyFilters({ category: "" })}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium shrink-0 cursor-pointer ${
            !currentCategory
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#2855D9]"
          }`}
        >
          All ({totalResults})
        </button>
        {categories.map((cat) => {
          const isActive = currentCategory === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => applyFilters({ category: cat.slug })}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#2855D9] text-white shadow-2xs"
                  : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#2855D9]"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
