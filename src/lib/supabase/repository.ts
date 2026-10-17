import type {
  Semester,
  Subject,
  ResourceCategory,
  AcademicResource,
  Note,
  Quiz,
  QuizQuestion,
  Bookmark,
  ResourceVoteSummary,
} from "@/types/database";

async function getDbClient(): Promise<any> {
  try {
    const adminMod = await import("./admin").catch(() => import("./admin.ts" as any));
    return adminMod.getServiceSupabase();
  } catch {
    try {
      const serverMod = await import("./server").catch(() => import("./server.ts" as any));
      return serverMod.createClient();
    } catch {
      return null;
    }
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

export function invalidateRepositoryCache(targetPattern?: string): void {
  if (targetPattern === "all") {
    repoMemoryCache.clear();
    return;
  }
  if (!targetPattern) {
    for (const key of repoMemoryCache.keys()) {
      if (key !== "semesters_all" && key !== "categories_all") {
        repoMemoryCache.delete(key);
      }
    }
    return;
  }
  for (const key of repoMemoryCache.keys()) {
    if (key.includes(targetPattern) || key.startsWith(targetPattern)) {
      repoMemoryCache.delete(key);
    }
  }
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
    setToCache("semesters_all", result, 300000);
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
    setToCache(cacheKey, result, 300000);
    return result;
  } catch {
    return null;
  }
}

export async function getSubjects(semesterId?: string, userId?: string): Promise<Subject[]> {
  const cacheKey = `subjects_${semesterId || "all"}_${userId || "anon"}`;
  const cached = getFromCache<Subject[]>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    let query = supabase
      .from("subjects")
      .select("*, semester:semesters(*)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (semesterId) {
      if (UUID_REGEX.test(semesterId)) {
        query = query.eq("semester_id", semesterId);
      } else if (semesterId === "sem-1" || semesterId.includes("1")) {
        query = query.eq("semester_id", "11111111-1111-1111-1111-111111111111");
      } else if (semesterId === "sem-2" || semesterId.includes("2")) {
        query = query.eq("semester_id", "22222222-2222-2222-2222-222222222222");
      }
    }

    // Query resource counts filtered strictly by requester visibility
    let resQuery = supabase.from("resources").select("subject_id");
    if (userId) {
      resQuery = resQuery.or(`visibility.eq.public,owner_id.eq.${userId}`);
    } else {
      resQuery = resQuery.eq("visibility", "public");
    }

    const [{ data, error }, { data: resData }] = await Promise.all([
      query,
      resQuery,
    ]);

    if (error || !data) {
      console.error("Database query error [getSubjects]:", error);
      return [];
    }

    const countMap = new Map<string, number>();
    (resData || []).forEach((r: any) => {
      if (r.subject_id) {
        countMap.set(r.subject_id, (countMap.get(r.subject_id) || 0) + 1);
      }
    });

    const result = data.map((item: any) => ({
      ...item,
      resource_count: countMap.get(item.id) ?? 0,
    }));
    setToCache(cacheKey, result, 180000);
    return result;
  } catch (err) {
    console.error("Failed to query subjects from database:", err);
    return [];
  }
}

export async function getSubjectBySlugOrId(idOrSlug: string, userId?: string): Promise<Subject | null> {
  const cacheKey = `subject_single_${idOrSlug}_${userId || "anon"}`;
  const cached = getFromCache<Subject>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    let query = supabase
      .from("subjects")
      .select("*, semester:semesters(*)");

    if (UUID_REGEX.test(idOrSlug)) {
      query = query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
    } else {
      query = query.eq("slug", idOrSlug);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    // Count visible resources for this specific subject
    let resCountQuery = supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", data.id);

    if (userId) {
      resCountQuery = resCountQuery.or(`visibility.eq.public,owner_id.eq.${userId}`);
    } else {
      resCountQuery = resCountQuery.eq("visibility", "public");
    }

    const { count: resCount } = await resCountQuery;

    const result = {
      ...data,
      resource_count: resCount ?? 0,
    };
    setToCache(cacheKey, result, 180000);
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
    setToCache("categories_all", result, 300000);
    return result;
  } catch (err) {
    console.error("Failed to query categories from database:", err);
    return [];
  }
}

export async function getResourceVotes(
  resourceIds: string[],
  userId?: string
): Promise<Record<string, ResourceVoteSummary>> {
  const result: Record<string, ResourceVoteSummary> = {};
  if (!resourceIds || resourceIds.length === 0) return result;

  resourceIds.forEach((id) => {
    result[id] = { score: 0, upvotes: 0, downvotes: 0, userVote: 0 };
  });

  try {
    const supabase = await getDbClient();
    if (supabase) {
      const { data: votes, error } = await supabase
        .from("resource_votes")
        .select("resource_id, user_id, vote_value")
        .in("resource_id", resourceIds);

      if (!error && votes && votes.length > 0) {
        votes.forEach((v: { resource_id: string; user_id: string; vote_value: number }) => {
          const entry = result[v.resource_id];
          if (!entry) return;
          if (v.vote_value === 1) entry.upvotes++;
          else if (v.vote_value === -1) entry.downvotes++;

          if (userId && v.user_id === userId) {
            entry.userVote = v.vote_value as any;
          }
        });

        Object.values(result).forEach((summary) => {
          summary.score = summary.upvotes - summary.downvotes;
        });

        return result;
      }
    }

    // Fallback if table doesn't exist yet or offline: disk cache, notes, global memory
    let fallbackVotes: any[] = [];

    // 1. Try disk cache first
    try {
      const fs = await import("fs");
      const path = await import("path");
      const diskPath = path.join(process.cwd(), ".validily-cache", "resource_votes.json");
      if (fs.existsSync(diskPath)) {
        const raw = fs.readFileSync(diskPath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fallbackVotes = parsed;
        }
      }
    } catch {}

    // 2. Check global memory store
    if (fallbackVotes.length === 0) {
      const globalVotes = (globalThis as any).__localVotesStore;
      if (globalVotes && globalVotes instanceof Map) {
        fallbackVotes = Array.from(globalVotes.values());
      }
    }

    if (fallbackVotes.length > 0) {
      fallbackVotes.forEach((v: any) => {
        const entry = result[v.resource_id];
        if (!entry) return;
        if (v.vote_value === 1) entry.upvotes++;
        else if (v.vote_value === -1) entry.downvotes++;

        if (userId && v.user_id === userId) {
          entry.userVote = v.vote_value;
        }
      });
      Object.values(result).forEach((summary) => {
        summary.score = summary.upvotes - summary.downvotes;
      });
    }
  } catch {}

  return result;
}

export function inferResourceType(r: any): "document" | "quiz" | "url" | "link" {
  if (
    r.resource_type === "quiz" ||
    r.mime_type?.includes("quiz") ||
    r.mime_type === "text/html" ||
    (Array.isArray(r.tags) && r.tags.includes("quiz"))
  ) {
    return "quiz";
  }
  if (
    r.resource_type === "link" ||
    r.resource_type === "url" ||
    r.mime_type?.includes("url") ||
    r.mime_type === "application/vnd.google-apps" ||
    (typeof r.storage_path === "string" && (r.storage_path.startsWith("http://") || r.storage_path.startsWith("https://"))) ||
    (Array.isArray(r.tags) && (r.tags.includes("external_link") || r.tags.includes("gdrive"))) ||
    Boolean(r.external_url)
  ) {
    return "url";
  }
  return "document";
}

export async function getResources(options?: {
  subjectId?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
  userId?: string;
  includeAll?: boolean;
  sort?: "useful" | "recent" | "voted";
  resourceType?: string;
  folderId?: string;
}): Promise<AcademicResource[]> {
  const cacheKey = `resources_${options?.subjectId || ""}_${options?.categoryId || ""}_${options?.search || ""}_${options?.limit || ""}_${options?.userId || "anon"}_${options?.includeAll || ""}_${options?.sort || "recent"}_${options?.resourceType || "all"}_${options?.folderId || ""}`;
  const cached = getFromCache<AcademicResource[]>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    let query = supabase
      .from("resources")
      .select("*, subject:subjects(*), category:resource_categories(*)")
      .eq("publication_status", "published");

    // Sorting at DB query level: always created_at DESC for schema resilience
    query = query.order("created_at", { ascending: false });

    // Strict visibility and privacy isolation
    if (options?.includeAll) {
      // Administrative or explicitly unfiltered context
    } else if (options?.userId) {
      // Authenticated user: public resources OR owned by this user
      query = query.or(`visibility.eq.public,owner_id.eq.${options.userId}`);
    } else {
      // Anonymous / public context (e.g. homepage, public library): strictly public resources only
      query = query.eq("visibility", "public");
    }

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

    if (options?.folderId) {
      query = query.eq("chapter", options.folderId);
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

    // Attach inferred resource_type
    let enrichedData = data.map((r: any) => ({
      ...r,
      resource_type: inferResourceType(r),
    }));

    // In-memory format filter
    if (options?.resourceType && options.resourceType !== "all") {
      const targetType = options.resourceType === "link" ? "url" : options.resourceType;
      enrichedData = enrichedData.filter((r: any) => {
        if (targetType === "url") {
          return r.resource_type === "url" || r.resource_type === "link";
        }
        return r.resource_type === targetType;
      });
    }

    // Batch enrich vote summaries without N+1 requests
    const ids = enrichedData.map((r: any) => r.id);
    if (ids.length > 0) {
      try {
        const voteSummaries = await getResourceVotes(ids, options?.userId);
        enrichedData.forEach((r: any) => {
          if (voteSummaries[r.id]) {
            r.vote_summary = voteSummaries[r.id];
            r.usefulness_score = voteSummaries[r.id].score;
            r.upvotes_count = voteSummaries[r.id].upvotes;
            r.downvotes_count = voteSummaries[r.id].downvotes;
          }
        });
      } catch {}

      // Batch enrich revision status and bookmark state per user
      if (options?.userId) {
        try {
          const { data: revData } = await supabase
            .from("revision_progress")
            .select("resource_id, status")
            .eq("user_id", options.userId)
            .in("resource_id", ids);

          const revMap = new Map<string, string>();
          if (Array.isArray(revData)) {
            revData.forEach((row: any) => {
              if (row.resource_id) revMap.set(row.resource_id, row.status);
            });
          }

          const { data: bkmData } = await supabase
            .from("bookmarks")
            .select("resource_id")
            .eq("user_id", options.userId)
            .in("resource_id", ids);

          const bkmSet = new Set<string>();
          if (Array.isArray(bkmData)) {
            bkmData.forEach((b: any) => {
              if (b.resource_id) bkmSet.add(b.resource_id);
            });
          }

          enrichedData.forEach((r: any) => {
            r.revision_status = (revMap.get(r.id) as any) || "not_started";
            r.is_bookmarked = bkmSet.has(r.id);
          });
        } catch {
          enrichedData.forEach((r: any) => {
            if (!r.revision_status) r.revision_status = "not_started";
            if (r.is_bookmarked === undefined) r.is_bookmarked = false;
          });
        }
      } else {
        enrichedData.forEach((r: any) => {
          if (!r.revision_status) r.revision_status = "not_started";
          if (r.is_bookmarked === undefined) r.is_bookmarked = false;
        });
      }
    }

    // In-memory sort by usefulness or votes or recency
    if (options?.sort === "useful") {
      enrichedData.sort((a: any, b: any) => {
        const scoreA = a.vote_summary?.score ?? a.usefulness_score ?? 0;
        const scoreB = b.vote_summary?.score ?? b.usefulness_score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (options?.sort === "voted") {
      enrichedData.sort((a: any, b: any) => {
        const votesA = (a.vote_summary?.upvotes || 0) + (a.vote_summary?.downvotes || 0);
        const votesB = (b.vote_summary?.upvotes || 0) + (b.vote_summary?.downvotes || 0);
        if (votesB !== votesA) return votesB - votesA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      enrichedData.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    setToCache(cacheKey, enrichedData, 20000);
    return enrichedData;
  } catch (err) {
    console.error("Failed to query resources from database:", err);
    return [];
  }
}

export async function getResourceById(id: string, userId?: string): Promise<AcademicResource | null> {
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

    data.resource_type = inferResourceType(data);

    // Enrich single resource with vote summary
    try {
      const voteMap = await getResourceVotes([data.id], userId);
      if (voteMap[data.id]) {
        data.vote_summary = voteMap[data.id];
        data.usefulness_score = voteMap[data.id].score;
        data.upvotes_count = voteMap[data.id].upvotes;
        data.downvotes_count = voteMap[data.id].downvotes;
      }
    } catch {}

    // Enrich single resource with user revision status and bookmark state
    if (userId) {
      try {
        const { data: rev } = await supabase
          .from("revision_progress")
          .select("status")
          .eq("user_id", userId)
          .eq("resource_id", id)
          .maybeSingle();
        data.revision_status = (rev?.status as any) || "not_started";
      } catch {
        data.revision_status = "not_started";
      }

      try {
        const { data: bkm } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", userId)
          .eq("resource_id", id)
          .maybeSingle();
        data.is_bookmarked = Boolean(bkm?.id);
      } catch {
        data.is_bookmarked = false;
      }
    } else {
      data.revision_status = "not_started";
      data.is_bookmarked = false;
    }

    return data;
  } catch {
    return null;
  }
}

export async function getNotes(userId?: string, subjectId?: string): Promise<Note[]> {
  const cacheKey = `notes_${userId || "public"}_${subjectId || "all"}`;
  const cached = getFromCache<Note[]>(cacheKey);
  if (cached) return cached;

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

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    const filtered = data.filter((n: any) => {
      if (!n || !n.title) return false;
      if (n.title.startsWith("__")) return false;
      if (Array.isArray(n.tags) && n.tags.some((t: string) => t.startsWith("system_"))) return false;
      return true;
    });
    setToCache(cacheKey, filtered, 60000);
    return filtered;
  } catch (err) {
    console.error("Failed to query notes from database:", err);
    return [];
  }
}

export async function getSubjectFolders(subjectId: string): Promise<import("@/types/database").SubjectFolder[]> {
  const cacheKey = `folders_${subjectId}`;
  const cached = getFromCache<import("@/types/database").SubjectFolder[]>(cacheKey);
  if (cached) return cached;

  try {
    const fs = await import("fs");
    const path = await import("path");
    const cacheDir = path.join(process.cwd(), ".validily-cache");
    const file = path.join(cacheDir, `folders_${subjectId}.json`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setToCache(cacheKey, parsed, 20000);
        return parsed;
      }
    }

    // Auto-heal from canonical curriculum defaults
    let canonical: import("@/types/database").SubjectFolder[] = [];
    try {
      const mod = await import("../constants/curriculum-folders").catch(
        () => import("../constants/curriculum-folders.ts" as any)
      );
      canonical = mod.getDefaultSubjectFolders(subjectId);
    } catch {
      try {
        const mod = await import("@/lib/constants/curriculum-folders");
        canonical = mod.getDefaultSubjectFolders(subjectId);
      } catch {}
    }
    if (canonical.length > 0) {
      try {
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(file, JSON.stringify(canonical, null, 2), "utf8");
      } catch {}
      setToCache(cacheKey, canonical, 20000);
      return canonical;
    }

    return [];
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

export async function getQuizWithQuestions(quizId: string, requesterUserId?: string) {
  try {
    const supabase = await getDbClient();
    if (!supabase) return null;
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .select("*, subject:subjects(*)")
      .eq("id", quizId)
      .maybeSingle();

    if (quizErr || !quiz) {
      return null;
    }

    // Parent-level permission check: Draft quizzes can only be viewed by owner or admin
    if (quiz.publication_status === "draft") {
      const isOwner = requesterUserId && quiz.owner_id === requesterUserId;
      let isAdmin = false;
      if (requesterUserId) {
        try {
          const authMod = await import("@/lib/auth/authorization");
          isAdmin = await authMod.isUserAdmin(requesterUserId);
        } catch {
          isAdmin = false;
        }
      }
      if (!isOwner && !isAdmin) {
        return null;
      }
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

export async function getSubjectQuizzesWithQuestions(subjectId: string, requesterUserId?: string) {
  const cacheKey = `subject_quizzes_${subjectId}_${requesterUserId || "anon"}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = await getDbClient();
    if (!supabase) return [];
    let query = supabase
      .from("quizzes")
      .select("*, questions:quiz_questions(*, options:quiz_options(*))")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    // Strict parent-level protection: only show published quizzes, unless owned by requester
    if (requesterUserId) {
      query = query.or(`publication_status.eq.published,owner_id.eq.${requesterUserId}`);
    } else {
      query = query.eq("publication_status", "published");
    }

    const { data: quizzes, error } = await query;

    if (error || !quizzes) {
      return [];
    }

    const result = quizzes.map((q: any) => {
      const htmlQuestion = q.questions?.find((qu: any) => qu.question_type === "interactive_html");
      const isHtml = Boolean(htmlQuestion);
      return {
        ...q,
        isHtmlDrill: isHtml,
        htmlContent: htmlQuestion ? (htmlQuestion.explanation || htmlQuestion.question_text) : undefined,
        question_count: isHtml ? "Atelier" : (q.questions?.length ?? 0),
      };
    });
    setToCache(cacheKey, result, 20000);
    return result;
  } catch (err) {
    console.error("Failed to query subject quizzes:", err);
    return [];
  }
}

export async function getBookmarks(userId?: string): Promise<Bookmark[]> {
  if (!userId) {
    return [];
  }

  try {
    const supabase = await getDbClient();
    const query = supabase
      .from("bookmarks")
      .select("*, resource:resources(*, subject:subjects(*), category:resource_categories(*))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

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
  const cached = getFromCache<any>("dashboard_metrics");
  if (cached) return cached;

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

    const result = {
      totalSemesters: totalSemesters ?? 0,
      totalSubjects: totalSubjects ?? 0,
      totalResources: totalResources ?? 0,
      totalCategories: totalCategories ?? 0,
    };
    setToCache("dashboard_metrics", result, 180000);
    return result;
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
