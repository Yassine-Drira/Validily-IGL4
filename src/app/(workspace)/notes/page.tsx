import { getNotes, getSubjects } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotesManager } from "@/components/notes/notes-manager";

export const dynamic = "force-dynamic";

interface NotesPageProps {
  searchParams: Promise<{
    action?: string;
    subjectId?: string;
  }>;
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const { action, subjectId } = await searchParams;
  const notes = await getNotes();
  const subjects = await getSubjects("sem-1");

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Cheat Sheets & Notes" }]} />

      <div className="border-b border-[#E4E8F0] pb-5">
        <h1 className="text-2xl font-serif font-bold text-[#182235] tracking-tight">
          Revision Cheat Sheets & Notes
        </h1>
        <p className="text-xs text-[#68748A] mt-1">
          Concise formula sheets, exam tips, and revision summaries authored for your academic modules.
        </p>
      </div>

      <NotesManager
        initialNotes={notes}
        subjects={subjects}
        initialCreateOpen={action === "new"}
        defaultSubjectId={subjectId}
      />
    </div>
  );
}
