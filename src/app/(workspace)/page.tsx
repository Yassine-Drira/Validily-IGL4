import Link from "next/link";
import {
  getSemesters,
  getSubjects,
  getResources,
  getCategories,
  getDashboardMetrics,
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
  Bookmark,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [metrics, subjects, recentResources, categories] = await Promise.all([
    getDashboardMetrics(),
    getSubjects("sem-1"),
    getResources({ limit: 4 }),
    getCategories(),
  ]);

  return (
    <div className="space-y-8">
      {/* Workspace Greeting & Context Hero */}
      <section className="bg-white border border-[#E4E8F0] rounded-xl p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#EDF2FF] border border-[#2855D9]/20 text-xs font-mono text-[#2855D9] mb-3">
              <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>AY 2024–2025</span>
              <span>•</span>
              <span className="font-semibold">Semester 1 Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#111A2E] tracking-tight leading-tight">
              validily-IGL4 Academic Workspace
            </h1>
            <p className="mt-2 text-xs md:text-sm text-[#68748A] leading-relaxed">
              Curated course syllabus, practical lab sheets (TP), continuous assessments (DS), past exams, and revision cheat sheets for software engineering.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link href="/library?action=upload">
              <Button size="md" variant="primary">
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </Button>
            </Link>
            <Link href="/notes?action=new">
              <Button size="md" variant="outline">
                <FileEdit className="w-4 h-4 text-[#68748A]" />
                <span>New Cheat Sheet</span>
              </Button>
            </Link>
            <Link href="/quizzes">
              <Button size="md" variant="outline">
                <GraduationCap className="w-4 h-4 text-[#68748A]" />
                <span>Practice Quizzes</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Database-Driven Summary Metrics */}
        <div className="mt-8 pt-6 border-t border-[#E4E8F0] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-4 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Curriculum Track</div>
            <div className="text-lg font-bold text-[#111A2E] mt-1 font-mono">IGL4</div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Software Engineering</div>
          </div>
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-4 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Active Subjects</div>
            <div className="text-lg font-bold text-[#2855D9] mt-1 font-mono font-tabular">
              {metrics.totalSubjects}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Semester 1 cataloged</div>
          </div>
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-4 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Persisted Documents</div>
            <div className="text-lg font-bold text-[#111A2E] mt-1 font-mono font-tabular">
              {metrics.totalResources}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">PDFs & cheat sheets</div>
          </div>
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-4 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Controlled Categories</div>
            <div className="text-lg font-bold text-[#111A2E] mt-1 font-mono font-tabular">
              {metrics.totalCategories}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Courses, TPs, Exams</div>
          </div>
        </div>
      </section>

      {/* S1 Subject Shortcuts Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111A2E] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#2855D9]" />
              <span>Semester 1 Subject Directory</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Select any academic module to browse verified lecture notes, TPs, and exam papers.
            </p>
          </div>
          <Link
            href="/semesters"
            className="text-xs font-medium text-[#2855D9] hover:text-[#111A2E] flex items-center space-x-1"
          >
            <span>All Semesters</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 text-center">
            <Layers className="w-8 h-8 text-[#68748A] mx-auto mb-2" />
            <div className="text-xs font-semibold text-[#111A2E]">No subjects active</div>
          </div>
        )}
      </section>

      {/* Recently Published Documents */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111A2E] flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#2855D9]" />
              <span>Recently Updated Academic Documents</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Course materials and past exams verified for revision.
            </p>
          </div>
          <Link
            href="/subjects"
            className="text-xs font-medium text-[#2855D9] hover:text-[#111A2E] flex items-center space-x-1"
          >
            <span>Browse entire library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 text-center text-xs text-[#68748A]">
            No documents published yet. Upload your first document to get started.
          </div>
        )}
      </section>

      {/* Academic Revision Workflow Guide */}
      <section className="bg-[#EDF2FF]/60 border border-[#2855D9]/20 rounded-xl p-6">
        <h3 className="text-xs font-semibold text-[#111A2E] uppercase tracking-wider font-mono mb-2">
          Academic Navigation Hierarchy
        </h3>
        <p className="text-xs text-[#68748A] leading-relaxed mb-4">
          All revision materials follow the standard academic information hierarchy:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-white border border-[#E4E8F0] text-[#182235]">
            Semester
          </span>
          <span className="text-[#68748A]">→</span>
          <span className="px-2.5 py-1 rounded bg-white border border-[#E4E8F0] text-[#182235]">
            Subject Module
          </span>
          <span className="text-[#68748A]">→</span>
          <span className="px-2.5 py-1 rounded bg-white border border-[#E4E8F0] text-[#182235]">
            Category (Courses, TPs, Exams...)
          </span>
          <span className="text-[#68748A]">→</span>
          <span className="px-2.5 py-1 rounded bg-white border border-[#2855D9] text-[#2855D9] font-semibold">
            In-App PDF Reader
          </span>
        </div>
      </section>
    </div>
  );
}
