import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getSemesters,
  getSubjects,
  getCategories,
  getResources,
} from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AdminManager } from "@/components/admin/admin-manager";
import { getRequesterUser, isUserAdmin } from "@/lib/auth/authorization";

import { listManagedUsers } from "@/lib/actions/admin-actions";
import { getRecentAuditLogs } from "@/lib/audit/audit-logger";

import { ShieldAlert, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getRequesterUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
  if (!isAdmin) {
    redirect("/login?next=/admin");
  }

  const semesters = await getSemesters();
  const subjects = await getSubjects();
  const categories = await getCategories();
  const resources = await getResources();
  const usersRes = await listManagedUsers();
  const auditLogs = getRecentAuditLogs(50);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Paramètres & Console d'Administration" }]} />

      <AdminManager
        initialSemesters={semesters}
        initialSubjects={subjects}
        initialCategories={categories}
        totalResources={resources.length}
        currentUser={user}
        isAdmin={isAdmin}
        initialUsers={usersRes.users || []}
        initialAuditLogs={auditLogs}
      />
    </div>
  );
}
