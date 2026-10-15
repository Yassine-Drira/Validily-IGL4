import Link from "next/link";
import {
  getSubjects,
  getResources,
  getCategories,
  getDashboardMetrics,
} from "@/lib/supabase/repository";
import { ResourceCard } from "@/components/academic/resource-card";
import { InteractiveFlowSelector } from "@/components/academic/interactive-flow-selector";
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
  FolderArchive,
  Sparkles,
  Puzzle,
  FileText,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

function MountainSummitIllustration({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Mountain */}
      <polygon points="38,22 56,52 20,52" fill="#CBD5E1" />
      {/* Foreground Main Mountain */}
      <polygon points="24,14 46,52 4,52" fill="#111A2E" />
      {/* Snow Cap on Main Mountain */}
      <polygon points="24,14 31,26 27,24 24,27 21,24 17,26" fill="#FFFFFF" />
      {/* Little Flagpole & Flag at Summit */}
      <line x1="24" y1="14" x2="24" y2="4" stroke="#2855D9" strokeWidth="2" strokeLinecap="round" />
      <polygon points="24,4 34,7.5 24,11" fill="#2855D9" />
      {/* Base Foothill / Grass Accent */}
      <path d="M2 52 Q18 48 34 52 T62 52" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default async function HomePage() {
  const [metrics, s1Subjects, s2Subjects, recentResources, categories] = await Promise.all([
    getDashboardMetrics(),
    getSubjects("sem-1"),
    getSubjects("sem-2"),
    getResources({ limit: 4 }),
    getCategories(),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Greeting & Motivational Tip Header */}
      <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left Greeting */}
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111A2E] tracking-tight">
            Bonjour !
          </h1>
          <p className="text-xs sm:text-sm text-[#68748A] mt-1 leading-relaxed">
            Votre réussite commence ici. Choisissez votre semestre et accédez à toutes vos ressources.
          </p>
        </div>

        {/* Right Motivational Card (Directly from Mockup) */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-4 sm:px-5 sm:py-3.5 shadow-xs flex items-center space-x-4 shrink-0 max-w-md">
          <MountainSummitIllustration className="w-11 h-11 shrink-0" />
          <div className="text-xs text-[#182235] font-medium leading-snug">
            Un petit effort chaque jour fait de grandes réussites !
          </div>
        </div>
      </section>

      {/* 3-Step Decision Flow: Semestre -> Type d'examen -> Matière */}
      <section>
        <InteractiveFlowSelector
          s1Subjects={s1Subjects}
          s2Subjects={s2Subjects}
          categories={categories}
        />
      </section>

      {/* Section: Ressources rapides (from Mockup) */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#111A2E]">
          Ressources rapides
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/library"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-xl p-3.5 flex items-center space-x-3 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EDF2FF] flex items-center justify-center text-[#2855D9] group-hover:scale-105 transition-transform">
              <FolderArchive className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#182235] group-hover:text-[#2855D9] transition-colors">
              Mes fichiers
            </span>
          </Link>

          <Link
            href="/quizzes"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-xl p-3.5 flex items-center space-x-3 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F5F0FF] flex items-center justify-center text-[#7C3AED] group-hover:scale-105 transition-transform">
              <Puzzle className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#182235] group-hover:text-[#2855D9] transition-colors">
              Mes espaces / Quiz
            </span>
          </Link>

          <Link
            href="/notes"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-xl p-3.5 flex items-center space-x-3 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#059669] group-hover:scale-105 transition-transform">
              <FileEdit className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#182235] group-hover:text-[#2855D9] transition-colors">
              Fiches de révision
            </span>
          </Link>

          <Link
            href="/library?action=upload"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-xl p-3.5 flex items-center space-x-3 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EDF5FF] flex items-center justify-center text-[#0284C7] group-hover:scale-105 transition-transform">
              <UploadCloud className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#182235] group-hover:text-[#2855D9] transition-colors">
              Téléverser un fichier
            </span>
          </Link>
        </div>
      </section>

      {/* Feature Discovery Callouts (Bottom Row from Mockup) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Téléversez vos fichiers */}
        <Link
          href="/library?action=upload"
          className="bg-[#EDF5FF] border border-[#D0E2FF] rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-all group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-[#0284C7] mb-3">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#111A2E] leading-snug">
              Téléversez vos fichiers
            </h4>
            <p className="text-[11px] text-[#475569] mt-0.5">
              PDF, DOC, PPT, ...
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end text-[#0284C7] text-xs">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Créez vos espaces */}
        <Link
          href="/notes"
          className="bg-[#EDFAF3] border border-[#C3ECD6] rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-all group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-[#059669] mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#111A2E] leading-snug">
              Créez vos espaces
            </h4>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Quiz, notes, projets...
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end text-[#059669] text-xs">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Fiches de révision */}
        <Link
          href="/notes"
          className="bg-[#F5F0FF] border border-[#E0D4FF] rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-all group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-[#7C3AED] mb-3">
              <FileEdit className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#111A2E] leading-snug">
              Fiches de révision
            </h4>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Votre mémo personnalisé
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end text-[#7C3AED] text-xs">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Quiz & QCM */}
        <Link
          href="/quizzes"
          className="bg-[#FFF0F2] border border-[#FDCED5] rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-all group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-[#E11D48] mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#111A2E] leading-snug">
              Quiz & QCM
            </h4>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Testez vos connaissances
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end text-[#E11D48] text-xs">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 5: Brand Palette Visual Tagline (from Mockup) */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-4 flex flex-col justify-between items-center text-center">
          <div className="flex items-center space-x-2 my-auto">
            <span className="w-4 h-4 rounded-full bg-[#2855D9] shadow-2xs" />
            <span className="w-4 h-4 rounded-full bg-[#111A2E] shadow-2xs" />
            <span className="w-4 h-4 rounded-full bg-[#E4E8F0] shadow-2xs" />
            <span className="w-4 h-4 rounded-full bg-[#F4F6FA] border border-[#E4E8F0] shadow-2xs" />
          </div>
          <div className="text-[11px] font-medium text-[#68748A] tracking-tight">
            Simple • Moderne • Efficace
          </div>
        </div>
      </section>

      {/* Recently Published Documents (Preserved Database Section) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111A2E] flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#2855D9]" />
              <span>Documents Académiques Récents</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Cours, fiches de TD/TP et examens indexés dans la base de données.
            </p>
          </div>
          <Link
            href="/library"
            className="text-xs font-medium text-[#2855D9] hover:text-[#111A2E] flex items-center space-x-1"
          >
            <span>Toute la bibliothèque</span>
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
            Aucun document publié pour le moment. Téléversez votre premier document pour commencer.
          </div>
        )}
      </section>

      {/* Database Summary Metrics */}
      <section className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Parcours Académique</div>
            <div className="text-base font-bold text-[#111A2E] mt-1 font-mono">IGL4</div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Génie Logiciel</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Matières Actives</div>
            <div className="text-base font-bold text-[#2855D9] mt-1 font-mono font-tabular">
              {metrics.totalSubjects}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Semestre 1 catalogué</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Documents Indexés</div>
            <div className="text-base font-bold text-[#111A2E] mt-1 font-mono font-tabular">
              {metrics.totalResources}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">PDFs & fiches mémo</div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Catégories Contrôlées</div>
            <div className="text-base font-bold text-[#111A2E] mt-1 font-mono font-tabular">
              {metrics.totalCategories}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Cours, TPs, Examens</div>
          </div>
        </div>
      </section>
    </div>
  );
}
