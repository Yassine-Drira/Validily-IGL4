import { notFound } from "next/navigation";
import Link from "next/link";
import { getResourceById, getResources } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CategoryBadge } from "@/components/academic/category-badge";
import { formatBytes, formatDate } from "@/lib/utils";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { ExternalLinkViewer } from "@/components/resources/external-link-viewer";
import { ResourceActionsBar } from "@/components/resources/resource-actions-bar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  Calendar,
  User,
  FileText,
} from "lucide-react";

import { getRequesterUser } from "@/lib/auth/authorization";

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

  // Strict Access Control: Private resources are only visible to the owner or admin
  if (resource.visibility === "private") {
    const requester = await getRequesterUser();
    if (!requester || (requester.id !== resource.owner_id && requester.role !== "admin")) {
      notFound();
    }
  }

  // Generate signed viewing URL if Supabase is configured
  let viewUrl: string | undefined = undefined;
  if (isSupabaseConfigured() && resource.storage_path) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.storage
        .from("academic-resources")
        .createSignedUrl(resource.storage_path, 900); // 15 mins
      if (data?.signedUrl) {
        viewUrl = data.signedUrl;
      }
    } catch (err) {
      console.error("Could not create signed view URL:", err);
    }
  }

  const downloadEndpoint = `/api/download/${resource.id}`;

  const related = await getResources({
    subjectId: resource.subject_id,
    limit: 4,
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
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-6 shadow-xs">
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
                <span className="text-xs font-mono text-[#68748A] bg-[#F4F6FA] px-2 py-0.5 rounded border border-[#E4E8F0]">
                  {resource.exam_session} Session
                </span>
              )}
              {resource.chapter && (
                <span className="text-xs text-[#68748A] font-medium">
                  {resource.chapter}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-serif font-bold text-[#182235] tracking-tight">
              {resource.title}
            </h1>

            {resource.description && (
              <p className="text-xs md:text-sm text-[#68748A] mt-2 max-w-3xl leading-relaxed">
                {resource.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#68748A] font-mono mt-4">
              {resource.instructor && (
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-[#68748A]" />
                  <span>{resource.instructor}</span>
                </div>
              )}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#68748A]" />
                <span>Uploaded {formatDate(resource.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-[#68748A]" />
                <span className="font-tabular">{formatBytes(resource.file_size_bytes)}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="capitalize">{resource.visibility}</span>
              </div>
            </div>
          </div>

          {/* Interactive Bookmark, Revision Status & Download / Redirect */}
          {(() => {
            const isExternal =
              resource.mime_type?.includes("url") ||
              resource.mime_type?.includes("google-apps") ||
              resource.tags?.includes("external_link") ||
              resource.tags?.includes("gdrive") ||
              resource.storage_path?.startsWith("http");

            const isGoogleDrive =
              resource.mime_type === "application/vnd.google-apps" ||
              resource.tags?.includes("gdrive") ||
              resource.storage_path?.includes("drive.google.com");

            const externalUrl = resource.external_url || resource.storage_path;

            return (
              <ResourceActionsBar
                resourceId={resource.id}
                title={resource.title}
                initialBookmarked={resource.is_bookmarked}
                initialStatus={resource.revision_status}
                downloadUrl={downloadEndpoint}
                filename={resource.original_filename}
                isExternal={isExternal}
                isGoogleDrive={isGoogleDrive}
                externalUrl={externalUrl}
                subjectSlug={resource.subject?.slug}
              />
            );
          })()}
        </div>
      </div>

      {/* In-App Reader Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Viewer Frame: External Link Portal vs PDF Reader */}
        <div className="lg:col-span-3">
          {resource.mime_type?.includes("url") ||
          resource.mime_type?.includes("google-apps") ||
          resource.tags?.includes("external_link") ||
          resource.tags?.includes("gdrive") ||
          resource.storage_path?.startsWith("http") ? (
            <ExternalLinkViewer resource={resource} />
          ) : (
            <PdfViewer
              url={viewUrl}
              filename={resource.original_filename}
              title={resource.title}
              downloadUrl={downloadEndpoint}
            />
          )}
        </div>

        {/* Sidebar: Metadata & Related Documents */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#68748A] font-mono">
              Academic Metadata
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E4E8F0]">
                <span className="text-[#68748A]">Subject:</span>
                <span className="font-medium text-[#182235]">
                  {resource.subject?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4E8F0]">
                <span className="text-[#68748A]">Category:</span>
                <span className="font-medium text-[#182235]">
                  {resource.category?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4E8F0]">
                <span className="text-[#68748A]">Academic Year:</span>
                <span className="font-mono text-[#182235]">
                  {resource.academic_year || "2024-2025"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4E8F0]">
                <span className="text-[#68748A]">File Format:</span>
                <span className="font-mono text-[#182235] uppercase">
                  {resource.mime_type.split("/")[1]}
                </span>
              </div>
            </div>

            {resource.tags && resource.tags.length > 0 && (
              <div>
                <div className="text-[11px] font-mono text-[#68748A] mb-2">Tags:</div>
                <div className="flex flex-wrap gap-1">
                  {resource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono bg-[#F4F6FA] text-[#68748A] px-2 py-0.5 rounded border border-[#E4E8F0]"
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
            <div className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#68748A] font-mono">
                From Same Subject
              </h3>
              <div className="space-y-2.5">
                {filteredRelated.map((item) => (
                  <Link
                    key={item.id}
                    href={`/resources/${item.id}`}
                    className="block group p-2 rounded hover:bg-[#F4F6FA] transition-colors"
                  >
                    <div className="text-xs font-semibold text-[#182235] group-hover:text-[#2855D9] transition-colors line-clamp-1">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#68748A] font-mono mt-0.5 font-tabular">
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
