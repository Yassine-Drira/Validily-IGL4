import Link from "next/link";
import { Subject } from "@/types/database";
import { getSubjectVisual } from "./subject-icon";
import { ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  subject: Subject;
  variant?: "compact" | "full";
}

export function SubjectCard({ subject, variant = "full" }: SubjectCardProps) {
  const visual = getSubjectVisual(subject.slug || subject.name);
  const IconComponent = visual.icon;

  if (variant === "compact") {
    return (
      <Link
        href={`/subjects/${subject.slug}`}
        className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-200 hover:-translate-y-0.5"
      >
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110",
            visual.bgLight
          )}
        >
          <IconComponent className={cn("w-6 h-6", visual.color)} />
        </div>
        <span className="font-semibold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors leading-tight line-clamp-1">
          {subject.name}
        </span>
        <span className="text-[10px] text-[#68748A] mt-1 font-mono">
          {subject.resource_count ?? 0} docs
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 hover:shadow-xs rounded-xl p-5 flex flex-col justify-between transition-all"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105",
              visual.bgLight,
              visual.borderLight
            )}
          >
            <IconComponent className={cn("w-5 h-5", visual.color)} />
          </div>
          <div className="flex items-center space-x-1 text-xs text-[#68748A] font-mono font-tabular">
            <FileText className="w-3.5 h-3.5 text-[#68748A]" />
            <span>{subject.resource_count ?? 0} docs</span>
          </div>
        </div>

        <h3 className="font-semibold text-sm text-[#182235] group-hover:text-[#2855D9] transition-colors mb-1.5 leading-snug">
          {subject.name}
        </h3>

        <p className="text-xs text-[#68748A] line-clamp-2 leading-relaxed mb-4">
          {subject.description || "Course materials, exams, and revision cheat sheets."}
        </p>
      </div>

      <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between text-xs text-[#68748A] group-hover:text-[#2855D9] transition-colors font-medium">
        <span>Open Module Workspace</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
