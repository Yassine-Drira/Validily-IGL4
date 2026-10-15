# Validily — Premium University Exam Preparation Platform (IGL4 Track)

Validily is a production-minded academic library and exam preparation platform designed for software engineering students (IGL4). It organizes revision materials by **Semester → Subject → Resource Category → Resource Document**, featuring an in-app document reader, personal library, revision bookmarks, notes/cheat sheets, practice quizzes, and admin management.

---

## 1. System Architecture

- **Frontend & App Framework:** Next.js 16 (App Router) with TypeScript (strict mode), Tailwind CSS v4, Lucide icons.
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS) enforcement.
- **File Storage:** Supabase Storage (`academic-resources` private bucket with signed access URLs).
- **Authentication:** Supabase Auth (email/password with session cookies via `@supabase/ssr`).
- **Hosting:** Vercel (Frontend & Serverless Edge/Node APIs) + Supabase (Managed Postgres & Storage Free Tier).

```
Semester
  └── Subject
        └── Resource Category (Courses, TPs, DS, Exams, Cheat Sheets...)
              └── Resource Document (In-App PDF Reader & Downloads)
```

---

## 2. Initial Academic Hierarchy (Phase 1)

### Semester 1 Modules (10 Initial Subjects):
1. **Flutter** (`flutter`) — Cross-platform mobile development, BLoC, Riverpod.
2. **Blockchain** (`blockchain`) — Distributed ledgers, consensus protocols, smart contracts.
3. **Parallel Algorithms** (`parallel-algorithms`) — OpenMP, MPI, synchronization, Amdahl's Law.
4. **Artificial Intelligence** (`artificial-intelligence`) — Heuristic search, Bayes, ML fundamentals.
5. **Cybersecurity** (`cybersecurity`) — Applied cryptography, network defense, threat modeling.
6. **Project Management** (`project-management`) — Agile Scrum lifecycles, sprint estimation, risk.
7. **Enterprise** (`enterprise`) — Corporate economics, product management, strategy.
8. **Cloud Computing** (`cloud-computing`) — Containerization, Docker, microservices, cloud infra.
9. **Combinatorial Optimization** (`combinatorial-optimization`) — Linear programming, simplex, duality.
10. **Stochastic Processes** (`stochastic-processes`) — Markov chains, Poisson processes, queuing theory.

### Controlled Resource Categories:
- Courses and lecture notes (`courses-notes`)
- TP / Practical Work (`tp-practical`)
- DS / Continuous Assessment (`ds-assessments`)
- Exams (`exams`)
- Cheat Sheets (`cheat-sheets`)
- Quizzes (`quizzes`)
- Exercises and Solutions (`exercises-solutions`)
- Summaries (`summaries`)
- Other Resources (`other`)

*Semester 2 is registered and ready for future subjects without modifying core application code.*

---

## 3. Local Development Setup

### Prerequisites
- Node.js 18+ (tested on Node v22.17)
- npm or pnpm

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/Yassine-Drira/Validily-IGL4.git
cd Validily-IGL4
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
*(Note: If left empty, the application runs in self-contained demonstration mode with seeded curriculum data).*

### Step 3: Run Tests & Build
```bash
# Run unit & schema tests
npm test

# Verify production build
npm run build

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Supabase Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project named `validily-igl4`.
2. Select your closest region (e.g. Frankfurt or London).

### 2. Apply Database Migration
1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Open `supabase/migrations/20241015000000_initial_schema.sql` from this repository.
3. Paste the entire SQL content into the SQL Editor and click **Run**.
   - This creates all tables: `semesters`, `subjects`, `resource_categories`, `resources`, `profiles`, `bookmarks`, `revision_progress`, `notes`, `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_attempt_answers`.
   - Sets up indices, user signup triggers, and all RLS policies.

### 3. Run Seed Data
1. In the Supabase SQL Editor, open `supabase/seed.sql`.
2. Click **Run**.
   - This seeds Semester 1 & 2, the 10 initial subjects, and the 9 categories.
   - Configures the `academic-resources` storage bucket and bucket access policies.

### 4. Create the First Administrator
After registering your personal account through `/register`, run the following SQL command in Supabase to grant yourself Administrator rights:
```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'your-email@university.tn'
);
```

---

## 5. Vercel Deployment Instructions

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Phase 1 production foundation"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import `Validily-IGL4`.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (Set to `https://your-vercel-domain.vercel.app`)
5. Click **Deploy**. Vercel will build and publish your application.

---

## 6. Security & Free-Tier Boundaries

- **Row Level Security (RLS):** Every single database table has RLS enabled. Visitors can only read public published resources; students manage only their own uploads, notes, and quiz attempts; only verified admins can modify curriculum hierarchy.
- **Storage Protection:** File uploads are stored with UUID namespaces (`{userId}/{timestamp}-{filename}`) in a private bucket. Private files are served via short-lived signed URLs.
- **File Limits:** Uploads are capped at **50MB** per file and validated for `application/pdf` MIME format.
- **Supabase Free Tier:** 500MB Postgres database, 1GB Storage, 50,000 monthly active users.
- **Vercel Free Tier:** 100GB monthly bandwidth, serverless function executions with 10s timeout limit.

---

## 7. Automated Testing
Run automated acceptance criteria tests:
```bash
npm test
```
The test suite verifies:
- Presence and naming of the 10 initial Semester 1 subjects.
- Verification of the 9 controlled resource categories.
- Semester 2 non-population constraint.
- Strict RLS and storage policy definitions.

---

## 8. License

This project is proprietary and source-available. Copying, using, modifying, or distributing any part of this repository requires prior written permission from Yassine Drira. Attribution to Yassine Drira is mandatory, and copyright notices plus the `LICENSE` file must be preserved in any permitted copy or derivative.
