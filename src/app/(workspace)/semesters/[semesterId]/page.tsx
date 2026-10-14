import { notFound } from "next/navigation";
import { getSemesterById, getSubjects } from "@/lib/supabase/repository";
import { SubjectCard } from "@/components/academic/subject-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Layers, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

interface SemesterDetailPageProps {
  params: Promise<{
    semesterId: string;
  }>;
}

export default async function SemesterDetailPage({
  params,
}: SemesterDetailPageProps) {
  const { semesterId } = await params;
  const semester = await getSemesterById(semesterId);

  if (!semester) {
    notFound();
  }

  const subjects = await getSubjects(semester.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Semesters", href: "/semesters" },
          { label: semester.name },
        ]}
      />

      {/* Header */}
      <div className="bg-white border border-[#e6e3da] rounded-xl p-6 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-mono text-stone-500 mb-2">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>AY {semester.academic_year}</span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
          {semester.name}
        </h1>
        <p className="text-xs text-stone-500 mt-1 max-w-xl">
          Browse all subjects and course documents registered for {semester.name}.
        </p>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#3730a3]" />
            <span>Curriculum Subjects ({subjects.length})</span>
          </h2>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#e6e3da] rounded-xl p-12 text-center">
            <Layers className="w-8 h-8 text-stone-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-900">
              No subjects registered yet
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              Subjects for this semester have not been configured yet. Administrators can add subjects in the admin console.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
