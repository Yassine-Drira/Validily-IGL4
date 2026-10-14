"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
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
    <div className="bg-white border border-[#e6e3da] rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title, instructor, or topic..."
            className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md pl-9 pr-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
          />
        </form>

        {/* Exam Session Filter */}
        <select
          value={currentSession}
          onChange={(e) => applyFilters({ session: e.target.value })}
          className="w-full sm:w-auto bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
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
            className="text-xs text-rose-600 hover:text-rose-800 flex items-center space-x-1 shrink-0"
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
          className={`px-2.5 py-1 rounded-md transition-colors font-medium shrink-0 ${
            !currentCategory
              ? "bg-[#3730a3] text-white"
              : "bg-[#f4f3ed] text-stone-600 hover:bg-[#edebe3]"
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
              className={`px-2.5 py-1 rounded-md transition-colors font-medium shrink-0 ${
                isActive
                  ? "bg-[#3730a3] text-white"
                  : "bg-[#f4f3ed] text-stone-600 hover:bg-[#edebe3]"
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
