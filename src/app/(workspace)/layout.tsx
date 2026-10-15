import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getSubjects } from "@/lib/supabase/repository";
import { getRequesterUser, isUserAdmin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getRequesterUser();
  const subjects = await getSubjects(undefined, user?.id);
  const isAdmin = user ? user.role === "admin" || (await isUserAdmin(user.id)) : false;

  return (
    <WorkspaceShell
      sidebar={<AppSidebar subjects={subjects} isAdmin={isAdmin} />}
      header={<AppHeader />}
    >
      {children}
    </WorkspaceShell>
  );
}
