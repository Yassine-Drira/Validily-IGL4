import Link from "next/link";
import { Semester } from "@/types/database";
import { Calendar, Layers, ArrowRight } from "lucide-react";

interface SemesterCardProps {
  semester: Semester;
}

export function SemesterCard({ semester }: SemesterCardProps) {
  const isAvailable = (semester.subject_count ?? 0) > 0;

  return (
    <div className="bg-white border border-[#e6e3da] rounded-lg p-5 flex flex-col justify-between hover:border-stone-400 transition-colors shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-stone-500">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>AY {semester.academic_year}</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              isAvailable
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-stone-100 text-stone-500 border border-stone-200"
            }`}
          >
            {isAvailable ? "Active" : "Upcoming"}
          </span>
        </div>

        <h3 className="font-semibold text-base text-stone-900 mb-1">
          {semester.name}
        </h3>

        <div className="flex items-center space-x-2 text-xs text-stone-500 mb-4">
          <Layers className="w-3.5 h-3.5 text-[#3730a3]" />
          <span>
            {semester.subject_count} {semester.subject_count === 1 ? "Subject" : "Subjects"}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-[#f0ede6] flex items-center justify-between">
        {isAvailable ? (
          <Link
            href={`/semesters/${semester.id}`}
            className="text-xs font-semibold text-[#3730a3] hover:text-indigo-950 flex items-center space-x-1"
          >
            <span>Explore Subjects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="text-xs text-stone-400 italic">
            Curriculum not yet posted
          </span>
        )}
      </div>
    </div>
  );
}
