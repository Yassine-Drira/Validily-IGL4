"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { Note } from "@/types/database";
import { getRequesterUser, assertOwnershipOrAdmin } from "@/lib/auth/authorization";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

export async function createNote(data: {
  subject_id: string;
  title: string;
  content: string;
  tags?: string[];
  visibility?: "private" | "public";
}): Promise<{ success?: boolean; error?: string; note?: Note }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database not configured." };
    }

    if (!data.title?.trim()) {
      return { error: "Note title is required." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour créer une note." };
    }
    const user = { id: requester.id };
    const serviceSupabase = getServiceSupabase();

    const { data: newNote, error } = await serviceSupabase
      .from("notes")
      .insert({
        user_id: user.id,
        subject_id: data.subject_id || null,
        title: data.title.trim(),
        content: data.content || "",
        tags: data.tags || [],
        visibility: data.visibility || "private",
      })
      .select("*, subject:subjects(*)")
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return { error: error.message };
    }

    safeRevalidate("/notes");
    safeRevalidate("/subjects");
    return { success: true, note: newNote };
  } catch (err: any) {
    return { error: err.message || "Failed to create note." };
  }
}

export async function updateNote(
  noteId: string,
  data: {
    title?: string;
    content?: string;
    tags?: string[];
    visibility?: "private" | "public";
  }
): Promise<{ success?: boolean; error?: string; note?: Note }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database not configured." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour modifier cette note." };
    }

    const serviceSupabase = getServiceSupabase();

    const { data: note, error: fetchErr } = await serviceSupabase
      .from("notes")
      .select("id, user_id, title")
      .eq("id", noteId)
      .maybeSingle();

    if (fetchErr || !note) {
      return { error: "Note introuvable." };
    }

    const authCheck = await assertOwnershipOrAdmin(note.user_id, "cette note");
    if (!authCheck.authorized) {
      return { error: authCheck.error };
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.content !== undefined) updatePayload.content = data.content;
    if (data.tags !== undefined) updatePayload.tags = data.tags;
    if (data.visibility !== undefined) updatePayload.visibility = data.visibility;

    const { data: updated, error } = await serviceSupabase
      .from("notes")
      .update(updatePayload)
      .eq("id", noteId)
      .select("*, subject:subjects(*)")
      .single();

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/notes");
    safeRevalidate("/subjects");
    return { success: true, note: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update note." };
  }
}

export async function deleteNote(noteId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Database not configured." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { error: "Authentification requise pour supprimer cette note." };
    }

    const serviceSupabase = getServiceSupabase();

    const { data: note, error: fetchErr } = await serviceSupabase
      .from("notes")
      .select("id, user_id, title")
      .eq("id", noteId)
      .maybeSingle();

    if (fetchErr || !note) {
      return { error: "Note introuvable ou déjà supprimée." };
    }

    const authCheck = await assertOwnershipOrAdmin(note.user_id, "cette note");
    if (!authCheck.authorized) {
      return { error: authCheck.error };
    }

    const { error } = await serviceSupabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/notes");
    safeRevalidate("/subjects");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete note." };
  }
}
