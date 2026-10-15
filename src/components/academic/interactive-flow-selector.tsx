"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Subject, ResourceCategory } from "@/types/database";
import { getSubjectVisual } from "./subject-icon";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  FileText,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  BookOpen,
} from "lucide-react";

interface InteractiveFlowSelectorProps {
  s1Subjects: Subject[];
  s2Subjects?: Subject[];
  categories?: ResourceCategory[];
}

export function InteractiveFlowSelector({
  s1Subjects,
  s2Subjects = [],
}: InteractiveFlowSelectorProps) {
  const [selectedSemester, setSelectedSemester] = useState<"sem-1" | "sem-2">("sem-1");
  const [selectedExamType, setSelectedExamType] = useState<"tp" | "ds" | "exam" | null>(null);

  // Strictly respect the selected semester without falling back to S1 when S2 is empty
  const activeSubjects = selectedSemester === "sem-1" ? s1Subjects : s2Subjects;

  const examCategorySlugMap: Record<string, string> = {
    tp: "tp-practical",
    ds: "ds-assessments",
    exam: "exams",
  };

  const getSubjectHref = (subjectSlug: string) => {
    if (selectedExamType) {
      return `/subjects/${subjectSlug}?category=${examCategorySlugMap[selectedExamType]}`;
    }
    return `/subjects/${subjectSlug}`;
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 md:p-8 shadow-xs space-y-7">
      {/* Step 1: Choisissez votre semestre & Step 2: Sélectionnez un type d'examen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#E4E8F0]">
        {/* Step 1 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#111A2E] text-white text-xs font-mono flex items-center justify-center font-bold">
                1
              </span>
              <h3 className="text-sm font-bold text-[#111A2E]">
                Choisissez votre semestre
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#68748A]">
              {selectedSemester === "sem-1" ? `${s1Subjects.length} matières` : `${s2Subjects.length} matières`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedSemester("sem-1")}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 px-4 rounded-xl transition-all cursor-pointer border text-center",
                selectedSemester === "sem-1"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-sm shadow-blue-500/20 ring-1 ring-[#2855D9]"
                  : "bg-white text-[#182235] border-[#E4E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
              )}
            >
              <span className="text-xs sm:text-sm font-bold tracking-tight">Semestre 1</span>
              <span
                className={cn(
                  "text-[11px] font-normal mt-0.5",
                  selectedSemester === "sem-1" ? "text-blue-100" : "text-[#68748A]"
                )}
              >
                {s1Subjects.length} Matières
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSemester("sem-2")}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 px-4 rounded-xl transition-all cursor-pointer border text-center",
                selectedSemester === "sem-2"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-sm shadow-blue-500/20 ring-1 ring-[#2855D9]"
                  : "bg-white text-[#182235] border-[#E4E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
              )}
            >
              <span className="text-xs sm:text-sm font-bold tracking-tight">Semestre 2</span>
              <span
                className={cn(
                  "text-[11px] font-normal mt-0.5",
                  selectedSemester === "sem-2" ? "text-blue-100" : "text-[#68748A]"
                )}
              >
                {s2Subjects.length} Matières
              </span>
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#111A2E] text-white text-xs font-mono flex items-center justify-center font-bold">
                2
              </span>
              <h3 className="text-sm font-bold text-[#111A2E]">
                Sélectionnez un type d&apos;examen
              </h3>
            </div>
            {selectedExamType && (
              <button
                type="button"
                onClick={() => setSelectedExamType(null)}
                className="text-[11px] text-[#2855D9] font-medium hover:underline cursor-pointer"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedExamType(selectedExamType === "tp" ? null : "tp")
              }
              className={cn(
                "flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedExamType === "tp"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-sm scale-[1.01]"
                  : "bg-[#F4F6FA] text-[#182235] border-[#E4E8F0] hover:bg-[#EDF2FF] hover:border-[#2855D9]/30"
              )}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>TP</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedExamType(selectedExamType === "ds" ? null : "ds")
              }
              className={cn(
                "flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedExamType === "ds"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-sm scale-[1.01]"
                  : "bg-[#F4F6FA] text-[#182235] border-[#E4E8F0] hover:bg-[#EDF2FF] hover:border-[#2855D9]/30"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>DS</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedExamType(selectedExamType === "exam" ? null : "exam")
              }
              className={cn(
                "flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedExamType === "exam"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-sm scale-[1.01]"
                  : "bg-[#F4F6FA] text-[#182235] border-[#E4E8F0] hover:bg-[#EDF2FF] hover:border-[#2855D9]/30"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Examen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Choisissez une matière */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-[#111A2E] text-white text-xs font-mono flex items-center justify-center font-bold">
              3
            </span>
            <h3 className="text-sm font-bold text-[#111A2E]">
              {selectedSemester === "sem-1" ? "Matières du Semestre 1" : "Matières du Semestre 2"}
            </h3>
          </div>
          {selectedExamType && (
            <div className="text-xs text-[#2855D9] font-medium bg-[#EDF2FF] px-2.5 py-0.5 rounded-full border border-[#2855D9]/20 flex items-center space-x-1">
              <span>Filtre actif : {selectedExamType.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Dynamic Subject Cards Grid */}
        {activeSubjects.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {activeSubjects.map((subject) => {
              const visual = getSubjectVisual(subject.slug || subject.name);
              const IconRenderer = visual.icon;
              const href = getSubjectHref(subject.slug);

              return (
                <Link
                  key={subject.id}
                  href={href}
                  className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 transition-transform duration-200 group-hover:scale-110",
                      visual.bgLight
                    )}
                  >
                    <IconRenderer className={cn("w-6 h-6", visual.color)} />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors leading-tight line-clamp-1">
                    {subject.name}
                  </span>
                  <span className="text-[10px] text-[#68748A] mt-1 font-mono">
                    {subject.resource_count ?? 0} docs
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#FAFBFD] border border-dashed border-[#CBD5E1] rounded-2xl p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center mx-auto">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#182235]">
                Aucune matière enregistrée pour le Semestre 2
              </h4>
              <p className="text-xs text-[#68748A] max-w-sm mx-auto mt-1">
                Le catalogue du Semestre 2 est prêt à accueillir vos modules. Vous pouvez créer votre première matière dès maintenant.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center space-x-2 bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une matière sous S2</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
