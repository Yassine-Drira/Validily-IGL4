import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  setTestUser,
  getRequesterUser,
  isUserAdmin,
  checkResourceAccess,
  _resetMockSharesStore,
  _injectMockShare,
} from "../src/lib/auth/authorization.ts";
import { getEffectiveUserId } from "../src/lib/supabase/admin.ts";
import { getQuizWithQuestions, getSubjectQuizzesWithQuestions, getBookmarks } from "../src/lib/supabase/repository.ts";

const ACTOR_A = {
  id: "user-a-1111-1111-1111-111111111111",
  email: "student_a@insat.u-carthage.tn",
  role: "student",
};

const ACTOR_B = {
  id: "user-b-2222-2222-2222-222222222222",
  email: "student_b@insat.u-carthage.tn",
  role: "student",
};

const ACTOR_ADMIN = {
  id: "admin-9999-9999-9999-999999999999",
  email: "admin@insat.u-carthage.tn",
  role: "admin",
};

test("SEC-PHASE0-01: getEffectiveUserId never steals profiles for unauthenticated guests", async () => {
  setTestUser(null);
  const effectiveId = await getEffectiveUserId();
  assert.equal(effectiveId, null, "Must return null for unauthenticated session, never an arbitrary profile ID");

  setTestUser(ACTOR_A);
  const userAEffective = await getRequesterUser();
  assert.equal(userAEffective?.id, ACTOR_A.id, "Must return active requester identity");
});

test("SEC-PHASE0-02: Server actions reject unauthenticated mutations and default to private", () => {
  const resourceCode = fs.readFileSync(path.resolve("src/lib/actions/resource-actions.ts"), "utf8");
  const quizCode = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");
  const noteCode = fs.readFileSync(path.resolve("src/lib/actions/note-actions.ts"), "utf8");
  const uploadCode = fs.readFileSync(path.resolve("src/app/api/upload/route.ts"), "utf8");

  // 1. No file may call getEffectiveUserId
  assert.ok(!resourceCode.includes("getEffectiveUserId"), "resource-actions must not use getEffectiveUserId");
  assert.ok(!quizCode.includes("getEffectiveUserId"), "quiz-actions must not use getEffectiveUserId");
  assert.ok(!noteCode.includes("getEffectiveUserId"), "note-actions must not use getEffectiveUserId");
  assert.ok(!uploadCode.includes("getEffectiveUserId"), "upload route must not use getEffectiveUserId");

  // 2. createResource enforces requester check and defaults to private
  assert.ok(resourceCode.includes("Authentification requise pour créer une ressource"), "createResource must require authentication");
  assert.ok(resourceCode.includes('visibility || "private"'), "createResource must default visibility to private");

  // 3. createQuiz enforces requester check
  assert.ok(quizCode.includes("Authentification requise pour créer un quiz"), "createQuiz must require authentication");

  // 4. toggleBookmark enforces requester check
  assert.ok(resourceCode.includes("Authentification requise pour modifier vos favoris"), "toggleBookmark must require authentication");

  // 5. updateRevisionStatus enforces requester check
  assert.ok(resourceCode.includes("Authentification requise pour enregistrer votre progression"), "updateRevisionStatus must require authentication");

  // 6. upload route rejects unauthenticated requests with HTTP 401
  assert.ok(uploadCode.includes("getRequesterUser()"), "Upload route must resolve requester");
  assert.ok(uploadCode.includes("status: 401"), "Upload route must return 401 for unauthenticated uploads");
  assert.ok(uploadCode.includes('visibility: "public" | "shared" | "private" = "private"'), "Upload route must default visibility to private");

  // 7. createNote defaults to private
  assert.ok(noteCode.includes('visibility: data.visibility || "private"'), "createNote must default visibility to private");
});

test("SEC-PHASE0-03: Draft quiz questions and options are protected from unauthorized enumeration", async () => {
  // 1. Repository-level parent check
  const draftQuizId = "draft-quiz-secret-123";

  // When unauthenticated, draft quiz must not be disclosed
  setTestUser(null);
  const unauthQuiz = await getQuizWithQuestions(draftQuizId, undefined);
  assert.equal(unauthQuiz, null, "Unauthenticated user must receive null for draft quiz");

  // When requested by another user (User B), draft quiz must not be disclosed
  setTestUser(ACTOR_B);
  const userBQuiz = await getQuizWithQuestions(draftQuizId, ACTOR_B.id);
  assert.equal(userBQuiz, null, "User B must receive null for User A's draft quiz");

  // 2. Migration RLS policies verification in 20261016000000_phase0_security_hardening.sql
  const migrationPath = path.resolve("supabase/migrations/20261016000000_phase0_security_hardening.sql");
  assert.ok(fs.existsSync(migrationPath), "Phase 0 migration file must exist");
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  assert.ok(
    migrationSql.includes('create policy "Questions viewable with authorized quiz"'),
    "Must create parent-bound quiz_questions policy"
  );
  assert.ok(
    migrationSql.includes('create policy "Options viewable with authorized question"'),
    "Must create parent-bound quiz_options policy"
  );
  assert.ok(
    !migrationSql.includes("using (true)"),
    "Must eliminate using (true) public enumeration hole"
  );
});

test("SEC-PHASE0-04: Explicit Sharing & Visibility Matrix (checkResourceAccess)", async () => {
  _resetMockSharesStore();

  const testResource = {
    id: "res-shared-123",
    owner_id: ACTOR_A.id,
    visibility: "shared",
    publication_status: "published",
  };

  // 1. Anonymous visitor -> denied
  const anonCheck = await checkResourceAccess(testResource, null, "view");
  assert.equal(anonCheck.allowed, false);
  assert.match(anonCheck.reason || "", /Authentification requise/i);

  // 2. Owner (User A) -> full view and edit
  const ownerViewCheck = await checkResourceAccess(testResource, ACTOR_A.id, "view");
  assert.equal(ownerViewCheck.allowed, true);
  const ownerEditCheck = await checkResourceAccess(testResource, ACTOR_A.id, "edit");
  assert.equal(ownerEditCheck.allowed, true);

  // 3. Admin -> full view and edit
  setTestUser(ACTOR_ADMIN);
  const adminViewCheck = await checkResourceAccess(testResource, ACTOR_ADMIN.id, "view");
  assert.equal(adminViewCheck.allowed, true);
  const adminEditCheck = await checkResourceAccess(testResource, ACTOR_ADMIN.id, "edit");
  assert.equal(adminEditCheck.allowed, true);

  // 4. User B before being granted share -> denied
  setTestUser(ACTOR_B);
  const userBBeforeShare = await checkResourceAccess(testResource, ACTOR_B.id, "view");
  assert.equal(userBBeforeShare.allowed, false);
  assert.match(userBBeforeShare.reason || "", /destinataires/i);

  // 5. User B granted 'viewer' share -> view allowed, edit denied
  _injectMockShare({
    id: "share-1",
    resource_id: testResource.id,
    grantor_id: ACTOR_A.id,
    recipient_id: ACTOR_B.id,
    permission: "viewer",
    created_at: new Date().toISOString(),
  });

  const userBViewerCheck = await checkResourceAccess(testResource, ACTOR_B.id, "view");
  assert.equal(userBViewerCheck.allowed, true, "Recipient with viewer grant must be allowed to read");

  const userBViewerEditCheck = await checkResourceAccess(testResource, ACTOR_B.id, "edit");
  assert.equal(userBViewerEditCheck.allowed, false, "Recipient with viewer grant must NOT be allowed to edit");
  assert.match(userBViewerEditCheck.reason || "", /droits de lecture/i);

  // 6. User B upgraded to 'editor' share -> view and edit allowed
  _injectMockShare({
    id: "share-1",
    resource_id: testResource.id,
    grantor_id: ACTOR_A.id,
    recipient_id: ACTOR_B.id,
    permission: "editor",
    created_at: new Date().toISOString(),
  });

  const userBEditorCheck = await checkResourceAccess(testResource, ACTOR_B.id, "edit");
  assert.equal(userBEditorCheck.allowed, true, "Recipient with editor grant must be allowed to edit");

  // 7. Revocation: Grant removed -> access immediately denied
  _resetMockSharesStore();
  const userBAfterRevoke = await checkResourceAccess(testResource, ACTOR_B.id, "view");
  assert.equal(userBAfterRevoke.allowed, false, "Revoked recipient must be immediately denied access");
});

test("SEC-PHASE0-05: Private resources strictly inaccessible to non-owners even if ID is guessed", async () => {
  const privateResource = {
    id: "res-private-999",
    owner_id: ACTOR_A.id,
    visibility: "private",
    publication_status: "published",
  };

  // User B tries to view
  setTestUser(ACTOR_B);
  const userBAccess = await checkResourceAccess(privateResource, ACTOR_B.id, "view");
  assert.equal(userBAccess.allowed, false);
  assert.match(userBAccess.reason || "", /privé/i);

  // Owner views
  setTestUser(ACTOR_A);
  const ownerAccess = await checkResourceAccess(privateResource, ACTOR_A.id, "view");
  assert.equal(ownerAccess.allowed, true);
});

test("SEC-PHASE0-06: Cross-account quiz attempt history snooping prevention contract", () => {
  const quizActionsCode = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");
  assert.ok(quizActionsCode.includes("Deny unauthorized cross-account snooping"), "Attempts and mistakes queries must prevent cross-user snooping");
  assert.ok(quizActionsCode.includes("const isSelf = !userId || userId === requester.id;"), "Enforces requester identity boundary");
});

test("SEC-PHASE0-07: Unauthenticated quiz attempts remain safe local evaluations without DB pollution", () => {
  const quizActionsCode = fs.readFileSync(path.resolve("src/lib/actions/quiz-actions.ts"), "utf8");
  assert.ok(quizActionsCode.includes("isGuest: true"), "submitQuizAttempt must identify guest users cleanly");
  assert.ok(quizActionsCode.includes("Résultats calculés localement"), "submitQuizAttempt returns local evaluation message for guests");
});

test("SEC-PHASE0-08: Code contracts verify strict download route access control", () => {
  const downloadCode = fs.readFileSync(path.resolve("src/app/api/download/[resourceId]/route.ts"), "utf8");
  assert.ok(downloadCode.includes("checkResourceAccess"), "Download endpoint must call checkResourceAccess");
  assert.ok(downloadCode.includes("status: 403"), "Download endpoint must return 403 for unauthorized requests");
  assert.ok(downloadCode.includes('resource.visibility === "private"'), "Download endpoint handles private resources");
});

test("SEC-PHASE0-09: Unauthenticated bookmarks query returns empty array", async () => {
  const unauthBookmarks = await getBookmarks(undefined);
  assert.deepEqual(unauthBookmarks, [], "Unauthenticated bookmarks query must immediately return empty array");
});
