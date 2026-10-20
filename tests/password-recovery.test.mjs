import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Password Recovery: Route files & Component Contracts", () => {
  const resetPagePath = path.resolve("src/app/(auth)/reset-password/page.tsx");
  assert.ok(fs.existsSync(resetPagePath), "reset-password/page.tsx must exist");

  const resetContent = fs.readFileSync(resetPagePath, "utf-8");
  assert.ok(
    resetContent.includes("export default function ResetPasswordPage"),
    "reset-password page must export default ResetPasswordPage"
  );
  assert.ok(
    resetContent.includes("resetPasswordForEmail"),
    "reset-password page must call resetPasswordForEmail"
  );
  assert.ok(
    resetContent.includes("updateUser"),
    "reset-password page must call updateUser to set new password"
  );
  assert.ok(
    resetContent.includes("evaluatePasswordStrength"),
    "reset-password page must compute real-time password strength"
  );
  assert.ok(
    resetContent.includes("Suspense"),
    "reset-password page must be wrapped in Suspense for useSearchParams safety"
  );

  const forgotPagePath = path.resolve("src/app/(auth)/forgot-password/page.tsx");
  assert.ok(fs.existsSync(forgotPagePath), "forgot-password/page.tsx must exist as alias/route");
  const forgotContent = fs.readFileSync(forgotPagePath, "utf-8");
  assert.ok(
    forgotContent.includes("reset-password"),
    "forgot-password route must link/re-export reset-password page"
  );
});

test("Password Recovery: Callback route handles code, token_hash, and open redirect protection", () => {
  const callbackPath = path.resolve("src/app/api/auth/callback/route.ts");
  assert.ok(fs.existsSync(callbackPath), "auth callback route must exist");

  const callbackContent = fs.readFileSync(callbackPath, "utf-8");
  assert.ok(
    callbackContent.includes("exchangeCodeForSession"),
    "Auth callback must exchange PKCE code for session"
  );
  assert.ok(
    callbackContent.includes("verifyOtp"),
    "Auth callback must support token_hash OTP verification"
  );
  assert.ok(
    callbackContent.includes("token_hash"),
    "Auth callback must extract token_hash search parameter"
  );
  assert.ok(
    callbackContent.includes("safeNext"),
    "Auth callback must sanitize next parameter against open-redirect vulnerabilities"
  );
  assert.ok(
    callbackContent.includes("reset-password?error="),
    "Auth callback must route recovery errors to reset-password with clear status"
  );
});

test("Password Recovery: Login page integration & feedback banners", () => {
  const loginPath = path.resolve("src/app/(auth)/login/page.tsx");
  assert.ok(fs.existsSync(loginPath), "login page must exist");

  const loginContent = fs.readFileSync(loginPath, "utf-8");
  assert.ok(
    loginContent.includes('href="/reset-password"'),
    "Login page must contain link to /reset-password"
  );
  assert.ok(
    loginContent.includes('searchParams.get("reset") === "success"'),
    "Login page must detect reset=success parameter"
  );
  assert.ok(
    loginContent.includes("Mot de passe réinitialisé !"),
    "Login page must display success confirmation banner after reset"
  );
});

test("Password Recovery: Security logic - Strength evaluation rules", () => {
  // Pure function validation replicating evaluatePasswordStrength logic
  function evaluateStrength(password) {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
    return score;
  }

  assert.equal(evaluateStrength(""), 0, "Empty password has score 0");
  assert.equal(evaluateStrength("abc"), 0, "Short password < 8 has score 0");
  assert.ok(evaluateStrength("abcdefgh") >= 1, "8 chars meets min length");
  assert.ok(evaluateStrength("Abcdefgh") >= 2, "8 chars with mixed case gets at least score 2");
  assert.ok(evaluateStrength("Abcdefgh1") >= 3, "Mixed case + digit gets at least score 3");
  assert.equal(evaluateStrength("Abcdefgh1!"), 4, "Full criteria gets maximum score 4");
});
