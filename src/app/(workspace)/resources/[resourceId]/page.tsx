import { notFound } from "next/navigation";
import Link from "next/link";
import { getResourceById, getResources } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CategoryBadge } from "@/components/academic/category-badge";
import { formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Download,
  Bookmark,
  CheckCircle2,
  Calendar,
  User,
  Layers,
  FileText,
  Share2,
  Clock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ResourceDetailPageProps {
  params: Promise<{
    resourceId: string;
  }>;
}

export default async function ResourceDetailPage({
  params,
}: ResourceDetailPageProps) {
  const { resourceId } = await params;
  const resource = await getResourceById(resourceId);

  if (!resource) {
    notFound();
  }

  const related = await getResources({
    subjectId: resource.subject_id,
    limit: 3,
  });
  const filteredRelated = related.filter((r) => r.id !== resource.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Subjects", href: "/subjects" },
          ...(resource.subject
            ? [{ label: resource.subject.name, href: `/subjects/${resource.subject.slug}` }]
            : []),
          { label: resource.title },
        ]}
      />

      {/* Resource Title & Action Bar */}
      <div className="bg-white border border-[#e6e3da] rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {resource.category && (
                <CategoryBadge
                  slug={resource.category.slug}
                  name={resource.category.name}
                />
              )}
              {resource.exam_session && (
                <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  {resource.exam_session} Session
                </span>
              )}
              {resource.chapter && (
                <span className="text-xs text-stone-500 font-medium">
                  {resource.chapter}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-serif font-bold text-stone-900 tracking-tight">
              {resource.title}
            </h1>

            {resource.description && (
              <p className="text-xs md:text-sm text-stone-600 mt-2 max-w-3xl leading-relaxed">
                {resource.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-400 font-mono mt-4">
              {resource.instructor && (
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>{resource.instructor}</span>
                </div>
              )}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Uploaded {formatDate(resource.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                <span>{formatBytes(resource.file_size_bytes)}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="capitalize">{resource.visibility}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              className="p-2 border border-stone-200 rounded-md bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors"
              title="Bookmark Document"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="px-3 py-1.5 border border-emerald-300 rounded-md bg-emerald-50 text-emerald-800 text-xs font-medium hover:bg-emerald-100 flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Revised</span>
            </button>
            <a
              href={`/api/download/${resource.id}`}
              download={resource.original_filename}
            >
              <Button size="sm" variant="primary">
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* In-App Reader Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* PDF Reader Frame */}
        <div className="lg:col-span-3 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-md flex flex-col min-h-[650px]">
          {/* Reader Controls Toolbar */}
          <div className="bg-stone-950 text-stone-300 px-4 py-2.5 flex items-center justify-between text-xs border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-stone-400 truncate max-w-xs">
                {resource.original_filename}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                PDF Preview Mode
              </span>
            </div>
          </div>

          {/* Document Preview Area */}
          <div className="flex-1 bg-stone-800 flex flex-col items-center justify-center p-8 text-center text-stone-300">
            <FileText className="w-16 h-16 text-stone-500 mb-4" />
            <h3 className="text-base font-semibold text-stone-100 mb-1">
              {resource.title}
            </h3>
            <p className="text-xs text-stone-400 max-w-md mb-6 leading-relaxed">
              Official document: <span className="font-mono">{resource.original_filename}</span> ({formatBytes(resource.file_size_bytes)}).
              When connected to your Supabase Storage bucket (<code className="text-indigo-300">academic-resources</code>), authenticated signed stream URLs render inline.
            </p>

            <div className="flex items-center space-x-3">
              <a
                href={`/api/download/${resource.id}`}
                download={resource.original_filename}
              >
                <Button size="md" variant="primary">
                  <Download className="w-4 h-4" />
                  <span>Download Full Document</span>
                </Button>
              </a>
              {resource.subject && (
                <Link href={`/subjects/${resource.subject.slug}`}>
                  <Button size="md" variant="outline" className="text-stone-300 bg-stone-900 border-stone-700 hover:bg-stone-800">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Subject</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Metadata & Related Documents */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-stone-400 font-mono">
              Academic Metadata
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Subject:</span>
                <span className="font-medium text-stone-900">
                  {resource.subject?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Category:</span>
                <span className="font-medium text-stone-900">
                  {resource.category?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Academic Year:</span>
                <span className="font-mono text-stone-900">
                  {resource.academic_year || "2024-2025"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">File Format:</span>
                <span className="font-mono text-stone-900 uppercase">
                  {resource.mime_type.split("/")[1]}
                </span>
              </div>
            </div>

            {resource.tags && resource.tags.length > 0 && (
              <div>
                <div className="text-[11px] font-mono text-stone-400 mb-2">Tags:</div>
                <div className="flex flex-wrap gap-1">
                  {resource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Related from same subject */}
          {filteredRelated.length > 0 && (
            <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-stone-400 font-mono">
                From Same Subject
              </h3>
              <div className="space-y-2.5">
                {filteredRelated.map((item) => (
                  <Link
                    key={item.id}
                    href={`/resources/${item.id}`}
                    className="block group p-2 rounded hover:bg-stone-50 transition-colors"
                  >
                    <div className="text-xs font-semibold text-stone-900 group-hover:text-[#3730a3] transition-colors line-clamp-1">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                      {item.category?.name} • {formatBytes(item.file_size_bytes)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
