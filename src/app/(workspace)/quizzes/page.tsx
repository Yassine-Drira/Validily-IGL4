import { getQuizzes, getSubjects } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, HelpCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function QuizzesPage() {
  const quizzes = await getQuizzes();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Practice Quizzes" }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e6e3da] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Practice Quizzes & Knowledge Checks
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Self-assessment question sets with explanations to test exam readiness.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white border border-[#e6e3da] hover:border-stone-400 rounded-lg p-5 flex flex-col justify-between transition-colors shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#3730a3] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {quiz.subject?.name}
                </span>
                <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                  {quiz.difficulty}
                </span>
              </div>

              <h3 className="font-semibold text-sm text-stone-900 mb-1.5 leading-snug">
                {quiz.title}
              </h3>

              <p className="text-xs text-stone-500 leading-relaxed mb-4">
                {quiz.description}
              </p>
            </div>

            <div className="pt-3 border-t border-[#f0ede6] flex items-center justify-between">
              <span className="text-xs text-stone-400 font-mono">
                {quiz.question_count} Questions
              </span>

              <Link href={`/quizzes/${quiz.id}`}>
                <Button size="sm" variant="primary">
                  <span>Start Drill</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
