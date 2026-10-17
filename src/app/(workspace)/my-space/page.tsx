import { redirect } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getRequesterUser } from "@/lib/auth/authorization";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StudentPrivateWorkspace } from "@/components/workspace/student-private-workspace";
import { getStudentQuizAttempts, getStudentMistakes } from "@/lib/actions/quiz-actions";
import { getBookmarks } from "@/lib/supabase/repository";
import { getRecentAuditLogs } from "@/lib/audit/audit-logger";
import { getUserVipStatus } from "@/lib/actions/vip-actions";
import { getUserSubjectsRevisionProgress, UserOverallRevisionMetrics } from "@/lib/actions/resource-actions";

export const dynamic = "force-dynamic";

export default async function MySpacePage() {
  const requester = await getRequesterUser();

  if (!requester || !requester.id) {
    redirect("/login?next=/my-space");
  }

  const user = {
    id: requester.id,
    email: requester.email,
    display_name: requester.name || requester.email?.split("@")[0] || "Étudiant",
    avatar_url: requester.avatarUrl || null,
  };
  const isGuest = false;

  let isVip = false;
  let privateNotes: any[] = [];
  let privateResources: any[] = [];
  let sharedResources: any[] = [];
  let publicResources: any[] = [];
  let quizAttempts: any[] = [];
  let mistakes: any[] = [];
  let bookmarkedCount = 0;
  let recentActivity: any[] = [];
  let revisionProgressMetrics: UserOverallRevisionMetrics = {
    totalResources: 0,
    totalRevised: 0,
    totalInProgress: 0,
    totalNotStarted: 0,
    overallPercentage: 0,
    subjects: [],
  };

  try {
    const service = getServiceSupabase();

    // Parallelize all independent user space queries concurrently with safe fallbacks
    const [
      profileRes,
      notesRes,
      resDataRes,
      attemptsRes,
      mistakesRes,
      bookmarksRes,
      vipRes,
      revRes,
    ] = await Promise.all([
      service
        ? Promise.resolve(
            service
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", requester.id)
              .maybeSingle()
          ).catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      service
        ? Promise.resolve(
            service
              .from("notes")
              .select("*, subject:subjects(name)")
              .eq("user_id", requester.id)
              .order("created_at", { ascending: false })
          ).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      service
        ? Promise.resolve(
            service
              .from("resources")
              .select("*, subject:subjects(name)")
              .eq("owner_id", requester.id)
              .order("created_at", { ascending: false })
          ).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      getStudentQuizAttempts(requester.id).catch(() => []),
      getStudentMistakes(requester.id).catch(() => []),
      getBookmarks(requester.id).catch(() => []),
      getUserVipStatus(requester.id).catch(() => ({ isVip: false })),
      getUserSubjectsRevisionProgress(requester.id).catch(() => null),
    ]);

    if (profileRes?.data?.display_name) {
      user.display_name = profileRes.data.display_name;
    }
    if (profileRes?.data?.avatar_url) {
      user.avatar_url = profileRes.data.avatar_url;
    }

    privateNotes = (notesRes?.data || []).filter((note: any) => {
      if (!note || !note.title) return false;
      if (note.title.startsWith("__")) return false;
      if (Array.isArray(note.tags) && note.tags.some((t: string) => t.startsWith("system_"))) return false;
      return true;
    });
    const allUserResources = resDataRes?.data || [];
    privateResources = allUserResources.filter((r: any) => r.visibility === "private");
    sharedResources = allUserResources.filter((r: any) => r.visibility === "shared");
    publicResources = allUserResources.filter((r: any) => r.visibility === "public");

    quizAttempts = attemptsRes || [];
    mistakes = mistakesRes || [];
    bookmarkedCount = (bookmarksRes || []).length;

    recentActivity = getRecentAuditLogs(30).filter(
      (log: any) => log.actor_id === requester.id || log.metadata?.user_id === requester.id
    );

    if (vipRes?.isVip !== undefined) {
      isVip = Boolean(vipRes.isVip);
    }
    if (revRes) {
      revisionProgressMetrics = revRes;
    }
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("MySpacePage query error:", err);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Mon Espace Étudiant" }]} />
      <StudentPrivateWorkspace
        user={user}
        isGuest={isGuest}
        isVip={isVip}
        quizAttempts={quizAttempts}
        mistakes={mistakes}
        privateNotes={privateNotes}
        privateResources={privateResources}
        sharedResources={sharedResources}
        publicResources={publicResources}
        bookmarkedCount={bookmarkedCount}
        recentActivity={recentActivity}
        revisionProgress={revisionProgressMetrics}
      />
    </div>
  );
}
