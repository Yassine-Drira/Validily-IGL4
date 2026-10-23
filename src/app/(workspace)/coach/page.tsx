import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRequesterUser } from "@/lib/auth/authorization";
import { getCoachingPlanAction } from "@/lib/actions/coach-actions";
import { CoachShell } from "@/components/coach/coach-shell";

export const metadata: Metadata = {
  title: "Validily AI — Coach & Tuteur Académique | VALIDILY-IGL4",
  description:
    "Votre tuteur et coach académique fondé sur l'IA pour optimiser vos révisions, pratiquer des quiz RAG et maîtriser votre cursus IGL4.",
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
