"use client";

import React, { useState } from "react";
import {
  FileEdit,
  Plus,
  Search,
  Trash2,
  Calendar,
  X,
  Check,
  Tag,
  BookOpen,
  Code,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Note, Subject } from "@/types/database";
import { createNote, updateNote, deleteNote } from "@/lib/actions/note-actions";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface NotesManagerProps {
  initialNotes: Note[];
  subjects: Subject[];
  initialCreateOpen?: boolean;
  defaultSubjectId?: string;
  isAuthenticated?: boolean;
}

export function NotesManager({
  initialNotes,
  subjects,
  initialCreateOpen = false,
  defaultSubjectId,
  isAuthenticated = true,
}: NotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [search, setSearch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(initialCreateOpen);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || "");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const openCreateModal = () => {
    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent("/notes?action=new")}`;
      return;
    }
    setEditingNote(null);
    setSubjectId(defaultSubjectId || subjects[0]?.id || "");
    setTitle("");
    setContent("");
    setTags([]);
    setActiveTab("write");
    setIsEditorOpen(true);
  };

  const openEditModal = (note: Note) => {
    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent("/notes")}`;
      return;
    }
    setEditingNote(note);
    setSubjectId(note.subject_id || "");
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setActiveTab("write");
    setIsEditorOpen(true);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          title,
          content,
          tags,
        });
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingNote.id
              ? {
                  ...n,
                  title,
                  content,
                  tags,
                  subject_id: subjectId,
                  subject: subjects.find((s) => s.id === subjectId),
                }
              : n
          )
        );
      } else {
        const res = await createNote({
          subject_id: subjectId,
          title,
          content,
          tags,
        });
        const createdNote: Note = {
          id: res.note?.id || `note-${Date.now()}`,
          user_id: "current-user",
          semester_id: null,
          subject_id: subjectId,
          title,
          content,
          tags,
          visibility: "private",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subject: subjects.find((s) => s.id === subjectId),
        };
        setNotes([createdNote, ...notes]);
      }
      setIsEditorOpen(false);
    } catch (err) {
      console.error("Save note error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };



  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesSubject = !selectedSubject || n.subject_id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cheat sheets by keyword or #tag..."
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] transition-all"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-1.5 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] shrink-0 cursor-pointer"
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <Button size="md" variant="primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>New Cheat Sheet</span>
        </Button>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <div className="flex items-center space-x-2">
                <FileEdit className="w-5 h-5 text-[#2855D9]" />
                <h3 className="font-semibold text-sm text-[#182235]">
                  {editingNote ? "Edit Cheat Sheet" : "Create New Cheat Sheet"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#182235] mb-1">
                    Subject Module *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#182235] mb-1">
                    Note Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BLoC Architecture Summary"
                    required
                    className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  />
                </div>
              </div>

              {/* Write vs Preview Tabs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#182235]">
                    Content (Markdown Supported) *
                  </label>
                  <div className="flex items-center space-x-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab("write")}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        activeTab === "write"
                          ? "bg-[#2855D9] text-white font-medium"
                          : "text-[#68748A] hover:text-[#182235]"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        activeTab === "preview"
                          ? "bg-[#2855D9] text-white font-medium"
                          : "text-[#68748A] hover:text-[#182235]"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {activeTab === "write" ? (
                  <textarea
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="## Key Concepts&#10;- Point 1: ...&#10;- Formula: `E = mc^2`&#10;&#10;```python&#10;# Example&#10;```"
                    required
                    className="w-full font-mono bg-[#F4F6FA] border border-[#E4E8F0] rounded-md p-3 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  />
                ) : (
                  <div className="bg-[#FAFAF7] border border-[#E4E8F0] rounded-md p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap min-h-[175px] max-h-64 overflow-y-auto text-[#182235]">
                    {content || <span className="text-[#68748A] italic">No content to preview</span>}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  Tags (Press Enter or Comma to add)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#F4F6FA] border border-[#E4E8F0] rounded-md min-h-[38px] items-center">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-white text-[#182235] border border-[#E4E8F0] text-xs px-2 py-0.5 rounded flex items-center space-x-1"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[#68748A] hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "e.g. flutter, bloc, exam..." : ""}
                    className="bg-transparent text-xs text-[#182235] focus:outline-none flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E4E8F0]">
                <span className="text-[11px] text-stone-400">
                  Private to your account.
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditorOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Cheat Sheet"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 rounded-lg p-5 transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#2855D9] bg-[#EDF2FF] border border-[#2855D9]/20 px-2 py-0.5 rounded">
                    {note.subject?.name || "General"}
                  </span>
                  <div className="flex items-center space-x-2 text-[#68748A] text-xs">
                    <span className="text-[11px] font-mono flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(note.created_at)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      className="hover:text-[#182235] p-1 cursor-pointer"
                      title="Edit note"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteToDelete(note)}
                      className="hover:text-rose-600 p-1 cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-[#182235] mb-2 leading-snug">
                  {note.title}
                </h3>

                <div className="text-xs text-[#182235] bg-[#FAFAF7] border border-[#E4E8F0] rounded p-3 font-mono leading-relaxed whitespace-pre-wrap mb-4 max-h-36 overflow-y-auto">
                  {note.content}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono text-[#68748A] bg-[#F4F6FA] px-1.5 py-0.5 rounded border border-[#E4E8F0]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-[#68748A] capitalize">
                  {note.visibility}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-12 text-center">
          <FileEdit className="w-10 h-10 text-[#68748A]/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#182235]">
            No cheat sheets found
          </h3>
          <p className="text-xs text-[#68748A] mt-1 max-w-sm mx-auto">
            {search || selectedSubject
              ? "No revision notes match your active filter."
              : "Create high-yield formula sheets and revision summaries for your courses."}
          </p>
          <div className="mt-4">
            <Button size="sm" variant="primary" onClick={openCreateModal}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create First Cheat Sheet</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Confirmation suppression fiche mémo */}
      {noteToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title="Supprimer la fiche mémo"
          itemName={noteToDelete.title}
          itemType="note"
          onClose={() => setNoteToDelete(null)}
          onConfirm={async () => {
            const res = await deleteNote(noteToDelete.id);
            if (res.error) {
              throw new Error(res.error);
            }
            setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
            setNoteToDelete(null);
          }}
        />
      )}
    </div>
  );
}
