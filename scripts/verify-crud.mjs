import { createSubject, updateSubject, deleteSubject } from "../src/lib/actions/admin-actions.ts";
import { createNote, updateNote, deleteNote } from "../src/lib/actions/note-actions.ts";
import { createQuiz, deleteQuiz, submitQuizAttempt } from "../src/lib/actions/quiz-actions.ts";
import { createResource, updateRevisionStatus, deleteResource } from "../src/lib/actions/resource-actions.ts";
import { getSubjects, getSubjectBySlugOrId, getNotes, getSubjectQuizzesWithQuestions, getResources } from "../src/lib/supabase/repository.ts";

async function runTests() {
  console.log("=== STARTING END-TO-END CRUD VERIFICATION ===");

  // 1. Verify S1 and S2 initial counts
  const s1Subjects = await getSubjects("11111111-1111-1111-1111-111111111111");
  const s2Subjects = await getSubjects("22222222-2222-2222-2222-222222222222");
  console.log("Initial S1 Subjects Count:", s1Subjects.length, "(Expected: 10)");
  console.log("Initial S2 Subjects Count:", s2Subjects.length, "(Expected: 0)");

  if (s1Subjects.length !== 10 || s2Subjects.length !== 0) {
    throw new Error(`S1 or S2 count mismatch: S1=${s1Subjects.length}, S2=${s2Subjects.length}`);
  }

  // 2. Test S2 Subject Creation & Persistence
  console.log("\n--- Testing Subject Creation under S2 ---");
  const createSubRes = await createSubject({
    semester_id: "22222222-2222-2222-2222-222222222222",
    name: "Systèmes Embarqués Temps Réel",
    slug: "realtime-embedded-systems",
    description: "Conception et ordonnancement de systèmes temps réel.",
    icon: "Cpu",
  });
  console.log("Create S2 Subject Response:", createSubRes);
  if (createSubRes.error || !createSubRes.subject) {
    throw new Error(`Failed to create S2 subject: ${createSubRes.error}`);
  }

  // Verify persistence by querying repository directly
  const s2AfterCreate = await getSubjects("22222222-2222-2222-2222-222222222222");
  console.log("S2 Subjects after create:", s2AfterCreate.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
  if (s2AfterCreate.length !== 1 || s2AfterCreate[0].slug !== "realtime-embedded-systems") {
    throw new Error("Persistence verification failed: S2 subject did not survive fetch!");
  }

  const createdSubId = createSubRes.subject.id;

  // 3. Test Note & Cheat Sheet Creation under this subject
  console.log("\n--- Testing Note & Cheat Sheet Creation ---");
  const noteRes = await createNote({
    subject_id: createdSubId,
    title: "Théorème de Liu et Layland",
    content: "RMS (Rate Monotonic Scheduling) est optimal pour les priorités statiques sous condition d'utilisation U <= n(2^(1/n) - 1).",
    tags: ["cheat-sheet"],
  });
  console.log("Create Cheat Sheet Response:", noteRes);
  if (noteRes.error || !noteRes.note) {
    throw new Error(`Failed to create note: ${noteRes.error}`);
  }

  // Verify note persistence
  const notes = await getNotes();
  const subNotes = notes.filter(n => n.subject_id === createdSubId);
  console.log("Subject Notes count:", subNotes.length, "(Expected: 1)");
  if (subNotes.length !== 1) {
    throw new Error("Note persistence failed!");
  }

  // 4. Test Quiz Creation under this subject
  console.log("\n--- Testing Quiz Creation ---");
  const quizRes = await createQuiz({
    subject_id: createdSubId,
    title: "Quiz Ordonnancement Temps Réel",
    description: "Évaluation sur EDF et RMS.",
    difficulty: "intermediate",
    questions: [
      {
        question_text: "Quelle est la condition suffisante d'ordonnançabilité pour EDF sur monoprocesseur ?",
        explanation: "EDF est optimal et ordonnançable si et seulement si U <= 1.",
        options: [
          { option_text: "U <= 1 (100% du processeur)", is_correct: true },
          { option_text: "U <= ln(2) (~69%)", is_correct: false },
          { option_text: "U <= 0.5", is_correct: false },
        ],
      },
    ],
  });
  console.log("Create Quiz Response:", quizRes);
  if (quizRes.error || !quizRes.quiz) {
    throw new Error(`Failed to create quiz: ${quizRes.error}`);
  }

  const subQuizzes = await getSubjectQuizzesWithQuestions(createdSubId);
  console.log("Subject Quizzes count:", subQuizzes.length, "(Expected: 1)");
  if (subQuizzes.length !== 1 || subQuizzes[0].questions?.length !== 1) {
    throw new Error("Quiz persistence failed!");
  }

  // 5. Test Resource Creation under this subject
  console.log("\n--- Testing Resource Creation ---");
  const resRes = await createResource({
    subject_id: createdSubId,
    category_id: "a1111111-1111-1111-1111-111111111111", // Courses & Notes
    title: "Cours 1 : Ordonnancement Préemptif",
    description: "Support de cours d'introduction.",
    storage_path: "https://example.com/course-1.pdf",
    mime_type: "application/pdf",
    original_filename: "cours-1-ordonnancement.pdf",
  });
  console.log("Create Resource Response:", resRes);
  if (resRes.error || !resRes.resource) {
    throw new Error(`Failed to create resource: ${resRes.error}`);
  }

  // Test revision status update
  const statusRes = await updateRevisionStatus(resRes.resource.id, "revised");
  console.log("Revision Status Update Response:", statusRes);
  if (statusRes.error) {
    throw new Error(`Failed to update revision status: ${statusRes.error}`);
  }

  // 6. Test Cascade Deletion: Delete the S2 subject and verify no orphan records
  console.log("\n--- Testing Cascade Deletion ---");
  const delSubRes = await deleteSubject(createdSubId);
  console.log("Delete S2 Subject Response:", delSubRes);
  if (delSubRes.error) {
    throw new Error(`Failed to delete S2 subject: ${delSubRes.error}`);
  }

  // Verify S2 is back to 0 subjects
  const s2AfterDelete = await getSubjects("22222222-2222-2222-2222-222222222222");
  console.log("S2 Subjects after delete:", s2AfterDelete.length, "(Expected: 0)");
  if (s2AfterDelete.length !== 0) {
    throw new Error("Deletion verification failed: S2 still has subjects!");
  }

  // Verify resources and quizzes for that subject are cascade-deleted
  const leftoverRes = await getResources({ subjectId: createdSubId });
  const leftoverQuizzes = await getSubjectQuizzesWithQuestions(createdSubId);
  console.log("Leftover resources:", leftoverRes.length, "(Expected: 0)");
  console.log("Leftover quizzes:", leftoverQuizzes.length, "(Expected: 0)");
  if (leftoverRes.length !== 0 || leftoverQuizzes.length !== 0) {
    throw new Error("Cascade deletion failed: orphan records found!");
  }

  // 7. Verify S1 subjects are completely untouched
  const s1Final = await getSubjects("11111111-1111-1111-1111-111111111111");
  console.log("S1 Final Subjects Count:", s1Final.length, "(Expected: 10)");
  if (s1Final.length !== 10) {
    throw new Error("S1 subjects compromised!");
  }

  console.log("\n=== ALL CRUD AND PERSISTENCE VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
