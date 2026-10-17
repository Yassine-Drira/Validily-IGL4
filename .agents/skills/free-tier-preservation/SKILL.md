---
name: free-tier-preservation
description: >-
  Use this skill whenever building, testing, committing, or deploying code to ensure
  strict adherence to Vercel and Supabase free-tier quota limits, preventing automated
  deployments, excessive serverless invocations, and unwanted cloud storage bandwidth.
---

# Free Tier & Quota Preservation Guide

This project runs on free-tier subscriptions for both **Vercel** and **Supabase**. Exceeding these limits can suspend services or incur unexpected costs.

## Core Rules & Guardrails

### 1. Never Push to Remote Without Explicit User Confirmation
* **Rule**: Never run `git push` or trigger remote CI/CD pipelines.
* **Why**: Each push triggers an automatic Vercel production build and deployment, consuming:
  * Fluid Active CPU time (Free limit: 4h / month)
  * Serverless Function invocations
  * Deployment and Functions storage
* **Local Alternative**:
  * Build check: `npx next build` (Turbopack local build)
  * Test execution: `node --test tests/*.test.mjs`
  * Dev server: `npm run dev` (running locally on localhost:3000)

### 2. Supabase Quota Safeguards & Egress Preservation
* **Bandwidth & Egress Hard Limit**: Supabase Free Tier has a **5 GB monthly egress limit** (currently tracked at ~0.96 GB / 19.2%).
  * **Leverage In-Memory Repository Cache**: Always preserve and utilize `src/lib/supabase/repository.ts` to cache queries for subjects, categories, and resources in memory (avoiding redundant PostgREST network calls).
  * **Never Fetch Bulk Storage Files in Testing**: Do not repeatedly download or stream large files (>10 MB) directly through Supabase during staging smoke tests. Test strictly with small fixtures (100 KB – 1 MB).
  * **Cache-Control on Storage Downloads**: Public downloads must leverage browser and CDN caching (`Cache-Control: public, max-age=31536000, immutable`) to prevent returning users from re-fetching existing documents.
  * **Local-First Execution**: Continue running all automated tests locally via `npm test` without connecting to live Supabase, preserving 100% of remaining egress bandwidth for real users.
* **Storage Limit**: 1 GB free bucket limit on `academic-resources`. Do not upload bulk or dummy test files to live storage.
* **Database Size**: 500 MB limit. Avoid unindexed table scans or high-frequency automated query loops.

### 3. Verification Protocol
Before marking any task complete:
1. Verify with local automated tests (`node --test tests/*.test.mjs`).
2. Verify with local build (`npx next build`).
3. Keep git changes committed locally or staged, but **never push to origin**.
