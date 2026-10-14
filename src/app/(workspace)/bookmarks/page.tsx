import { getResources } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ResourceCard } from "@/components/academic/resource-card";
import { Bookmark, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const allResources = await getResources();
  // Filter sample bookmarked resources
  const bookmarked = allResources.slice(0, 3);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Bookmarks" }]} />

      <div className="border-b border-[#e6e3da] pb-5">
        <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
          Bookmarked Documents
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Quick-access revision shortlist saved for your upcoming assessments and exams.
        </p>
      </div>

      {bookmarked.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarked.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#e6e3da] rounded-xl p-12 text-center">
          <Bookmark className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-900">
            No bookmarked documents
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Click the bookmark icon on any course material, exam paper, or practical worksheet to add it to your revision shortlist.
          </p>
          <div className="mt-4">
            <Link href="/subjects">
              <Button size="sm" variant="outline">
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                <span>Browse Subjects</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
