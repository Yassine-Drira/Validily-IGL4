import { getBookmarks } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SavedItemsManager } from "@/components/bookmarks/saved-items-manager";
import { AcademicResource } from "@/types/database";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  let isGuest = true;
  let bookmarkedResources: AcademicResource[] = [];

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        isGuest = false;
        const bookmarks = await getBookmarks(user.id);
        bookmarkedResources = bookmarks
          .map((b) => b.resource)
          .filter((r): r is AcademicResource => Boolean(r));
      } else {
        const bookmarks = await getBookmarks();
        bookmarkedResources = bookmarks
          .map((b) => b.resource)
          .filter((r): r is AcademicResource => Boolean(r));
      }
    }
  } catch (err) {
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
