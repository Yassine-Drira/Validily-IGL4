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

interface NotesManagerProps {
  initialNotes: Note[];
  subjects: Subject[];
  initialCreateOpen?: boolean;
  defaultSubjectId?: string;
}

export function NotesManager({
  initialNotes,
  subjects,
  initialCreateOpen = false,
  defaultSubjectId,
}: NotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
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
    setEditingNote(null);
    setSubjectId(defaultSubjectId || subjects[0]?.id || "");
    setTitle("");
    setContent("");
    setTags([]);
    setActiveTab("write");
    setIsEditorOpen(true);
  };

  const openEditModal = (note: Note) => {
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

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this cheat sheet?")) return;
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error("Delete note error:", err);
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
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cheat sheets by keyword or #tag..."
              className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md pl-9 pr-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-1.5 text-xs text-stone-700 focus:outline-none shrink-0"
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
          <div className="bg-white border border-[#e6e3da] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileEdit className="w-5 h-5 text-[#3730a3]" />
                <h3 className="font-semibold text-sm text-stone-900">
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
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Subject Module *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Note Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BLoC Architecture Summary"
                    required
                    className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              {/* Write vs Preview Tabs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    Content (Markdown Supported) *
                  </label>
                  <div className="flex items-center space-x-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab("write")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        activeTab === "write"
                          ? "bg-stone-200 text-stone-900 font-medium"
                          : "text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        activeTab === "preview"
                          ? "bg-stone-200 text-stone-900 font-medium"
                          : "text-stone-500 hover:text-stone-900"
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
                    className="w-full font-mono bg-[#f4f3ed] border border-[#dedad0] rounded-md p-3 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                ) : (
                  <div className="bg-[#fbfbfa] border border-[#dedad0] rounded-md p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap min-h-[175px] max-h-64 overflow-y-auto text-stone-800">
                    {content || <span className="text-stone-400 italic">No content to preview</span>}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Tags (Press Enter or Comma to add)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#f4f3ed] border border-[#dedad0] rounded-md min-h-[38px] items-center">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-white text-stone-700 border border-stone-300 text-xs px-2 py-0.5 rounded flex items-center space-x-1"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-stone-400 hover:text-rose-600"
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
                    placeholder={tags.length === 0 ? "e.g. flutter, bloc..." : ""}
                    className="bg-transparent text-xs text-stone-900 focus:outline-none flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
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
              className="bg-white border border-[#e6e3da] hover:border-stone-400 rounded-lg p-5 transition-colors shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#3730a3] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {note.subject?.name || "General"}
                  </span>
                  <div className="flex items-center space-x-2 text-stone-400 text-xs">
                    <span className="text-[11px] font-mono flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(note.created_at)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      className="hover:text-stone-700 p-1"
                      title="Edit note"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="hover:text-rose-600 p-1"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
      ) : (
        <div className="bg-white border border-[#e6e3da] rounded-xl p-12 text-center">
          <FileEdit className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-900">
            No cheat sheets found
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
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
    </div>
  );
}
