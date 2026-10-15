import { getBookmarks } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ResourceCard } from "@/components/academic/resource-card";
import { Bookmark, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AcademicResource } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const bookmarks = await getBookmarks();
  const bookmarkedResources: AcademicResource[] = bookmarks
    .map((b) => b.resource)
    .filter((r): r is AcademicResource => Boolean(r));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Bookmarks" }]} />

      <div className="border-b border-[#E4E8F0] pb-5">
        <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
          Bookmarked Documents
        </h1>
        <p className="text-xs text-[#68748A] mt-1">
          Quick-access revision shortlist saved for your upcoming assessments and exams.
        </p>
      </div>

      {bookmarkedResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarkedResources.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-12 text-center">
          <Bookmark className="w-10 h-10 text-[#68748A]/50 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#182235]">
            No bookmarked documents
          </h3>
          <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
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
