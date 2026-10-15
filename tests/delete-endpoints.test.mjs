import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Delete Endpoints Integrity: All 5 delete actions are exported and typed", async () => {
  const adminActions = fs.readFileSync(path.resolve("src/lib/actions/admin-actions.ts"), "utf8");
  const resourceActions = fs.readFileSync(path.resolve("src/lib/actions/resource-actions.ts"), "utf8");
  const folderActions = fs.readFileSync(path.resolve("src/lib/actions/folder-actions.ts"), "utf8");
  const quizActions = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");
  const noteActions = fs.readFileSync(path.resolve("src/lib/actions/note-actions.ts"), "utf8");

  assert.ok(adminActions.includes("export async function deleteSubject"), "deleteSubject is exported");
  assert.ok(resourceActions.includes("export async function deleteResource"), "deleteResource is exported");
  assert.ok(folderActions.includes("export async function deleteFolderAction"), "deleteFolderAction is exported");
  assert.ok(quizActions.includes("export async function deleteQuiz"), "deleteQuiz is exported");
  assert.ok(noteActions.includes("export async function deleteNote"), "deleteNote is exported");
});

test("Cascade Safety: deleteSubject cleans all dependent tables before removing subject", () => {
  const adminActions = fs.readFileSync(path.resolve("src/lib/actions/admin-actions.ts"), "utf8");
  
  // Must clean bookmarks
  assert.ok(adminActions.includes('.from("bookmarks").delete()'), "Cleans bookmarks");
  // Must clean revision_progress
  assert.ok(adminActions.includes('.from("revision_progress").delete()'), "Cleans revision_progress");
  // Must clean storage
  assert.ok(adminActions.includes('.storage'), "Cleans storage files");
  // Must clean resources
  assert.ok(adminActions.includes('.from("resources").delete()'), "Cleans resources");
  // Must clean quiz_attempts
  assert.ok(adminActions.includes('.from("quiz_attempts").delete()'), "Cleans quiz_attempts");
  // Must clean quiz_options
  assert.ok(adminActions.includes('.from("quiz_options").delete()'), "Cleans quiz_options");
  // Must clean quiz_questions
  assert.ok(adminActions.includes('.from("quiz_questions").delete()'), "Cleans quiz_questions");
  // Must clean quizzes
  assert.ok(adminActions.includes('.from("quizzes").delete()'), "Cleans quizzes");
  // Must clean notes
  assert.ok(adminActions.includes('.from("notes").delete()'), "Cleans notes");
  // Must clean subject_folders
  assert.ok(adminActions.includes('.from("subject_folders").delete()'), "Cleans subject_folders");
  // Must delete subject
  assert.ok(adminActions.includes('.from("subjects")') && adminActions.includes('.delete()'), "Deletes subject");
});

test("Modern UX: Zero native confirm() or alert() calls in client codebase", () => {
  const srcFiles = [
    "src/components/admin/admin-manager.tsx",
    "src/components/notes/notes-manager.tsx",
    "src/components/workspace/subject-file-library.tsx",
    "src/components/workspace/subject-learning-workspace.tsx",
    "src/components/workspace/subject-tree-view.tsx",
    "src/components/resources/resource-actions-bar.tsx",
  ];

  for (const relPath of srcFiles) {
    const fullPath = path.resolve(relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      assert.ok(!content.includes("confirm("), `${relPath} should not use confirm()`);
      assert.ok(!content.includes("alert("), `${relPath} should not use alert()`);
    }
  }
});

test("Modal Wiring: SubjectFileLibrary renders DeleteConfirmModal for resources and folders", () => {
  const libraryContent = fs.readFileSync(
    path.resolve("src/components/workspace/subject-file-library.tsx"),
    "utf8"
  );

  assert.ok(libraryContent.includes("resourceToDelete &&"), "Handles resourceToDelete modal condition");
  assert.ok(libraryContent.includes("folderToDelete &&"), "Handles folderToDelete modal condition");
  assert.ok(libraryContent.includes("<DeleteConfirmModal"), "Renders DeleteConfirmModal");
});

test("Modal Wiring: AdminManager renders DeleteConfirmModal for subjects", () => {
  const adminContent = fs.readFileSync(
    path.resolve("src/components/admin/admin-manager.tsx"),
    "utf8"
  );

  assert.ok(adminContent.includes("subjectToDelete &&"), "Handles subjectToDelete modal condition");
  assert.ok(adminContent.includes("<DeleteConfirmModal"), "Renders DeleteConfirmModal in AdminManager");
  assert.ok(adminContent.includes('itemType="subject"'), "Specifies subject itemType");
});
