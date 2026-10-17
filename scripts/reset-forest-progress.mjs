import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetForestProgress() {
  console.log("=== RESTARTING FOREST PROGRESS FOR ALL USERS ===");

  // 1. Delete notes with title '__validily_forest_trees__'
  const { data: delNotes, error: errNotes } = await supabase
    .from("notes")
    .delete()
    .eq("title", "__validily_forest_trees__")
    .select();
  if (errNotes) {
    console.warn("Notice: could not delete __validily_forest_trees__ notes:", errNotes.message);
  } else {
    console.log(`Deleted ${delNotes?.length || 0} forest tree fallback notes.`);
  }

  // 2. Delete notes with title '__validily_forest_preferences__'
  const { data: delNotePrefs, error: errNotePrefs } = await supabase
    .from("notes")
    .delete()
    .eq("title", "__validily_forest_preferences__")
    .select();
  if (errNotePrefs) {
    console.warn("Notice: could not delete __validily_forest_preferences__ notes:", errNotePrefs.message);
  } else {
    console.log(`Deleted ${delNotePrefs?.length || 0} forest preferences fallback notes.`);
  }

  // 3. Delete forest_entries if table exists
  try {
    const { data: delEntries, error: errEntries } = await supabase
      .from("forest_entries")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    if (errEntries) {
      console.log("forest_entries table not present or empty:", errEntries.message);
    } else {
      console.log(`Deleted ${delEntries?.length || 0} rows from forest_entries table.`);
    }
  } catch (e) {
    console.log("forest_entries check:", e);
  }

  // 4. Delete focus_sessions if table exists
  try {
    const { data: delSessions, error: errSessions } = await supabase
      .from("focus_sessions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    if (errSessions) {
      console.log("focus_sessions table not present or empty:", errSessions.message);
    } else {
      console.log(`Deleted ${delSessions?.length || 0} rows from focus_sessions table.`);
    }
  } catch (e) {
    console.log("focus_sessions check:", e);
  }

  // 5. Delete forest_cheers if table exists
  try {
    const { data: delCheers, error: errCheers } = await supabase
      .from("forest_cheers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    if (errCheers) {
      console.log("forest_cheers table not present or empty:", errCheers.message);
    } else {
      console.log(`Deleted ${delCheers?.length || 0} rows from forest_cheers table.`);
    }
  } catch (e) {
    console.log("forest_cheers check:", e);
  }

  console.log("Forest progress reset completed successfully!");
}

resetForestProgress();
