import { notFound } from "next/navigation";
import { getQuizWithQuestions } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { QuizRunner, QuestionData } from "@/components/quizzes/quiz-runner";
import { InteractiveHtmlRunner } from "@/components/quizzes/interactive-html-runner";
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

  const htmlQuestion = (dbQuestions || []).find((q: any) => q.question_type === "interactive_html");
  const isHtml = Boolean(quiz.isHtmlDrill || quiz.htmlContent || htmlQuestion);
  let htmlContent = quiz.htmlContent || htmlQuestion?.explanation || htmlQuestion?.question_text;

  // Seamlessly synchronize refined local workshop if present
  if (quiz.id === "4c311da4-d1c9-4489-9689-cc516840719f" || quiz.title?.includes("Systèmes d'Information")) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localFile = path.join(process.cwd(), "atelier-sid-urbanisation.html");
      if (fs.existsSync(localFile)) {
        htmlContent = fs.readFileSync(localFile, "utf-8");
      }
    } catch (_) {}
  }

  if (isHtml && htmlContent) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: "Practice Quizzes", href: "/quizzes" },
            { label: quiz.title },
          ]}
        />

        <InteractiveHtmlRunner
          quizId={quiz.id}
          title={quiz.title}
          subjectName={quiz.subject?.name || "Academic Module"}
          htmlContent={htmlContent}
        />
      </div>
    );
  }

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
