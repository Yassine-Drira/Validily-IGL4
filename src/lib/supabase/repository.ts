import { createClient, isSupabaseConfigured } from "./server";
import {
  Semester,
  Subject,
  ResourceCategory,
  AcademicResource,
  Note,
  Quiz,
} from "@/types/database";
import {
  INITIAL_SEMESTERS,
  INITIAL_SUBJECTS,
  INITIAL_CATEGORIES,
  INITIAL_RESOURCES,
  INITIAL_NOTES,
  INITIAL_QUIZZES,
} from "../mock-data";

export async function getSemesters(): Promise<Semester[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_SEMESTERS;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("semesters")
      .select("*, subjects:subjects(count)")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_SEMESTERS;
    }

    return data.map((item) => ({
      ...item,
      subject_count: item.subjects?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Error fetching semesters, using fallback data:", err);
    return INITIAL_SEMESTERS;
  }
}

export async function getSemesterById(idOrSlug: string): Promise<Semester | null> {
  const all = await getSemesters();
  return (
    all.find(
      (s) =>
        s.id === idOrSlug ||
        s.name.toLowerCase().replace(/\s+/g, "-") === idOrSlug.toLowerCase()
    ) || null
  );
}

export async function getSubjects(semesterId?: string): Promise<Subject[]> {
  if (!isSupabaseConfigured()) {
    if (semesterId) {
      return INITIAL_SUBJECTS.filter((s) => s.semester_id === semesterId);
    }
    return INITIAL_SUBJECTS;
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("subjects")
      .select("*, semester:semesters(*), resources:resources(count)")
      .order("sort_order", { ascending: true });

    if (semesterId) {
      query = query.eq("semester_id", semesterId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (semesterId) {
        return INITIAL_SUBJECTS.filter((s) => s.semester_id === semesterId);
      }
      return INITIAL_SUBJECTS;
    }

    return data.map((item) => ({
      ...item,
      resource_count: item.resources?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Error fetching subjects, using fallback data:", err);
    if (semesterId) {
      return INITIAL_SUBJECTS.filter((s) => s.semester_id === semesterId);
    }
    return INITIAL_SUBJECTS;
  }
}

export async function getSubjectBySlugOrId(idOrSlug: string): Promise<Subject | null> {
  const subjects = await getSubjects();
  return subjects.find((s) => s.id === idOrSlug || s.slug === idOrSlug) || null;
}

export async function getCategories(): Promise<ResourceCategory[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_CATEGORIES;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_categories")
      .select("*, resources:resources(count)")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_CATEGORIES;
    }

    return data.map((item) => ({
      ...item,
      resource_count: item.resources?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Error fetching categories, using fallback data:", err);
    return INITIAL_CATEGORIES;
  }
}

export async function getResources(options?: {
  subjectId?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
}): Promise<AcademicResource[]> {
  if (!isSupabaseConfigured()) {
    let list = [...INITIAL_RESOURCES];
    if (options?.subjectId) {
      list = list.filter((r) => r.subject_id === options.subjectId);
    }
    if (options?.categoryId) {
      list = list.filter((r) => r.category_id === options.categoryId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    // enrich with subject and category
    return list.map((r) => ({
      ...r,
      subject: INITIAL_SUBJECTS.find((s) => s.id === r.subject_id),
      category: INITIAL_CATEGORIES.find((c) => c.id === r.category_id),
    }));
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("resources")
      .select("*, subject:subjects(*), category:resource_categories(*)")
      .order("created_at", { ascending: false });

    if (options?.subjectId) {
      query = query.eq("subject_id", options.subjectId);
    }
    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }
    if (options?.search) {
      query = query.ilike("title", `%${options.search}%`);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return INITIAL_RESOURCES.map((r) => ({
        ...r,
        subject: INITIAL_SUBJECTS.find((s) => s.id === r.subject_id),
        category: INITIAL_CATEGORIES.find((c) => c.id === r.category_id),
      }));
    }

    return data;
  } catch (err) {
    console.error("Error fetching resources, using fallback data:", err);
    return INITIAL_RESOURCES;
  }
}

export async function getResourceById(id: string): Promise<AcademicResource | null> {
  const resources = await getResources();
  return resources.find((r) => r.id === id) || null;
}

export async function getNotes(userId?: string): Promise<Note[]> {
  return INITIAL_NOTES.map((n) => ({
    ...n,
    subject: INITIAL_SUBJECTS.find((s) => s.id === n.subject_id),
  }));
}

export async function getQuizzes(subjectId?: string): Promise<Quiz[]> {
  let list = [...INITIAL_QUIZZES];
  if (subjectId) {
    list = list.filter((q) => q.subject_id === subjectId);
  }
  return list.map((q) => ({
    ...q,
    subject: INITIAL_SUBJECTS.find((s) => s.id === q.subject_id),
  }));
}
