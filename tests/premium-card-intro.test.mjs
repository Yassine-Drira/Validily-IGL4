import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("Instant Workspace Rendering Contract: Complete eradication of black-screen intro holding", (t) => {
  // 1. RootLayout must never inject global holding script or class
  const rootLayoutPath = path.join(rootDir, "src/app/layout.tsx");
  const rootLayoutContent = fs.readFileSync(rootLayoutPath, "utf-8");
  assert.ok(!rootLayoutContent.includes("validily-intro-init"), "Root layout must be free of blocking holding scripts");
  assert.ok(!rootLayoutContent.includes("validily-intro-holding"), "Root layout must never add validily-intro-holding");

  // 2. Workspace layout must be free of blocking intro scripts and overlays
  const wsLayoutPath = path.join(rootDir, "src/app/(workspace)/layout.tsx");
  const wsLayoutContent = fs.readFileSync(wsLayoutPath, "utf-8");
  assert.ok(!wsLayoutContent.includes("validily-intro-holding-script"), "Workspace layout must not contain intro holding script");
  assert.ok(!wsLayoutContent.includes("<PremiumCardIntro"), "Workspace layout must not mount PremiumCardIntro overlay");

  // 3. globals.css must be clean of any validily-intro-holding black-screen rules
  const globalsCssPath = path.join(rootDir, "src/app/globals.css");
  const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");
  assert.ok(!globalsCssContent.includes("html.validily-intro-holding"), "globals.css must not contain validily-intro-holding");
  assert.ok(!globalsCssContent.includes("holdingSafetyRelease"), "globals.css must not contain holdingSafetyRelease keyframes");
  assert.ok(!globalsCssContent.includes("workspaceSafetyReveal"), "globals.css must not contain workspaceSafetyReveal keyframes");

  // 4. Login page must transition cleanly without blocking cookies or storage hacks
  const loginPagePath = path.join(rootDir, "src/app/(auth)/login/page.tsx");
  const loginContent = fs.readFileSync(loginPagePath, "utf-8");
  assert.ok(!loginContent.includes("validily_intro_pending"), "Login page must not set validily_intro_pending cookie");
  assert.ok(!loginContent.includes("validily_login_event"), "Login page must not set validily_login_event");
  assert.ok(loginContent.includes("window.location.href = nextUrl"), "Login page must direct cleanly to nextUrl");
});
