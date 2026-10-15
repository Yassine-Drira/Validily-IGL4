import { createClient, isSupabaseConfigured } from "./server";
import {
  Semester,
  Subject,
  ResourceCategory,
  AcademicResource,
  Note,
  Quiz,
  QuizQuestion,
  Bookmark,
} from "@/types/database";

export async function getSemesters(): Promise<Semester[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("semesters")
      .select("*, subjects:subjects(count)")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.error("Database query error [getSemesters]:", error);
      return [];
    }

    return data.map((item) => ({
      ...item,
      subject_count: item.subjects?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Failed to query semesters from database:", err);
    return [];
  }
}

export async function getSemesterById(idOrSlug: string): Promise<Semester | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("semesters")
      .select("*, subjects:subjects(count)")
      .or(`id.eq.${idOrSlug},name.ilike.%${idOrSlug}%`)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      ...data,
      subject_count: data.subjects?.[0]?.count ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getSubjects(semesterId?: string): Promise<Subject[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("subjects")
      .select("*, semester:semesters(*), resources:resources(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (semesterId) {
      query = query.eq("semester_id", semesterId);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error("Database query error [getSubjects]:", error);
      return [];
    }

    return data.map((item) => ({
      ...item,
      resource_count: item.resources?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Failed to query subjects from database:", err);
    return [];
  }
}

export async function getSubjectBySlugOrId(idOrSlug: string): Promise<Subject | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subjects")
      .select("*, semester:semesters(*), resources:resources(count)")
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      ...data,
      resource_count: data.resources?.[0]?.count ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<ResourceCategory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_categories")
      .select("*, resources:resources(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.error("Database query error [getCategories]:", error);
      return [];
    }

    return data.map((item) => ({
      ...item,
      resource_count: item.resources?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Failed to query categories from database:", err);
    return [];
  }
}

export async function getResources(options?: {
  subjectId?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
}): Promise<AcademicResource[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("resources")
      .select("*, subject:subjects(*), category:resource_categories(*)")
      .eq("publication_status", "published")
      .order("created_at", { ascending: false });

    if (options?.subjectId) {
      query = query.eq("subject_id", options.subjectId);
    }
    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }
    if (options?.search) {
      query = query.or(
        `title.ilike.%${options.search}%,description.ilike.%${options.search}%`
      );
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error("Database query error [getResources]:", error);
      return [];
    }

    return data;
  } catch (err) {
    console.error("Failed to query resources from database:", err);
    return [];
  }
}

export async function getResourceById(id: string): Promise<AcademicResource | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resources")
      .select("*, subject:subjects(*), category:resource_categories(*)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function getNotes(userId?: string): Promise<Note[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("notes")
      .select("*, subject:subjects(*)")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data;
  } catch (err) {
    console.error("Failed to query notes from database:", err);
    return [];
  }
}

export async function getQuizzes(subjectId?: string): Promise<Quiz[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("quizzes")
      .select("*, subject:subjects(*), questions:quiz_questions(count)")
      .eq("publication_status", "published")
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((item) => ({
      ...item,
      question_count: item.questions?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("Failed to query quizzes from database:", err);
    return [];
  }
}

export async function getQuizWithQuestions(quizId: string) {
  try {
    const supabase = await createClient();
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .select("*, subject:subjects(*)")
      .eq("id", quizId)
      .maybeSingle();

    if (quizErr || !quiz) {
      return null;
    }

    const { data: questions, error: qErr } = await supabase
      .from("quiz_questions")
      .select("*, options:quiz_options(*)")
      .eq("quiz_id", quizId)
      .order("sort_order", { ascending: true });

    if (qErr || !questions) {
      return { quiz, questions: [] };
    }

    return { quiz, questions };
  } catch (err) {
    console.error("Failed to query quiz with questions:", err);
    return null;
  }
}

export async function getBookmarks(userId?: string): Promise<Bookmark[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("bookmarks")
      .select("*, resource:resources(*, subject:subjects(*), category:resource_categories(*))")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

export async function getDashboardMetrics() {
  try {
    const supabase = await createClient();
    const [
      { count: totalSemesters },
      { count: totalSubjects },
      { count: totalResources },
      { count: totalCategories },
    ] = await Promise.all([
      supabase.from("semesters").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("resources").select("*", { count: "exact", head: true }).eq("publication_status", "published"),
      supabase.from("resource_categories").select("*", { count: "exact", head: true }),
    ]);

    return {
      totalSemesters: totalSemesters ?? 0,
      totalSubjects: totalSubjects ?? 0,
      totalResources: totalResources ?? 0,
      totalCategories: totalCategories ?? 0,
    };
  } catch (err) {
    console.error("Failed to calculate dashboard metrics from database:", err);
    return {
      totalSemesters: 0,
      totalSubjects: 0,
      totalResources: 0,
      totalCategories: 0,
    };
  }
}
