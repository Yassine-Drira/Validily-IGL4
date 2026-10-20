"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
}: LibraryExplorerProps) {
  // 0ms Optimistic Filter States
  const [category, setCategory] = useState<string>(initialCategory);
  const [type, setType] = useState<string>(initialType);
  const [sort, setSort] = useState<"useful" | "recent" | "voted">(initialSort);
  const [q, setQ] = useState<string>(initialQuery);
  const [subjectId, setSubjectId] = useState<string | undefined>(initialSubjectId);

  // Sync with browser URL without triggering Next.js server component re-fetch
  const updateUrl = useCallback(
    (
      newCategory: string,
      newType: string,
      newSort: string,
      newQ: string,
      newSubId?: string
    ) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (newCategory && newCategory !== "all") params.set("category", newCategory);
      if (newType && newType !== "all") params.set("type", newType);
      if (newSort && newSort !== "useful") params.set("sort", newSort);
      if (newQ && newQ.trim()) params.set("q", newQ.trim());
      if (newSubId) params.set("subjectId", newSubId);

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
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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

  // Click Handlers - 0ms Instant Response
  const handleSelectCategory = (catSlug: string) => {
    setCategory(catSlug);
    updateUrl(catSlug, type, sort, q, subjectId);
  };

  const handleSelectType = (newType: string) => {
    setType(newType);
    updateUrl(category, newType, sort, q, subjectId);
  };

  const handleSelectSort = (newSort: "useful" | "recent" | "voted") => {
    setSort(newSort);
    updateUrl(category, type, newSort, q, subjectId);
  };

  const handleClearSubject = () => {
    setSubjectId(undefined);
    updateUrl(category, type, sort, q, undefined);
  };

  const handleClearCategory = () => {
    setCategory("all");
    updateUrl("all", type, sort, q, subjectId);
  };

  const handleClearSearch = () => {
    setQ("");
    updateUrl(category, type, sort, "", subjectId);
  };

  const handleResetAll = () => {
    setCategory("all");
    setType("all");
    setSort("useful");
    setQ("");
    setSubjectId(undefined);
    updateUrl("all", "all", "useful", "", undefined);
  };

  const isAllCategoriesActive = !category || category === "all";

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="space-y-3 bg-[#FAFAF7] p-3 rounded-lg border border-[#E4E8F0]">
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

      {/* Resource Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
            <FolderArchive className="w-4 h-4 text-[#2855D9]" />
            <span>Ressources académiques ({filteredResources.length})</span>
          </h2>
        </div>

        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((res) => (
              <ResourceCard key={res.id} resource={res} />
            ))}
          </div>
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
