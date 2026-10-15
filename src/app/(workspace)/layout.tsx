import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getSubjects } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const subjects = await getSubjects();

  return (
    <WorkspaceShell
      sidebar={<AppSidebar subjects={subjects} />}
      header={<AppHeader />}
    >
      {children}
    </WorkspaceShell>
  );
}
