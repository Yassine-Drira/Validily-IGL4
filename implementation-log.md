# VALIDILY-IGL4 — Incremental Upgrade Implementation Log

**Date:** 2026-10-17  
**Platform:** Next.js 16.4.1 (Turbopack) / React 19.3.0 / Supabase SSR / TailwindCSS v4  
**Operating State:** Local-first, Free-Tier Quota Preserved, Zero Remote Pushes  
**Test Suite:** 206 / 206 Tests Passing (100% Green)  
**Production Build:** Clean (`npx next build` exited 0)  

---

## 1. Executive Summary & Verification Matrix

| Area / Task | Scope | Status | Notes |
|---|---|---|---|
| **Task 1: Migration Reliability** | `supabase/migrations/20261017030000_subject_folders_and_notifications.sql` | **PASS (Local AST / Syntax)**<br>**UNVERIFIED (Remote Live Supabase)** | Migration is fully idempotent using `DROP POLICY IF EXISTS ...; CREATE POLICY ...`. Foreign keys and cascading deletes configured safely. Remote application marked UNVERIFIED to protect live database per free-tier protocol. |
| **Task 2: Upload Compatibility** | `src/app/api/upload/route.ts` & `src/lib/actions/resource-actions.ts` | **PASS** | Supports both `camelCase` and `snake_case` form parameters. Documented Vercel 4.5 MB edge payload wall. Implemented `createSignedUploadUrlAction` for direct-to-storage uploads up to 50 MB with per-user partitioning. |
| **Task 3: Distributed Abuse Protection** | `src/lib/actions/forest-actions.ts` & `src/lib/actions/quiz-actions.ts` | **PASS (Single-Instance)**<br>**UNVERIFIED (Cross-Instance Cluster)** | Cheer cooldown map updated atomically on entry to prevent concurrent race conditions. Added in-flight burst lock for quiz submissions. Cross-instance synchronization requires external distributed store (Redis/KV). |
| **Task 4: Regression & Compatibility** | Full test suite & Next.js production build | **PASS** | 206/206 tests passing across all 11 test suites. Production build succeeds with 0 TypeScript or lint errors. |

---

## 2. Findings & Verified Remediation Status

| Finding ID | Severity | Component / Route | Audit Verification | Status | Remediation Summary |
|---|---|---|---|---|---|
| `SEC-CRIT-001` | **CRITICAL** | `src/lib/actions/forest-actions.ts` (`resetAllForestProgressAction`) | **CONFIRMED** | **FIXED** | Enforced `assertPermanentAdmin()`. Prevents anonymous callers, students, and temporary delegated admins from wiping global forest entries. |
| `SEC-HIGH-002` | **HIGH** | `src/lib/actions/quiz-actions.ts` (`submitQuizAttempt`) | **CONFIRMED** | **FIXED** | Replaced client-trusted score with server-authoritative recalculation using authoritative `quiz_questions` and `quiz_options` via service role. Added 2s anti-replay throttle. |
| `SEC-HIGH-003` | **HIGH** | `src/components/quizzes/interactive-html-runner.tsx` | **CONFIRMED** | **FIXED** | Restricted iframe sandbox to `allow-scripts allow-forms` (stripped `allow-modals` and `allow-popups`). Added strict `event.source === iframeRef.current.contentWindow` validation. |
| `PRIV-HIGH-012` | **HIGH** | `src/lib/actions/email-actions.ts` (`getBroadcastSettingsSummary`) | **CONFIRMED** | **FIXED** | Enforced `assertAdmin()`. Unauthenticated callers or students receive safe empty summaries without user emails or count leaks. |
| `ABUSE-HIGH-011` | **HIGH** | `src/lib/actions/forest-actions.ts` (`sendClassmateCheer`) | **CONFIRMED** | **FIXED** | Implemented 60-second cooldown per `(requester.id, recipientId)` pair across database and in-memory cache with immediate atomic lock on entry. |
| `ARCH-CRIT-004` | **HIGH** | `src/lib/actions/folder-actions.ts` & `supabase/migrations/` | **CONFIRMED** | **FIXED** | Created backward-compatible local migration `20261017030000_subject_folders_and_notifications.sql`. Enhanced `folder-actions.ts` with database synchronization and graceful fallback. |
| `SEC-MED-005` | **MEDIUM** | `src/app/api/upload/route.ts` | **CONFIRMED** | **FIXED** | Added initial magic byte inspection (`%PDF-` validation, rejection of Windows MZ and Linux ELF executables) and per-user upload rate limiting (15/min). |
| `COMPAT-006` | **MEDIUM** | `src/app/api/upload/route.ts` | **CONFIRMED** | **FIXED** | Supported both camelCase (`subjectId`, `categoryId`) and snake_case (`subject_id`, `category_id`) form fields. |
| `LIMIT-HIGH-013` | **HIGH** | `src/lib/actions/resource-actions.ts` | **CONFIRMED** | **FIXED** | Created `createSignedUploadUrlAction` enabling secure direct-to-storage upload for large files up to 50 MB, bypassing Vercel's 4.5 MB proxy limit. |

---

## 3. Detailed Task Walkthrough & Root Causes

### Task 1 — Migration Reliability
- **File:** [supabase/migrations/20261017030000_subject_folders_and_notifications.sql](file:///c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4/supabase/migrations/20261017030000_subject_folders_and_notifications.sql)
- **Review:**
  - Ensured all policies use `DROP POLICY IF EXISTS <policy_name> ON <table_name>;` followed by `CREATE POLICY <policy_name> ON <table_name> ...`. This makes the migration safely re-runnable without retaining outdated or overly permissive policies.
  - Foreign keys reference `auth.users(id) ON DELETE CASCADE` and `subjects(id) ON DELETE CASCADE`.
  - Non-destructive: Uses `CREATE TABLE IF NOT EXISTS` and preserves existing records.
  - Performance indexes added: `idx_subject_folders_subject_id`, `idx_subject_folders_owner_id`, `idx_notifications_user_unread`, `idx_notifications_created_at`.
- **Status:** PASS locally. Marked **UNVERIFIED** for remote Supabase execution (no remote execution performed to protect live database per free-tier protocol).

### Task 2 — Upload Compatibility & Vercel Limitations
- **Files:** [src/app/api/upload/route.ts](file:///c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4/src/app/api/upload/route.ts), [src/lib/actions/resource-actions.ts](file:///c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4/src/lib/actions/resource-actions.ts)
- **Review & Enhancements:**
  - **Form Field Fallback:** `src/app/api/upload/route.ts` extracts `formData.get("subjectId") || formData.get("subject_id")` and `formData.get("categoryId") || formData.get("category_id")`, ensuring compatibility across legacy and modern callers.
  - **Vercel Serverless Function 4.5 MB Payload Wall:** On Vercel free-tier serverless functions, HTTP requests with bodies > 4.5 MB are rejected by AWS API Gateway / Vercel Edge with HTTP 413. Therefore, `/api/upload` is strictly suitable for small files (≤ 4.5 MB).
  - **Direct-to-Storage Capability:** Implemented and exported `createSignedUploadUrlAction` in `resource-actions.ts`. It authenticates callers, validates MIME types (`application/pdf`, `text/html`, `text/plain`, `text/markdown`), validates the 50 MB ceiling, and generates a partitioned signed URL (`${requester.id}/${timestamp}-${filename}`) using Supabase Storage client.

### Task 3 — Distributed Abuse Protection
- **Files:** [src/lib/actions/forest-actions.ts](file:///c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4/src/lib/actions/forest-actions.ts), [src/lib/actions/quiz-actions.ts](file:///c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4/src/lib/actions/quiz-actions.ts)
- **Review & Enhancements:**
  - **Cheer Race Condition Lock:** In `sendClassmateCheer`, the cooldown record `cheerCooldownMap.set(cooldownKey, now)` is now set *immediately* upon entering the function before running the database query, closing the concurrency window for simultaneous bursts.
  - **Quiz Submission Replay Lock:** In `submitQuizAttempt`, added `quizAttemptInFlightMap` to block simultaneous concurrent attempts for the same `(userId, quizId)` within 2 seconds.
  - **Distributed Caveat:** In-memory Maps operate per Node.js process / serverless lambda instance. Multi-region or multiple serverless containers do not share memory; global multi-instance coordination requires a persistent distributed cache (e.g. Upstash Redis / Vercel KV).

### Task 4 — Regression & Build Verification
- **Test Command:** `npm test` (`node --experimental-strip-types --test tests/*.test.mjs`)
- **Test Results:**
  - Total Tests: **206**
  - Passed: **206**
  - Failed: **0**
  - Duration: **836ms**
- **Production Build:** `npx next build`
  - Turbopack compilation: **Successful** (1376ms)
  - TypeScript type checking: **0 errors** (5.0s)
  - Static page generation: **8/8 pages generated cleanly**

---

## 4. Staging Readiness Checklist

- [x] All 206 automated tests passing locally (`npm test`).
- [x] Production build passes cleanly with zero TypeScript errors (`npx next build`).
- [x] Global reset authorization strictly guarded by `assertPermanentAdmin()`.
- [x] Server-authoritative quiz score recalculation prevents client score falsification.
- [x] Sandboxed interactive HTML quiz runner validates message origin and source.
- [x] Email broadcast settings summary strictly protected behind `assertAdmin()`.
- [x] Magic byte verification implemented for file uploads (rejects MZ/ELF executables).
- [x] Repeatable, idempotent SQL migration prepared for `subject_folders` and `notifications`.
- [x] Direct signed upload action available for files up to 50 MB.
- [ ] **Pending Staging Action 1:** Run `supabase/migrations/20261017030000_subject_folders_and_notifications.sql` against the staging Supabase project.
- [ ] **Pending Staging Action 2:** Verify `academic-resources` storage bucket configuration and RLS in staging Supabase dashboard.
- [ ] **Pending Staging Action 3:** Provision staging environment variables (`SMTP_PASSWORD`, `ENABLE_EMAIL_BROADCAST`).

---

## 5. Remaining Risks & Documented Limitations

1. **Vercel Serverless Payload Ceiling (4.5 MB):**
   - Direct multipart uploads to `/api/upload` exceeding 4.5 MB will fail at Vercel's edge gateway. Large files must use `createSignedUploadUrlAction`.
2. **Ephemeral Serverless Filesystem:**
   - In environments where the migration has not been run on Supabase, folder persistence relies on the local fallback. While safe in development, staging and production require the database migration.
3. **Cross-Instance Concurrency:**
   - In-memory rate-limiting maps (`cheerCooldownMap`, `quizAttemptInFlightMap`, `signedUploadRateMap`) enforce single-instance atomicity. If deployed across multiple Vercel serverless containers, concurrent requests hitting different instances might bypass in-memory cooldowns unless backed by Redis.

---

## 6. Release Verdicts

### Staging Release Recommendation: **GO**
- All critical vulnerabilities have been remediated locally.
- Test suite is 100% green (206/206).
- Zero build regressions.
- Safe to deploy to an isolated staging environment for live migration validation.

### Production Release Recommendation: **NO-GO**
- **Blocker 1:** Live execution and verification of migration `20261017030000_subject_folders_and_notifications.sql` has not yet taken place on remote Supabase.
- **Blocker 2:** Supabase Storage bucket `academic-resources` private/public policy configuration requires live staging confirmation.
- **Blocker 3:** Production deployment must be preceded by successful staging verification.
