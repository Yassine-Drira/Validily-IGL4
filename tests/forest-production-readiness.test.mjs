import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  setTestUser,
  getTestUser,
} from "../src/lib/auth/authorization.ts";
import {
  startFocusSession,
  getMyForest,
  getCommunityForests,
  sendClassmateCheer,
  updateForestPreferences,
} from "../src/lib/actions/forest-actions.ts";

test("Forest Production Readiness: Unauthenticated visitor receives authenticated: false", async () => {
  setTestUser(null);

  const res = await getMyForest();
  assert.equal(res.authenticated, false, "Unlogged user must have authenticated: false");
  assert.equal(res.trees.length, 0, "Unlogged user must receive 0 trees to trigger login gate");
  assert.equal(res.stats.healthyCount, 0);
  assert.equal(res.stats.totalFocusedMinutes, 0);
});

test("Forest Production Readiness: Injects rich starter test grove (5 healthy trees) for active student", async () => {
  setTestUser({
    id: "student-ready-001",
    email: "student01@validily.tn",
    role: "student",
    name: "Étudiant IGL4",
  });

  const res = await getMyForest();
  assert.equal(res.authenticated, true);
  assert.ok(res.trees.length >= 5, "Must inject at least 5 starter trees for immediate flourishing experience");
  
  // Verify diversity of botanical species
  const species = new Set(res.trees.map((t) => t.tree_species));
  assert.ok(species.has("cedar"), "Grove should contain Cedar");
  assert.ok(species.has("oak"), "Grove should contain Oak");
  assert.ok(species.has("pine"), "Grove should contain Pine");
  assert.ok(species.has("willow"), "Grove should contain Willow");

  // Verify subjects & labels
  const subjects = res.trees.map((t) => t.session?.session_label).filter(Boolean);
  assert.ok(subjects.length >= 4, "Trees must have realistic academic session labels");

  // Verify stats calculation
  assert.ok(res.stats.healthyCount >= 5, "All starter trees must be healthy");
  assert.equal(res.stats.leaflessCount, 0);
  assert.ok(res.stats.totalFocusedMinutes >= 180, "Total focus minutes must reflect combined sessions (> 180 min)");
  assert.ok(res.stats.currentStreak >= 1, "Consecutive daily streak must be positive");
});

test("Forest Production Readiness: Community Cohort returns active IGL4 classmates", async () => {
  setTestUser({
    id: "student-ready-001",
    role: "student",
    name: "Étudiant IGL4",
  });

  const members = await getCommunityForests();
  assert.ok(members.length >= 4, "Must return at least 4 active IGL4 classmates in the promotion gallery");

  const names = members.map((m) => m.displayName);
  assert.ok(names.includes("Yassine Drira"), "Cohort must include Yassine Drira");
  assert.ok(names.includes("Amen"), "Cohort must include Amen");
  assert.ok(names.includes("test001"), "Cohort must include test001");

  for (const member of members) {
    assert.ok(member.healthyTreeCount > 0, "Classmate card must display healthy trees");
    assert.ok(member.totalFocusedMinutes > 0, "Classmate card must display focus duration");
    assert.ok(member.recentSpecies.length > 0, "Classmate card must display botanical species");
  }
});

test("Forest Production Readiness: Member interaction sendClassmateCheer enforces security & feedback", async () => {
  setTestUser({
    id: "student-sender-001",
    role: "student",
    name: "Étudiant Expéditeur",
  });

  // Self-cheer prevention
  const selfCheer = await sendClassmateCheer({
    recipientId: "student-sender-001",
    cheerType: "water",
  });
  assert.equal(selfCheer.success, false);
  assert.match(selfCheer.error || "", /pas vous encourager vous-même/);

  // Unauthenticated cheer prevention
  setTestUser(null);
  const unauthCheer = await sendClassmateCheer({
    recipientId: "amen-002",
    recipientName: "Amen",
    cheerType: "fire",
  });
  assert.equal(unauthCheer.success, false);
  assert.match(unauthCheer.error || "", /Connexion requise/);

  // Valid peer cheer
  setTestUser({
    id: "student-sender-001",
    role: "student",
    name: "Étudiant Expéditeur",
  });
  const validCheer = await sendClassmateCheer({
    recipientId: "amen-002",
    recipientName: "Amen",
    cheerType: "water",
  });
  assert.equal(validCheer.success, true);
  assert.match(validCheer.message, /Arrosage bienveillant envoyé à Amen/);
});

test("Forest Production Readiness: Route protection proxy.ts mandates login on protected endpoints", () => {
  const proxyCode = fs.readFileSync(path.resolve("src/proxy.ts"), "utf-8");
  assert.match(proxyCode, /isProtectedRoute/, "proxy.ts must define protected routes");
  assert.match(proxyCode, /pathname\.startsWith\("\/forest"\)/, "proxy.ts must protect /forest");
  assert.match(proxyCode, /pathname\.startsWith\("\/my-space"\)/, "proxy.ts must protect /my-space");
  assert.match(proxyCode, /pathname\.startsWith\("\/admin"\)/, "proxy.ts must protect /admin");
  assert.match(proxyCode, /NextResponse\.redirect\(loginUrl\)/, "proxy.ts must redirect unauthenticated visitors to login");
});
