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
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#E4E8F0] rounded-xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-[#2855D9] flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-[#182235]">Console d&apos;Administration</h2>
        <p className="text-xs text-[#68748A]">
          Veuillez vous authentifier avec votre compte administrateur pour accéder à la configuration des matières et semestres.
        </p>
        <Link
          href="/login?next=/admin"
          className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold text-white bg-[#2855D9] rounded-lg hover:bg-blue-700 transition"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const isAdmin = user.role === "admin" || (await isUserAdmin(user.id));
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#E4E8F0] rounded-xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-[#182235]">Accès Restreint</h2>
        <p className="text-xs text-[#68748A]">
          Le compte actuel ({user.email}) ne dispose pas des privilèges administrateur requis.
        </p>
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 py-2 text-xs font-semibold text-[#182235] bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg hover:bg-gray-100 transition text-center"
          >
            Accueil
          </Link>
          <Link
            href="/login?next=/admin"
            className="flex-1 py-2 text-xs font-semibold text-white bg-[#2855D9] rounded-lg hover:bg-blue-700 transition text-center"
          >
            Changer de compte
          </Link>
        </div>
      </div>
    );
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
