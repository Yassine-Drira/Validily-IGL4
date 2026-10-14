"use client";

import React, { useState } from "react";
import {
  Shield,
  Layers,
  BookOpen,
  Calendar,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Semester, Subject, ResourceCategory } from "@/types/database";
import {
  createSubject,
  createSemester,
  archiveSubject,
} from "@/lib/actions/admin-actions";

interface AdminManagerProps {
  initialSemesters: Semester[];
  initialSubjects: Subject[];
  initialCategories: ResourceCategory[];
  totalResources: number;
}

export function AdminManager({
  initialSemesters,
  initialSubjects,
  initialCategories,
  totalResources,
}: AdminManagerProps) {
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [categories, setCategories] = useState<ResourceCategory[]>(initialCategories);

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subSemesterId, setSubSemesterId] = useState(semesters[0]?.id || "");
  const [subDescription, setSubDescription] = useState("");
  const [subIcon, setSubIcon] = useState("BookOpen");
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Semester Modal State
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [semName, setSemName] = useState("");
  const [semYear, setSemYear] = useState("2024-2025");
  const [isSubmittingSem, setIsSubmittingSem] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleSubNameChange = (name: string) => {
    setSubName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSubSlug(slug);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subSlug.trim()) return;

    setIsSubmittingSub(true);
    try {
      const res = await createSubject({
        semester_id: subSemesterId,
        name: subName,
        slug: subSlug,
        description: subDescription,
        icon: subIcon,
        sort_order: subjects.length + 1,
      });

      const newSubject: Subject = res.subject || {
        id: `sub-${Date.now()}`,
        semester_id: subSemesterId,
        name: subName,
        slug: subSlug,
        description: subDescription,
        icon: subIcon,
        sort_order: subjects.length + 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resource_count: 0,
      };

      setSubjects([...subjects, newSubject]);
      setIsSubjectModalOpen(false);
      setSubName("");
      setSubSlug("");
      setSubDescription("");
      setFeedbackMsg(`Subject "${subName}" created successfully!`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName.trim() || !semYear.trim()) return;

    setIsSubmittingSem(true);
    try {
      await createSemester({
        name: semName,
        academic_year: semYear,
        sort_order: semesters.length + 1,
      });

      const newSem: Semester = {
        id: `sem-${Date.now()}`,
        name: semName,
        academic_year: semYear,
        sort_order: semesters.length + 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subject_count: 0,
      };

      setSemesters([...semesters, newSem]);
      setIsSemesterModalOpen(false);
      setSemName("");
      setFeedbackMsg(`Semester "${semName}" added to curriculum!`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSem(false);
    }
  };

  const handleArchive = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Archive module "${subjectName}" from active listings?`)) return;
    try {
      await archiveSubject(subjectId);
      setSubjects(
        subjects.map((s) => (s.id === subjectId ? { ...s, is_active: false } : s))
      );
      setFeedbackMsg(`Subject "${subjectName}" archived.`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="bg-white border border-[#e6e3da] rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 text-[#3730a3] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">
                Academic Administration Console
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage semester terms, catalog course subjects, and configure categories.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSemesterModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Semester</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsSubjectModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create Subject</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#f0ede6] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Semesters</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {semesters.length}
            </div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Subjects Active</div>
            <div className="text-lg font-bold text-[#3730a3] mt-1 font-mono">
              {subjects.filter((s) => s.is_active).length}
            </div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Categories</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {categories.length}
            </div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Indexed Docs</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {totalResources}
            </div>
          </div>
        </div>
      </div>

      {/* Semesters & Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semesters */}
        <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#3730a3]" />
              <span>Academic Semesters ({semesters.length})</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setIsSemesterModalOpen(true)}
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </Button>
          </div>

          <div className="space-y-2">
            {semesters.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-md border border-[#e6e3da] bg-[#fbfbfa] text-xs"
              >
                <div>
                  <div className="font-semibold text-stone-900">{s.name}</div>
                  <div className="text-stone-400 font-mono text-[11px]">
                    AY {s.academic_year} • Order #{s.sort_order}
                  </div>
                </div>
                <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[11px] font-mono">
                  {subjects.filter((sub) => sub.semester_id === s.id).length} subjects
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#3730a3]" />
              <span>Controlled Categories ({categories.length})</span>
            </h2>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-[#e6e3da] bg-[#fbfbfa] text-xs"
              >
                <div>
                  <div className="font-semibold text-stone-900">{c.name}</div>
                  <div className="text-stone-400 font-mono text-[11px]">
                    slug: {c.slug}
                  </div>
                </div>
                <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[11px] font-mono">
                  Order #{c.sort_order}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects Catalog Table */}
      <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#3730a3]" />
              <span>Curriculum Subject Registry ({subjects.length} Modules)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Administrators can add, edit, and archive subjects without editing application code.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsSubjectModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Subject</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6e3da] text-stone-400 font-mono uppercase text-[10px]">
                <th className="py-2 px-3 font-semibold">Order</th>
                <th className="py-2 px-3 font-semibold">Subject Name</th>
                <th className="py-2 px-3 font-semibold">Slug</th>
                <th className="py-2 px-3 font-semibold">Semester</th>
                <th className="py-2 px-3 font-semibold">Status</th>
                <th className="py-2 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede6]">
              {subjects.map((sub) => {
                const parentSem = semesters.find((s) => s.id === sub.semester_id);
                return (
                  <tr key={sub.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-stone-400">
                      #{sub.sort_order}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-stone-900">
                      {sub.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-500">
                      {sub.slug}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-500">
                      {parentSem?.name || "Semester 1"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          sub.is_active
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-stone-100 text-stone-500 border border-stone-200"
                        }`}
                      >
                        {sub.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {sub.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleArchive(sub.id, sub.name)}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                        >
                          Archive
                        </button>
                      ) : (
                        <span className="text-stone-300 italic">Archived</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Subject */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e6e3da] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-semibold text-sm text-stone-900">
                Register New Subject Module
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Assign to Semester *
                </label>
                <select
                  value={subSemesterId}
                  onChange={(e) => setSubSemesterId(e.target.value)}
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Subject Title *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => handleSubNameChange(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  placeholder="distributed-systems"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  placeholder="Module scope, topics, and syllabus overview..."
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSubjectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isSubmittingSub}
                >
                  {isSubmittingSub ? "Creating..." : "Save Subject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Semester */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e6e3da] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-semibold text-sm text-stone-900">
                Add Academic Semester
              </h3>
              <button
                type="button"
                onClick={() => setIsSemesterModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Semester Name *
                </label>
                <input
                  type="text"
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="e.g. Semester 3 or Summer Session"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  value={semYear}
                  onChange={(e) => setSemYear(e.target.value)}
                  placeholder="2025-2026"
                  required
                  className="w-full bg-[#f4f3ed] border border-[#dedad0] rounded-md px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSemesterModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isSubmittingSem}
                >
                  {isSubmittingSem ? "Adding..." : "Add Semester"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
