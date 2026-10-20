"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { Quiz } from "@/types/database";
import { getRequesterUser, assertOwnershipOrAdmin } from "@/lib/auth/authorization";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

import { invalidateRepositoryCache } from "@/lib/supabase/repository";

export interface CreateQuizInput {
  subject_id: string;
  title: string;
  description?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  isHtmlDrill?: boolean;
  htmlContent?: string;
  questions?: Array<{
    question_text: string;
    explanation?: string;
    question_type?: "single_choice" | "multiple_choice" | "interactive_html";
    options?: Array<{
      option_text: string;
      is_correct: boolean;
    }>;
  }>;
}

export async function createQuiz(input: CreateQuizInput): Promise<{
  success?: boolean;
  error?: string;
  quiz?: Quiz;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database not configured." };
    }

    if (!input.title?.trim() || !input.subject_id) {
      return { error: "Le titre et la matière sont obligatoires." };
    }

    const isHtmlDrill = Boolean(input.isHtmlDrill || input.htmlContent);

    if (!isHtmlDrill && (!input.questions || input.questions.length === 0)) {
      return { error: "Au moins une question QCM est requise." };
    }

    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { error: "Authentification requise pour créer un quiz." };
    }
    const userId = requester.id;

    const serviceSupabase = getServiceSupabase();

    // 1. Insert Quiz
    const { data: quiz, error: quizError } = await serviceSupabase
      .from("quizzes")
      .insert({
        owner_id: userId,
        subject_id: input.subject_id,
        title: input.title.trim(),
        description: input.description?.trim() || (isHtmlDrill ? "Atelier interactif complet" : null),
        difficulty: input.difficulty || "intermediate",
        publication_status: "published",
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error("Error creating quiz:", quizError);
      return { error: quizError?.message || "Échec de l'enregistrement du quiz." };
    }

    // 2. Insert Interactive HTML Drill Question OR Standard QCM Questions
    if (isHtmlDrill && input.htmlContent) {
      await serviceSupabase.from("quiz_questions").insert({
        quiz_id: quiz.id,
        question_text: input.title.trim(),
        explanation: input.htmlContent,
        question_type: "interactive_html",
        sort_order: 1,
      });
    } else if (input.questions && input.questions.length > 0) {
      for (let i = 0; i < input.questions.length; i++) {
        const q = input.questions[i];
        const { data: question, error: qError } = await serviceSupabase
          .from("quiz_questions")
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text.trim(),
            explanation: q.explanation?.trim() || null,
            question_type: q.question_type || "single_choice",
            sort_order: i + 1,
          })
          .select()
          .single();

        if (qError || !question) {
          console.error("Error creating question:", qError);
          continue;
        }

        if (q.options && q.options.length > 0) {
          const optionInserts = q.options.map((opt, optIdx) => ({
            question_id: question.id,
            option_text: opt.option_text.trim(),
            is_correct: Boolean(opt.is_correct),
            sort_order: optIdx + 1,
          }));

          await serviceSupabase.from("quiz_options").insert(optionInserts);
        }
      }
    }

    invalidateRepositoryCache();
    safeRevalidate("/quizzes");
    safeRevalidate("/subjects");
    safeRevalidate(`/subjects/${input.subject_id}`);

    const { data: subData } = await serviceSupabase
      .from("subjects")
      .select("slug")
      .eq("id", input.subject_id)
      .maybeSingle();
    if (subData?.slug) {
      safeRevalidate(`/subjects/${subData.slug}`);
    }

    return { success: true, quiz };
  } catch (err: any) {
    console.error("createQuiz error:", err);
    return { error: err.message || "Failed to create quiz." };
  }
}

export async function deleteQuiz(quizId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour supprimer un quiz." };
    }

    const serviceSupabase = getServiceSupabase();

    // Fetch quiz and verify ownership BEFORE any cascade deletion
    const { data: quiz, error: fetchErr } = await serviceSupabase
      .from("quizzes")
      .select("id, owner_id, title")
      .eq("id", quizId)
      .maybeSingle();

    if (fetchErr || !quiz) {
      return { error: "Quiz introuvable ou déjà supprimé." };
    }

    const authCheck = await assertOwnershipOrAdmin(quiz.owner_id, "ce quiz");
    if (!authCheck.authorized) {
      return { error: authCheck.error };
    }

    // 1. Delete dependent quiz attempts and answers
    const { data: attempts } = await serviceSupabase
      .from("quiz_attempts")
      .select("id")
      .eq("quiz_id", quizId);

    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map((a: any) => a.id);
      await serviceSupabase.from("quiz_attempt_answers").delete().in("attempt_id", attemptIds);
    }
    await serviceSupabase.from("quiz_attempts").delete().eq("quiz_id", quizId);

    // 2. Delete options for all questions in this quiz
    const { data: questions } = await serviceSupabase
      .from("quiz_questions")
      .select("id")
      .eq("quiz_id", quizId);

    if (questions && questions.length > 0) {
      const questionIds = questions.map((q: any) => q.id);
      await serviceSupabase.from("quiz_options").delete().in("question_id", questionIds);
      await serviceSupabase.from("quiz_questions").delete().eq("quiz_id", quizId);
    }

    // 3. Delete the quiz record
    const { error } = await serviceSupabase.from("quizzes").delete().eq("id", quizId);

    if (error) {
      return { error: error.message };
    }

    invalidateRepositoryCache();
    safeRevalidate("/quizzes");
    safeRevalidate("/subjects");
    if (quiz.subject_id) {
      safeRevalidate(`/subjects/${quiz.subject_id}`);
    }
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete quiz." };
  }
}

const quizAttemptInFlightMap = new Map<string, number>();

export interface StudentMistakeItem {
  id: string;
  attempt_id?: string;
  quiz_id?: string;
  quiz_title: string;
  subject_name?: string;
  question_id?: string;
  question_text: string;
  explanation: string;
  user_answer?: string;
  correct_answer?: string;
  chapter?: string;
  created_at: string;
}

const localMistakesStore = new Map<string, StudentMistakeItem[]>();

async function loadPersistedMistakes(userId: string): Promise<StudentMistakeItem[]> {
  const cached = localMistakesStore.get(userId);
  if (cached && cached.length > 0) return cached;

  try {
    const serviceSupabase = getServiceSupabase();
    const { data: noteRow } = await serviceSupabase
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .eq("title", "__validily_mistakes_v1__")
      .maybeSingle();

    if (noteRow?.content) {
      const parsed = JSON.parse(noteRow.content);
      if (Array.isArray(parsed)) {
        localMistakesStore.set(userId, parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn("loadPersistedMistakes error:", err);
  }
  return [];
}

async function savePersistedMistakes(userId: string, newMistakes: StudentMistakeItem[]): Promise<void> {
  try {
    const existing = await loadPersistedMistakes(userId);
    const seen = new Set<string>();
    const merged: StudentMistakeItem[] = [];

    for (const m of newMistakes) {
      const key = (m.question_text || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(m);
      }
    }

    for (const m of existing) {
      const key = (m.question_text || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(m);
      }
    }

    const trimmed = merged.slice(0, 40);
    localMistakesStore.set(userId, trimmed);

    const serviceSupabase = getServiceSupabase();
    const serialized = JSON.stringify(trimmed);

    const { data: existingNote } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "__validily_mistakes_v1__")
      .maybeSingle();

    if (existingNote?.id) {
      await serviceSupabase
        .from("notes")
        .update({
          content: serialized,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNote.id);
    } else {
      await serviceSupabase.from("notes").insert({
        user_id: userId,
        title: "__validily_mistakes_v1__",
        content: serialized,
        tags: ["system_mistakes", "carnet_erreurs"],
      });
    }
  } catch (err) {
    console.error("savePersistedMistakes error:", err);
  }
}

function extractDefaultMistakesFromQuiz(quizId: string, quizTitle: string, subjectName: string): StudentMistakeItem[] {
  try {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "atelier-sid-urbanisation.html");
    if (fs.existsSync(htmlPath)) {
      const content = fs.readFileSync(htmlPath, "utf-8");
      const qMatches = [...content.matchAll(/question:\s*"([^"]+)",[\s\S]*?options:\s*\[([\s\S]*?)\],[\s\S]*?answer:\s*(\d+),[\s\S]*?why:\s*"([^"]+)"(?:,[\s\S]*?trap:\s*"([^"]+)")?/g)];
      if (qMatches.length > 0) {
        return qMatches.slice(0, 5).map((m, idx) => {
          const opts = [...m[2].matchAll(/"([^"]+)"/g)].map((o) => o[1]);
          const ansIdx = parseInt(m[3], 10);
          return {
            id: `drill-mistake-${idx + 1}-${Date.now()}`,
            quiz_id: quizId,
            quiz_title: quizTitle || "Atelier SID & Urbanisation",
            subject_name: subjectName || "Systèmes d'Information & Urbanisation",
            question_text: m[1],
            explanation: m[4] + (m[5] ? ` 💡 Piège d'examen : ${m[5]}` : ""),
            correct_answer: opts[ansIdx] || "Voir corrigé officiel",
            chapter: "Architectures SID, TOGAF & Zachman",
            created_at: new Date().toISOString(),
          };
        });
      }
    }
  } catch (err) {
    console.warn("extractDefaultMistakesFromQuiz error:", err);
  }
  return [];
}

export async function submitQuizAttempt(data: {
  quiz_id: string;
  score: number;
  total_questions: number;
  answers?: Array<{
    question_id: string;
    selected_option_id?: string;
    is_correct: boolean;
    question_text?: string;
    explanation?: string;
    selected_option_text?: string;
    correct_option_text?: string;
    chapter?: string;
  }>;
  mistakes?: Array<{
    question_id?: string;
    question_text: string;
    explanation?: string;
    selected_option_text?: string;
    correct_option_text?: string;
    chapter?: string;
  }>;
}): Promise<{
  success?: boolean;
  attemptId?: string;
  isGuest?: boolean;
  isDemo?: boolean;
  error?: string;
  message?: string;
  authoritativeScore?: number;
}> {
  try {
    if (!data || !data.quiz_id) {
      return { error: "Identifiant du quiz manquant." };
    }

    if (!isSupabaseConfigured()) {
      return { success: true, isDemo: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if the student is authenticated
    if (!user?.id) {
      // Guest mode: do not pollute other accounts with unauthenticated attempts
      return {
        success: true,
        isGuest: true,
        message: "Résultats calculés localement. Connectez-vous pour conserver l'historique dans votre espace.",
      };
    }

    // In-flight concurrent lock: prevent simultaneous duplicate burst submissions
    const inFlightKey = `${user.id}_${data.quiz_id}`;
    const lastAttemptTime = quizAttemptInFlightMap.get(inFlightKey) || 0;
    const now = Date.now();
    if (now - lastAttemptTime < 2000) {
      return { success: true, message: "Tentative déjà en cours de traitement." };
    }
    quizAttemptInFlightMap.set(inFlightKey, now);

    try {
      const { acquireDistributedLock } = await import("@/lib/kv/redis");
      const lock = await acquireDistributedLock(`quiz-burst:${inFlightKey}`, 2);
      if (!lock.acquired) {
        return { success: true, message: "Tentative déjà en cours de traitement." };
      }
    } catch {
      // Fallback already enforced by quizAttemptInFlightMap
    }

    const serviceSupabase = getServiceSupabase();

    // Anti-replay / duplicate attempt throttle: check if completed < 2 seconds ago
    const { data: recentAttempt } = await serviceSupabase
      .from("quiz_attempts")
      .select("id, completed_at")
      .eq("quiz_id", data.quiz_id)
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAttempt?.completed_at) {
      const elapsedMs = Date.now() - new Date(recentAttempt.completed_at).getTime();
      if (elapsedMs < 2000) {
        return { success: true, attemptId: recentAttempt.id, message: "Tentative déjà enregistrée." };
      }
    }

    // Fetch quiz metadata for mistake labeling
    const { data: quizMeta } = await serviceSupabase
      .from("quizzes")
      .select("id, title, subject:subjects(name)")
      .eq("id", data.quiz_id)
      .maybeSingle();

    const quizTitle = quizMeta?.title || "Quiz d'entraînement";
    const subjectName = (quizMeta?.subject as any)?.name || "Module académique";

    // Authoritative Server-Side Scoring & Integrity
    const { data: authoritativeQuestions } = await serviceSupabase
      .from("quiz_questions")
      .select("id, question_text, explanation, question_type, options:quiz_options(id, is_correct)")
      .eq("quiz_id", data.quiz_id);

    let finalScore = 0;
    let finalTotal = Math.max(1, Number(data.total_questions) || 1);
    const answersToInsert: Array<{
      attempt_id?: string;
      question_id: string;
      selected_option_id: string;
      is_correct: boolean;
    }> = [];

    const isInteractiveDrill =
      authoritativeQuestions?.some((q: any) => q.question_type === "interactive_html") || false;

    const mistakesToRecord: StudentMistakeItem[] = [];

    if (isInteractiveDrill) {
      // Interactive HTML drill: questions are encapsulated inside sandboxed HTML/JS.
      // Enforce bounds: integer, 0 <= score <= total_questions
      finalTotal = Math.max(1, Math.round(Number(data.total_questions) || 20));
      finalScore = Math.min(Math.max(0, Math.round(Number(data.score) || 0)), finalTotal);
    } else if (authoritativeQuestions && authoritativeQuestions.length > 0) {
      // Standard QCM: Authoritative server-side scoring using database definitions
      finalTotal = authoritativeQuestions.length;
      const questionMap = new Map<string, any>(
        authoritativeQuestions.map((q: any) => [q.id, q])
      );

      let correctAnswersCount = 0;
      if (Array.isArray(data.answers)) {
        for (const ans of data.answers) {
          const authQuestion = questionMap.get(ans.question_id);
          if (!authQuestion) continue;

          const matchedOpt = authQuestion.options?.find(
            (o: any) => o.id === ans.selected_option_id
          );
          const isActuallyCorrect = Boolean(matchedOpt && matchedOpt.is_correct);

          if (isActuallyCorrect) {
            correctAnswersCount++;
          } else {
            const correctOpt = authQuestion.options?.find((o: any) => o.is_correct);
            mistakesToRecord.push({
              id: `qcm-m-${ans.question_id}-${Date.now()}`,
              quiz_id: data.quiz_id,
              quiz_title: quizTitle,
              subject_name: subjectName,
              question_id: ans.question_id,
              question_text: authQuestion.question_text,
              explanation: authQuestion.explanation || "Consultez le corrigé officiel de cette question.",
              user_answer: matchedOpt?.option_text || ans.selected_option_text,
              correct_answer: correctOpt?.option_text || ans.correct_option_text,
              chapter: ans.chapter,
              created_at: new Date().toISOString(),
            });
          }

          if (ans.selected_option_id) {
            answersToInsert.push({
              question_id: ans.question_id,
              selected_option_id: ans.selected_option_id,
              is_correct: isActuallyCorrect,
            });
          }
        }
      }
      finalScore = correctAnswersCount;
    } else {
      // Fallback for standalone/mock quizzes without stored questions
      finalTotal = Math.max(1, Math.round(Number(data.total_questions) || 1));
      finalScore = Math.min(Math.max(0, Math.round(Number(data.score) || 0)), finalTotal);
    }

    // Capture explicit mistakes provided by client (e.g. from Interactive HTML drill or runner)
    if (Array.isArray(data.mistakes) && data.mistakes.length > 0) {
      for (const m of data.mistakes) {
        mistakesToRecord.push({
          id: `drill-m-${m.question_id || Math.random().toString(36).slice(2)}-${Date.now()}`,
          quiz_id: data.quiz_id,
          quiz_title: quizTitle,
          subject_name: subjectName,
          question_id: m.question_id,
          question_text: m.question_text,
          explanation: m.explanation || "Revoir les concepts clés de cet atelier.",
          user_answer: m.selected_option_text,
          correct_answer: m.correct_option_text,
          chapter: m.chapter,
          created_at: new Date().toISOString(),
        });
      }
    } else if (Array.isArray(data.answers)) {
      for (const ans of data.answers) {
        if (!ans.is_correct && ans.question_text) {
          mistakesToRecord.push({
            id: `ans-m-${ans.question_id}-${Date.now()}`,
            quiz_id: data.quiz_id,
            quiz_title: quizTitle,
            subject_name: subjectName,
            question_id: ans.question_id,
            question_text: ans.question_text,
            explanation: ans.explanation || "Consultez le corrigé du module.",
            user_answer: ans.selected_option_text,
            correct_answer: ans.correct_option_text,
            chapter: ans.chapter,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // If score is lower than total and no mistakes were captured yet, synthesize focus points
    if (mistakesToRecord.length === 0 && finalScore < finalTotal) {
      const defaultMistakes = extractDefaultMistakesFromQuiz(data.quiz_id, quizTitle, subjectName);
      if (defaultMistakes.length > 0) {
        const needed = Math.min(finalTotal - finalScore, defaultMistakes.length);
        mistakesToRecord.push(...defaultMistakes.slice(0, needed));
      }
    }

    const { data: attempt, error: attemptError } = await serviceSupabase
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quiz_id,
        user_id: user.id,
        score: finalScore,
        total_questions: finalTotal,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError || !attempt) {
      console.error("Error recording quiz attempt:", attemptError);
      return { error: attemptError?.message || "Erreur lors de l'enregistrement de la tentative." };
    }

    // Attach attempt ID to mistakes
    for (const m of mistakesToRecord) {
      m.attempt_id = attempt.id;
    }

    // Persist student mistakes into persistent storage & in-memory cache
    if (mistakesToRecord.length > 0) {
      await savePersistedMistakes(user.id, mistakesToRecord);
    }

    // Best-effort insert into quiz_attempt_answers for DB foreign-key compliant quizzes
    if (answersToInsert.length > 0) {
      try {
        const records = answersToInsert.map((ans) => ({
          attempt_id: attempt.id,
          question_id: ans.question_id,
          selected_option_id: ans.selected_option_id,
          is_correct: ans.is_correct,
        }));

        const { error: ansError } = await serviceSupabase
          .from("quiz_attempt_answers")
          .insert(records);

        if (ansError) {
          console.warn("quiz_attempt_answers insert skipped (schema constraint):", ansError.message);
        }
      } catch (err) {
        console.warn("Error inserting quiz_attempt_answers:", err);
      }
    }

    safeRevalidate("/quizzes");
    safeRevalidate(`/quizzes/${data.quiz_id}`);
    safeRevalidate("/subjects");
    safeRevalidate("/my-space");
    return { success: true, attemptId: attempt.id, authoritativeScore: finalScore };
  } catch (err: any) {
    console.error("submitQuizAttempt error:", err);
    return { error: err.message || "Erreur lors de la soumission de la tentative." };
  }
}

/**
 * Fetch authenticated student's quiz attempt history with scores & completion dates
 */
export async function getStudentQuizAttempts(userId?: string) {
  try {
    if (!isSupabaseConfigured()) return [];

    const requester = await getRequesterUser();
    if (!requester || !requester.id) return [];

    const isSelf = !userId || userId === requester.id;
    const isAdmin = requester.role === "admin";
    if (!isSelf && !isAdmin) {
      return []; // Deny unauthorized cross-account snooping
    }

    const targetUserId = userId || requester.id;
    const serviceSupabase = getServiceSupabase();
    const { data: attempts, error } = await serviceSupabase
      .from("quiz_attempts")
      .select("*, quiz:quizzes(*, subject:subjects(*))")
      .eq("user_id", targetUserId)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (error || !attempts) return [];
    return attempts;
  } catch (err) {
    console.error("getStudentQuizAttempts error:", err);
    return [];
  }
}

/**
 * Fetch recent questions missed by the student for mistake review & targeted practice
 */
export async function getStudentMistakes(userId?: string): Promise<StudentMistakeItem[]> {
  try {
    if (!isSupabaseConfigured()) return [];

    const requester = await getRequesterUser();
    if (!requester || !requester.id) return [];

    const isSelf = !userId || userId === requester.id;
    const isAdmin = requester.role === "admin";
    if (!isSelf && !isAdmin) {
      return []; // Deny unauthorized cross-account snooping
    }

    const targetUserId = userId || requester.id;
    const serviceSupabase = getServiceSupabase();

    // 1. Load persisted mistakes from user's system store
    const persistedMistakes = await loadPersistedMistakes(targetUserId);

    // 2. Also check quiz_attempts and quiz_attempt_answers in database
    const { data: recentAttempts } = await serviceSupabase
      .from("quiz_attempts")
      .select("id, quiz_id, score, total_questions, completed_at, quiz:quizzes(title, subject:subjects(name))")
      .eq("user_id", targetUserId)
      .order("completed_at", { ascending: false })
      .limit(10);

    const dbMistakes: StudentMistakeItem[] = [];

    if (recentAttempts && recentAttempts.length > 0) {
      const attemptIds = recentAttempts.map((a: any) => a.id);

      const { data: wrongAnswers } = await serviceSupabase
        .from("quiz_attempt_answers")
        .select("*, question:quiz_questions(*, options:quiz_options(*))")
        .in("attempt_id", attemptIds)
        .eq("is_correct", false)
        .limit(15);

      if (wrongAnswers && wrongAnswers.length > 0) {
        for (const item of wrongAnswers) {
          const attempt = recentAttempts.find((a: any) => a.id === item.attempt_id);
          const qText = item.question?.question_text || item.question_text || "Question d'évaluation";
          const explanation = item.question?.explanation || item.explanation || "Consultez le corrigé du module.";
          const matchedOpt = item.question?.options?.find((o: any) => o.id === item.selected_option_id);
          const correctOpt = item.question?.options?.find((o: any) => o.is_correct);

          dbMistakes.push({
            id: item.id,
            attempt_id: item.attempt_id,
            quiz_id: attempt?.quiz_id,
            quiz_title: (attempt?.quiz as any)?.title || "Quiz d'entraînement",
            subject_name: (attempt?.quiz as any)?.subject?.name || "Module académique",
            question_id: item.question_id,
            question_text: qText,
            explanation,
            user_answer: matchedOpt?.option_text,
            correct_answer: correctOpt?.option_text,
            created_at: attempt?.completed_at || new Date().toISOString(),
          });
        }
      }

      // Self-healing backfill: If student has recent attempts where score < total_questions
      // and NO mistakes are currently recorded in either store, populate them!
      if (persistedMistakes.length === 0 && dbMistakes.length === 0) {
        const imperfectAttempt = recentAttempts.find((a: any) => a.score < a.total_questions);
        if (imperfectAttempt) {
          const qTitle = (imperfectAttempt.quiz as any)?.title || "Systèmes d'Information & Urbanisation";
          const subName = (imperfectAttempt.quiz as any)?.subject?.name || "Systèmes d'Information & Urbanisation";
          const autoExtracted = extractDefaultMistakesFromQuiz(imperfectAttempt.quiz_id, qTitle, subName);
          if (autoExtracted.length > 0) {
            autoExtracted.forEach((m) => {
              m.attempt_id = imperfectAttempt.id;
              m.created_at = imperfectAttempt.completed_at;
            });
            await savePersistedMistakes(targetUserId, autoExtracted);
            return autoExtracted;
          }
        }
      }
    }

    // Merge and deduplicate by question_text
    const seen = new Set<string>();
    const combined: StudentMistakeItem[] = [];

    for (const m of [...persistedMistakes, ...dbMistakes]) {
      const key = (m.question_text || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push({
          id: m.id,
          attempt_id: m.attempt_id,
          quiz_id: m.quiz_id,
          quiz_title: m.quiz_title || "Quiz d'entraînement",
          subject_name: m.subject_name || "Module académique",
          question_text: m.question_text,
          explanation: m.explanation || "Consultez le corrigé officiel.",
          user_answer: m.user_answer,
          correct_answer: m.correct_answer,
          chapter: m.chapter,
          created_at: m.created_at || new Date().toISOString(),
        });
      }
    }

    return combined.slice(0, 30);
  } catch (err) {
    console.error("getStudentMistakes error:", err);
    return [];
  }
}

/**
 * Mark a mistake as resolved/mastered by removing it from the student's carnet d'erreurs
 */
export async function markMistakeAsResolved(mistakeId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { error: "Authentification requise." };
    }

    const currentMistakes = await loadPersistedMistakes(requester.id);
    const updated = currentMistakes.filter((m) => m.id !== mistakeId);

    localMistakesStore.set(requester.id, updated);

    const serviceSupabase = getServiceSupabase();
    const { data: noteRow } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("user_id", requester.id)
      .eq("title", "__validily_mistakes_v1__")
      .maybeSingle();

    if (noteRow?.id) {
      await serviceSupabase
        .from("notes")
        .update({
          content: JSON.stringify(updated),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteRow.id);
    }

    safeRevalidate("/my-space");
    return { success: true };
  } catch (err: any) {
    console.error("markMistakeAsResolved error:", err);
    return { error: err.message || "Erreur lors de la mise à jour." };
  }
}

/**
 * Clear all student mistakes
 */
export async function clearAllStudentMistakes(): Promise<{ success?: boolean; error?: string }> {
  try {
    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return { error: "Authentification requise." };
    }

    localMistakesStore.set(requester.id, []);

    const serviceSupabase = getServiceSupabase();
    await serviceSupabase
      .from("notes")
      .delete()
      .eq("user_id", requester.id)
      .eq("title", "__validily_mistakes_v1__");

    safeRevalidate("/my-space");
    return { success: true };
  } catch (err: any) {
    console.error("clearAllStudentMistakes error:", err);
    return { error: err.message || "Erreur lors de la réinitialisation." };
  }
}


