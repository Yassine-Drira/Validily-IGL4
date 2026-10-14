import { getSubjects, getCategories, getResources } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ResourceCard } from "@/components/academic/resource-card";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FolderArchive,
  Search,
  Filter,
  Shield,
  FileCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface LibraryPageProps {
  searchParams: Promise<{
    action?: string;
    subjectId?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { action, subjectId } = await searchParams;
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

        <a href="?action=upload">
          <Button size="md" variant="primary">
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Document</span>
          </Button>
        </a>
      </div>

      {/* Upload Modal Drawer / Dialog (Inline or conditional) */}
      {isUploadModalOpen && (
        <div className="bg-white border-2 border-[#3730a3]/20 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-[#3730a3]" />
              <h2 className="font-semibold text-sm text-stone-900">
                Upload Revision Document (PDF)
              </h2>
            </div>
            <a href="/library" className="text-xs text-stone-400 hover:text-stone-700">
              Close
            </a>
          </div>

          <form className="space-y-4" action="/api/upload" method="POST" encType="multipart/form-data">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Subject Module *
                </label>
                <select
                  name="subjectId"
                  defaultValue={subjectId || ""}
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} (Semester 1)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Resource Category *
                </label>
                <select
                  name="categoryId"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Flutter State Management & BLoC Patterns"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Instructor / Professor (Optional)
                </label>
                <input
                  type="text"
                  name="instructor"
                  placeholder="e.g. Dr. Ben Ammar"
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Select PDF File * (Max 50MB)
              </label>
              <div className="border border-dashed border-stone-300 rounded-md p-6 text-center hover:bg-stone-50 transition-colors">
                <input
                  type="file"
                  name="file"
                  accept="application/pdf"
                  required
                  className="block w-full text-xs text-stone-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#3730a3] hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-[11px] text-stone-400 mt-2">
                  Strictly validated for valid PDF format. Securely stored in private Supabase Storage bucket.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="submitShared"
                  name="submitShared"
                  className="rounded border-stone-300 text-[#3730a3] focus:ring-0"
                />
                <label htmlFor="submitShared" className="text-xs text-stone-600 cursor-pointer">
                  Submit for class shared library review (Keep private if unchecked)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <a href="/library">
                  <Button type="button" size="sm" variant="ghost">Cancel</Button>
                </a>
                <Button type="submit" size="sm" variant="primary">
                  Upload Document
                </Button>
              </div>
            </div>
          </form>
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
