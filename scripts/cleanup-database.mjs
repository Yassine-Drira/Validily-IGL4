import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanup() {
  console.log("Starting safe database cleanup...");

  // 1. Delete quiz attempt answers & attempts
  const { error: errAns } = await supabase.from("quiz_attempt_answers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errAns) console.error("Error deleting quiz attempt answers:", errAns);

  const { error: errAtt } = await supabase.from("quiz_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errAtt) console.error("Error deleting quiz attempts:", errAtt);

  // 2. Delete quiz options & questions & quizzes
  const { error: errOpt } = await supabase.from("quiz_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errOpt) console.error("Error deleting quiz options:", errOpt);

  const { error: errQues } = await supabase.from("quiz_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errQues) console.error("Error deleting quiz questions:", errQues);

  const { error: errQuiz } = await supabase.from("quizzes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errQuiz) console.error("Error deleting quizzes:", errQuiz);

  // 3. Delete revision progress & bookmarks
  const { error: errProg } = await supabase.from("revision_progress").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errProg) console.error("Error deleting revision progress:", errProg);

  const { error: errBm } = await supabase.from("bookmarks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errBm) console.error("Error deleting bookmarks:", errBm);

  // 4. Delete demo resources
  const { error: errRes } = await supabase.from("resources").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errRes) console.error("Error deleting resources:", errRes);

  // 5. Delete notes
  const { error: errNotes } = await supabase.from("notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errNotes) console.error("Error deleting notes:", errNotes);

  // 5b. Delete any test S2 subjects
  const { error: errS2Sub } = await supabase.from("subjects").delete().eq("semester_id", "22222222-2222-2222-2222-222222222222");
  if (errS2Sub) console.error("Error deleting S2 subjects:", errS2Sub);

  // 6. Verify semesters and S1 subjects are intact
  const { data: semesters } = await supabase.from("semesters").select("id, name, sort_order");
  console.log("Preserved Semesters:", semesters);

  const { data: s1Subjects } = await supabase
    .from("subjects")
    .select("id, name, slug, semester_id")
    .eq("semester_id", "11111111-1111-1111-1111-111111111111");
  console.log("Preserved S1 Subjects Count:", s1Subjects?.length);

  // 7. Verify S2 subjects are empty
  const { data: s2Subjects } = await supabase
    .from("subjects")
    .select("id, name, slug, semester_id")
    .eq("semester_id", "22222222-2222-2222-2222-222222222222");
  console.log("S2 Subjects Count (should be 0):", s2Subjects?.length);

  console.log("Cleanup completed successfully!");
}

cleanup();
