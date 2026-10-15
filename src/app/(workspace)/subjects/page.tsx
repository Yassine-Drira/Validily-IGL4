import { getSubjects, getSemesters } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SubjectsDirectoryView } from "@/components/academic/subjects-directory-view";

import { getRequesterUser } from "@/lib/auth/authorization";

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
  const { semester } = await searchParams;
  const requester = await getRequesterUser();
  const [subjects, semesters] = await Promise.all([
    getSubjects(semester, requester?.id),
    getSemesters(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Modules & Matières" }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
            Modules du Curriculum IGL4
          </h1>
          <p className="text-xs text-[#68748A] mt-1">
            Répertoire complet des matières académiques avec supports de cours, quiz interactifs et fiches de révision.
          </p>
        </div>
      </div>

      <SubjectsDirectoryView
        initialSubjects={subjects}
        semesters={semesters}
      />
    </div>
  );
}
