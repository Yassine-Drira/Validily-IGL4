import Link from "next/link";
import { AcademicResource } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { CardBookmarkButton } from "./card-bookmark-button";
import { formatBytes, formatDate } from "@/lib/utils";
import {
  FileText,
  Download,
  Calendar,
  User,
  BookOpen,
} from "lucide-react";

interface ResourceCardProps {
  resource: AcademicResource;
  isBookmarked?: boolean;
}

export function ResourceCard({ resource, isBookmarked = false }: ResourceCardProps) {
  return (
    <div className="bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 hover:shadow-xs rounded-lg p-4 transition-all flex flex-col justify-between group">
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
              <span className="text-[11px] font-mono text-[#68748A] bg-[#F4F6FA] px-1.5 py-0.5 rounded border border-[#E4E8F0]">
                {resource.exam_session}
              </span>
            )}
            {resource.chapter && (
              <span className="text-[11px] text-[#68748A] font-sans">
                {resource.chapter}
              </span>
            )}
          </div>

          <CardBookmarkButton
            resourceId={resource.id}
            initialBookmarked={isBookmarked}
          />
        </div>

        <h4 className="font-semibold text-sm text-[#182235] mb-1.5 leading-snug group-hover:text-[#2855D9] transition-colors">
          {resource.title}
        </h4>

        {resource.description && (
          <p className="text-xs text-[#68748A] line-clamp-2 leading-relaxed mb-3">
            {resource.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-[#68748A] font-mono mb-4">
          {resource.instructor && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3 text-[#68748A]" />
              <span>{resource.instructor}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-[#68748A]" />
            <span>{formatDate(resource.created_at)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="w-3 h-3 text-[#68748A]" />
            <span>{formatBytes(resource.file_size_bytes)}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between">
        <Link
          href={`/resources/${resource.id}`}
          className="text-xs font-semibold text-[#2855D9] hover:text-[#111A2E] flex items-center space-x-1.5 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Open Document Reader</span>
        </Link>

        <a
          href={`/api/download/${resource.id}`}
          download={resource.original_filename}
          className="text-[#68748A] hover:text-[#182235] p-1 rounded hover:bg-[#F4F6FA] transition-colors"
          title="Download PDF"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
