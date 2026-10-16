import { redirect } from "next/navigation";
import { getBookmarks } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SavedItemsManager } from "@/components/bookmarks/saved-items-manager";
import { AcademicResource } from "@/types/database";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  let isGuest = false;
  let bookmarkedResources: AcademicResource[] = [];

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        redirect("/login?next=/bookmarks");
      }

      const bookmarks = await getBookmarks(user.id);
      bookmarkedResources = bookmarks
        .map((b) => b.resource)
        .filter((r): r is AcademicResource => Boolean(r));
    } else {
      // In unconfigured / test environment, allow test execution
      const bookmarks = await getBookmarks();
      bookmarkedResources = bookmarks
        .map((b) => b.resource)
        .filter((r): r is AcademicResource => Boolean(r));
    }
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("BookmarksPage error:", err);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Favoris & Sauvegardes" }]} />
      <SavedItemsManager
        initialResources={bookmarkedResources}
        isGuest={isGuest}
      />
    </div>
  );
}
