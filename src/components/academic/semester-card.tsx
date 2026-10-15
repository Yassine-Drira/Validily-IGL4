import Link from "next/link";
import { Semester } from "@/types/database";
import { Calendar, Layers, ArrowRight } from "lucide-react";

interface SemesterCardProps {
  semester: Semester;
}

export function SemesterCard({ semester }: SemesterCardProps) {
  const isAvailable = (semester.subject_count ?? 0) > 0;

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#2855D9]/40 transition-all shadow-2xs group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#68748A]">
            <Calendar className="w-3.5 h-3.5 text-[#68748A]" />
            <span>AY {semester.academic_year}</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              isAvailable
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-[#F4F6FA] text-[#68748A] border border-[#E4E8F0]"
            }`}
          >
            {isAvailable ? "Active" : "Upcoming"}
          </span>
        </div>

        <h3 className="font-semibold text-base text-[#182235] mb-1 group-hover:text-[#2855D9] transition-colors">
          {semester.name}
        </h3>

        <div className="flex items-center space-x-2 text-xs text-[#68748A] mb-4">
          <Layers className="w-3.5 h-3.5 text-[#2855D9]" />
          <span className="font-tabular">
            {semester.subject_count} {semester.subject_count === 1 ? "Subject" : "Subjects"}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E4E8F0] flex items-center justify-between">
        {isAvailable ? (
          <Link
            href={`/semesters/${semester.id}`}
            className="text-xs font-semibold text-[#2855D9] hover:text-[#111A2E] flex items-center space-x-1 transition-colors"
          >
            <span>Explore Subjects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="text-xs text-[#68748A] italic">
            Curriculum not yet posted
          </span>
        )}
      </div>
    </div>
  );
}
