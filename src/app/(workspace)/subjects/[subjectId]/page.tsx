import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getSubjectBySlugOrId,
  getResources,
  getCategories,
  getNotes,
  getQuizzes,
} from "@/lib/supabase/repository";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { ResourceCard } from "@/components/academic/resource-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ResourceFilters } from "@/components/resources/resource-filters";
import {
  UploadCloud,
  FileText,
  FileEdit,
  GraduationCap,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface SubjectWorkspaceProps {
  params: Promise<{
    subjectId: string;
  }>;
  searchParams: Promise<{
    category?: string;
    search?: string;
    session?: string;
  }>;
}

export default async function SubjectWorkspace({
  params,
  searchParams,
}: SubjectWorkspaceProps) {
  const { subjectId } = await params;
  const { category: activeCategorySlug, search, session } = await searchParams;

  const subject = await getSubjectBySlugOrId(subjectId);
  if (!subject) {
    notFound();
  }

  const categories = await getCategories();
  const activeCategory = categories.find((c) => c.slug === activeCategorySlug);

  let allResources = await getResources({
    subjectId: subject.id,
    categoryId: activeCategory?.id,
    search: search,
  });

  if (session) {
    allResources = allResources.filter((r) => r.exam_session === session);
  }

  const relatedNotes = await getNotes();
  const subjectNotes = relatedNotes.filter((n) => n.subject_id === subject.id);

  const relatedQuizzes = await getQuizzes(subject.id);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Subjects", href: "/subjects" },
          { label: subject.name },
        ]}
      />

      {/* Subject Header */}
      <div className="bg-white border border-[#e6e3da] rounded-xl p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 text-[#3730a3] flex items-center justify-center shrink-0">
              <SubjectIcon name={subject.icon} className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-stone-500 mb-1">
                <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200 text-stone-700">
                  Semester 1
                </span>
                <span>•</span>
                <span>{allResources.length} Materials</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight">
                {subject.name}
              </h1>
              <p className="mt-2 text-xs md:text-sm text-stone-600 max-w-2xl leading-relaxed">
                {subject.description || "Course syllabus, lecture notes, lab sheets, and past examinations."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link href={`/library?action=upload&subjectId=${subject.id}`}>
              <Button size="md" variant="primary">
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </Button>
            </Link>
            <Link href={`/notes?action=new&subjectId=${subject.id}`}>
              <Button size="md" variant="outline">
                <FileEdit className="w-4 h-4 text-stone-600" />
                <span>Add Note</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Live Resource Filters (Search, Category Pills, Exam Session) */}
      <ResourceFilters
        categories={categories}
        totalResults={allResources.length}
      />

      {/* Resources Grid */}
      <div className="space-y-4">
        {allResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allResources.map((res) => (
              <ResourceCard key={res.id} resource={res} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#e6e3da] rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-900">
              No documents found
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {activeCategory
                ? `There are currently no uploaded documents under "${activeCategory.name}" matching your criteria.`
                : "No documents have been uploaded matching your search."}
            </p>
            <div className="mt-4">
              <Link href={`/library?action=upload&subjectId=${subject.id}`}>
                <Button size="sm" variant="outline">
                  <UploadCloud className="w-3.5 h-3.5 mr-1" />
                  <span>Upload first document</span>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Related Notes & Quizzes */}
      {(subjectNotes.length > 0 || relatedQuizzes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#e6e3da]">
          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <FileEdit className="w-4 h-4 text-[#3730a3]" />
              <span>Personal Cheat Sheets & Notes</span>
            </h3>
            {subjectNotes.length > 0 ? (
              <div className="space-y-2">
                {subjectNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/notes`}
                    className="block bg-white border border-[#e6e3da] p-3.5 rounded-lg hover:border-stone-400 transition-colors shadow-2xs"
                  >
                    <div className="font-semibold text-xs text-stone-900 mb-1">
                      {note.title}
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      {note.content.replace(/[#*`]/g, "")}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">No notes created yet.</p>
            )}
          </div>

          {/* Quizzes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-[#3730a3]" />
              <span>Practice Quizzes</span>
            </h3>
            {relatedQuizzes.length > 0 ? (
              <div className="space-y-2">
                {relatedQuizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/quizzes`}
                    className="block bg-white border border-[#e6e3da] p-3.5 rounded-lg hover:border-stone-400 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-stone-900">
                        {quiz.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-indigo-50 text-[#3730a3] px-1.5 py-0.5 rounded border border-indigo-200">
                        {quiz.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {quiz.description}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">No quizzes available yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
