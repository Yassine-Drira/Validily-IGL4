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
  Check,
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

  const activeSubjects = selectedSemester === "sem-1" ? s1Subjects : s2Subjects.length > 0 ? s2Subjects : s1Subjects;

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
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-[#111A2E] text-white text-xs font-mono flex items-center justify-center font-bold">
              1
            </span>
            <h3 className="text-sm font-bold text-[#111A2E]">
              Choisissez votre semestre
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setSelectedSemester("sem-1")}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedSemester === "sem-1"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-xs scale-[1.01]"
                  : "bg-[#F4F6FA] text-[#182235] border-[#E4E8F0] hover:bg-[#EDF2FF] hover:border-[#2855D9]/30"
              )}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                1
              </span>
              <span>Semestre 1</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSemester("sem-2")}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedSemester === "sem-2"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-xs scale-[1.01]"
                  : "bg-[#F4F6FA] text-[#182235] border-[#E4E8F0] hover:bg-[#EDF2FF] hover:border-[#2855D9]/30"
              )}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                2
              </span>
              <span>Semestre 2</span>
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
                className="text-[11px] text-[#2855D9] hover:underline"
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
                "flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedExamType === "tp"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-xs scale-[1.01]"
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
                "flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedExamType === "ds"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-xs scale-[1.01]"
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
                "flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                selectedExamType === "exam"
                  ? "bg-[#2855D9] text-white border-[#2855D9] shadow-xs scale-[1.01]"
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
              Choisissez une matière
            </h3>
          </div>
          {selectedExamType && (
            <div className="text-xs text-[#2855D9] font-medium bg-[#EDF2FF] px-2.5 py-0.5 rounded-full border border-[#2855D9]/20 flex items-center space-x-1">
              <span>Filtre actif : {selectedExamType.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Dynamic Subject Cards Grid matching mockup visuals */}
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
      </div>
    </div>
  );
}
