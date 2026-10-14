import { getSemesters } from "@/lib/supabase/repository";
import { SemesterCard } from "@/components/academic/semester-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SemestersPage() {
  const semesters = await getSemesters();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Semesters" }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e6e3da] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Academic Semesters
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Browse curriculum modules and revision materials grouped by academic semester.
          </p>
        </div>

        <Link href="/admin/semesters">
          <Button size="sm" variant="outline" className="text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Semesters</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {semesters.map((semester) => (
          <SemesterCard key={semester.id} semester={semester} />
        ))}
      </div>
    </div>
  );
}
