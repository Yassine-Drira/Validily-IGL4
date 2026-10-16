import { notFound } from "next/navigation";
import { getQuizWithQuestions } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { QuizRunner, QuestionData } from "@/components/quizzes/quiz-runner";
import { getRequesterUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

interface QuizPageProps {
  params: Promise<{
    quizId: string;
  }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { quizId } = await params;
  const requester = await getRequesterUser();
  const quizData = await getQuizWithQuestions(quizId, requester?.id);

  if (!quizData || !quizData.quiz) {
    notFound();
  }

  const { quiz, questions: dbQuestions } = quizData;

  const questions: QuestionData[] = (dbQuestions || []).map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    explanation: q.explanation || "Official answer explanation provided for this question.",
    options: (q.options || []).map((opt: any) => ({
      id: opt.id,
      text: opt.option_text || opt.text,
      is_correct: Boolean(opt.is_correct),
    })),
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Practice Quizzes", href: "/quizzes" },
          { label: quiz.title },
        ]}
      />

      <QuizRunner
        quizId={quiz.id}
        quizTitle={quiz.title}
        subjectName={quiz.subject?.name || "Academic Module"}
        difficulty={quiz.difficulty}
        questions={questions}
      />
    </div>
  );
}
