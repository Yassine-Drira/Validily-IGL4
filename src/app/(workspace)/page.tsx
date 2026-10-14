import Link from "next/link";
import {
  getSemesters,
  getSubjects,
  getResources,
  getCategories,
} from "@/lib/supabase/repository";
import { SubjectCard } from "@/components/academic/subject-card";
import { ResourceCard } from "@/components/academic/resource-card";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FileEdit,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Bookmark,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const semesters = await getSemesters();
  const subjects = await getSubjects("sem-1");
  const recentResources = await getResources({ limit: 4 });
  const categories = await getCategories();

  const totalDocs = subjects.reduce(
    (acc, s) => acc + (s.resource_count ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      {/* Editorial Header Banner */}
      <section className="bg-white border border-[#e6e3da] rounded-xl p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#f4f3ed] border border-[#dedad0] text-xs font-mono text-stone-600 mb-3">
              <Calendar className="w-3.5 h-3.5 text-[#3730a3]" />
              <span>Academic Year 2024–2025</span>
              <span>•</span>
              <span className="font-semibold text-stone-900">Semester 1 Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
              Academic Library & Exam Preparation
            </h1>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Curated course materials, lab worksheets (TP), continuous assessments (DS), past exams, and high-yield cheat sheets for the IGL4 curriculum.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link href="/library?action=upload">
              <Button size="md" variant="primary">
                <UploadCloud className="w-4 h-4" />
                <span>Upload Resource</span>
              </Button>
            </Link>
            <Link href="/notes?action=new">
              <Button size="md" variant="outline">
                <FileEdit className="w-4 h-4 text-stone-600" />
                <span>New Cheat Sheet</span>
              </Button>
            </Link>
            <Link href="/quizzes">
              <Button size="md" variant="outline">
                <GraduationCap className="w-4 h-4 text-stone-600" />
                <span>Practice Quiz</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Real Summary Metrics */}
        <div className="mt-8 pt-6 border-t border-[#f0ede6] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3.5 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Curriculum Track</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">IGL4</div>
            <div className="text-[11px] text-stone-400 mt-0.5">Software Engineering</div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3.5 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">S1 Subjects</div>
            <div className="text-lg font-bold text-[#3730a3] mt-1 font-mono">
              {subjects.length}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">Active modules</div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3.5 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Indexed Documents</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {totalDocs}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">PDFs & cheat sheets</div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3.5 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Resource Categories</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {categories.length}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">Courses, TPs, Exams</div>
          </div>
        </div>
      </section>

      {/* Semester 1 Subjects Grid (All 10 initial subjects) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#3730a3]" />
              <span>Semester 1 Subject Directory</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Select a module to view organized lecture notes, TPs, DS, and exam corrections.
            </p>
          </div>
          <Link
            href="/semesters/sem-1"
            className="text-xs font-medium text-[#3730a3] hover:text-indigo-950 flex items-center space-x-1"
          >
            <span>View all in Semester 1</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      {/* Recently Published Resources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#3730a3]" />
              <span>Recently Updated Academic Documents</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Official course materials and exam archives verified for revision.
            </p>
          </div>
          <Link
            href="/subjects"
            className="text-xs font-medium text-[#3730a3] hover:text-indigo-950 flex items-center space-x-1"
          >
            <span>Browse entire library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      {/* Academic Revision Workflow Guide */}
      <section className="bg-[#f5f4ef] border border-[#e6e3da] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-stone-900 mb-2">
          Academic Hierarchy & Navigation
        </h3>
        <p className="text-xs text-stone-600 leading-relaxed mb-4">
          The revision library is structured strictly according to the academic standard:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-800">
            Semester
          </span>
          <span className="text-stone-400">→</span>
          <span className="px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-800">
            Subject
          </span>
          <span className="text-stone-400">→</span>
          <span className="px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-800">
            Resource Category
          </span>
          <span className="text-stone-400">→</span>
          <span className="px-2.5 py-1 rounded bg-white border border-stone-200 text-[#3730a3] font-semibold">
            In-App Document Reader
          </span>
        </div>
      </section>
    </div>
  );
}
