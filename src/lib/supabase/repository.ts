import { createClient, isSupabaseConfigured } from "./server";
import { getServiceSupabase } from "./admin";
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

async function getDbClient(): Promise<any> {
  try {
    return getServiceSupabase();
  } catch {
    return createClient();
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory cache for ultra-fast navigation transitions (< 10ms)
const repoMemoryCache = new Map<string, { data: any; expiry: number }>();

function getFromCache<T>(key: string): T | null {
  const item = repoMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    repoMemoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setToCache<T>(key: string, data: T, ttlMs: number = 30000): void {
  repoMemoryCache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateRepositoryCache(): void {
  repoMemoryCache.clear();
}

export async function getSemesters(): Promise<Semester[]> {
  const cached = getFromCache<Semester[]>("semesters_all");
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    const { data, error } = await supabase
      .from("semesters")
      .select("*, subjects:subjects(count)")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.error("Database query error [getSemesters]:", error);
      return [];
    }

    const result = data.map((item: any) => ({
      ...item,
      subject_count: item.subjects?.[0]?.count ?? 0,
    }));
    setToCache("semesters_all", result, 30000);
    return result;
  } catch (err) {
    console.error("Failed to query semesters from database:", err);
    return [];
  }
}

export async function getSemesterById(idOrSlug: string): Promise<Semester | null> {
  const cacheKey = `semester_${idOrSlug}`;
  const cached = getFromCache<Semester>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    let query = supabase.from("semesters").select("*, subjects:subjects(count)");

    if (UUID_REGEX.test(idOrSlug)) {
      query = query.eq("id", idOrSlug);
    } else if (idOrSlug === "sem-1" || idOrSlug.includes("1")) {
      query = query.or("id.eq.11111111-1111-1111-1111-111111111111,sort_order.eq.1,name.ilike.%1%");
    } else if (idOrSlug === "sem-2" || idOrSlug.includes("2")) {
      query = query.or("id.eq.22222222-2222-2222-2222-222222222222,sort_order.eq.2,name.ilike.%2%");
    } else {
      query = query.ilike("name", `%${idOrSlug}%`);
    }

    const { data, error } = await query.order("sort_order", { ascending: true }).limit(1).maybeSingle();
    if (error || !data) {
      return null;
    }

    const result = {
      ...data,
      subject_count: data.subjects?.[0]?.count ?? 0,
    };
    setToCache(cacheKey, result, 30000);
    return result;
  } catch {
    return null;
  }
}

export async function getSubjects(semesterId?: string): Promise<Subject[]> {
  const cacheKey = `subjects_${semesterId || "all"}`;
  const cached = getFromCache<Subject[]>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    let query = supabase
      .from("subjects")
      .select("*, semester:semesters(*), resources:resources(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (semesterId) {
      if (UUID_REGEX.test(semesterId)) {
        query = query.eq("semester_id", semesterId);
      } else if (semesterId === "sem-1" || semesterId.includes("1")) {
        const s1 = await getSemesterById("sem-1");
        const s1Id = s1?.id || "11111111-1111-1111-1111-111111111111";
        query = query.eq("semester_id", s1Id);
      } else if (semesterId === "sem-2" || semesterId.includes("2")) {
        const s2 = await getSemesterById("sem-2");
        const s2Id = s2?.id || "22222222-2222-2222-2222-222222222222";
        query = query.eq("semester_id", s2Id);
      }
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error("Database query error [getSubjects]:", error);
      return [];
    }

    const result = data.map((item: any) => ({
      ...item,
      resource_count: item.resources?.[0]?.count ?? 0,
    }));
    setToCache(cacheKey, result, 20000);
    return result;
  } catch (err) {
    console.error("Failed to query subjects from database:", err);
    return [];
  }
}

export async function getSubjectBySlugOrId(idOrSlug: string): Promise<Subject | null> {
  const cacheKey = `subject_single_${idOrSlug}`;
  const cached = getFromCache<Subject>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    let query = supabase
      .from("subjects")
      .select("*, semester:semesters(*), resources:resources(count)");

    if (UUID_REGEX.test(idOrSlug)) {
      query = query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
    } else {
      query = query.eq("slug", idOrSlug);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    const result = {
      ...data,
      resource_count: data.resources?.[0]?.count ?? 0,
    };
    setToCache(cacheKey, result, 20000);
    return result;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<ResourceCategory[]> {
  const cached = getFromCache<ResourceCategory[]>("categories_all");
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    const { data, error } = await supabase
      .from("resource_categories")
      .select("*, resources:resources(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.error("Database query error [getCategories]:", error);
      return [];
    }

    const result = data.map((item: any) => ({
      ...item,
      resource_count: item.resources?.[0]?.count ?? 0,
    }));
    setToCache("categories_all", result, 30000);
    return result;
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
    const supabase = await getDbClient();
    let query = supabase
      .from("resources")
      .select("*, subject:subjects(*), category:resource_categories(*)")
      .eq("publication_status", "published")
      .order("created_at", { ascending: false });

    if (options?.subjectId) {
      if (UUID_REGEX.test(options.subjectId)) {
        query = query.eq("subject_id", options.subjectId);
      } else {
        const subjects = await getSubjects();
        const matched = subjects.find(
          (s) => s.id === options.subjectId || s.slug === options.subjectId
        );
        if (matched) {
          query = query.eq("subject_id", matched.id);
        } else {
          query = query.eq("subject_id", options.subjectId);
        }
      }
    }

    if (options?.categoryId) {
      if (UUID_REGEX.test(options.categoryId)) {
        query = query.eq("category_id", options.categoryId);
      } else {
        const categories = await getCategories();
        const cleanTarget = options.categoryId.replace("cat-", "").toLowerCase();
        const matched = categories.find(
          (c) =>
            c.id === options.categoryId ||
            c.slug === options.categoryId ||
            c.slug.includes(cleanTarget) ||
            cleanTarget.includes(c.slug)
        );
        if (matched) {
          query = query.eq("category_id", matched.id);
        } else {
          query = query.eq("category_id", options.categoryId);
        }
      }
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
    const supabase = await getDbClient();
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
    const supabase = await getDbClient();
    let query = supabase
      .from("notes")
      .select("*, subject:subjects(*)")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.eq("visibility", "public");
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.filter((n: any) => !n.tags?.includes("system_folder_registry"));
  } catch (err) {
    console.error("Failed to query notes from database:", err);
    return [];
  }
}

export async function getSubjectFolders(subjectId: string): Promise<import("@/types/database").SubjectFolder[]> {
  try {
    const supabase = await getDbClient();
    const { data, error } = await supabase
      .from("notes")
      .select("id, content")
      .eq("subject_id", subjectId)
      .contains("tags", ["system_folder_registry"])
      .maybeSingle();

    if (error || !data || !data.content) {
      return [];
    }

    try {
      const parsed = JSON.parse(data.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

export async function getQuizzes(subjectId?: string): Promise<Quiz[]> {
  try {
    const supabase = await getDbClient();
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

    return data.map((item: any) => ({
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
    const supabase = await getDbClient();
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

    const htmlQuestion = questions.find((qu: any) => qu.question_type === "interactive_html");
    const isHtmlDrill = Boolean(htmlQuestion);

    return {
      quiz: {
        ...quiz,
        isHtmlDrill,
        htmlContent: htmlQuestion ? (htmlQuestion.explanation || htmlQuestion.question_text) : undefined,
      },
      questions,
    };
  } catch (err) {
    console.error("Failed to query quiz with questions:", err);
    return null;
  }
}

export async function getSubjectQuizzesWithQuestions(subjectId: string) {
  try {
    const supabase = await getDbClient();
    const { data: quizzes, error } = await supabase
      .from("quizzes")
      .select("*, questions:quiz_questions(*, options:quiz_options(*))")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error || !quizzes) {
      return [];
    }

    return quizzes.map((q: any) => {
      const htmlQuestion = q.questions?.find((qu: any) => qu.question_type === "interactive_html");
      const isHtml = Boolean(htmlQuestion);
      return {
        ...q,
        isHtmlDrill: isHtml,
        htmlContent: htmlQuestion ? (htmlQuestion.explanation || htmlQuestion.question_text) : undefined,
        question_count: isHtml ? "Atelier" : (q.questions?.length ?? 0),
      };
    });
  } catch (err) {
    console.error("Failed to query subject quizzes:", err);
    return [];
  }
}

export async function getBookmarks(userId?: string): Promise<Bookmark[]> {
  try {
    const supabase = await getDbClient();
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
    const supabase = await getDbClient();
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
