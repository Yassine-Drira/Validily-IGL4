import Link from "next/link";
import { AcademicResource } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { formatBytes, formatDate } from "@/lib/utils";
import {
  FileText,
  Download,
  Bookmark,
  Calendar,
  User,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface ResourceCardProps {
  resource: AcademicResource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div className="bg-white border border-[#e6e3da] hover:border-stone-400 rounded-lg p-4 transition-colors shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {resource.category && (
              <CategoryBadge
                slug={resource.category.slug}
                name={resource.category.name}
              />
            )}
            {resource.exam_session && (
              <span className="text-[11px] font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                {resource.exam_session}
              </span>
            )}
            {resource.chapter && (
              <span className="text-[11px] text-stone-500 font-sans">
                {resource.chapter}
              </span>
            )}
          </div>

          <button
            type="button"
            className="text-stone-400 hover:text-amber-600 transition-colors p-1"
            title="Bookmark resource"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>

        <h4 className="font-semibold text-sm text-stone-900 mb-1.5 leading-snug">
          {resource.title}
        </h4>

        {resource.description && (
          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-3">
            {resource.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-stone-400 font-mono mb-4">
          {resource.instructor && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3 text-stone-400" />
              <span>{resource.instructor}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-stone-400" />
            <span>{formatDate(resource.created_at)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="w-3 h-3 text-stone-400" />
            <span>{formatBytes(resource.file_size_bytes)}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#f0ede6] flex items-center justify-between">
        <Link
          href={`/resources/${resource.id}`}
          className="text-xs font-semibold text-[#3730a3] hover:text-indigo-950 flex items-center space-x-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Open Document Reader</span>
        </Link>

        <a
          href={`/api/download/${resource.id}`}
          download={resource.original_filename}
          className="text-stone-400 hover:text-stone-700 p-1 rounded hover:bg-stone-100 transition-colors"
          title="Download PDF"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
