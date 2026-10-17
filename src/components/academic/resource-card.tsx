import Link from "next/link";
import { AcademicResource } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { CardBookmarkButton } from "./card-bookmark-button";
import { ResourceVoteControl } from "@/components/resources/resource-vote-control";
import { formatBytes, formatDate } from "@/lib/utils";
import {
  FileText,
  Download,
  Calendar,
  User,
  BookOpen,
  FileCode,
  Link2,
} from "lucide-react";

interface ResourceCardProps {
  resource: AcademicResource;
  isBookmarked?: boolean;
}

export function ResourceCard({ resource, isBookmarked = false }: ResourceCardProps) {
  const isQuiz = resource.resource_type === "quiz" || resource.mime_type?.includes("quiz") || resource.tags?.includes("quiz");
  const isLink = resource.resource_type === "link" || resource.mime_type?.includes("url") || !!resource.external_url;

  return (
    <div className="bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 hover:shadow-xs rounded-xl p-4 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {resource.category && (
              <CategoryBadge
                slug={resource.category.slug}
                name={resource.category.name}
              />
            )}
            {isQuiz && (
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center space-x-1">
                <FileCode className="w-2.5 h-2.5" />
                <span>Quiz</span>
              </span>
            )}
            {isLink && (
              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 flex items-center space-x-1">
                <Link2 className="w-2.5 h-2.5" />
                <span>Lien</span>
              </span>
            )}
            {resource.exam_session && (
              <span className="text-[11px] font-mono text-[#68748A] bg-[#F4F6FA] px-1.5 py-0.5 rounded border border-[#E4E8F0]">
                {resource.exam_session}
              </span>
            )}
          </div>

          <CardBookmarkButton
            resourceId={resource.id}
            initialBookmarked={isBookmarked}
          />
        </div>

        <h4 className="font-semibold text-sm text-[#182235] mb-1.5 leading-snug group-hover:text-[#2855D9] transition-colors line-clamp-2">
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
              <span className="truncate max-w-[120px]">{resource.instructor}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-[#68748A]" />
            <span>{formatDate(resource.created_at)}</span>
          </div>
          {resource.file_size_bytes > 0 && (
            <div className="flex items-center space-x-1">
              <FileText className="w-3 h-3 text-[#68748A]" />
              <span>{formatBytes(resource.file_size_bytes)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between gap-2">
        <ResourceVoteControl
          resourceId={resource.id}
          initialScore={resource.vote_summary?.score ?? resource.usefulness_score ?? 0}
          initialUserVote={resource.vote_summary?.userVote ?? 0}
          initialUpvotes={resource.vote_summary?.upvotes ?? resource.upvotes_count ?? 0}
          initialDownvotes={resource.vote_summary?.downvotes ?? resource.downvotes_count ?? 0}
          size="sm"
        />

        <div className="flex items-center space-x-2">
          <Link
            href={`/resources/${resource.id}`}
            className="text-xs font-semibold text-[#2855D9] hover:text-[#111A2E] flex items-center space-x-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Consulter</span>
          </Link>

          {!isLink && (
            <a
              href={`/api/download/${resource.id}`}
              download={resource.original_filename}
              className="text-[#68748A] hover:text-[#182235] p-1 rounded-lg hover:bg-[#F4F6FA] transition-colors"
              title="Télécharger"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
