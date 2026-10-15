"use client";

import React, { useState, useMemo } from "react";
import { Subject, Semester } from "@/types/database";
import { SubjectCard } from "@/components/academic/subject-card";
import {
  Layers,
  Search,
  X,
  List,
  LayoutGrid,
  BookOpen,
  Folder,
  ArrowRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SubjectsDirectoryViewProps {
  initialSubjects: Subject[];
  semesters: Semester[];
}

export function SubjectsDirectoryView({
  initialSubjects,
  semesters,
}: SubjectsDirectoryViewProps) {
  const [search, setSearch] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped_list" | "cards">("grouped_list");

  // Filter subjects based on search query and semester selection
  const filteredSubjects = useMemo(() => {
    return initialSubjects.filter((subject) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        subject.name.toLowerCase().includes(q) ||
        subject.slug?.toLowerCase().includes(q) ||
        subject.description?.toLowerCase().includes(q);

      const matchesSemester =
        selectedSemesterId === "all" ||
        subject.semester_id === selectedSemesterId ||
        subject.semester?.id === selectedSemesterId;

      return matchesSearch && matchesSemester;
    });
  }, [initialSubjects, search, selectedSemesterId]);

  // Group filtered subjects by semester
  const groupedSemesters = useMemo(() => {
    // If specific semester is selected, only that semester is shown
    const activeSemesters =
      selectedSemesterId === "all"
        ? semesters
        : semesters.filter((s) => s.id === selectedSemesterId);

    // Also catch any subjects that don't match known semesters or if semesters table is empty
    return activeSemesters
      .map((sem) => {
        const subjectsInSem = filteredSubjects.filter(
          (s) => s.semester_id === sem.id || s.semester?.id === sem.id
        );
        return {
          semester: sem,
          subjects: subjectsInSem,
        };
      })
      .filter((group) => group.subjects.length > 0 || (search === "" && selectedSemesterId === "all"));
  }, [semesters, filteredSubjects, selectedSemesterId, search]);

  const totalDocs = useMemo(() => {
    return initialSubjects.reduce((sum, s) => sum + (s.resource_count ?? 0), 0);
  }, [initialSubjects]);

  return (
    <div className="space-y-6">
      {/* FILTER & TOOLBAR */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#68748A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une matière (Flutter, Blockchain, Parallèle...)"
              className="w-full bg-[#FAFAF7] focus:bg-white border border-[#E4E8F0] focus:border-[#2855D9] rounded-xl pl-9 pr-9 py-2 text-xs text-[#182235] transition-colors focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#68748A] hover:text-[#182235] p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Semester dropdown + View mode switcher */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center space-x-1.5 bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#68748A]" />
              <span className="text-[11px] text-[#68748A] font-medium hidden sm:inline">
                Semestre :
              </span>
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="bg-transparent text-xs text-[#111A2E] font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">Tous les semestres ({initialSubjects.length})</option>
                {semesters.map((sem) => {
                  const count = initialSubjects.filter(
                    (s) => s.semester_id === sem.id || s.semester?.id === sem.id
                  ).length;
                  return (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} ({count} modules)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grouped_list")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                  viewMode === "grouped_list"
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Grouper par listes de semestre"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Par Semestre</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Grille de cartes"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Cartes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#F4F6FA]">
          <button
            type="button"
            onClick={() => setSelectedSemesterId("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border flex items-center space-x-1.5",
              selectedSemesterId === "all"
                ? "bg-[#2855D9] text-white border-[#2855D9] shadow-2xs"
                : "bg-[#FAFAF7] text-[#68748A] border-[#E4E8F0] hover:text-[#111A2E] hover:bg-white"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tous les modules</span>
            <span className="text-[10px] font-mono opacity-80">({initialSubjects.length})</span>
          </button>

          {semesters.map((sem) => {
            const count = initialSubjects.filter(
              (s) => s.semester_id === sem.id || s.semester?.id === sem.id
            ).length;
            const isSelected = selectedSemesterId === sem.id;

            return (
              <button
                key={sem.id}
                type="button"
                onClick={() => setSelectedSemesterId(sem.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border flex items-center space-x-1.5",
                  isSelected
                    ? "bg-[#2855D9] text-white border-[#2855D9] shadow-2xs"
                    : "bg-[#FAFAF7] text-[#68748A] border-[#E4E8F0] hover:text-[#111A2E] hover:bg-white"
                )}
              >
                <span>{sem.name}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isSelected ? "bg-white/20 text-white" : "bg-white text-[#68748A]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER SUBJECTS */}
      {filteredSubjects.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-9 h-9 text-[#68748A]/40 mx-auto" />
          <h3 className="text-sm font-semibold text-[#182235]">
            Aucun module ne correspond à votre recherche
          </h3>
          <p className="text-xs text-[#68748A] max-w-sm mx-auto">
            Vérifiez l&apos;orthographe ou réinitialisez le filtre de semestre.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedSemesterId("all");
            }}
            className="text-xs font-semibold text-[#2855D9] hover:underline cursor-pointer pt-2"
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : viewMode === "grouped_list" ? (
        /* GROUPED BY SEMESTER SECTIONS */
        <div className="space-y-6">
          {groupedSemesters.map(({ semester, subjects }) => {
            if (subjects.length === 0 && search) return null;
            const semDocs = subjects.reduce((sum, s) => sum + (s.resource_count ?? 0), 0);

            return (
              <div
                key={semester.id}
                className="bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-2xs"
              >
                {/* Semester Group Header */}
                <div className="bg-[#FAFBFD] px-5 py-3.5 border-b border-[#E4E8F0] flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-[#2855D9] flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111A2E] leading-tight flex items-center space-x-2">
                        <span>{semester.name}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#E4E8F0] text-[#68748A] font-semibold">
                          {subjects.length} modules • {semDocs} ressources
                        </span>
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={`/semesters/${semester.id}`}
                    className="text-xs font-semibold text-[#2855D9] hover:text-[#1E40AF] hover:bg-[#EDF2FF] px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Explorer le semestre</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Subject List Rows */}
                {subjects.length > 0 ? (
                  <div className="divide-y divide-[#F1F4F9]">
                    {subjects.map((sub) => (
                      <SubjectCard key={sub.id} subject={sub} variant="list" />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[#68748A]">
                    Aucun module dans ce semestre.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSubjects.map((sub) => (
            <SubjectCard key={sub.id} subject={sub} variant="full" />
          ))}
        </div>
      )}
    </div>
  );
}
