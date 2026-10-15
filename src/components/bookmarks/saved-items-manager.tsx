"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bookmark,
  Search,
  Filter,
  ExternalLink,
  Download,
  Eye,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  HardDrive,
  FileText,
  FileCode,
  CheckCircle2,
  X,
  ArrowRight,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcademicResource } from "@/types/database";
import { toggleBookmark } from "@/lib/actions/resource-actions";

interface SavedItemsManagerProps {
  initialResources: AcademicResource[];
  isGuest: boolean;
}

export function SavedItemsManager({
  initialResources,
  isGuest,
}: SavedItemsManagerProps) {
  const [resources, setResources] = useState<AcademicResource[]>(initialResources);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "pdf" | "gdrive" | "exams" | "courses">("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [feedback, setFeedback] = useState<string>("");

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3500);
  };

  const handleRemoveBookmark = async (resourceId: string, title: string) => {
    try {
      const res = await toggleBookmark(resourceId);
      if (res.success) {
        setResources((prev) => prev.filter((r) => r.id !== resourceId));
        showFeedback(`"${title}" retiré de vos favoris.`);
      }
    } catch {
      showFeedback("Impossible de retirer le favori.");
    }
  };

  // Distinct subjects present in bookmarks
  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resources) {
      if (r.subject_id && r.subject?.name) {
        map.set(r.subject_id, r.subject.name);
      }
    }
    return Array.from(map.entries());
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesSubject = res.subject?.name.toLowerCase().includes(q);
        const matchesDesc = res.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesDesc) return false;
      }

      // Subject Filter
      if (selectedSubject !== "all" && res.subject_id !== selectedSubject) {
        return false;
      }

      // Type Filter
      if (selectedType === "gdrive") {
        return res.storage_path.startsWith("http") && res.storage_path.includes("drive.google.com");
      }
      if (selectedType === "pdf") {
        return res.mime_type?.includes("pdf") || res.storage_path.endsWith(".pdf");
      }
      if (selectedType === "exams") {
        return res.category?.slug?.includes("exam") || res.category?.name?.toLowerCase().includes("examen");
      }
      if (selectedType === "courses") {
        return res.category?.slug?.includes("course") || res.category?.name?.toLowerCase().includes("cours");
      }

      return true;
    });
  }, [resources, searchQuery, selectedType, selectedSubject]);

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2855D9] flex items-center justify-center border border-blue-100">
              <Bookmark className="w-5 h-5 fill-[#2855D9]/20" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[#111A2E] tracking-tight">
                Documents & Ressources Sauvegardés
              </h1>
              <p className="text-xs text-[#68748A] mt-0.5">
                Votre sélection rapide pour préparer vos examens, TD et révisions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#68748A] bg-[#FAFAF7] border border-[#E4E8F0] px-3.5 py-2 rounded-xl font-mono">
          <span>Total :</span>
          <strong className="text-[#111A2E] text-sm">{resources.length}</strong>
          <span>ressource{resources.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, matière, mot-clé..."
              className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111A2E] placeholder:text-[#68748A] focus:outline-none focus:border-[#2855D9]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subject Filter Dropdown */}
          {subjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9] cursor-pointer"
            >
              <option value="all">Toutes les matières ({resources.length})</option>
              {subjects.map(([subId, subName]) => (
                <option key={subId} value={subId}>
                  {subName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedType === "all"
                ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#E4E8F0] hover:text-[#111A2E]"
            }`}
          >
            Tous ({resources.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("pdf")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedType === "pdf"
                ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#E4E8F0] hover:text-[#111A2E]"
            }`}
          >
            PDFs
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("gdrive")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedType === "gdrive"
                ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#E4E8F0] hover:text-[#111A2E]"
            }`}
          >
            Google Drive
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("exams")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedType === "exams"
                ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#E4E8F0] hover:text-[#111A2E]"
            }`}
          >
            Examens & DS
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("courses")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedType === "courses"
                ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#E4E8F0] hover:text-[#111A2E]"
            }`}
          >
            Cours & Notes
          </button>
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const isExternal = res.storage_path.startsWith("http");
            const isGoogleDrive = res.storage_path.includes("drive.google.com");

            return (
              <div
                key={res.id}
                className="bg-white border border-[#E4E8F0] rounded-2xl p-4 shadow-xs hover:border-[#2855D9]/40 hover:shadow-sm transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FAFBFD] border border-[#E4E8F0] text-[#68748A]">
                      {res.subject?.name || "Matière"}
                    </span>

                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                      isGoogleDrive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : res.mime_type?.includes("pdf")
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}>
                      {isGoogleDrive ? "Google Drive" : res.mime_type?.includes("pdf") ? "PDF" : "Document"}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors leading-snug line-clamp-2">
                    {res.title}
                  </h3>

                  {res.description && (
                    <p className="text-[11px] text-[#68748A] mt-1 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#F1F4F9] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    {isExternal ? (
                      <a
                        href={res.storage_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-colors text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir</span>
                      </a>
                    ) : (
                      <Link
                        href={`/resources/${res.id}`}
                        className="bg-[#2855D9] hover:bg-[#1E40AF] text-white px-2.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-colors text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Consulter</span>
                      </Link>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(res.id, res.title)}
                    className="p-1.5 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Retirer des favoris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : resources.length > 0 ? (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-10 text-center space-y-2">
          <Filter className="w-8 h-8 text-[#68748A]/40 mx-auto" />
          <h4 className="text-sm font-semibold text-[#111A2E]">
            Aucun résultat pour cette recherche
          </h4>
          <p className="text-xs text-[#68748A] max-w-sm mx-auto">
            Essayez de modifier votre mot-clé ou sélectionnez une autre matière dans le filtre.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setSelectedType("all");
              setSelectedSubject("all");
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-12 text-center space-y-4">
          <Bookmark className="w-10 h-10 text-[#68748A]/40 mx-auto" />
          <div>
            <h3 className="text-base font-semibold text-[#111A2E]">
              Aucun document sauvegardé pour le moment
            </h3>
            <p className="text-xs text-[#68748A] max-w-sm mx-auto mt-1 leading-relaxed">
              Cliquez sur l'icône de favori sur n'importe quel cours, fiche TD ou examen pour l'épingler ici et y accéder rapidement.
            </p>
          </div>
          <Link href="/subjects">
            <Button size="sm" variant="primary">
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              <span>Explorer les Matières</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
