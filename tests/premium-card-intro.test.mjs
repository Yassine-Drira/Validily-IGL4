import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("Premium Magical Card Intro Contract: Component & CSS Module exist and follow visual brief", (t) => {
  const componentPath = path.join(rootDir, "src/components/brand/premium-card-intro.tsx");
  const cssPath = path.join(rootDir, "src/components/brand/premium-card-intro.module.css");

  assert.ok(fs.existsSync(componentPath), "premium-card-intro.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "premium-card-intro.module.css must exist");

  const componentContent = fs.readFileSync(componentPath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  // Visual Direction Checks
  assert.ok(cssContent.includes("perspective: 1200px"), "Must configure 3D perspective");
  assert.ok(cssContent.includes("preserve-3d"), "Must preserve 3D for smooth rotation");
  assert.ok(cssContent.includes("rotateY"), "Must use rotateY for authentic card flip");
  assert.ok(cssContent.includes("lightSweep"), "Must include light sweep across card face");
  assert.ok(cssContent.includes("haloPulse"), "Must include subtle atmospheric halo");
  assert.ok(cssContent.includes("particle"), "Must include sparse floating stardust particles");

  // Logo asset preservation
  assert.ok(componentContent.includes("rect\n                      x=\"48\"\n                      y=\"28\"") || componentContent.includes("d=\"M74 116 L124 166 L178 82"), "Must animate the authentic Validily card logo geometry");
  assert.ok(componentContent.includes("#D4A346"), "Must preserve the gold apex accent");
  assert.ok(componentContent.includes("validily-igl4"), "Must include brand wordmark");
});

test("Premium Magical Card Intro Contract: Session-scoped login playback rules", (t) => {
  const componentPath = path.join(rootDir, "src/components/brand/premium-card-intro.tsx");
  const componentContent = fs.readFileSync(componentPath, "utf-8");

  // Session storage keys
  assert.ok(componentContent.includes("validily_intro_played_${user.id}"), "Must scope played flag to user.id in sessionStorage");
  assert.ok(componentContent.includes("validily_login_event"), "Must check for fresh login event marker");
  assert.ok(componentContent.includes("sessionStorage.setItem(introKey, \"true\")"), "Must set introKey to true to prevent replay on refresh/nav");

  // Strict Mode remount protection
  assert.ok(componentContent.includes("hasTriggeredRef"), "Must prevent duplicate playback during React Strict Mode remounts");

  // Login page integration
  const loginPagePath = path.join(rootDir, "src/app/(auth)/login/page.tsx");
  const loginContent = fs.readFileSync(loginPagePath, "utf-8");
  assert.ok(loginContent.includes("sessionStorage.setItem(\"validily_login_event\", \"true\")"), "Login page must set login event upon successful signInWithPassword");

  // Workspace layout mount
  const layoutPath = path.join(rootDir, "src/app/(workspace)/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert.ok(layoutContent.includes("<PremiumCardIntro user={initialUser} />"), "Workspace layout must mount PremiumCardIntro with initialUser");
});

test("Premium Magical Card Intro Contract: Accessibility & Reduced Motion", (t) => {
  const componentPath = path.join(rootDir, "src/components/brand/premium-card-intro.tsx");
  const cssPath = path.join(rootDir, "src/components/brand/premium-card-intro.module.css");

  const componentContent = fs.readFileSync(componentPath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  // Skip button & Escape key
  assert.ok(componentContent.includes("handleSkip"), "Must provide skip handler");
  assert.ok(componentContent.includes("e.key === \"Escape\""), "Must listen for Escape key to skip");
  assert.ok(componentContent.includes("Passer l'intro") || componentContent.includes("Passer l&apos;intro"), "Must have accessible skip button text");
  assert.ok(componentContent.includes("role=\"dialog\""), "Must have accessible dialog semantics");

  // Prefers Reduced Motion
  assert.ok(componentContent.includes("window.matchMedia(\"(prefers-reduced-motion: reduce)\")"), "Must check prefers-reduced-motion in JS");
  assert.ok(cssContent.includes("@media (prefers-reduced-motion: reduce)"), "Must support prefers-reduced-motion in CSS");
  assert.ok(cssContent.includes("transform: none !important"), "Must disable 3D spinning under reduced motion");
});

test("Premium Magical Card Intro Contract: Unauthenticated visitors never trigger intro", (t) => {
  const componentPath = path.join(rootDir, "src/components/brand/premium-card-intro.tsx");
  const componentContent = fs.readFileSync(componentPath, "utf-8");

  assert.ok(componentContent.includes("if (!user?.id && !isForceReplay"), "Must bail out immediately if user is null/guest");
  assert.ok(componentContent.includes("if (!isMounted) return null;"), "Must not render any DOM overlay when not mounted");
});

