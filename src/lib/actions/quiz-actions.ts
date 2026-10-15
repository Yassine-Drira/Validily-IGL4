"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase, getEffectiveUserId } from "@/lib/supabase/admin";
import { Quiz } from "@/types/database";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

export interface CreateQuizInput {
  subject_id: string;
  title: string;
  description?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  questions: Array<{
    question_text: string;
    explanation?: string;
    question_type?: "single_choice" | "multiple_choice";
    options: Array<{
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
      return { error: "Title and subject ID are required." };
    }

    if (!input.questions || input.questions.length === 0) {
      return { error: "At least one quiz question is required." };
    }

    const userId = await getEffectiveUserId();
    const serviceSupabase = getServiceSupabase();

    // 1. Insert Quiz
    const { data: quiz, error: quizError } = await serviceSupabase
      .from("quizzes")
      .insert({
        owner_id: userId,
        subject_id: input.subject_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        difficulty: input.difficulty || "intermediate",
        publication_status: "published",
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error("Error creating quiz:", quizError);
      return { error: quizError?.message || "Failed to create quiz." };
    }

    // 2. Insert Questions & Options
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

    safeRevalidate("/quizzes");
    safeRevalidate("/subjects");
    return { success: true, quiz };
  } catch (err: any) {
    console.error("createQuiz error:", err);
    return { error: err.message || "Failed to create quiz." };
  }
}

export async function deleteQuiz(quizId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database not configured." };
    }

    const serviceSupabase = getServiceSupabase();
    const { error } = await serviceSupabase.from("quizzes").delete().eq("id", quizId);

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/quizzes");
    safeRevalidate("/subjects");
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
}) {
  try {
    if (!isSupabaseConfigured()) {
      return { success: true, isDemo: true };
    }

    const userId = await getEffectiveUserId();
    const serviceSupabase = getServiceSupabase();

    const { data: attempt, error: attemptError } = await serviceSupabase
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quiz_id,
        user_id: userId,
        score: data.score,
        total_questions: data.total_questions,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError || !attempt) {
      console.error("Error recording quiz attempt:", attemptError);
      return { error: attemptError?.message };
    }

    if (data.answers && data.answers.length > 0) {
      const answersToInsert = data.answers.map((ans) => ({
        attempt_id: attempt.id,
        question_id: ans.question_id,
        selected_option_id: ans.selected_option_id,
        is_correct: ans.is_correct,
      }));

      await serviceSupabase.from("quiz_attempt_answers").insert(answersToInsert);
    }

    safeRevalidate("/quizzes");
    return { success: true, attemptId: attempt.id };
  } catch (err: any) {
    return { error: err.message };
  }
}
