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
      className="group bg-white border border-[#e6e3da] hover:border-stone-400 rounded-lg p-5 flex flex-col justify-between transition-colors shadow-2xs"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 rounded-md bg-[#f4f3ed] border border-[#dedad0] flex items-center justify-center text-[#3730a3] group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors">
            <SubjectIcon name={subject.icon} className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-1 text-xs text-stone-500 font-mono">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span>{subject.resource_count ?? 0} docs</span>
          </div>
        </div>

        <h3 className="font-semibold text-sm text-stone-900 group-hover:text-[#3730a3] transition-colors mb-1.5">
          {subject.name}
        </h3>

        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
          {subject.description || "Course materials, exams, and revision cheat sheets."}
        </p>
      </div>

      <div className="pt-3 border-t border-[#f0ede6] flex items-center justify-between text-xs text-stone-400 group-hover:text-[#3730a3] transition-colors font-medium">
        <span>Open Workspace</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
