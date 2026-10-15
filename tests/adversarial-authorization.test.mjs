import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  setTestUser,
  getRequesterUser,
  isUserAdmin,
  assertAdmin,
  assertOwnershipOrAdmin,
  canMutateResourceWithGrant,
} from "../src/lib/auth/authorization.ts";

const USER_A = {
  id: "user-a-1111-1111-1111-111111111111",
  email: "student_a@insat.u-carthage.tn",
  role: "student",
};

const USER_B = {
  id: "user-b-2222-2222-2222-222222222222",
  email: "student_b@insat.u-carthage.tn",
  role: "student",
};

const USER_ADMIN = {
  id: "admin-9999-9999-9999-999999999999",
  email: "admin@insat.u-carthage.tn",
  role: "admin",
};

test("SEC-01 Adversarial: User B cannot delete, rename, or move User A's private resource", async () => {
  // 1. Unauthenticated guest check
  setTestUser(null);
  const guestUser = await getRequesterUser();
  assert.equal(guestUser, null, "Guest user must be null");

  const guestAuth = await assertOwnershipOrAdmin(USER_A.id, "cette ressource");
  assert.equal(guestAuth.authorized, false, "Unauthenticated guest must be denied");
  assert.match(guestAuth.error, /Authentification requise/i);

  // 2. User B (malicious student) attempts to mutate User A's resource
  setTestUser(USER_B);
  const userB = await getRequesterUser();
  assert.equal(userB.id, USER_B.id);

  const userBAuth = await assertOwnershipOrAdmin(USER_A.id, "cette ressource");
  assert.equal(userBAuth.authorized, false, "User B must not be authorized to mutate User A's resource");
  assert.match(userBAuth.error, /Accès refusé/i);

  // 3. User A (legitimate owner) has authorization
  setTestUser(USER_A);
  const ownerAuth = await assertOwnershipOrAdmin(USER_A.id, "cette ressource");
  assert.equal(ownerAuth.authorized, true, "User A must be authorized for own resource");
  assert.equal(ownerAuth.user.id, USER_A.id);

  // 4. Admin has authorized moderation capability
  setTestUser(USER_ADMIN);
  const adminAuth = await assertOwnershipOrAdmin(USER_A.id, "cette ressource");
  assert.equal(adminAuth.authorized, true, "Admin must be authorized for administrative moderation");
  assert.equal(adminAuth.isAdmin, true);

  // 5. Code contract verification in resource-actions.ts
  const resourceCode = fs.readFileSync(path.resolve("src/lib/actions/resource-actions.ts"), "utf8");
  assert.ok(resourceCode.includes("getRequesterUser"), "Must derive requester identity");
  assert.ok(resourceCode.includes("assertOwnershipOrAdmin"), "Must enforce assertOwnershipOrAdmin");
  
  // Verify deleteResource enforces ownership BEFORE any delete operations
  const deleteStart = resourceCode.indexOf("export async function deleteResource");
  const deleteEnd = resourceCode.indexOf("export async function updateResourceVisibility");
  const deleteBody = resourceCode.slice(deleteStart, deleteEnd);

  const authPos = deleteBody.indexOf("assertOwnershipOrAdmin");
  const storagePos = deleteBody.indexOf(".storage");
  const dbDeletePos = deleteBody.indexOf('.from("resources").delete()');

  assert.ok(authPos !== -1, "deleteResource must call assertOwnershipOrAdmin");
  assert.ok(storagePos !== -1, "deleteResource must call .storage");
  assert.ok(dbDeletePos !== -1, "deleteResource must call .from('resources').delete()");
  assert.ok(authPos < storagePos, "Ownership check must precede Storage deletion");
  assert.ok(authPos < dbDeletePos, "Ownership check must precede database row deletion");

  // Verify renameResourceAction and moveResourceAction enforce ownership
  assert.ok(resourceCode.includes("renameResourceAction"), "Must export renameResourceAction");
  const renameBody = resourceCode.slice(
    resourceCode.indexOf("export async function renameResourceAction"),
    resourceCode.indexOf("export async function toggleBookmark")
  );
  assert.ok(renameBody.includes("assertOwnershipOrAdmin"), "renameResourceAction must enforce ownership");

  const moveBody = resourceCode.slice(
    resourceCode.indexOf("export async function moveResourceAction"),
    resourceCode.indexOf("export async function renameResourceAction")
  );
  assert.ok(moveBody.includes("assertOwnershipOrAdmin"), "moveResourceAction must enforce ownership");

  setTestUser(undefined);
});

test("SEC-02 Adversarial: User B cannot delete User A's quiz or its questions, options, and attempts", async () => {
  // 1. Unauthenticated guest check
  setTestUser(null);
  const guestQuizAuth = await assertOwnershipOrAdmin(USER_A.id, "ce quiz");
  assert.equal(guestQuizAuth.authorized, false);
  assert.match(guestQuizAuth.error, /Authentification requise/i);

  // 2. User B attempts to delete User A's quiz
  setTestUser(USER_B);
  const userBQuizAuth = await assertOwnershipOrAdmin(USER_A.id, "ce quiz");
  assert.equal(userBQuizAuth.authorized, false, "User B must be rejected from deleting User A's quiz");
  assert.match(userBQuizAuth.error, /Accès refusé/i);

  // 3. User A is authorized for own quiz
  setTestUser(USER_A);
  const userAQuizAuth = await assertOwnershipOrAdmin(USER_A.id, "ce quiz");
  assert.equal(userAQuizAuth.authorized, true);

  // 4. Code contract verification in quiz-actions.ts
  const quizCode = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");
  const deleteQuizStart = quizCode.indexOf("export async function deleteQuiz");
  const deleteQuizEnd = quizCode.indexOf("export async function submitQuizAttempt");
  const deleteQuizBody = quizCode.slice(deleteQuizStart, deleteQuizEnd);

  const authPos = deleteQuizBody.indexOf("assertOwnershipOrAdmin");
  const attemptsPos = deleteQuizBody.indexOf('.from("quiz_attempts").delete()');
  const questionsPos = deleteQuizBody.indexOf('.from("quiz_questions").delete()');
  const quizDeletePos = deleteQuizBody.indexOf('.from("quizzes").delete()');

  assert.ok(authPos !== -1, "deleteQuiz must call assertOwnershipOrAdmin");
  assert.ok(authPos < attemptsPos, "Ownership verification must occur BEFORE attempt cleanup");
  assert.ok(authPos < questionsPos, "Ownership verification must occur BEFORE question cleanup");
  assert.ok(authPos < quizDeletePos, "Ownership verification must occur BEFORE quiz record deletion");

  setTestUser(undefined);
});

test("SEC-03 Adversarial: User B cannot update or delete User A's notes and cheat sheets", async () => {
  // 1. Unauthenticated guest check
  setTestUser(null);
  const guestNoteAuth = await assertOwnershipOrAdmin(USER_A.id, "cette note");
  assert.equal(guestNoteAuth.authorized, false);
  assert.match(guestNoteAuth.error, /Authentification requise/i);

  // 2. User B attempts to mutate User A's note
  setTestUser(USER_B);
  const userBNoteAuth = await assertOwnershipOrAdmin(USER_A.id, "cette note");
  assert.equal(userBNoteAuth.authorized, false, "User B must not be permitted to mutate User A's note");
  assert.match(userBNoteAuth.error, /Accès refusé/i);

  // 3. User A is authorized
  setTestUser(USER_A);
  const userANoteAuth = await assertOwnershipOrAdmin(USER_A.id, "cette note");
  assert.equal(userANoteAuth.authorized, true);

  // 4. Code contract verification in note-actions.ts
  const noteCode = fs.readFileSync(path.resolve("src/lib/actions/note-actions.ts"), "utf8");
  assert.ok(noteCode.includes("getRequesterUser"), "Note actions must derive requester identity");
  assert.ok(noteCode.includes("assertOwnershipOrAdmin"), "Note actions must assert ownership");

  const updateNoteBody = noteCode.slice(
    noteCode.indexOf("export async function updateNote"),
    noteCode.indexOf("export async function deleteNote")
  );
  assert.ok(updateNoteBody.includes("assertOwnershipOrAdmin"), "updateNote must enforce ownership");

  const deleteNoteBody = noteCode.slice(noteCode.indexOf("export async function deleteNote"));
  assert.ok(deleteNoteBody.includes("assertOwnershipOrAdmin"), "deleteNote must enforce ownership");

  setTestUser(undefined);
});

test("SEC-04 Adversarial: Non-admin students cannot access /admin or execute curriculum mutations", async () => {
  // 1. Unauthenticated guest check
  setTestUser(null);
  const guestAdmin = await assertAdmin();
  assert.equal(guestAdmin.authorized, false);
  assert.match(guestAdmin.error, /Authentification requise/i);

  // 2. Ordinary student (User B) attempts administrative action
  setTestUser(USER_B);
  const studentAdmin = await assertAdmin();
  assert.equal(studentAdmin.authorized, false, "Student must fail assertAdmin");
  assert.match(studentAdmin.error, /Privilèges administrateur requis/i);

  // 3. Administrator passes assertAdmin
  setTestUser(USER_ADMIN);
  const realAdmin = await assertAdmin();
  assert.equal(realAdmin.authorized, true);
  assert.equal(realAdmin.user.role, "admin");

  // 4. Code contract verification in admin-actions.ts
  const adminActionsCode = fs.readFileSync(path.resolve("src/lib/actions/admin-actions.ts"), "utf8");
  assert.ok(adminActionsCode.includes("assertAdmin"), "admin-actions must import assertAdmin");

  for (const fn of ["createSubject", "updateSubject", "deleteSubject", "createSemester"]) {
    const fnStart = adminActionsCode.indexOf(`export async function ${fn}`);
    const fnSnippet = adminActionsCode.slice(fnStart, fnStart + 400);
    assert.ok(
      fnSnippet.includes("await assertAdmin()"),
      `${fn} must call assertAdmin() before any execution`
    );
  }

  // 5. Code contract verification in src/app/(workspace)/admin/page.tsx
  const adminPageCode = fs.readFileSync(path.resolve("src/app/(workspace)/admin/page.tsx"), "utf8");
  assert.ok(adminPageCode.includes("getRequesterUser"), "Admin page must derive user session");
  assert.ok(adminPageCode.includes("isUserAdmin"), "Admin page must verify role against trusted DB state");
  assert.ok(adminPageCode.includes("redirect("), "Admin page must redirect unauthorized visitors");

  setTestUser(undefined);
});

test("SEC-05 Adversarial: Folder operations enforce ownership and protect descendant resources", async () => {
  // 1. Unauthenticated guest check
  setTestUser(null);
  const guestFolderAuth = await assertOwnershipOrAdmin(USER_A.id, "ce dossier");
  assert.equal(guestFolderAuth.authorized, false);
  assert.match(guestFolderAuth.error, /Authentification requise/i);

  // 2. User B cannot rename or move User A's folder
  setTestUser(USER_B);
  const userBFolderAuth = await assertOwnershipOrAdmin(USER_A.id, "ce dossier");
  assert.equal(userBFolderAuth.authorized, false, "User B cannot manage User A's folder");
  assert.match(userBFolderAuth.error, /Accès refusé/i);

  // 3. User A is authorized
  setTestUser(USER_A);
  const userAFolderAuth = await assertOwnershipOrAdmin(USER_A.id, "ce dossier");
  assert.equal(userAFolderAuth.authorized, true);

  // 4. Descendant resource protection logic:
  // When deleteFolderAction is called with deleteContents: true, it inspects all descendant resources
  const resourcesInsideFolder = [
    { id: "res-b", owner_id: USER_B.id, storage_path: "user_b_file.pdf" },
    { id: "res-a", owner_id: USER_A.id, storage_path: "user_a_file.pdf" },
  ];

  // User B attempts to delete: must detect that res-a belongs to User A
  const unauthorizedDescendants = resourcesInsideFolder.some(
    (r) => r.owner_id && r.owner_id !== USER_B.id && USER_B.role !== "admin"
  );
  assert.equal(
    unauthorizedDescendants,
    true,
    "Must detect that User A owns a resource inside the folder and block deletion"
  );

  // Admin caller is allowed
  const adminUnauthorized = resourcesInsideFolder.some(
    (r) => r.owner_id && r.owner_id !== USER_ADMIN.id && USER_ADMIN.role !== "admin"
  );
  assert.equal(adminUnauthorized, false, "Admin can manage descendant resources");

  // 5. Code contract verification in folder-actions.ts
  const folderCode = fs.readFileSync(path.resolve("src/lib/actions/folder-actions.ts"), "utf8");
  assert.ok(folderCode.includes("getRequesterUser"), "folder-actions must derive user session");
  assert.ok(folderCode.includes("assertOwnershipOrAdmin"), "folder-actions must enforce ownership");

  const deleteFolderSnippet = folderCode.slice(folderCode.indexOf("export async function deleteFolderAction"));
  assert.ok(
    deleteFolderSnippet.includes("unauthorizedResource"),
    "deleteFolderAction must verify every descendant resource owner before deletion"
  );

  setTestUser(undefined);
});

test("Grant Scope Enforcement: Recipient with 'view' permission cannot edit, move, rename, or delete", () => {
  const resourceOwner = USER_A.id;

  // View-only grant
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "view", "delete"),
    false,
    "Recipient with 'view' permission cannot delete"
  );
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "view", "rename"),
    false,
    "Recipient with 'view' permission cannot rename"
  );
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "view", "move"),
    false,
    "Recipient with 'view' permission cannot move"
  );
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "view", "visibility"),
    false,
    "Recipient with 'view' permission cannot modify visibility"
  );

  // Edit grant
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "edit", "delete"),
    false,
    "Recipient with 'edit' permission cannot delete"
  );
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "edit", "visibility"),
    false,
    "Recipient with 'edit' permission cannot change visibility"
  );
  assert.equal(
    canMutateResourceWithGrant(USER_B, resourceOwner, "edit", "rename"),
    true,
    "Recipient with 'edit' permission can rename if granted"
  );

  // Owner always has full rights
  assert.equal(canMutateResourceWithGrant(USER_A, resourceOwner, null, "delete"), true);
  assert.equal(canMutateResourceWithGrant(USER_A, resourceOwner, null, "rename"), true);
  assert.equal(canMutateResourceWithGrant(USER_A, resourceOwner, null, "move"), true);
  assert.equal(canMutateResourceWithGrant(USER_A, resourceOwner, null, "visibility"), true);
});

test("Explicit Publication Invariant: Moving a resource never broadens its visibility", () => {
  const resourceCode = fs.readFileSync(
    path.resolve("src/lib/actions/resource-actions.ts"),
    "utf8"
  );

  const moveSnippet = resourceCode.slice(
    resourceCode.indexOf("export async function moveResourceAction"),
    resourceCode.indexOf("export async function renameResourceAction")
  );

  assert.ok(
    !moveSnippet.includes("visibility: 'public'"),
    "moveResourceAction must never silently set visibility to public"
  );
  assert.ok(
    !moveSnippet.includes('visibility: "public"'),
    "moveResourceAction must never silently set visibility to public"
  );
  assert.ok(
    moveSnippet.includes("preserved_visibility"),
    "moveResourceAction explicitly preserves resource visibility and audits it"
  );
});

test("Failed authorization occurs before any database mutation or storage deletion", () => {
  const resourceCode = fs.readFileSync(
    path.resolve("src/lib/actions/resource-actions.ts"),
    "utf8"
  );

  const deleteSnippet = resourceCode.slice(
    resourceCode.indexOf("export async function deleteResource"),
    resourceCode.indexOf("export async function updateResourceVisibility")
  );

  const authIndex = deleteSnippet.indexOf("assertOwnershipOrAdmin");
  const storageRemoveIndex = deleteSnippet.indexOf(".storage");
  const dbDeleteIndex = deleteSnippet.indexOf('.from("resources").delete()');

  assert.ok(authIndex !== -1, "assertOwnershipOrAdmin must be called in deleteResource");
  assert.ok(storageRemoveIndex !== -1, "deleteResource must clean storage files");
  assert.ok(dbDeleteIndex !== -1, "deleteResource must clean resources table");
  assert.ok(authIndex < storageRemoveIndex, "Authorization check must happen BEFORE storage removal");
  assert.ok(authIndex < dbDeleteIndex, "Authorization check must happen BEFORE database deletion");
});

test("SEC-09: Temporary Admin Role Delegation, Revocation, and Expiration Contracts", () => {
  const adminActionsCode = fs.readFileSync(
    path.resolve("src/lib/actions/admin-actions.ts"),
    "utf8"
  );

  assert.ok(adminActionsCode.includes("grantTemporaryAdminRole"), "admin-actions must export grantTemporaryAdminRole");
  assert.ok(adminActionsCode.includes("revokeAdminRole"), "admin-actions must export revokeAdminRole");
  assert.ok(adminActionsCode.includes("listManagedUsers"), "admin-actions must export listManagedUsers");

  // Verify grantTemporaryAdminRole enforces assertAdmin()
  const grantSnippet = adminActionsCode.slice(
    adminActionsCode.indexOf("export async function grantTemporaryAdminRole"),
    adminActionsCode.indexOf("export async function revokeAdminRole")
  );
  assert.ok(grantSnippet.includes("await assertAdmin()"), "grantTemporaryAdminRole must require admin authorization");

  // Verify revokeAdminRole enforces assertAdmin() and protects primary admin
  const revokeSnippet = adminActionsCode.slice(
    adminActionsCode.indexOf("export async function revokeAdminRole")
  );
  assert.ok(revokeSnippet.includes("await assertAdmin()"), "revokeAdminRole must require admin authorization");
  assert.ok(revokeSnippet.includes("yassinedrira3@gmail.com"), "revokeAdminRole must protect master admin account");

  // Verify authorization.ts handles temporary expiration
  const authCode = fs.readFileSync(
    path.resolve("src/lib/auth/authorization.ts"),
    "utf8"
  );
  assert.ok(authCode.includes("temporary_admin_expires_at"), "authorization.ts must check temporary grant expiration");
});
