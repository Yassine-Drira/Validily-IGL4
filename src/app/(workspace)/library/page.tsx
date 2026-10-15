import { getSubjects, getCategories, getResources } from "@/lib/supabase/repository";
import { getRequesterUser } from "@/lib/auth/authorization";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ResourceCard } from "@/components/academic/resource-card";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/resources/upload-dropzone";
import {
  UploadCloud,
  FolderArchive,
  Search,
  Filter,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface LibraryPageProps {
  searchParams: Promise<{
    action?: string;
    subjectId?: string;
    categoryId?: string;
    category?: string;
    q?: string;
    uploaded?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { action, subjectId, categoryId, category, q, uploaded } = await searchParams;
  const subjects = await getSubjects();
  const categories = await getCategories();

  // Support both slug (category=exams) and ID (categoryId=uuid)
  const effectiveCategoryParam = categoryId || category;
  const matchedCategory = effectiveCategoryParam
    ? categories.find(
        (c) =>
          c.id === effectiveCategoryParam ||
          c.slug === effectiveCategoryParam ||
          c.slug.includes(effectiveCategoryParam.replace("cat-", "")) ||
          effectiveCategoryParam.includes(c.slug)
      )
    : null;

  const targetCategoryId = matchedCategory ? matchedCategory.id : effectiveCategoryParam;

  const requester = await getRequesterUser();

  // Dynamic PostgreSQL query with search and filters (strict privacy boundary)
  const resources = await getResources({
    subjectId: subjectId || undefined,
    categoryId: targetCategoryId || undefined,
    search: q?.trim() || undefined,
    userId: requester?.id || undefined,
  });

  const isUploadModalOpen = action === "upload";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Resource Library" }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
            Academic Resource Library
          </h1>
          <p className="text-xs text-[#68748A] mt-1">
            Search, filter, and study course materials, exam archives, practical guides, and cheat sheets.
          </p>
        </div>

        {!isUploadModalOpen && (
          <Link href="/library?action=upload">
            <Button size="md" variant="primary">
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
          </Link>
        )}
      </div>

      {uploaded && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Document uploaded successfully and registered in the academic library!
          </span>
        </div>
      )}

      {/* Upload Zone */}
      {isUploadModalOpen && (
        <div className="space-y-3 bg-[#FAFAF7] border border-[#E4E8F0] p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
              <UploadCloud className="w-4 h-4 text-[#2855D9]" />
              <span>Upload Academic Resource (PDF)</span>
            </h2>
            <Link
              href="/library"
              className="text-xs text-[#68748A] hover:text-[#182235]"
            >
              Cancel
            </Link>
          </div>

          <UploadDropzone
            subjects={subjects}
            categories={categories}
            defaultSubjectId={subjectId}
          />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAFAF7] p-3 rounded-lg border border-[#E4E8F0]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <Link
            href="/library"
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              !effectiveCategoryParam && !subjectId && !q
                ? "bg-[#2855D9] text-white font-medium shadow-2xs"
                : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235]"
            }`}
          >
            All Resources
          </Link>
          {categories.slice(0, 5).map((cat) => {
            const isSelected =
              matchedCategory?.id === cat.id ||
              effectiveCategoryParam === cat.id ||
              effectiveCategoryParam === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/library?category=${cat.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  isSelected
                    ? "bg-[#2855D9] text-white font-medium shadow-2xs"
                    : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235]"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        {/* Active Filter Tags */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {matchedCategory && (
            <div className="flex items-center space-x-1.5 text-xs text-[#2855D9] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
              <span className="font-medium">{matchedCategory.name}</span>
              <Link href="/library" className="text-[#2855D9] hover:text-[#111A2E]" title="Clear category filter">
                <X className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {q && (
            <div className="flex items-center space-x-1.5 text-xs text-[#182235] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
              <span>&ldquo;{q}&rdquo;</span>
              <Link href={effectiveCategoryParam ? `/library?category=${effectiveCategoryParam}` : "/library"} className="text-[#2855D9] hover:text-[#111A2E]" title="Clear search query">
                <X className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Resource Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
            <FolderArchive className="w-4 h-4 text-[#2855D9]" />
            <span>Documents ({resources.length})</span>
          </h2>
        </div>

        {resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((res) => (
              <ResourceCard key={res.id} resource={res} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E4E8F0] rounded-xl p-12 text-center">
            <FolderArchive className="w-10 h-10 text-[#68748A]/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#182235]">
              No documents found
            </h3>
            <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
              {q
                ? `No academic resources matching "${q}". Try a different keyword or reset filters.`
                : "No materials registered under this filter yet. Be the first to upload lecture notes or exams!"}
            </p>
            <div className="mt-4">
              <Link href="/library">
                <Button size="sm" variant="outline">
                  Reset Filters
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
