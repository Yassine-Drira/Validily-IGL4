<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## FREE-TIER QUOTA PRESERVATION & LOCAL-FIRST DEVELOPMENT RULES

CRITICAL: The project is hosted on FREE-TIER Vercel and Supabase accounts. To avoid quota exhaustion, service suspension, or unnecessary resource usage:

1. **NEVER PUSH TO REMOTE**:
   - Strictly NEVER run `git push` or trigger remote deployment pipelines under any circumstances unless the user explicitly and directly requests a push.
   - Every push triggers a Vercel build and deployment, consuming valuable Fluid CPU time, function invocations, and deployment storage.

2. **STRICTLY LOCAL TESTING & VERIFICATION**:
   - All tests, builds, validations, and previews must run locally on the user's machine:
     - Integration & unit tests: `node --test tests/*.test.mjs`
     - Production bundle & type checking: `npx next build`
     - Local dev server: `npm run dev` (running locally on http://localhost:3000)

3. **SUPABASE RESOURCE EFFICIENCY**:
   - Do not upload bulk or dummy test files to live Supabase Storage.
   - Maintain the in-memory repository cache (`src/lib/supabase/repository.ts`) to avoid redundant API queries.
   - Avoid executing high-frequency network polling or repetitive DB scans.

4. **MANDATORY PRODUCTION RELEASE ANNOUNCEMENT GATE**:
   - For every production release, follow `.agents/skills/release-announcement/SKILL.md`.
   - Never insert N duplicate notification rows in Supabase. Register releases in `ACTIVE_GLOBAL_ANNOUNCEMENTS` (`src/lib/actions/notification-actions.ts`).
   - Only announce verified, working capabilities covered by automated tests.
