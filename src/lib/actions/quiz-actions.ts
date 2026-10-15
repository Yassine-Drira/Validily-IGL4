"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase, getEffectiveUserId } from "@/lib/supabase/admin";
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
    let userId = requester?.id;
    if (!userId) {
      userId = await getEffectiveUserId();
    }
    if (!userId) {
      return { error: "Authentification requise pour créer un quiz." };
    }

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

export async function submitQuizAttempt(data: {
  quiz_id: string;
  score: number;
  total_questions: number;
  answers: Array<{
    question_id: string;
    selected_option_id: string;
    is_correct: boolean;
  }>;
}): Promise<{
  success?: boolean;
  attemptId?: string;
  isGuest?: boolean;
  isDemo?: boolean;
  error?: string;
  message?: string;
}> {
  try {
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

    const serviceSupabase = getServiceSupabase();

    const { data: attempt, error: attemptError } = await serviceSupabase
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quiz_id,
        user_id: user.id,
        score: data.score,
        total_questions: data.total_questions,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError || !attempt) {
      console.error("Error recording quiz attempt:", attemptError);
      return { error: attemptError?.message || "Erreur lors de l'enregistrement de la tentative." };
    }

    if (data.answers && data.answers.length > 0) {
      const answersToInsert = data.answers.map((ans) => ({
        attempt_id: attempt.id,
        question_id: ans.question_id,
        selected_option_id: ans.selected_option_id,
        is_correct: ans.is_correct,
      }));

      const { error: ansError } = await serviceSupabase
        .from("quiz_attempt_answers")
        .insert(answersToInsert);

      if (ansError) {
        console.error("Error recording attempt answers:", ansError);
      }
    }

    safeRevalidate("/quizzes");
    safeRevalidate(`/quizzes/${data.quiz_id}`);
    safeRevalidate("/subjects");
    return { success: true, attemptId: attempt.id };
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

    let targetUserId = userId;
    if (!targetUserId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return [];

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
export async function getStudentMistakes(userId?: string) {
  try {
    if (!isSupabaseConfigured()) return [];

    let targetUserId = userId;
    if (!targetUserId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return [];

    const serviceSupabase = getServiceSupabase();
    // 1. Get user's recent attempts
    const { data: recentAttempts } = await serviceSupabase
      .from("quiz_attempts")
      .select("id, quiz_id, completed_at, quiz:quizzes(title, subject:subjects(name))")
      .eq("user_id", targetUserId)
      .order("completed_at", { ascending: false })
      .limit(10);

    if (!recentAttempts || recentAttempts.length === 0) return [];
    const attemptIds = recentAttempts.map((a: any) => a.id);

    // 2. Query incorrect answers
    const { data: wrongAnswers, error } = await serviceSupabase
      .from("quiz_attempt_answers")
      .select("*, question:quiz_questions(*, options:quiz_options(*))")
      .in("attempt_id", attemptIds)
      .eq("is_correct", false)
      .limit(15);

    if (error || !wrongAnswers) return [];

    return wrongAnswers.map((item: any) => ({
      ...item,
      attempt: recentAttempts.find((a: any) => a.id === item.attempt_id),
    }));
  } catch (err) {
    console.error("getStudentMistakes error:", err);
    return [];
  }
}

