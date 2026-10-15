import { getSubjects, getSemesters } from "@/lib/supabase/repository";
import { SubjectCard } from "@/components/academic/subject-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

interface SubjectsPageProps {
  searchParams: Promise<{
    search?: string;
    semester?: string;
  }>;
}

export default async function SubjectsPage({
  searchParams,
}: SubjectsPageProps) {
  const { search, semester } = await searchParams;
  let subjects = await getSubjects(semester);

  if (search) {
    const q = search.toLowerCase();
    subjects = subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Subjects" }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
            Curriculum Subjects
          </h1>
          <p className="text-xs text-[#68748A] mt-1">
            Complete directory of academic modules across the IGL4 software engineering degree.
          </p>
        </div>
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-[#68748A]/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#182235]">
            No subjects found
          </h3>
          <p className="text-xs text-[#68748A] mt-1">
            No academic modules match your search criteria.
          </p>
        </div>
      )}
    </div>
  );
}
