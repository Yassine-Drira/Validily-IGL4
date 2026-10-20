import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("AUTH-01: Server-side authentication action exists and validates credentials", async () => {
  const authActionsPath = path.join(rootDir, "src/lib/actions/auth-actions.ts");
  assert.ok(fs.existsSync(authActionsPath), "auth-actions.ts must exist");

  const content = fs.readFileSync(authActionsPath, "utf-8");
  assert.match(content, /"use server"/, "Must be a Server Action file");
  assert.match(content, /export async function loginWithEmailAction/, "loginWithEmailAction must be exported");
  assert.match(content, /supabase\.auth\.signInWithPassword/, "Must call supabase signInWithPassword server-side");
  assert.match(content, /Invalid login credentials/, "Must sanitize invalid credentials message");
});

test("AUTH-02: LoginPage uses server-side loginWithEmailAction with client fallback", async () => {
  const loginPagePath = path.join(rootDir, "src/app/(auth)/login/page.tsx");
  const content = fs.readFileSync(loginPagePath, "utf-8");

  assert.match(content, /loginWithEmailAction/, "LoginPage must import loginWithEmailAction");
  assert.match(content, /await loginWithEmailAction\(email, password\)/, "handleLogin must call loginWithEmailAction");
  assert.match(content, /Failed to fetch/, "handleLogin must handle Failed to fetch gracefully");
});

test("PLANNER-UI-01: academic-todo-list does not clip 3-dots overflow menu", async () => {
  const todoListPath = path.join(rootDir, "src/components/planner/academic-todo-list.tsx");
  const content = fs.readFileSync(todoListPath, "utf-8");

  // Verify task card container is not overflow-hidden when menu is active
  assert.match(content, /isMenuOpen \? "z-30 overflow-visible" : "z-1 overflow-visible"/, "Task card must allow dropdown overflow");
  assert.match(content, /Planifier sur l'agenda/, "Must contain Planifier sur l'agenda button");
  assert.match(content, /Modifier/, "Must contain Modifier button");
  assert.match(content, /Dupliquer/, "Must contain Dupliquer button");
  assert.match(content, /Supprimer/, "Must contain Supprimer button");
});

test("AUTH-03: Server-side registration action exists and is used in RegisterPage", async () => {
  const authActionsPath = path.join(rootDir, "src/lib/actions/auth-actions.ts");
  const authContent = fs.readFileSync(authActionsPath, "utf-8");
  assert.match(authContent, /export async function registerWithEmailAction/, "registerWithEmailAction must be exported");

  const registerPagePath = path.join(rootDir, "src/app/(auth)/register/page.tsx");
  const regContent = fs.readFileSync(registerPagePath, "utf-8");
  assert.match(regContent, /registerWithEmailAction/, "RegisterPage must import and use registerWithEmailAction");
});

test("RELEASE-01: v1.3 release announcement gate verified and registered", async () => {
  const notifActionsPath = path.join(rootDir, "src/lib/actions/notification-actions.ts");
  const notifContent = fs.readFileSync(notifActionsPath, "utf-8");
  assert.match(notifContent, /id: "announcement-v1-3-release"/, "v1.3 announcement must be in registry");
  assert.match(notifContent, /release_version: "v1.3"/, "Must specify v1.3 version");

  const modalPath = path.join(rootDir, "src/components/notifications/announcement-modal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  assert.match(modalContent, /SEO Officiel & Indexation/, "Must contain SEO pillar");
  assert.match(modalContent, /Sécurité & Récupération/, "Must contain Security & Recovery pillar");
  assert.match(modalContent, /Planning 0ms & Menu Actions/, "Must contain Planning 0ms pillar");
  assert.match(modalContent, /Visibilité Public \/ Privé/, "Must contain Visibility pillar");
});

