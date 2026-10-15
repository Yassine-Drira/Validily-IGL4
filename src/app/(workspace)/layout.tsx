import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { getSubjects } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s1Subjects = await getSubjects();

  return (
    <div className="flex min-h-screen bg-[#F4F6FA]">
      {/* Persistent Left Sidebar */}
      <AppSidebar subjects={s1Subjects} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
