import {
  getSemesters,
  getSubjects,
  getCategories,
  getResources,
} from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AdminManager } from "@/components/admin/admin-manager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const semesters = await getSemesters();
  const subjects = await getSubjects();
  const categories = await getCategories();
  const resources = await getResources();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin Console" }]} />

      <AdminManager
        initialSemesters={semesters}
        initialSubjects={subjects}
        initialCategories={categories}
        totalResources={resources.length}
      />
    </div>
  );
}
