import { redirect } from "next/navigation";
import { getSubjects, getCategories, getResources } from "@/lib/supabase/repository";
import { getRequesterUser } from "@/lib/auth/authorization";
import { getUserContributionsStatsAction } from "@/lib/actions/vote-actions";
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
  Sparkles,
  Flame,
  Clock,
  ThumbsUp,
  FileText,
  FileCode,
  Link2,
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
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { action, subjectId, categoryId, category, q, uploaded, sort = "useful", type = "all" } = await searchParams;
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

  // Dynamic PostgreSQL query with search, sort, and type filters (strict privacy boundary)
  const resources = await getResources({
    subjectId: subjectId || undefined,
    categoryId: targetCategoryId || undefined,
    search: q?.trim() || undefined,
    userId: requester?.id || undefined,
    sort: (sort as "useful" | "recent" | "voted") || "useful",
    resourceType: type !== "all" ? type : undefined,
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
          />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-3 bg-[#FAFAF7] p-3 rounded-lg border border-[#E4E8F0]">
        {/* Row 1: Category Filter Pills & Active Queries */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildQuery({ category: undefined, categoryId: undefined })}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                !effectiveCategoryParam
                  ? "bg-[#2855D9] text-white font-medium shadow-2xs"
                  : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235]"
              }`}
            >
              Toutes les catégories
            </Link>
            {categories.map((cat) => {
              const isSelected =
                matchedCategory?.id === cat.id ||
                effectiveCategoryParam === cat.id ||
                effectiveCategoryParam === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={buildQuery({ category: cat.slug })}
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
            {matchedSubject && (
              <div className="flex items-center space-x-1.5 text-xs text-[#2855D9] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
                <span className="font-medium">Matière : {matchedSubject.name}</span>
                <Link href={buildQuery({ subjectId: undefined })} className="text-[#2855D9] hover:text-[#111A2E]" title="Effacer la matière">
                  <X className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {matchedCategory && (
              <div className="flex items-center space-x-1.5 text-xs text-[#2855D9] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
                <span className="font-medium">{matchedCategory.name}</span>
                <Link href={buildQuery({ category: undefined, categoryId: undefined })} className="text-[#2855D9] hover:text-[#111A2E]" title="Effacer la catégorie">
                  <X className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {q && (
              <div className="flex items-center space-x-1.5 text-xs text-[#182235] bg-[#EDF2FF] px-2.5 py-1 rounded border border-[#2855D9]/20">
                <span>&ldquo;{q}&rdquo;</span>
                <Link href={buildQuery({ q: undefined })} className="text-[#2855D9] hover:text-[#111A2E]" title="Effacer la recherche">
                  <X className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Format Filter Pills & Reddit-Style Ranking Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#E4E8F0]/70">
          {/* Format pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#68748A] mr-1 hidden sm:inline">Format :</span>
            {[
              { id: "all", label: "Tous", icon: null },
              { id: "document", label: "Documents PDF", icon: FileText },
              { id: "quiz", label: "Quiz HTML", icon: FileCode },
              { id: "url", label: "Liens Web", icon: Link2 },
            ].map((f) => {
              const isSelected = type === f.id;
              const Icon = f.icon;
              return (
                <Link
                  key={f.id}
                  href={buildQuery({ type: f.id })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                    isSelected
                      ? "bg-[#182235] text-white font-medium"
                      : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235]"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{f.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sorting tabs */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-[11px] font-medium text-[#68748A] mr-1 hidden sm:inline">Trier par :</span>
            {[
              { id: "useful", label: "Plus utiles", icon: Flame },
              { id: "recent", label: "Plus récents", icon: Clock },
              { id: "voted", label: "Plus votés", icon: ThumbsUp },
            ].map((s) => {
              const isSelected = sort === s.id;
              const Icon = s.icon;
              return (
                <Link
                  key={s.id}
                  href={buildQuery({ sort: s.id })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                    isSelected
                      ? "bg-amber-100/80 border border-amber-300 text-amber-900 font-semibold"
                      : "bg-white border border-[#E4E8F0] text-[#68748A] hover:text-[#182235]"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isSelected ? "text-amber-600" : ""}`} />
                  <span>{s.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
            <FolderArchive className="w-4 h-4 text-[#2855D9]" />
            <span>Ressources académiques ({resources.length})</span>
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
              Aucune ressource trouvée
            </h3>
            <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
              {q
                ? `Aucune ressource académique ne correspond à "${q}". Essayez d'autres mots-clés ou réinitialisez les filtres.`
                : "Aucune ressource enregistrée avec ces critères pour l'instant. Soyez le premier à enrichir la bibliothèque avec un cours, quiz ou lien !"}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href={buildQuery({ action: "upload" })}>
                <Button size="sm" variant="primary">
                  <UploadCloud className="w-4 h-4 mr-1.5" />
                  <span>Déposer le premier document</span>
                </Button>
              </Link>
              <Link href="/library">
                <Button size="sm" variant="outline">
                  Réinitialiser les filtres
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
