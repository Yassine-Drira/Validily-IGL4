"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function createNote(data: {
  subject_id: string;
  title: string;
  content: string;
  tags: string[];
  visibility?: "private" | "public";
}) {
  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to create notes." };
  }

  const { data: newNote, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      subject_id: data.subject_id || null,
      title: data.title.trim(),
      content: data.content.trim(),
      tags: data.tags || [],
      visibility: data.visibility || "private",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notes");
  return { success: true, note: newNote };
}

export async function updateNote(
  noteId: string,
  data: {
    title: string;
    content: string;
    tags: string[];
    visibility?: "private" | "public";
  }
) {
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

  const { error } = await supabase
    .from("notes")
    .update({
      title: data.title.trim(),
      content: data.content.trim(),
      tags: data.tags || [],
      visibility: data.visibility || "private",
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notes");
  return { success: true };
}

export async function deleteNote(noteId: string) {
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

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notes");
  return { success: true };
}
