import { notFound } from "next/navigation";
import {
  getSubjectBySlugOrId,
  getResources,
  getCategories,
  getNotes,
  getSubjectQuizzesWithQuestions,
  getSubjectFolders,
} from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SubjectLearningWorkspace } from "@/components/workspace/subject-learning-workspace";

export const dynamic = "force-dynamic";

interface SubjectWorkspaceProps {
  params: Promise<{
    subjectId: string;
  }>;
}

export default async function SubjectWorkspace({
  params,
}: SubjectWorkspaceProps) {
  const { subjectId } = await params;
  const subject = await getSubjectBySlugOrId(subjectId);

  if (!subject) {
    notFound();
  }

  const [categories, resources, allNotes, quizzes, folders] = await Promise.all([
    getCategories(),
    getResources({ subjectId: subject.id }),
    getNotes(),
    getSubjectQuizzesWithQuestions(subject.id),
    getSubjectFolders(subject.id),
  ]);

  const subjectNotes = allNotes.filter((n: any) => n.subject_id === subject.id);

  const semesterLabel =
    subject.semester?.name ||
    (subject.semester_id === "22222222-2222-2222-2222-222222222222"
      ? "Semestre 2"
      : "Semestre 1");

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Semestres", href: "/semesters" },
          {
            label: semesterLabel,
            href: `/semesters/${subject.semester_id}`,
          },
          { label: subject.name },
        ]}
      />

      <SubjectLearningWorkspace
        subject={subject}
        categories={categories}
        initialResources={resources}
        initialNotes={subjectNotes}
        initialQuizzes={quizzes}
        initialFolders={folders}
      />
    </div>
  );
}
