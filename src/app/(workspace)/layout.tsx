import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getSubjects } from "@/lib/supabase/repository";
import { getRequesterUser } from "@/lib/auth/authorization";
import { FocusProvider } from "@/components/focus/focus-provider";
import { FocusHubModal } from "@/components/focus/focus-hub-modal";
import { PresenceAndAnalyticsTracker } from "@/components/analytics/presence-tracker";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getRequesterUser();
  const subjects = await getSubjects(undefined, user?.id);
  const isAdmin = user?.role === "admin";
  const { getUserVipStatus } = await import("@/lib/actions/vip-actions");
  const vip = user?.id ? await getUserVipStatus(user.id) : { isVip: false };

  const initialUser = user
    ? {
        id: user.id,
        name: user.name || user.email?.split("@")[0] || "Étudiant",
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        isVip: vip.isVip,
        isTemporaryAdmin: Boolean(user.isTemporaryAdmin),
      }
    : null;

  return (
    <FocusProvider user={initialUser}>
      <WorkspaceShell
        key="workspace-shell"
        sidebar={<AppSidebar key="app-sidebar" subjects={subjects} isAdmin={isAdmin} />}
        header={<AppHeader key="app-header" initialUser={initialUser} />}
      >
        {children}
      </WorkspaceShell>
      <FocusHubModal key="focus-hub-modal" />
      <PresenceAndAnalyticsTracker key="presence-tracker" />
    </FocusProvider>
  );
}
