import {
  getSemesters,
  getSubjects,
  getCategories,
  getResources,
} from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Layers,
  BookOpen,
  Calendar,
  FileCheck,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const semesters = await getSemesters();
  const subjects = await getSubjects();
  const categories = await getCategories();
  const resources = await getResources();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Admin Console" }]} />

      {/* Header */}
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
                Curriculum structure management, subject cataloging, and submission moderation.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Owner Privileges Active</span>
            </span>
          </div>
        </div>

        {/* Real Summary Metrics */}
        <div className="mt-6 pt-5 border-t border-[#f0ede6] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Semesters</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {semesters.length}
            </div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Subjects Cataloged</div>
            <div className="text-lg font-bold text-[#3730a3] mt-1 font-mono">
              {subjects.length}
            </div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Resource Categories</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {categories.length}
            </div>
          </div>
          <div className="bg-[#fbfbfa] border border-[#e6e3da] p-3 rounded-lg">
            <div className="text-xs text-stone-500 font-medium">Published Documents</div>
            <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
              {resources.length}
            </div>
          </div>
        </div>
      </div>

      {/* Semesters & Subjects Management Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semesters */}
        <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#3730a3]" />
              <span>Academic Semesters</span>
            </h2>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Plus className="w-3 h-3" />
              <span>Add Semester</span>
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
                <div className="flex items-center space-x-2">
                  <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[11px] font-mono">
                    {s.subject_count} subjects
                  </span>
                  <button className="text-stone-400 hover:text-stone-700">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Categories */}
        <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#3730a3]" />
              <span>Controlled Resource Categories</span>
            </h2>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Plus className="w-3 h-3" />
              <span>Add Category</span>
            </Button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                <div className="flex items-center space-x-2">
                  <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[11px] font-mono">
                    {c.resource_count ?? 0} docs
                  </span>
                  <button className="text-stone-400 hover:text-stone-700">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ten Initial Subjects Verification Table */}
      <div className="bg-white border border-[#e6e3da] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#3730a3]" />
              <span>Curriculum Subject Registry (10 Initial Semester 1 Modules)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Administrators can add, edit, reorder, archive, and restore subjects without touching code.
            </p>
          </div>
          <Button size="sm" variant="primary" className="text-xs">
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
                <th className="py-2 px-3 font-semibold">Resources</th>
                <th className="py-2 px-3 font-semibold">Status</th>
                <th className="py-2 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede6]">
              {subjects.map((sub) => (
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
                    Semester 1
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#3730a3]">
                    {sub.resource_count ?? 0}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
                      Active
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button className="text-stone-500 hover:text-stone-900 mr-2 font-medium">
                      Edit
                    </button>
                    <button className="text-stone-400 hover:text-rose-600">
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
