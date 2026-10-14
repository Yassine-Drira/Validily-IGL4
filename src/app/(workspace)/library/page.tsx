import { getSubjects, getCategories, getResources } from "@/lib/supabase/repository";
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
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface LibraryPageProps {
  searchParams: Promise<{
    action?: string;
    subjectId?: string;
    uploaded?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { action, subjectId, uploaded } = await searchParams;
  const subjects = await getSubjects("sem-1");
  const categories = await getCategories();
  const resources = await getResources();

  const isUploadModalOpen = action === "upload";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Personal Library" }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e6e3da] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Personal Library & Uploads
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage your personal revision documents, uploaded lecture notes, and submissions.
          </p>
        </div>

        {!isUploadModalOpen && (
          <Link href="/library?action=upload">
            <Button size="md" variant="primary">
              <UploadCloud className="w-4 h-4" />
              <span>Upload New Document</span>
            </Button>
          </Link>
        )}
      </div>

      {uploaded && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Document uploaded successfully and registered in your library!
          </span>
        </div>
      )}

      {/* Drag & Drop Upload Panel */}
      {isUploadModalOpen && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <UploadCloud className="w-4 h-4 text-[#3730a3]" />
              <span>Upload Revision Document (PDF)</span>
            </h2>
            <Link
              href="/library"
              className="text-xs text-stone-400 hover:text-stone-700"
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

      {/* Resource Listing */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
          <FolderArchive className="w-4 h-4 text-[#3730a3]" />
          <span>Your Uploaded Materials ({resources.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      </div>
    </div>
  );
}
