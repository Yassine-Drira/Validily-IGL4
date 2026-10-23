"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { AcademicResource, ResourceCategory, Subject } from "@/types/database";
import { ResourceCard } from "@/components/academic/resource-card";
import { Button } from "@/components/ui/button";
import {
  FolderArchive,
  UploadCloud,
  X,
  Flame,
  Clock,
  ThumbsUp,
  FileText,
  FileCode,
  Link2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface LibraryExplorerProps {
  initialResources: AcademicResource[];
  categories: ResourceCategory[];
  subjects: Subject[];
  initialCategory?: string;
  initialType?: string;
  initialSort?: "useful" | "recent" | "voted";
  initialQuery?: string;
  initialSubjectId?: string;
  initialPage?: number;
  initialPageSize?: number;
}

export function LibraryExplorer({
  initialResources,
  categories,
  subjects,
  initialCategory = "all",
  initialType = "all",
  initialSort = "useful",
  initialQuery = "",
  initialSubjectId,
  initialPage = 1,
  initialPageSize = 12,
}: LibraryExplorerProps) {
  // 0ms Optimistic Filter States
  const [category, setCategory] = useState<string>(initialCategory);
  const [type, setType] = useState<string>(initialType);
  const [sort, setSort] = useState<"useful" | "recent" | "voted">(initialSort);
  const [q, setQ] = useState<string>(initialQuery);
  const [subjectId, setSubjectId] = useState<string | undefined>(initialSubjectId);
  const [page, setPage] = useState<number>(initialPage || 1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize || 12);

  const gridRef = useRef<HTMLDivElement>(null);

  // Sync with browser URL without triggering Next.js server component re-fetch
  const updateUrl = useCallback(
    (
      newCategory: string,
      newType: string,
      newSort: string,
      newQ: string,
      newSubId?: string,
      newPage: number = 1,
      newPageSize: number = 12
    ) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (newCategory && newCategory !== "all") params.set("category", newCategory);
      if (newType && newType !== "all") params.set("type", newType);
      if (newSort && newSort !== "useful") params.set("sort", newSort);
      if (newQ && newQ.trim()) params.set("q", newQ.trim());
      if (newSubId) params.set("subjectId", newSubId);
      if (newPage > 1) params.set("page", String(newPage));
      if (newPageSize !== 12) params.set("pageSize", String(newPageSize));

      const qs = params.toString();
      const newPath = qs ? `/library?${qs}` : "/library";
      window.history.replaceState(null, "", newPath);
    },
    []
  );

  // Synchronize on browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      setCategory(sp.get("category") || sp.get("categoryId") || "all");
      setType(sp.get("type") || "all");
      setSort((sp.get("sort") as "useful" | "recent" | "voted") || "useful");
      setQ(sp.get("q") || "");
      setSubjectId(sp.get("subjectId") || undefined);
      setPage(parseInt(sp.get("page") || "1", 10) || 1);
      setPageSize(parseInt(sp.get("pageSize") || "12", 10) || 12);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Synchronize state when navigating with new props
  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSubjectId(initialSubjectId);
  }, [initialSubjectId]);

  useEffect(() => {
    if (initialPage) setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (initialPageSize) setPageSize(initialPageSize);
  }, [initialPageSize]);

  // Debounced URL state updater to avoid thrashing window.history.replaceState on fast typing
  const debounceUrlTimer = useRef<NodeJS.Timeout | null>(null);

  const updateUrlDebounced = useCallback(
    (
      newCategory: string,
      newType: string,
      newSort: string,
      newQ: string,
      newSubId?: string,
      newPage: number = 1,
      newPageSize: number = 12
    ) => {
      if (debounceUrlTimer.current) {
        clearTimeout(debounceUrlTimer.current);
      }
      debounceUrlTimer.current = setTimeout(() => {
        updateUrl(newCategory, newType, newSort, newQ, newSubId, newPage, newPageSize);
      }, 250);
    },
    [updateUrl]
  );

  useEffect(() => {
    return () => {
      if (debounceUrlTimer.current) clearTimeout(debounceUrlTimer.current);
    };
  }, []);

  // Matched category object
  const matchedCategory = useMemo(() => {
    if (!category || category === "all") return null;
    const clean = category.replace("cat-", "").toLowerCase();
    return (
      categories.find(
        (c) =>
          c.id === category ||
          c.slug === category ||
          c.slug.includes(clean) ||
          clean.includes(c.slug)
      ) || null
    );
  }, [category, categories]);

  // Matched subject object
  const matchedSubject = useMemo(() => {
    if (!subjectId) return null;
    return subjects.find((s) => s.id === subjectId || s.slug === subjectId) || null;
  }, [subjectId, subjects]);

  // 0ms In-Memory Instant Filter & Sort Engine
  const filteredResources = useMemo(() => {
    let result = [...initialResources];

    // 1. Subject filter
    if (subjectId) {
      result = result.filter(
        (r) =>
          r.subject_id === subjectId ||
          r.subject?.id === subjectId ||
          r.subject?.slug === subjectId
      );
    }

    // 2. Category filter
    if (category && category !== "all") {
      const targetCatId = matchedCategory ? matchedCategory.id : category;
      const targetSlug = matchedCategory ? matchedCategory.slug : category;
      result = result.filter(
        (r) =>
          r.category_id === targetCatId ||
          r.category?.id === targetCatId ||
          r.category?.slug === targetSlug ||
          (r.category?.slug && targetSlug && (r.category.slug.includes(targetSlug) || targetSlug.includes(r.category.slug)))
      );
    }

    // 3. Search query filter
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      result = result.filter((r) => {
        const titleMatch = r.title?.toLowerCase().includes(term);
        const descMatch = r.description?.toLowerCase().includes(term);
        const subjectMatch = r.subject?.name?.toLowerCase().includes(term);
        const tagMatch = r.tags?.some((t: string) => t.toLowerCase().includes(term));
        return titleMatch || descMatch || subjectMatch || tagMatch;
      });
    }

    // 4. Format / Type filter
    if (type && type !== "all") {
      result = result.filter((r) => {
        const inferredType =
          r.resource_type ||
          (r.mime_type?.includes("pdf")
            ? "document"
            : r.mime_type?.includes("quiz") || r.tags?.includes("quiz")
            ? "quiz"
            : r.external_url
            ? "url"
            : "document");

        if (type === "url") {
          return inferredType === "url" || inferredType === "link";
        }
        return inferredType === type;
      });
    }

    // 5. Sort engine
    result.sort((a, b) => {
      if (sort === "useful") {
        const scoreA = a.vote_summary?.score ?? a.usefulness_score ?? 0;
        const scoreB = b.vote_summary?.score ?? b.usefulness_score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sort === "voted") {
        const votesA = (a.vote_summary?.upvotes || 0) + (a.vote_summary?.downvotes || 0);
        const votesB = (b.vote_summary?.upvotes || 0) + (b.vote_summary?.downvotes || 0);
        if (votesB !== votesA) return votesB - votesA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [initialResources, subjectId, category, matchedCategory, q, type, sort]);

  // Click Handlers - 0ms Instant Response with Automatic Page Reset
  const handleSelectCategory = (catSlug: string) => {
    setCategory(catSlug);
    setPage(1);
    updateUrl(catSlug, type, sort, q, subjectId, 1, pageSize);
  };

  const handleSelectType = (newType: string) => {
    setType(newType);
    setPage(1);
    updateUrl(category, newType, sort, q, subjectId, 1, pageSize);
  };

  const handleSelectSort = (newSort: "useful" | "recent" | "voted") => {
    setSort(newSort);
    setPage(1);
    updateUrl(category, type, newSort, q, subjectId, 1, pageSize);
  };

  const handleClearSubject = () => {
    setSubjectId(undefined);
    setPage(1);
    updateUrl(category, type, sort, q, undefined, 1, pageSize);
  };

  const handleClearCategory = () => {
    setCategory("all");
    setPage(1);
    updateUrl("all", type, sort, q, subjectId, 1, pageSize);
  };

  const handleClearSearch = () => {
    if (debounceUrlTimer.current) clearTimeout(debounceUrlTimer.current);
    setQ("");
    setPage(1);
    updateUrl(category, type, sort, "", subjectId, 1, pageSize);
  };

  const handleResetAll = () => {
    setCategory("all");
    setType("all");
    setSort("useful");
    setQ("");
    setSubjectId(undefined);
    setPage(1);
    updateUrl("all", "all", "useful", "", undefined, 1, pageSize);
  };

  // Pagination Calculations
  const totalCount = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const pagedResources = useMemo(() => {
    return filteredResources.slice(startIndex, endIndex);
  }, [filteredResources, startIndex, endIndex]);

  const handlePageChange = (targetPage: number) => {
    const validPage = Math.min(Math.max(1, targetPage), totalPages);
    setPage(validPage);
    updateUrl(category, type, sort, q, subjectId, validPage, pageSize);
    if (gridRef.current && typeof window !== "undefined") {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 80;
      if (window.scrollY > top) {
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    updateUrl(category, type, sort, q, subjectId, 1, newSize);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  };

  const isAllCategoriesActive = !category || category === "all";

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="space-y-3 bg-[#FAFAF7] p-3 rounded-xl border border-[#E4E8F0] shadow-2xs">
        {/* Instant Search Bar (0ms In-Memory Filter) */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              const val = e.target.value;
              setQ(val);
              setPage(1);
              updateUrlDebounced(category, type, sort, val, subjectId, 1, pageSize);
            }}
            placeholder="Rechercher par titre, matière, mot-clé ou tag..."
            className="w-full bg-white border border-[#E4E8F0] focus:border-[#2855D9] rounded-xl pl-9 pr-9 py-2 text-xs text-[#111A2E] placeholder:text-[#68748A] outline-none shadow-2xs transition-all"
          />
          {q && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#68748A] hover:text-[#111A2E] p-1 rounded-md cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 1: Category Filter Pills & Active Queries */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectCategory("all")}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
                isAllCategoriesActive
                  ? "bg-[#2855D9] text-white font-medium shadow-2xs"
                  : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235] hover:border-[#2855D9]/30"
              }`}
            >
              Toutes les catégories
            </button>
            {categories.map((cat) => {
              const isSelected =
                !isAllCategoriesActive &&
                (matchedCategory?.id === cat.id ||
                  category === cat.id ||
                  category === cat.slug);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`px-3 py-1 text-xs rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-[#2855D9] text-white font-medium shadow-2xs"
                      : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235] hover:border-[#2855D9]/30"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Active Filter Tags */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {matchedSubject && (
              <div className="flex items-center space-x-1.5 text-xs text-[#2855D9] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
                <span className="font-medium">Matière : {matchedSubject.name}</span>
                <button
                  type="button"
                  onClick={handleClearSubject}
                  className="text-[#2855D9] hover:text-[#111A2E] cursor-pointer"
                  title="Effacer la matière"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {matchedCategory && (
              <div className="flex items-center space-x-1.5 text-xs text-[#2855D9] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
                <span className="font-medium">{matchedCategory.name}</span>
                <button
                  type="button"
                  onClick={handleClearCategory}
                  className="text-[#2855D9] hover:text-[#111A2E] cursor-pointer"
                  title="Effacer la catégorie"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {q && (
              <div className="flex items-center space-x-1.5 text-xs text-[#182235] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
                <span>&ldquo;{q}&rdquo;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-[#2855D9] hover:text-[#111A2E] cursor-pointer"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Format Filter Pills & Sorting Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#E4E8F0]/70">
          {/* Format pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#68748A] mr-1 hidden sm:inline">
              Format :
            </span>
            {[
              { id: "all", label: "Tous", icon: null },
              { id: "document", label: "Documents PDF", icon: FileText },
              { id: "quiz", label: "Quiz HTML", icon: FileCode },
              { id: "url", label: "Liens Web", icon: Link2 },
            ].map((f) => {
              const isSelected = type === f.id;
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectType(f.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-[#182235] text-white font-medium shadow-2xs"
                      : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235] hover:border-[#182235]/30"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sorting tabs */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-[11px] font-medium text-[#68748A] mr-1 hidden sm:inline">
              Trier par :
            </span>
            {[
              { id: "useful", label: "Plus utiles", icon: Flame },
              { id: "recent", label: "Plus récents", icon: Clock },
              { id: "voted", label: "Plus votés", icon: ThumbsUp },
            ].map((s) => {
              const isSelected = sort === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSort(s.id as "useful" | "recent" | "voted")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-amber-100/80 border border-amber-300 text-amber-900 font-semibold shadow-2xs"
                      : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235] hover:border-amber-300/40"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isSelected ? "text-amber-600" : ""}`} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resource Grid Section with Pagination */}
      <div ref={gridRef} className="space-y-4 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <FolderArchive className="w-4 h-4 text-[#2855D9]" />
            <h2 className="text-sm font-semibold text-[#182235]">
              Ressources académiques ({totalCount})
            </h2>
            {totalCount > 0 && (
              <span className="text-[11px] text-[#68748A] font-medium hidden sm:inline">
                • Affichage de {startIndex + 1} à {endIndex}
              </span>
            )}
          </div>

          {/* Page size selector */}
          {totalCount > 12 && (
            <div className="flex items-center gap-1.5 text-xs text-[#68748A] self-end sm:self-auto">
              <span className="text-[11px] font-medium">Afficher par :</span>
              {[12, 24, 48].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                    pageSize === size
                      ? "bg-[#2855D9] text-white shadow-2xs"
                      : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        {pagedResources.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
              {pagedResources.map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav
                role="navigation"
                aria-label="Pagination des ressources"
                className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E4E8F0] mt-6"
              >
                <div className="text-xs text-[#68748A] font-medium text-center sm:text-left">
                  Affichage de <span className="font-semibold text-[#111A2E]">{startIndex + 1}</span> à{" "}
                  <span className="font-semibold text-[#111A2E]">{endIndex}</span> sur{" "}
                  <span className="font-semibold text-[#111A2E]">{totalCount}</span> documents
                </div>

                {/* Mobile compact pagination (prev, page X/Y, next) */}
                <div className="flex sm:hidden items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="min-h-[36px] px-3 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#182235] hover:bg-[#F4F6FA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Précédent</span>
                  </button>

                  <span className="text-xs font-semibold font-mono text-[#182235] px-2.5 py-1 bg-[#F4F6FA] rounded-lg border border-[#E4E8F0]">
                    {safePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="min-h-[36px] px-3 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#182235] hover:bg-[#F4F6FA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                    aria-label="Page suivante"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Desktop / tablet numbered pagination */}
                <div className="hidden sm:flex items-center gap-1">
                  {totalPages > 5 && (
                    <button
                      type="button"
                      onClick={() => handlePageChange(1)}
                      disabled={safePage <= 1}
                      className="min-w-[36px] min-h-[36px] rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center active:scale-90 transition-all shadow-2xs cursor-pointer"
                      title="Première page"
                      aria-label="Première page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="min-w-[36px] min-h-[36px] px-2.5 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 active:scale-90 transition-all shadow-2xs cursor-pointer"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden md:inline">Précédent</span>
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {getPageNumbers().map((item, idx) => {
                      if (item === "...") {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="min-w-[32px] text-center font-mono text-xs text-[#68748A] select-none"
                          >
                            ...
                          </span>
                        );
                      }
                      const num = item as number;
                      const isCurrent = num === safePage;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePageChange(num)}
                          aria-current={isCurrent ? "page" : undefined}
                          className={`min-w-[36px] min-h-[36px] rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center active:scale-90 ${
                            isCurrent
                              ? "bg-[#2855D9] text-white shadow-xs font-bold"
                              : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA]"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="min-w-[36px] min-h-[36px] px-2.5 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 active:scale-90 transition-all shadow-2xs cursor-pointer"
                    aria-label="Page suivante"
                  >
                    <span className="hidden md:inline">Suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {totalPages > 5 && (
                    <button
                      type="button"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={safePage >= totalPages}
                      className="min-w-[36px] min-h-[36px] rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center active:scale-90 transition-all shadow-2xs cursor-pointer"
                      title="Dernière page"
                      aria-label="Dernière page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </nav>
            )}
          </>
        ) : (
          <div className="bg-white border border-[#E4E8F0] rounded-xl p-12 text-center">
            <FolderArchive className="w-10 h-10 text-[#68748A]/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#182235]">
              Aucune ressource trouvée
            </h3>
            <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
              {q
                ? `Aucune ressource académique ne correspond à "${q}". Essayez d'autres mots-clés ou réinitialisez les filtres.`
                : "Aucune ressource enregistrée avec ces critères pour l'instant. Soyez le premier à enrichir la bibliothèque avec un cours, quiz ou lien !"}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/library?action=upload">
                <Button size="sm" variant="primary">
                  <UploadCloud className="w-4 h-4 mr-1.5" />
                  <span>Déposer le premier document</span>
                </Button>
              </Link>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-1.5 text-xs font-medium text-[#182235] bg-white border border-[#E4E8F0] hover:bg-[#F4F6FA] rounded-md transition-colors cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
