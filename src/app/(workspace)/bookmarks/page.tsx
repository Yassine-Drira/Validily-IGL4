import { redirect } from "next/navigation";
import { getBookmarks } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SavedItemsManager } from "@/components/bookmarks/saved-items-manager";
import { AcademicResource } from "@/types/database";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { getRequesterUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const requester = await getRequesterUser();
  if (!requester && isSupabaseConfigured()) {
    redirect("/login?next=/bookmarks");
  }

  let bookmarkedResources: AcademicResource[] = [];

  try {
    const bookmarks = requester?.id
      ? await getBookmarks(requester.id)
      : await getBookmarks();
    bookmarkedResources = bookmarks
      .map((b) => b.resource)
      .filter((r): r is AcademicResource => Boolean(r));
  } catch (err: any) {
    console.error("BookmarksPage error:", err);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Favoris & Sauvegardes" }]} />
      <SavedItemsManager
        initialResources={bookmarkedResources}
        isGuest={!requester}
      />
    </div>
  );
}
