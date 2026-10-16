import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getSubjects } from "@/lib/supabase/repository";
import { getRequesterUser } from "@/lib/auth/authorization";
import { FocusProvider } from "@/components/focus/focus-provider";
import { FocusHubModal } from "@/components/focus/focus-hub-modal";
import { PresenceAndAnalyticsTracker } from "@/components/analytics/presence-tracker";
import { PremiumCardIntro } from "@/components/brand/premium-card-intro";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getRequesterUser();
  const subjects = await getSubjects(undefined, user?.id);
  const isAdmin = user?.role === "admin";

  const initialUser = user
    ? {
        id: user.id,
        name: user.name || user.email?.split("@")[0] || "Étudiant",
        email: user.email,
        avatarUrl: user.avatarUrl || null,
      }
    : null;

  return (
    <>
      <script
        id="validily-intro-holding-script"
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=window.location.search;var p=new URLSearchParams(s).get('intro');var l=sessionStorage.getItem('validily_login_event')==='true';var c=document.cookie.indexOf('validily_intro_pending=1')!==-1;var r=p==='replay'||p==='true'||p==='hold';var pl=sessionStorage.getItem('validily_intro_played')==='true';var init=sessionStorage.getItem('validily_session_initialized');if(r||l||c||(!pl&&!init)){document.documentElement.classList.add('validily-intro-holding');}}catch(e){}})();`,
        }}
      />
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
        <PremiumCardIntro user={initialUser} />
      </FocusProvider>
    </>
  );
}
