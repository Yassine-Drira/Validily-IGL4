import { redirect } from "next/navigation";
import { getSubjects, getCategories, getResources } from "@/lib/supabase/repository";
import { getRequesterUser } from "@/lib/auth/authorization";
import { getUserContributionsStatsAction } from "@/lib/actions/vote-actions";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/resources/upload-dropzone";
import { LibraryExplorer } from "@/components/resources/library-explorer";
import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
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
    sort?: "useful" | "recent" | "voted";
    type?: string;
    visibility?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { action, subjectId, categoryId, category, q, uploaded, sort = "useful", type = "all", visibility, page = "1", pageSize = "12" } = await searchParams;
  const requester = await getRequesterUser();

  if (action === "upload" && !requester) {
    redirect(`/login?next=${encodeURIComponent("/library?action=upload")}`);
  }

  const [subjects, categories, userStats] = await Promise.all([
    getSubjects(undefined, requester?.id),
    getCategories(),
    requester?.id ? getUserContributionsStatsAction(requester.id) : Promise.resolve(null),
  ]);

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

  const matchedSubject = subjectId
    ? subjects.find((s) => s.id === subjectId || s.slug === subjectId)
    : null;

  // Dynamic PostgreSQL query scoped to subject/user - enables 0ms in-memory instant filtering
  const resources = await getResources({
    subjectId: subjectId || undefined,
    userId: requester?.id || undefined,
  });

  const isUploadModalOpen = action === "upload";

  // Helper to construct query params preserving active state
  const buildQuery = (params: Record<string, string | undefined>) => {
    const current: Record<string, string> = {};
    if (effectiveCategoryParam) current.category = effectiveCategoryParam;
    if (subjectId) current.subjectId = subjectId;
    if (q) current.q = q;
    if (sort && sort !== "useful") current.sort = sort;
    if (type && type !== "all") current.type = type;
    if (page && page !== "1") current.page = page;
    if (pageSize && pageSize !== "12") current.pageSize = pageSize;

    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "all") {
        delete current[k];
      } else {
        current[k] = v;
      }
    });

    const sp = new URLSearchParams(current);
    const qs = sp.toString();
    return qs ? `/library?${qs}` : "/library";
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Resource Library" }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
              Academic Resource Library
            </h1>
            {userStats && userStats.totalContributions > 0 && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {userStats.totalContributions} contribution{userStats.totalContributions > 1 ? "s" : ""} • +{userStats.upvotesReceived} votes reçus
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-[#68748A] mt-1">
            Explorez, notez et contribuez aux cours, quiz interactifs, examens et liens académiques.
          </p>
        </div>

        {!isUploadModalOpen && (
          <div className="flex items-center gap-2">
            <Link href={buildQuery({ action: "upload" })}>
              <Button size="sm" variant="primary">
                <UploadCloud className="w-4 h-4 mr-1.5" />
                <span>Déposer un document</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {uploaded && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Document envoyé avec succès et répertorié dans la bibliothèque académique !
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
            initialVisibility={visibility === "private" ? "private" : "public"}
          />
        </div>
      )}

      {/* High-Performance 0ms Interactive Library Explorer */}
      <LibraryExplorer
        initialResources={resources}
        categories={categories}
        subjects={subjects}
        initialCategory={effectiveCategoryParam || "all"}
        initialType={type || "all"}
        initialSort={(sort as "useful" | "recent" | "voted") || "useful"}
        initialQuery={q || ""}
        initialSubjectId={subjectId}
        initialPage={parseInt(page || "1", 10) || 1}
        initialPageSize={parseInt(pageSize || "12", 10) || 12}
      />
    </div>
  );
}

