import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRequesterUser } from "@/lib/auth/authorization";
import { getSubjects } from "@/lib/supabase/repository";
import {
  getAcademicTasksAction,
  getCalendarTimeblocksAction,
  getPlannerHistoryAction,
} from "@/lib/actions/planner-actions";
import { PlannerShell } from "@/components/planner/planner-shell";

export const metadata: Metadata = {
  title: "Planning & Tâches | VALIDILY-IGL4",
  description:
    "Organisez votre emploi du temps, planifiez vos révisions et gérez vos devoirs académiques IGL4.",
};

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const user = await getRequesterUser();

  // If not authenticated, redirect to sign-in
  if (!user?.id) {
    redirect("/login?next=/planner");
  }

  const today = new Date();
  const startRange = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const endRange = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [subjects, tasksRes, blocksRes, historyRes] = await Promise.all([
    getSubjects(undefined, user.id),
    getAcademicTasksAction(),
    getCalendarTimeblocksAction(startRange, endRange),
    getPlannerHistoryAction(30),
  ]);

  const tasks = tasksRes.success ? tasksRes.data : [];
  const timeblocks = blocksRes.success ? blocksRes.data : [];
  const history = historyRes.data;

  return (
    <div className="space-y-6">
      <PlannerShell
        initialTasks={tasks}
        initialTimeblocks={timeblocks}
        initialHistory={history}
        subjects={subjects}
      />
    </div>
  );
}
