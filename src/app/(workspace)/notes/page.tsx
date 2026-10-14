import { getNotes, getSubjects } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { FileEdit, Plus, Tag, Calendar, BookOpen } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

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

  const isCreating = action === "new";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Cheat Sheets & Notes" }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e6e3da] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Revision Cheat Sheets & Notes
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Concise formula sheets, exam tips, and revision summaries authored for your modules.
          </p>
        </div>

        <a href="?action=new">
          <Button size="md" variant="primary">
            <Plus className="w-4 h-4" />
            <span>Create New Cheat Sheet</span>
          </Button>
        </a>
      </div>

      {/* Note Creation Form Drawer */}
      {isCreating && (
        <div className="bg-white border-2 border-[#3730a3]/20 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileEdit className="w-5 h-5 text-[#3730a3]" />
              <h2 className="font-semibold text-sm text-stone-900">
                New Revision Cheat Sheet
              </h2>
            </div>
            <a href="/notes" className="text-xs text-stone-400 hover:text-stone-700">
              Close
            </a>
          </div>

          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Subject Module *
                </label>
                <select
                  defaultValue={subjectId || ""}
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} (Semester 1)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Simplex Tableau Pivot Steps"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Content (Markdown supported: headings, code blocks, lists) *
              </label>
              <textarea
                rows={6}
                placeholder="## Key Concepts&#10;- Point 1: ...&#10;- Formula: `E = mc^2`&#10;&#10;```python&#10;# Code example&#10;```"
                required
                className="w-full font-mono bg-[#f4f3ed] border border-[#dedad0] rounded-md p-3 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-400">
                Notes are private to your account by default.
              </span>
              <div className="flex items-center space-x-2">
                <a href="/notes">
                  <Button type="button" size="sm" variant="ghost">Cancel</Button>
                </a>
                <Button type="button" size="sm" variant="primary">
                  Save Note
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-white border border-[#e6e3da] hover:border-stone-400 rounded-lg p-5 transition-colors shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#3730a3] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {note.subject?.name || "General"}
                </span>
                <span className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <span>{formatDate(note.created_at)}</span>
                </span>
              </div>

              <h3 className="font-semibold text-sm text-stone-900 mb-2">
                {note.title}
              </h3>

              <div className="text-xs text-stone-600 bg-[#fbfbfa] border border-[#dedad0] rounded p-3 font-mono leading-relaxed whitespace-pre-wrap mb-4 max-h-36 overflow-y-auto">
                {note.content}
              </div>
            </div>

            <div className="pt-3 border-t border-[#f0ede6] flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <span className="text-[11px] font-mono text-stone-400 capitalize">
                {note.visibility}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
