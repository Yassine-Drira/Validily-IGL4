"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function createSubject(data: {
  semester_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}) {
  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  const { data: subject, error } = await supabase
    .from("subjects")
    .insert({
      semester_id: data.semester_id,
      name: data.name.trim(),
      slug: data.slug.trim().toLowerCase(),
      description: data.description?.trim() || null,
      icon: data.icon || "Folder",
      sort_order: data.sort_order || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/subjects");
  revalidatePath("/");
  return { success: true, subject };
}

export async function createSemester(data: {
  name: string;
  academic_year: string;
  sort_order?: number;
}) {
  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("semesters").insert({
    name: data.name.trim(),
    academic_year: data.academic_year.trim(),
    sort_order: data.sort_order || 0,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/semesters");
  revalidatePath("/");
  return { success: true };
}

export async function archiveSubject(subjectId: string) {
  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ is_active: false })
    .eq("id", subjectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/subjects");
  revalidatePath("/");
  return { success: true };
}
