import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRequesterUser } from "@/lib/auth/authorization";
import { getCoachingPlanAction } from "@/lib/actions/coach-actions";
import { CoachShell } from "@/components/coach/coach-shell";

export const metadata: Metadata = {
  title: "Coach IA & Tuteur | VALIDILY-IGL4",
  description:
    "Votre tuteur personnel autonome pour planifier vos révisions, cibler vos points faibles et optimiser votre emploi du temps.",
};

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const user = await getRequesterUser();

  if (!user?.id) {
    redirect("/login?next=/coach");
  }

  const planRes = await getCoachingPlanAction();

  if (!planRes.success || !planRes.data) {
    return (
      <div className="p-8 text-center bg-[#0f172a] rounded-2xl border border-slate-800 text-slate-300">
        <h2 className="text-lg font-semibold text-rose-400">Impossible de charger le Coach IA</h2>
        <p className="text-xs text-slate-400 mt-2">{planRes.error || "Erreur de connexion"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CoachShell initialPlan={planRes.data} />
    </div>
  );
}
