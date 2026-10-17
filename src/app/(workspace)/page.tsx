import Link from "next/link";
import {
  getSubjects,
  getResources,
  getCategories,
  getDashboardMetrics,
  getBookmarks,
} from "@/lib/supabase/repository";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getStudentQuizAttempts, getStudentMistakes } from "@/lib/actions/quiz-actions";
import { getMyForest } from "@/lib/actions/forest-actions";
import { getUserStudyGoals } from "@/lib/actions/analytics-actions";
import { ResourceCard } from "@/components/academic/resource-card";
import { InteractiveFlowSelector } from "@/components/academic/interactive-flow-selector";
import { PersonalAnalyticsDashboard } from "@/components/workspace/personal-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  User,
  RotateCcw,
  CheckCircle2,
  HardDrive,
  Compass,
} from "lucide-react";

import { getRequesterUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

function MountainSummitIllustration({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <polygon points="38,22 56,52 20,52" fill="#CBD5E1" />
      <polygon points="24,14 46,52 4,52" fill="#111A2E" />
      <polygon points="24,14 31,26 27,24 24,27 21,24 17,26" fill="#FFFFFF" />
      <line x1="24" y1="14" x2="24" y2="4" stroke="#2855D9" strokeWidth="2" strokeLinecap="round" />
      <polygon points="24,4 34,7.5 24,11" fill="#2855D9" />
      <path d="M2 52 Q18 48 34 52 T62 52" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default async function HomePage() {
  let currentUser: any = null;
  let userAttempts: any[] = [];
  let userBookmarksCount = 0;
  let userMistakesCount = 0;
  let userForestData: any = null;
  let userGoals: any = null;

  try {
    const user = await getRequesterUser();
    if (user?.id) {
      currentUser = {
        id: user.id,
        name: user.name || user.email?.split("@")[0] || "Étudiant",
        email: user.email,
      };
      const [attempts, bookmarks, mistakes, forestData, studyGoals] = await Promise.all([
        getStudentQuizAttempts(user.id),
        getBookmarks(user.id),
        getStudentMistakes(user.id),
        getMyForest(user.id),
        getUserStudyGoals(user.id),
      ]);
      userAttempts = attempts || [];
      userBookmarksCount = bookmarks.length;
      userMistakesCount = mistakes?.length || 0;
      userForestData = forestData;
      userGoals = studyGoals;
    }
  } catch (err) {
    console.error("HomePage user fetch error:", err);
  }

  // --- Real tracked study analytics ---
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][d.getDay()];
    const count = userAttempts.filter((a) => a.completed_at?.startsWith(dateStr)).length;
    return { dateStr, dayLabel, count };
  });

  // Real 7-day focus minutes from completed DB sessions
  const dailyFocusMap: { [dateStr: string]: number } = {};
  last7Days.forEach((d) => {
    dailyFocusMap[d.dateStr] = 0;
  });

  if (userForestData?.trees) {
    userForestData.trees.forEach((t: any) => {
      if (t.tree_status === "healthy" && t.earned_at) {
        const dateStr = t.earned_at.split("T")[0];
        if (dailyFocusMap[dateStr] !== undefined) {
          const durationSec =
            t.session?.actual_duration_seconds ||
            t.session?.target_duration_seconds ||
            1500;
          dailyFocusMap[dateStr] += Math.floor(durationSec / 60);
        }
      }
    });
  }

  // Unified study streak: combines Quizzes + Focus Pomodoro sessions
  const allActiveDatesSet = new Set<string>();
  userAttempts.forEach((a) => {
    if (a.completed_at) allActiveDatesSet.add(a.completed_at.split("T")[0]);
  });
  if (userForestData?.trees) {
    userForestData.trees.forEach((t: any) => {
      if (t.tree_status === "healthy" && t.earned_at) {
        allActiveDatesSet.add(t.earned_at.split("T")[0]);
      }
    });
  }

  const activeDates = Array.from(allActiveDatesSet).sort().reverse();

  let streak = 0;
  if (activeDates.length > 0) {
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const checkDate =
      activeDates[0] === todayStr ? today : activeDates[0] === yesterdayStr ? yesterday : null;
    if (checkDate) {
      streak = 1;
      const curr = new Date(checkDate);
      for (let i = 1; i < activeDates.length; i++) {
        curr.setDate(curr.getDate() - 1);
        const expectedStr = curr.toISOString().split("T")[0];
        if (activeDates[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  const practicedSubjectIds: string[] = [];
  if (userForestData?.trees) {
    userForestData.trees.forEach((t: any) => {
      const sid = t.session?.subject_id || t.session?.subject?.id;
      if (sid && !practicedSubjectIds.includes(sid)) {
        practicedSubjectIds.push(sid);
      }
    });
  }

  const averageScore =
    userAttempts.length > 0
      ? Math.round(
          userAttempts.reduce((acc, a) => acc + (a.score / (a.total_questions || 1)) * 100, 0) /
            userAttempts.length
        )
      : null;

  const recentAttempt = userAttempts[0] || null;
  const weakAttempt = userAttempts.find(
    (a) => a.score / (a.total_questions || 1) < 0.7
  );

  const [metrics, allSubjects, recentResources, categories] = await Promise.all([
    getDashboardMetrics(),
    getSubjects(undefined, currentUser?.id),
    getResources({ limit: 4, userId: currentUser?.id }),
    getCategories(),
  ]);

  const s1Subjects = allSubjects.filter(
    (s) =>
      s.semester_id === "11111111-1111-1111-1111-111111111111" ||
      s.semester?.sort_order === 1 ||
      s.semester?.name?.includes("1")
  );
  const s2Subjects = allSubjects.filter(
    (s) =>
      s.semester_id === "22222222-2222-2222-2222-222222222222" ||
      s.semester?.sort_order === 2 ||
      s.semester?.name?.includes("2")
  );

  return (
    <div className="space-y-8">
      {/* 1. Header: Student Welcome & Contextual Motivational Banner */}
      <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111A2E] tracking-tight">
              {currentUser ? `Bonjour, ${currentUser.name} !` : "Bonjour !"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FAFAF7] border border-[#E4E8F0] text-[#68748A]">
              Promotion IGL4
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#68748A] mt-1 leading-relaxed">
            {currentUser
              ? "Accédez à vos cours, reprenez vos entraînements et suivez votre progression académique."
              : "Votre plateforme universitaire de révision. Consultez vos cours ou connectez-vous pour synchroniser votre espace."}
          </p>
        </div>

        {/* Motivational Card */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-4 sm:px-5 sm:py-3.5 shadow-xs flex items-center space-x-4 shrink-0 max-w-md">
          <MountainSummitIllustration className="w-11 h-11 shrink-0" />
          <div className="text-xs text-[#182235] font-medium leading-snug">
            {streak > 1 ? (
              <span className="text-amber-800 font-semibold flex items-center space-x-1">
                <span>🔥 Belle régularité : série de {streak} jours consécutifs !</span>
              </span>
            ) : currentUser ? (
              "Un petit entraînement chaque jour fait de grandes réussites aux examens !"
            ) : (
              "Ressources libres d'accès. Connectez-vous pour sauvegarder vos notes et quiz."
            )}
          </div>
        </div>
      </section>

      {/* 2. PERSONAL ACADEMIC ANALYTICS & MOTIVATION DASHBOARD */}
      <PersonalAnalyticsDashboard
        user={currentUser}
        userAttempts={userAttempts}
        userBookmarksCount={userBookmarksCount}
        mistakesCount={userMistakesCount}
        streak={streak}
        averageScore={averageScore}
        last7Days={last7Days}
        initialDailyFocusMap={dailyFocusMap}
        initialGoals={userGoals}
        practicedSubjectIds={practicedSubjectIds}
        allSubjects={allSubjects}
        weakAttempt={weakAttempt}
        recentAttempt={recentAttempt}
      />

      {/* 3. Core Feature Entry Points (What can I do here?) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111A2E] flex items-center space-x-2">
            <Compass className="w-4 h-4 text-[#2855D9]" />
            <span>Modules & Outils de Révision</span>
          </h2>
          <span className="text-[11px] text-[#68748A]">
            Accès direct aux fonctionnalités clés
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Matières */}
          <Link
            href="/subjects"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] flex items-center justify-center text-[#2855D9] mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                Matières & Cours
              </h3>
              <p className="text-[11px] text-[#68748A] mt-0.5 line-clamp-1">
                10 modules IGL4
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end text-[#2855D9]">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Bibliothèque */}
          <Link
            href="/library"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#EDF5FF] flex items-center justify-center text-[#0284C7] mb-3 group-hover:scale-105 transition-transform">
                <FolderArchive className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                Bibliothèque
              </h3>
              <p className="text-[11px] text-[#68748A] mt-0.5 line-clamp-1">
                PDFs & Google Drive
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end text-[#0284C7]">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Quiz & QCM */}
          <Link
            href="/quizzes"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] flex items-center justify-center text-[#7C3AED] mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                Quiz & Ateliers
              </h3>
              <p className="text-[11px] text-[#68748A] mt-0.5 line-clamp-1">
                Tests interactifs & HTML
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end text-[#7C3AED]">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Fiches Mémo */}
          <Link
            href="/notes"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#EDFAF3] flex items-center justify-center text-[#059669] mb-3 group-hover:scale-105 transition-transform">
                <FileEdit className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                Fiches Mémo
              </h3>
              <p className="text-[11px] text-[#68748A] mt-0.5 line-clamp-1">
                Formules & synthèses
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end text-[#059669]">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Favoris */}
          <Link
            href="/bookmarks"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FFF8E6] flex items-center justify-center text-[#D97706] mb-3 group-hover:scale-105 transition-transform">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                Mes Favoris
              </h3>
              <p className="text-[11px] text-[#68748A] mt-0.5 line-clamp-1">
                {userBookmarksCount > 0 ? `${userBookmarksCount} sauvegardés` : "Shortlist rapide"}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end text-[#D97706]">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Mon Espace */}
          <Link
            href="/my-space"
            className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#FAFBFD] border border-[#E4E8F0] flex items-center justify-center text-[#111A2E] mb-3 group-hover:scale-105 transition-transform">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                Mon Espace
              </h3>
              <p className="text-[11px] text-[#68748A] mt-0.5 line-clamp-1">
                Carnet d'erreurs & privé
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end text-[#111A2E]">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. 3-Step Decision Flow: Semestre -> Type d'examen -> Matière */}
      <section>
        <InteractiveFlowSelector
          s1Subjects={s1Subjects}
          s2Subjects={s2Subjects}
          categories={categories}
        />
      </section>

      {/* 5. Recently Published Documents (Real database query) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111A2E] flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#2855D9]" />
              <span>Derniers Documents Académiques Publiés</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Polycopiés, séries d'exercices et épreuves d'examens disponibles.
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

      {/* 6. Database Summary Metrics (Real Persisted Stats) */}
      <section className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Parcours Académique</div>
            <div className="text-base font-bold text-[#111A2E] mt-1 font-mono">IGL4</div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Génie Logiciel</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Matières Actives</div>
            <div className="text-base font-bold text-[#2855D9] mt-1 font-mono font-tabular">
              {metrics.totalSubjects}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Semestre 1 & 2 catalogués</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Documents Indexés</div>
            <div className="text-base font-bold text-[#111A2E] mt-1 font-mono font-tabular">
              {metrics.totalResources}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">PDFs & Liens Google Drive</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E4E8F0]">
            <div className="text-xs text-[#68748A] font-medium">Catégories Contrôlées</div>
            <div className="text-base font-bold text-[#111A2E] mt-1 font-mono font-tabular">
              {metrics.totalCategories}
            </div>
            <div className="text-[11px] text-[#68748A] mt-0.5">Cours, TPs, Examens, Mémos</div>
          </div>
        </div>
      </section>
    </div>
  );
}
