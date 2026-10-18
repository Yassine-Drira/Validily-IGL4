import { getQuizzes } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Code2, Play } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const quizzes = await getQuizzes();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Practice Quizzes" }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
            Practice Quizzes & Knowledge Checks
          </h1>
          <p className="text-xs text-[#68748A] mt-1">
            Self-assessment question sets with immediate explanations to test semester exam readiness.
          </p>
        </div>
      </div>

      {quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((quiz: any) => {
            const isHtml = Boolean(quiz.isHtmlDrill);
            return (
              <div
                key={quiz.id}
                className="bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 rounded-lg p-5 flex flex-col justify-between transition-all shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#2855D9] bg-[#EDF2FF] border border-[#2855D9]/20 px-2 py-0.5 rounded">
                      {quiz.subject?.name || "Academic Module"}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {isHtml && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Code2 className="w-3 h-3 text-emerald-600" />
                          <span>Atelier HTML</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase bg-[#F4F6FA] text-[#68748A] px-2 py-0.5 rounded border border-[#E4E8F0]">
                        {quiz.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm text-[#182235] mb-1.5 leading-snug group-hover:text-[#2855D9] transition-colors">
                    {quiz.title}
                  </h3>

                  <p className="text-xs text-[#68748A] leading-relaxed mb-4">
                    {quiz.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between">
                  <span className="text-xs text-[#68748A] font-mono font-tabular">
                    {isHtml ? "Atelier Interactif" : `${quiz.question_count} Questions`}
                  </span>

                  <Link href={`/quizzes/${quiz.id}`}>
                    <Button size="sm" variant={isHtml ? "primary" : "outline"} className={isHtml ? "bg-[#2855D9]" : ""}>
                      <span>{isHtml ? "Lancer l'Atelier" : "Start Drill"}</span>
                      {isHtml ? <Play className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-12 text-center">
          <GraduationCap className="w-10 h-10 text-[#68748A]/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#182235]">No quizzes published</h3>
          <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
            Self-assessment drills will appear here as course instructors configure question sets.
          </p>
        </div>
      )}
    </div>
  );
}
