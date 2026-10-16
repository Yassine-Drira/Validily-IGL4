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
import { getRequesterUser } from "@/lib/auth/authorization";

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
  const requester = await getRequesterUser();
  const subject = await getSubjectBySlugOrId(subjectId, requester?.id);

  if (!subject) {
    notFound();
  }

  const [categories, resources, subjectNotes, quizzes, folders] = await Promise.all([
    getCategories(),
    getResources({ subjectId: subject.id, userId: requester?.id }),
    getNotes(requester?.id, subject.id),
    getSubjectQuizzesWithQuestions(subject.id, requester?.id),
    getSubjectFolders(subject.id),
  ]);

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
