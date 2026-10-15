import { notFound } from "next/navigation";
import Link from "next/link";
import { getSemesterById, getSubjects } from "@/lib/supabase/repository";
import { SubjectCard } from "@/components/academic/subject-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Layers, Calendar, Plus } from "lucide-react";

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
          { label: "Semestres", href: "/semesters" },
          { label: semester.name },
        ]}
      />

      {/* Header */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#68748A] mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Année Universitaire {semester.academic_year}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
            {semester.name}
          </h1>
          <p className="text-xs text-[#68748A] mt-1 max-w-xl">
            Toutes les matières, supports et révisions enregistrés pour le {semester.name}.
          </p>
        </div>

        <Link href="/admin">
          <Button size="sm" variant="primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une matière</span>
          </Button>
        </Link>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#182235] flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#2855D9]" />
            <span>Matières du programme ({subjects.length})</span>
          </h2>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-12 text-center space-y-3">
            <Layers className="w-8 h-8 text-[#68748A]/40 mx-auto" />
            <h3 className="text-sm font-semibold text-[#182235]">
              Aucune matière enregistrée pour le {semester.name}
            </h3>
            <p className="text-xs text-[#68748A] mt-1 max-w-md mx-auto">
              Ce semestre ne comporte pas encore de modules configurés. Vous pouvez créer votre première matière pour commencer vos révisions.
            </p>
            <div className="pt-2">
              <Link href="/admin">
                <Button size="sm" variant="primary">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer une matière</span>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
