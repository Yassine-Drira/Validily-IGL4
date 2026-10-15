import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StudentPrivateWorkspace } from "@/components/workspace/student-private-workspace";
import { getStudentQuizAttempts, getStudentMistakes } from "@/lib/actions/quiz-actions";
import { getBookmarks } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";

export default async function MySpacePage() {
  let user: any = null;
  let isGuest = true;
  let privateNotes: any[] = [];
  let privateResources: any[] = [];
  let quizAttempts: any[] = [];
  let mistakes: any[] = [];
  let bookmarkedCount = 0;

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.id) {
        user = {
          id: authUser.id,
          email: authUser.email,
          display_name: authUser.user_metadata?.display_name || authUser.email?.split("@")[0] || "Étudiant",
          avatar_url: authUser.user_metadata?.avatar_url || null,
        };
        isGuest = false;

        const service = getServiceSupabase();

        // 1. Fetch student's private/personal notes
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
        privateResources = resData || [];

        // 3. Quiz attempts and mistakes
        quizAttempts = await getStudentQuizAttempts(authUser.id);
        mistakes = await getStudentMistakes(authUser.id);

        // 4. Bookmarks count
        const bookmarks = await getBookmarks(authUser.id);
        bookmarkedCount = bookmarks.length;
      }
    }
  } catch (err) {
    console.error("MySpacePage error:", err);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Mon Espace Étudiant" }]} />
      <StudentPrivateWorkspace
        user={user}
        isGuest={isGuest}
        quizAttempts={quizAttempts}
        mistakes={mistakes}
        privateNotes={privateNotes}
        privateResources={privateResources}
        bookmarkedCount={bookmarkedCount}
      />
    </div>
  );
}
