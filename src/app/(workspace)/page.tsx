import Link from "next/link";
import {
  getSubjects,
  getResources,
  getCategories,
  getDashboardMetrics,
  getBookmarks,
} from "@/lib/supabase/repository";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getStudentQuizAttempts } from "@/lib/actions/quiz-actions";
import { ResourceCard } from "@/components/academic/resource-card";
import { InteractiveFlowSelector } from "@/components/academic/interactive-flow-selector";
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

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        currentUser = {
          id: user.id,
          name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Étudiant",
          email: user.email,
        };
        const [attempts, bookmarks] = await Promise.all([
          getStudentQuizAttempts(user.id),
          getBookmarks(user.id),
        ]);
        userAttempts = attempts || [];
        userBookmarksCount = bookmarks.length;
      }
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

  const attemptDates = Array.from(
    new Set(userAttempts.map((a) => a.completed_at?.split("T")[0]).filter(Boolean))
  )
    .sort()
    .reverse();

  let streak = 0;
  if (attemptDates.length > 0) {
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const checkDate =
      attemptDates[0] === todayStr ? today : attemptDates[0] === yesterdayStr ? yesterday : null;
    if (checkDate) {
      streak = 1;
      const curr = new Date(checkDate);
      for (let i = 1; i < attemptDates.length; i++) {
        curr.setDate(curr.getDate() - 1);
        const expectedStr = curr.toISOString().split("T")[0];
        if (attemptDates[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
    }
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

  const [metrics, s1Subjects, s2Subjects, recentResources, categories] = await Promise.all([
    getDashboardMetrics(),
    getSubjects("sem-1"),
    getSubjects("sem-2"),
    getResources({ limit: 4 }),
    getCategories(),
  ]);

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

      {/* 2. REAL ACADEMIC PROGRESS & STUDY ACTIVITY DASHBOARD */}
      {currentUser && userAttempts.length > 0 ? (
        <section className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4E8F0]">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#2855D9]" />
              <h2 className="text-sm font-bold text-[#111A2E]">
                Progression & Assiduité Récente
              </h2>
            </div>
            <span className="text-[11px] text-[#68748A] font-mono">
              Basé sur vos {userAttempts.length} entraînements enregistrés
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* 7-Day Visual Activity Graph */}
            <div className="p-3.5 bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#68748A] uppercase tracking-wider">
                  Activité (7 derniers jours)
                </span>
                <span className="text-xs font-bold text-[#2855D9] font-mono">
                  {streak > 0 ? `🔥 Série : ${streak} j` : "0 j"}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 items-end h-16 pt-2">
                {last7Days.map((day, idx) => {
                  const hasActivity = day.count > 0;
                  const heightPercent = hasActivity ? Math.min(100, Math.max(30, day.count * 35)) : 12;
                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={cn(
                          "w-full rounded-t transition-all",
                          hasActivity
                            ? "bg-[#2855D9] group-hover:bg-[#1E40AF]"
                            : "bg-[#E4E8F0]"
                        )}
                        title={`${day.dayLabel} : ${day.count} quiz passé(s)`}
                      />
                      <span className="text-[10px] text-[#68748A] mt-1 font-mono">
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Overview */}
            <div className="p-3.5 bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl flex flex-col justify-between h-full">
              <span className="text-[11px] font-semibold text-[#68748A] uppercase tracking-wider">
                Moyenne & Volume
              </span>
              <div className="flex items-center justify-around my-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-[#111A2E]">
                    {averageScore !== null ? `${averageScore}%` : "—"}
                  </div>
                  <div className="text-[10px] text-[#68748A] mt-0.5">Score moyen</div>
                </div>
                <div className="h-8 w-px bg-[#E4E8F0]" />
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-[#2855D9]">
                    {userAttempts.length}
                  </div>
                  <div className="text-[10px] text-[#68748A] mt-0.5">Quiz terminés</div>
                </div>
              </div>
            </div>

            {/* Recommendation Card */}
            <div className="p-3.5 bg-gradient-to-br from-[#F0F5FF] to-white border border-[#D0E2FF] rounded-xl flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#2855D9] uppercase tracking-wider">
                  Recommandation
                </span>
                {weakAttempt ? (
                  <div>
                    <h4 className="text-xs font-bold text-[#111A2E] mt-1 line-clamp-1">
                      Consolider : {weakAttempt.quiz?.title || "Quiz"}
                    </h4>
                    <p className="text-[11px] text-[#68748A] mt-0.5">
                      Score précédent : {weakAttempt.score}/{weakAttempt.total_questions}. Rejouez-le pour combler vos lacunes.
                    </p>
                  </div>
                ) : recentAttempt ? (
                  <div>
                    <h4 className="text-xs font-bold text-[#111A2E] mt-1 line-clamp-1">
                      Reprendre : {recentAttempt.quiz?.title || "Quiz"}
                    </h4>
                    <p className="text-[11px] text-[#68748A] mt-0.5">
                      {recentAttempt.quiz?.subject?.name || "Matière"} • Score : {recentAttempt.score}/{recentAttempt.total_questions}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs font-bold text-[#111A2E] mt-1">
                      Explorez un nouveau quiz
                    </h4>
                    <p className="text-[11px] text-[#68748A] mt-0.5">
                      Testez vos acquis sur les modules de votre semestre en cours.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-end">
                <Link
                  href={
                    weakAttempt
                      ? `/quizzes/${weakAttempt.quiz_id}`
                      : recentAttempt
                      ? `/quizzes/${recentAttempt.quiz_id}`
                      : "/quizzes"
                  }
                >
                  <Button size="sm" variant="primary" className="text-xs shadow-xs py-1.5 h-auto">
                    <span>{weakAttempt ? "Consolider" : "S'entraîner"}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Empty state for new or unregistered students */
        <section className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#111A2E]">
                Démarrez vos révisions universitaires
              </h3>
              <p className="text-xs text-[#68748A] mt-0.5 max-w-xl">
                Vos séries d'entraînement, temps de révision et graphiques de progression hebdomadaire s'afficheront ici automatiquement dès vos premiers QCM ou téléchargements.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link href="/quizzes">
              <Button size="sm" variant="primary" className="text-xs">
                <span>Passer un premier test</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </section>
      )}

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
