import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  setTestUser,
  assertAdmin,
  assertPermanentAdmin,
  getRequesterUser,
} from "../src/lib/auth/authorization.ts";

test("SEC-HIERARCHY-01: Authorization engine distinguishes permanent and temporary admins", async () => {
  // 1. Temporary Admin Actor
  const tempAdmin = {
    id: "temp-admin-01",
    email: "delegated.admin@validily.com",
    role: "admin",
    name: "Delegated Admin",
    isTemporaryAdmin: true,
    isPermanentAdmin: false,
    temporaryExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  setTestUser(tempAdmin);

  const adminCheck = await assertAdmin();
  assert.equal(adminCheck.authorized, true, "Temporary admin must be recognized as admin");
  assert.equal(adminCheck.isTemporary, true, "isTemporary must be true");
  assert.equal(adminCheck.isPermanent, false, "isPermanent must be false");

  const permCheck = await assertPermanentAdmin();
  assert.equal(permCheck.authorized, false, "assertPermanentAdmin must reject temporary admins");
  assert.match(
    permCheck.error || "",
    /administrateurs temporaires/i,
    "Must explain that action is restricted for temporary admins"
  );

  // 2. Permanent (Master) Admin Actor
  const masterAdmin = {
    id: "master-admin-01",
    email: "yassinedrira3@gmail.com",
    role: "admin",
    name: "Yassine Drira",
    isTemporaryAdmin: false,
    isPermanentAdmin: true,
  };

  setTestUser(masterAdmin);

  const masterAdminCheck = await assertAdmin();
  assert.equal(masterAdminCheck.authorized, true);
  assert.equal(masterAdminCheck.isTemporary, false);
  assert.equal(masterAdminCheck.isPermanent, true);

  const masterPermCheck = await assertPermanentAdmin();
  assert.equal(masterPermCheck.authorized, true, "Permanent admin must pass assertPermanentAdmin");

  // 3. Student Actor
  const student = {
    id: "student-01",
    email: "student@validily.com",
    role: "student",
    name: "Student",
  };

  setTestUser(student);

  const studentCheck = await assertAdmin();
  assert.equal(studentCheck.authorized, false, "Student must be rejected by assertAdmin");

  setTestUser(undefined);
});

test("SEC-HIERARCHY-02: admin-actions.ts enforces role delegation restrictions and master protection", () => {
  const adminCode = fs.readFileSync(path.resolve("src/lib/actions/admin-actions.ts"), "utf8");

  // 1. grantTemporaryAdminRole contract
  assert.ok(
    adminCode.includes("export async function grantTemporaryAdminRole"),
    "admin-actions must export grantTemporaryAdminRole"
  );
  const grantSnippet = adminCode.slice(
    adminCode.indexOf("export async function grantTemporaryAdminRole"),
    adminCode.indexOf("export async function revokeAdminRole")
  );

  // Assert temporary admin cannot grant or delegate
  assert.ok(
    grantSnippet.includes("adminCheck.isTemporary") ||
      grantSnippet.includes("adminCheck.user?.isTemporaryAdmin"),
    "grantTemporaryAdminRole must block temporary admins from delegating"
  );

  // Assert anti-self-extension
  assert.ok(
    grantSnippet.includes("params.userId === adminCheck.user?.id"),
    "grantTemporaryAdminRole must prevent callers from extending their own privileges"
  );

  // Assert master admin cannot be altered
  assert.ok(
    grantSnippet.includes("yassinedrira3@gmail.com"),
    "grantTemporaryAdminRole must protect master admin email"
  );

  // Assert announcement notification dispatch
  assert.ok(
    grantSnippet.includes("createNotification") &&
      grantSnippet.includes("role_assignment"),
    "grantTemporaryAdminRole must dispatch an official role_assignment notification"
  );

  // 2. revokeAdminRole contract
  assert.ok(
    adminCode.includes("export async function revokeAdminRole"),
    "admin-actions must export revokeAdminRole"
  );
  const revokeSnippet = adminCode.slice(adminCode.indexOf("export async function revokeAdminRole"));

  // Assert temporary admin cannot revoke
  assert.ok(
    revokeSnippet.includes("adminCheck.isTemporary") ||
      revokeSnippet.includes("adminCheck.user?.isTemporaryAdmin"),
    "revokeAdminRole must block temporary admins from revoking roles"
  );

  // Assert self-revocation protection
  assert.ok(
    revokeSnippet.includes("userId === adminCheck.user?.id"),
    "revokeAdminRole must prevent callers from revoking their own access"
  );

  // Assert master admin cannot be demoted
  assert.ok(
    revokeSnippet.includes("yassinedrira3@gmail.com"),
    "revokeAdminRole must protect master admin account against demotion"
  );

  // 3. deleteSubject & createSemester upper admin protection
  const delSnippet = adminCode.slice(
    adminCode.indexOf("export async function deleteSubject"),
    adminCode.indexOf("export async function createSemester")
  );
  assert.ok(
    delSnippet.includes("adminCheck.isTemporary") ||
      delSnippet.includes("adminCheck.user?.isTemporaryAdmin"),
    "deleteSubject must protect upper admin curriculum against deletion by temporary admins"
  );

  const semSnippet = adminCode.slice(
    adminCode.indexOf("export async function createSemester"),
    adminCode.indexOf("export interface ManagedUser")
  );
  assert.ok(
    semSnippet.includes("adminCheck.isTemporary") ||
      semSnippet.includes("adminCheck.user?.isTemporaryAdmin"),
    "createSemester must protect academic structure against creation by temporary admins"
  );
});

test("SEC-HIERARCHY-03: vip-actions.ts enforces temporary admin lock and announcements", () => {
  const vipCode = fs.readFileSync(path.resolve("src/lib/actions/vip-actions.ts"), "utf8");

  // 1. grantVipAccess blocks temporary admins
  const grantVipSnippet = vipCode.slice(
    vipCode.indexOf("export async function grantVipAccess"),
    vipCode.indexOf("export async function revokeVipAccess")
  );
  assert.ok(
    grantVipSnippet.includes("adminCheck.isTemporary") ||
      grantVipSnippet.includes("adminCheck.user?.isTemporaryAdmin"),
    "grantVipAccess must block temporary admins from granting VIP"
  );

  // 2. grantVipAccess dispatches official announcement notification
  assert.ok(
    grantVipSnippet.includes("createNotification") &&
      grantVipSnippet.includes("role_assignment"),
    "grantVipAccess must dispatch announcement notification with role_assignment type"
  );
  assert.ok(
    grantVipSnippet.includes("badge VIP Vérifié"),
    "grantVipAccess notification content must celebrate verified VIP badge activation"
  );

  // 3. revokeVipAccess blocks temporary admins
  const revokeVipSnippet = vipCode.slice(
    vipCode.indexOf("export async function revokeVipAccess"),
    vipCode.indexOf("export async function listVipEntitlements")
  );
  assert.ok(
    revokeVipSnippet.includes("adminCheck.isTemporary") ||
      revokeVipSnippet.includes("adminCheck.user?.isTemporaryAdmin"),
    "revokeVipAccess must block temporary admins from revoking VIP"
  );
});

test("UI-UX-01: Verified VIP Badge Component Contracts", () => {
  const badgePath = path.resolve("src/components/ui/vip-badge.tsx");
  assert.ok(fs.existsSync(badgePath), "src/components/ui/vip-badge.tsx must exist");
  const badgeCode = fs.readFileSync(badgePath, "utf8");

  assert.ok(badgeCode.includes("export function VipBadge"), "Must export VipBadge component");
  assert.ok(badgeCode.includes("avatar-badge"), "Must support avatar-badge variant for student avatars");
  assert.ok(badgeCode.includes("compact"), "Must support compact badge variant");
  assert.ok(badgeCode.includes("full"), "Must support full badge variant with gradient");
  assert.ok(badgeCode.includes("pill"), "Must support pill badge variant");
  assert.ok(badgeCode.includes("Crown"), "Must render Crown emblem for verified VIPs");
  assert.ok(badgeCode.includes("Sparkles"), "Must render Sparkles luxury effect");
});

test("UI-UX-02: App Header & Workspace Shell VIP Badge Integration", () => {
  const headerCode = fs.readFileSync(path.resolve("src/components/layout/app-header.tsx"), "utf8");
  assert.ok(headerCode.includes("VipBadge"), "AppHeader must import VipBadge");
  assert.ok(headerCode.includes("user.isVip"), "AppHeader must verify user.isVip");
  assert.ok(headerCode.includes("avatar-badge"), "AppHeader must render avatar-badge on profile pic");

  const workspaceCode = fs.readFileSync(
    path.resolve("src/components/workspace/student-private-workspace.tsx"),
    "utf8"
  );
  assert.ok(workspaceCode.includes("VipBadge"), "StudentPrivateWorkspace must import VipBadge");
  assert.ok(workspaceCode.includes("isVip"), "StudentPrivateWorkspace must accept isVip prop");
  assert.ok(workspaceCode.includes("avatar-badge"), "StudentPrivateWorkspace must render avatar-badge on student avatar");

  const mySpaceCode = fs.readFileSync(
    path.resolve("src/app/(workspace)/my-space/page.tsx"),
    "utf8"
  );
  assert.ok(mySpaceCode.includes("getUserVipStatus"), "my-space page must query VIP entitlement");
  assert.ok(mySpaceCode.includes("isVip={isVip}"), "my-space page must pass isVip to workspace");
});

test("UI-UX-03: Notification Center Top UI/UX Announcement Presentation", () => {
  const bellCode = fs.readFileSync(
    path.resolve("src/components/notifications/notification-bell.tsx"),
    "utf8"
  );
  assert.ok(bellCode.includes("role_assignment"), "NotificationBell must support role_assignment");
  assert.ok(bellCode.includes("announcement"), "NotificationBell must support announcement");
  assert.ok(bellCode.includes("Attribution de Rôle"), "Must display dedicated Attribution de Rôle chip");
  assert.ok(bellCode.includes("Statut VIP"), "Must display dedicated Statut VIP chip");
  assert.ok(bellCode.includes("isSpecial"), "Must flag special announcement cards with gold/indigo styling");
});

test("UI-UX-04: Admin Manager Temporary Admin Governance & UI Controls", () => {
  const adminManagerCode = fs.readFileSync(
    path.resolve("src/components/admin/admin-manager.tsx"),
    "utf8"
  );

  // Delegation tab shows warning banner for temporary admins
  assert.ok(
    adminManagerCode.includes("currentUser?.isTemporaryAdmin"),
    "AdminManager must check currentUser?.isTemporaryAdmin"
  );
  assert.ok(
    adminManagerCode.includes("Privilèges Administrateur Délégué (Lecture Seule)"),
    "AdminManager must show clear banner explaining read-only delegation for temp admins"
  );

  // Row actions locked for temp admin
  assert.ok(
    adminManagerCode.includes("isCallerTemp"),
    "AdminManager must compute isCallerTemp for table rows"
  );
  assert.ok(
    adminManagerCode.includes("Lecture seule"),
    "AdminManager must display Lecture seule lock for temporary admins in delegation rows"
  );

  // Passes isTemporaryAdmin to AdminVipManager
  assert.ok(
    adminManagerCode.includes("<AdminVipManager"),
    "AdminManager must mount AdminVipManager"
  );
  assert.ok(
    adminManagerCode.includes("isTemporaryAdmin={Boolean(currentUser?.isTemporaryAdmin)}"),
    "AdminManager must pass isTemporaryAdmin prop to AdminVipManager"
  );

  // AdminVipManager locks grant & revoke for temporary admins
  const vipManagerCode = fs.readFileSync(
    path.resolve("src/components/admin/admin-vip-manager.tsx"),
    "utf8"
  );
  assert.ok(
    vipManagerCode.includes("isTemporaryAdmin"),
    "AdminVipManager must receive isTemporaryAdmin prop"
  );
  assert.ok(
    vipManagerCode.includes("Réservé Admin Permanent"),
    "AdminVipManager must show Réservé Admin Permanent lock when isTemporaryAdmin is true"
  );

  // updateSubject properly awaits resolveSemesterId to avoid passing Promise to Supabase
  const adminActionsCode = fs.readFileSync(
    path.resolve("src/lib/actions/admin-actions.ts"),
    "utf8"
  );
  assert.match(
    adminActionsCode,
    /updatePayload\.semester_id\s*=\s*await\s+resolveSemesterId/,
    "updateSubject must await resolveSemesterId to prevent UUID syntax errors"
  );
});
