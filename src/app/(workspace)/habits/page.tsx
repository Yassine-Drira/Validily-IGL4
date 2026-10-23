import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRequesterUser } from "@/lib/auth/authorization";
import { getHabitsAction } from "@/lib/actions/habit-actions";
import { getAcademicGoalsAction } from "@/lib/actions/planner-actions";
import { HabitsShell } from "@/components/habits/habits-shell";
import { getLocalTodayDateString } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Habitudes & Routine | VALIDILY-IGL4",
  description:
    "Suivez votre discipline quotidienne, comprenez vos baisses de régime et ancrez des routines académiques durables.",
};

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const user = await getRequesterUser();

  if (!user?.id) {
    redirect("/login?next=/habits");
  }

  const todayStr = getLocalTodayDateString();

  const [habitsRes, goalsRes] = await Promise.all([
    getHabitsAction({ status: "all", targetDate: todayStr }),
    getAcademicGoalsAction(),
  ]);

  const initialHabits = habitsRes.success && habitsRes.data ? habitsRes.data : [];
  const initialGoals = goalsRes.success && goalsRes.data ? goalsRes.data : [];

  return (
    <div className="space-y-6">
      <HabitsShell
        initialHabits={initialHabits}
        initialGoals={initialGoals}
        currentDateStr={todayStr}
      />
    </div>
  );
}
