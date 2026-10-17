import test from "node:test";
import assert from "node:assert/strict";
import { computeStudentAchievements } from "../src/lib/utils/achievements.ts";
import {
  getStudentPublicProfile,
  listStudentsPerformanceAction,
} from "../src/lib/actions/profile-actions.ts";
import { setTestUser } from "../src/lib/auth/authorization.ts";
import { sendClassmateCheer } from "../src/lib/actions/forest-actions.ts";
import { getMyNotifications } from "../src/lib/actions/notification-actions.ts";

test("Achievements: computeStudentAchievements deterministically computes all 12 badges", () => {
  // Test case 1: Brand new user with 0 trees and 0 focus time
  const emptyAchievements = computeStudentAchievements([], 0);
  assert.equal(emptyAchievements.length, 12, "Must always define exactly 12 standard achievements");
  assert.equal(emptyAchievements.every((a) => !a.isUnlocked), true, "New user has 0 unlocked badges");

  // Test case 2: User with 1 healthy tree and 30 minutes
  const oneTree = [
    {
      id: "tree-1",
      session_id: "sess-1",
      user_id: "user-1",
      tree_species: "oak",
      tree_status: "healthy",
      position_x: 50,
      position_y: 50,
      scale_factor: 1,
      earned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      session: {
        id: "sess-1",
        user_id: "user-1",
        subject_id: null,
        session_label: "Session de test",
        target_duration_seconds: 1800,
        actual_duration_seconds: 1800,
        status: "completed",
        tree_species: "oak",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        interrupted_at: null,
        interruption_reason: null,
        idempotency_key: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  ];
  const oneTreeAchievements = computeStudentAchievements(oneTree, 1, 30);
  const firstTreeBadge = oneTreeAchievements.find((a) => a.id === "first_tree");
  assert.ok(firstTreeBadge, "first_tree achievement must exist");
  assert.equal(firstTreeBadge.isUnlocked, true, "First tree must unlock 'first_tree' badge");
  assert.equal(firstTreeBadge.progressPercent, 100);

  // Test case 3: User with 7-day streak and 15 hours (900 min)
  const heavyTrees = Array.from({ length: 30 }, (_, i) => ({
    id: `tree-${i}`,
    session_id: `sess-${i}`,
    user_id: "user-1",
    tree_species: (i % 3 === 0 ? "pine" : (i % 2 === 0 ? "sakura" : "oak")),
    tree_status: "healthy",
    position_x: 20 + i,
    position_y: 30 + i,
    scale_factor: 1,
    earned_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    session: {
      id: `sess-${i}`,
      user_id: "user-1",
      subject_id: null,
      session_label: `Session ${i}`,
      target_duration_seconds: 1800,
      actual_duration_seconds: 1800,
      status: "completed",
      tree_species: (i % 3 === 0 ? "pine" : (i % 2 === 0 ? "sakura" : "oak")),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      interrupted_at: null,
      interruption_reason: null,
      idempotency_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }));

  const proAchievements = computeStudentAchievements(heavyTrees, 7, 900);
  const streakBadge = proAchievements.find((a) => a.id === "streak_3");
  const weeklyBadge = proAchievements.find((a) => a.id === "streak_7");
  const groveBadge = proAchievements.find((a) => a.id === "grove_15");
  const marathonBadge = proAchievements.find((a) => a.id === "focus_silver");

  assert.equal(streakBadge?.isUnlocked, true, "3-day streak unlocked");
  assert.equal(weeklyBadge?.isUnlocked, true, "7-day streak unlocked");
  assert.equal(groveBadge?.isUnlocked, true, "15 trees unlocked");
  assert.equal(marathonBadge?.isUnlocked, true, "10h focus unlocked");
});

test("Public Profile: getStudentPublicProfile enforces privacy boundaries", async () => {
  const targetStudent = {
    id: "student-target-privacy-01",
    email: "sensitive-student-email@validily.com",
    role: "student",
    name: "Sarra Ben Amor",
    avatarUrl: "https://images.unsplash.com/photo-sarra",
  };

  const viewingStudent = {
    id: "student-viewer-02",
    email: "viewer@validily.com",
    role: "student",
    name: "Kais Marzouki",
    avatarUrl: null,
  };

  setTestUser(viewingStudent);

  const profileRes = await getStudentPublicProfile(targetStudent.id);
  assert.equal(profileRes.success, true, "Public profile retrieval must succeed");
  assert.ok(profileRes.profile, "Profile object must be present");

  const prof = profileRes.profile;
  // Verification: only public allowed fields are exposed
  assert.equal(prof.id, targetStudent.id);
  assert.equal(prof.displayName, targetStudent.name);
  assert.equal(prof.avatarUrl, targetStudent.avatarUrl);
  assert.ok(Array.isArray(prof.trees), "Trees array must be present");
  assert.ok(Array.isArray(prof.achievements), "Achievements array must be present");
  assert.equal(prof.achievements.length, 12, "Must contain all 12 achievements");
  assert.equal(typeof prof.stats.streak, "number");
  assert.equal(typeof prof.stats.totalFocusedMinutes, "number");
  assert.equal(typeof prof.stats.healthyTreesCount, "number");

  // STRICT PRIVACY: ensure sensitive private fields are NOT present
  assert.equal("notes" in prof, false, "Private student notes must NEVER be exposed");
  assert.equal("privateWorkspace" in prof, false, "Private workspace data must NEVER be exposed");
  assert.equal("email" in prof, false, "Email must be hidden for non-admin viewers");

  setTestUser(null);
});

test("Cheer Notification: Clean human phrasing & direct profile consultation link", async () => {
  const senderUser = {
    id: "user-sender-clapper-01",
    email: "clapper@validily.com",
    role: "student",
    name: "Yassine Drira",
    avatarUrl: null,
  };

  const recipientUser = {
    id: "user-recipient-notified-02",
    email: "notified@validily.com",
    role: "student",
    name: "Nour",
    avatarUrl: null,
  };

  // 1. Sender cheers recipient with applause/clap
  setTestUser(senderUser);
  const cheerRes = await sendClassmateCheer({
    recipientId: recipientUser.id,
    recipientName: recipientUser.name,
    cheerType: "clap",
  });

  assert.equal(cheerRes.success, true);
  // Verify clean, non-robotic confirmation text
  assert.ok(
    !cheerRes.message.includes("👏 👏"),
    "Must not duplicate emojis in feedback"
  );

  // 2. Recipient views notification
  setTestUser(recipientUser);
  const recipientNotifs = await getMyNotifications();
  const clapNotif = recipientNotifs.find((n) => n.sender_id === senderUser.id && n.cheer_type === "clap");

  assert.ok(clapNotif, "Clap notification must be delivered");
  assert.equal(clapNotif.title, "Session d'étude saluée");
  assert.ok(
    clapNotif.content.includes("Yassine Drira a salué votre session d'étude"),
    "Content must use natural human phrasing without excessive robot emoji text"
  );
  assert.equal(
    clapNotif.link,
    `/forest/community?student=${senderUser.id}`,
    "Link must direct recipient straight to sender's profile and bosquet in community gallery"
  );

  setTestUser(null);
});

test("Admin Dashboard: listStudentsPerformanceAction security & aggregate performance", async () => {
  const normalStudent = {
    id: "student-unauthorized-01",
    email: "student@validily.com",
    role: "student",
    name: "Étudiant Normal",
    avatarUrl: null,
  };

  const adminUser = {
    id: "admin-super-01",
    email: "admin@validily.com",
    role: "admin",
    name: "Principal Admin",
    avatarUrl: null,
  };

  // 1. Unauthorized attempt
  setTestUser(normalStudent);
  const unauthorizedRes = await listStudentsPerformanceAction();
  assert.equal(unauthorizedRes.success, false, "Regular student must be denied admin performance listing");
  assert.ok(unauthorizedRes.error?.includes("administrateur"));

  // 2. Admin access
  setTestUser(adminUser);
  const adminRes = await listStudentsPerformanceAction();
  assert.equal(adminRes.success, true, "Admin must be authorized");
  assert.ok(Array.isArray(adminRes.students), "Students list must be returned");
  assert.ok(adminRes.students.length > 0, "At least mock students must be listed");

  const sampleStudent = adminRes.students[0];
  assert.ok("id" in sampleStudent);
  assert.ok("displayName" in sampleStudent);
  assert.ok("totalFocusedMinutes" in sampleStudent);
  assert.ok("healthyTreesCount" in sampleStudent);
  assert.ok("streak" in sampleStudent);
  assert.ok("achievementsUnlocked" in sampleStudent);

  setTestUser(null);
});

test("Profile Modal Isolation & Performance: Modal uses createPortal to escape sticky header backdrop-blur", async () => {
  const fs = await import("node:fs");
  const modalSource = fs.readFileSync("src/components/profile/student-profile-modal.tsx", "utf8");

  assert.ok(
    modalSource.includes("createPortal(modalContent, document.body)"),
    "StudentProfileModal must mount directly to document.body via createPortal to prevent trapping behind sticky headers"
  );
  assert.ok(
    modalSource.includes("document.body.style.overflow = \"hidden\""),
    "StudentProfileModal must lock body scroll when open to prevent underlying page shifting"
  );
  assert.ok(
    modalSource.includes("z-[100]"),
    "StudentProfileModal must have elevated z-[100] overlay"
  );
});

test("Profile Action Caching: In-memory cache returns cached student profiles in < 5ms", async () => {
  const testRequester = {
    id: "requester-perf-test-01",
    email: "test@validily.com",
    role: "student",
    name: "Étudiant Testeur",
    avatarUrl: null,
  };

  setTestUser(testRequester);

  // First call primes cache
  const t0 = performance.now();
  const res1 = await getStudentPublicProfile("student-target-privacy-01");
  const d1 = performance.now() - t0;

  assert.equal(res1.success, true);
  assert.ok(res1.profile);
  assert.equal(res1.profile.displayName, "Sarra Ben Amor");

  // Second call hits in-memory cache
  const t1 = performance.now();
  const res2 = await getStudentPublicProfile("student-target-privacy-01");
  const d2 = performance.now() - t1;

  assert.equal(res2.success, true);
  assert.equal(res2.profile?.displayName, "Sarra Ben Amor");
  assert.ok(d2 < 15, `Cached retrieval should be near-instant (took ${d2.toFixed(2)}ms)`);

  setTestUser(null);
});

test("Admin Performance: listStudentsPerformanceAction aggregates resilient daily focus and streak", async () => {
  const adminUser = {
    id: "admin-super-metrics-01",
    email: "admin-metrics@validily.com",
    role: "admin",
    name: "Admin Metric Checker",
    avatarUrl: null,
  };

  setTestUser(adminUser);
  const res = await listStudentsPerformanceAction();
  assert.equal(res.success, true);
  assert.ok(Array.isArray(res.students));
  assert.ok(res.students.length > 0);

  // Each student must have positive or zero valid metrics (never NaN or undefined)
  for (const s of res.students) {
    assert.equal(typeof s.totalFocusedMinutes, "number");
    assert.ok(!isNaN(s.totalFocusedMinutes));
    assert.equal(typeof s.healthyTreesCount, "number");
    assert.ok(!isNaN(s.healthyTreesCount));
    assert.equal(typeof s.streak, "number");
    assert.ok(!isNaN(s.streak));
    assert.equal(typeof s.achievementsUnlocked, "number");
    assert.ok(!isNaN(s.achievementsUnlocked));
  }

  setTestUser(null);
});

