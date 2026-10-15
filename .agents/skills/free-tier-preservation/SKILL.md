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

### 2. Supabase Quota Safeguards
* **Storage Limit**: 1 GB free bucket limit on `academic-resources`. Do not upload bulk or dummy test files to live storage. Use local mocks or small (<1MB) test fixtures.
* **Database & Egress**: 500 MB database and 2 GB bandwidth. Avoid unindexed table scans or rapid automated query loops.
* **Caching**: Always preserve the 30-second TTL in-memory cache in `src/lib/supabase/repository.ts` to avoid redundant PostgREST network calls.

### 3. Verification Protocol
Before marking any task complete:
1. Verify with local automated tests (`node --test tests/*.test.mjs`).
2. Verify with local build (`npx next build`).
3. Keep git changes committed locally or staged, but **never push to origin**.
