"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { Subject, Semester } from "@/types/database";
import { invalidateRepositoryCache } from "@/lib/supabase/repository";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
    invalidateRepositoryCache();
  } catch {
    // Outside active Next.js request context
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSemesterId(idOrCode: string, serviceSupabase?: any): Promise<string> {
  if (UUID_REGEX.test(idOrCode)) {
    return idOrCode;
  }
  if (serviceSupabase) {
    const isSem1 = idOrCode === "sem-1" || idOrCode.includes("1");
    const isSem2 = idOrCode === "sem-2" || idOrCode.includes("2");
    if (isSem1 || isSem2) {
      const order = isSem1 ? 1 : 2;
      const { data: sem } = await serviceSupabase
        .from("semesters")
        .select("id")
        .eq("sort_order", order)
        .maybeSingle();
      if (sem?.id) return sem.id;
    }
  }
  if (idOrCode === "sem-1" || idOrCode.includes("1")) {
    return "11111111-1111-1111-1111-111111111111";
  }
  if (idOrCode === "sem-2" || idOrCode.includes("2")) {
    return "22222222-2222-2222-2222-222222222222";
  }
  return idOrCode;
}

export async function createSubject(data: {
  semester_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}): Promise<{ success?: boolean; error?: string; subject?: Subject }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database is not configured." };
    }

    if (!data.name?.trim()) {
      return { error: "Subject name is required." };
    }

    const cleanName = data.name.trim();
    let cleanSlug = (data.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      cleanSlug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const serviceSupabase = getServiceSupabase();
    const resolvedSemId = await resolveSemesterId(data.semester_id, serviceSupabase);

    // Check duplicate slug
    const { data: existing } = await serviceSupabase
      .from("subjects")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existing) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: subject, error } = await serviceSupabase
      .from("subjects")
      .insert({
        semester_id: resolvedSemId,
        name: cleanName,
        slug: cleanSlug,
        description: data.description?.trim() || null,
        icon: data.icon || "Folder",
        sort_order: data.sort_order || 0,
        is_active: true,
      })
      .select("*, semester:semesters(*)")
      .single();

    if (error) {
      console.error("Database insert error [createSubject]:", error);
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/subjects");
    safeRevalidate("/semesters");
    safeRevalidate(`/semesters/${resolvedSemId}`);
    safeRevalidate("/");
    return { success: true, subject };
  } catch (err: any) {
    console.error("Error creating subject:", err);
    return { error: err.message || "Failed to create subject in database." };
  }
}

export async function updateSubject(
  subjectId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    semester_id?: string;
  }
): Promise<{ success?: boolean; error?: string; subject?: Subject }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database is not configured." };
    }

    const serviceSupabase = getServiceSupabase();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
    if (data.icon !== undefined) updatePayload.icon = data.icon;
    if (data.semester_id !== undefined) updatePayload.semester_id = resolveSemesterId(data.semester_id);

    const { data: subject, error } = await serviceSupabase
      .from("subjects")
      .update(updatePayload)
      .eq("id", subjectId)
      .select("*, semester:semesters(*)")
      .single();

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/subjects");
    safeRevalidate(`/subjects/${subject.slug}`);
    safeRevalidate("/");
    return { success: true, subject };
  } catch (err: any) {
    return { error: err.message || "Failed to update subject." };
  }
}

export async function deleteSubject(subjectId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database is not configured." };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase
      .from("subjects")
      .delete()
      .eq("id", subjectId);

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/subjects");
    safeRevalidate("/semesters");
    safeRevalidate("/");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete subject." };
  }
}

export async function createSemester(data: {
  name: string;
  academic_year: string;
  sort_order?: number;
}): Promise<{ success?: boolean; error?: string; semester?: Semester }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database is not configured." };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: sem, error } = await serviceSupabase
      .from("semesters")
      .insert({
        name: data.name.trim(),
        academic_year: data.academic_year.trim(),
        sort_order: data.sort_order || 0,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/semesters");
    safeRevalidate("/");
    return { success: true, semester: sem };
  } catch (err: any) {
    return { error: err.message || "Failed to create semester." };
  }
}
