import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StudentPrivateWorkspace } from "@/components/workspace/student-private-workspace";
import { getStudentQuizAttempts, getStudentMistakes } from "@/lib/actions/quiz-actions";
import { getBookmarks } from "@/lib/supabase/repository";
import { getRecentAuditLogs } from "@/lib/audit/audit-logger";
import { getUserVipStatus } from "@/lib/actions/vip-actions";

export const dynamic = "force-dynamic";

export default async function MySpacePage() {
  let user: any = null;
  let isGuest = true;
  let isVip = false;
  let privateNotes: any[] = [];
  let privateResources: any[] = [];
  let sharedResources: any[] = [];
  let publicResources: any[] = [];
  let quizAttempts: any[] = [];
  let mistakes: any[] = [];
  let bookmarkedCount = 0;
  let recentActivity: any[] = [];

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser?.id) {
        redirect("/login?next=/my-space");
      }

      const service = getServiceSupabase();

        // 0. Fetch persisted student profile from database
        const { data: profile } = await service
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", authUser.id)
          .maybeSingle();

        user = {
          id: authUser.id,
          email: authUser.email,
          display_name: profile?.display_name || authUser.user_metadata?.display_name || authUser.email?.split("@")[0] || "Étudiant",
          avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
        };
        isGuest = false;

        // 1. Fetch student's personal notes
        const { data: notesData } = await service
          .from("notes")
          .select("*, subject:subjects(name)")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false });
        privateNotes = notesData || [];

        // 2. Fetch student's uploaded personal resources
        const { data: resData } = await service
          .from("resources")
          .select("*, subject:subjects(name)")
          .eq("owner_id", authUser.id)
          .order("created_at", { ascending: false });
        const allUserResources = resData || [];
        privateResources = allUserResources.filter((r: any) => r.visibility === "private");
        sharedResources = allUserResources.filter((r: any) => r.visibility === "shared");
        publicResources = allUserResources.filter((r: any) => r.visibility === "public");

        // 3. Quiz attempts and mistakes
        quizAttempts = await getStudentQuizAttempts(authUser.id);
        mistakes = await getStudentMistakes(authUser.id);

        // 4. Bookmarks count
        const bookmarks = await getBookmarks(authUser.id);
        bookmarkedCount = bookmarks.length;

        // 5. Audit Activity history
        recentActivity = getRecentAuditLogs(30).filter(
          (log: any) => log.actor_id === authUser.id || log.metadata?.user_id === authUser.id
        );

        // 6. VIP Entitlement & Verified Badge status
        try {
          const vipRes = await getUserVipStatus(authUser.id);
          isVip = Boolean(vipRes.isVip);
        } catch {}
      }
    } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("MySpacePage error:", err);
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
      />
    </div>
  );
}
