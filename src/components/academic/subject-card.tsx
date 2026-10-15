import Link from "next/link";
import { Subject } from "@/types/database";
import { SubjectIcon } from "./subject-icon";
import { FileText, ArrowRight } from "lucide-react";

interface SubjectCardProps {
  subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 hover:shadow-xs rounded-lg p-5 flex flex-col justify-between transition-all"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 rounded-md bg-[#F4F6FA] border border-[#E4E8F0] flex items-center justify-center text-[#2855D9] group-hover:bg-[#EDF2FF] group-hover:border-[#2855D9]/30 transition-colors">
            <SubjectIcon name={subject.icon} className="w-4 h-4" />
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
