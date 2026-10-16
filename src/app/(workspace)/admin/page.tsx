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
import { listAllCatalogEntries } from "@/lib/actions/audio-catalog-actions";
import { listVipEntitlements } from "@/lib/actions/vip-actions";
import { getLivePresenceList } from "@/lib/actions/presence-actions";
import { getAnalyticsOverview } from "@/lib/actions/analytics-actions";

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

  const [
    semesters,
    subjects,
    categories,
    resources,
    usersRes,
    catalogRes,
    vipRes,
    presenceRes,
    analyticsRes,
  ] = await Promise.all([
    getSemesters(),
    getSubjects(),
    getCategories(),
    getResources(),
    listManagedUsers(),
    listAllCatalogEntries(),
    listVipEntitlements(),
    getLivePresenceList(),
    getAnalyticsOverview("7d"),
  ]);

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
        initialCatalogEntries={catalogRes.entries || []}
        initialVipEntitlements={vipRes.entitlements || []}
        initialPresenceUsers={presenceRes.users || []}
        initialTotalActiveUsers={presenceRes.totalActive || 0}
        initialAnalytics={analyticsRes.overview || null}
      />
    </div>
  );
}
