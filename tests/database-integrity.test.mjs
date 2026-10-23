import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

test("Database Integrity: Zero mock business data files in production runtime", () => {
  const mockDataPath = path.join(process.cwd(), "src", "lib", "mock-data.ts");
  assert.strictEqual(
    fs.existsSync(mockDataPath),
    false,
    "src/lib/mock-data.ts must not exist; all data must be loaded from PostgreSQL"
  );
});

test("Brand Consistency: validily-IGL4 exact branding across layout and metadata", () => {
  const rootLayout = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "layout.tsx"),
    "utf-8"
  );
  assert.ok(
    rootLayout.includes("validily-IGL4"),
    "Root layout must display validily-IGL4 brand wordmark"
  );

  const sidebar = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "layout", "app-sidebar.tsx"),
    "utf-8"
  );
  assert.ok(
    sidebar.includes("validily-IGL4"),
    "Sidebar must display validily-IGL4 brand wordmark"
  );
});

test("Database Repository: Dynamic queries execute directly against Supabase", () => {
  const repoContent = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "supabase", "repository.ts"),
    "utf-8"
  );

  const requiredQueries = [
    'from("semesters")',
    'from("subjects")',
    'from("resources")',
    'from("resource_categories")',
    'from("notes")',
    'from("quizzes")',
    'from("quiz_questions")',
    'from("bookmarks")',
  ];

  for (const q of requiredQueries) {
    assert.ok(
      repoContent.includes(q),
      `Repository must execute real PostgreSQL query: ${q}`
    );
  }
});

test("Server Actions: Strict user authentication & RLS enforcement on mutations", () => {
  const resourceActions = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "actions", "resource-actions.ts"),
    "utf-8"
  );
  assert.ok(
    resourceActions.includes("supabase.auth.getUser()"),
    "Resource actions must authenticate user before mutation"
  );

  const noteActions = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "actions", "note-actions.ts"),
    "utf-8"
  );
  assert.ok(
    noteActions.includes("user_id: user.id"),
    "Note actions must bind note ownership to authenticated user.id"
  );
});

test("Quiz Persistence: Dynamic question loading from quiz_questions & quiz_options", () => {
  const quizPage = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "(workspace)", "quizzes", "[quizId]", "page.tsx"),
    "utf-8"
  );
  assert.ok(
    quizPage.includes("getQuizWithQuestions"),
    "Quiz page must dynamically load quiz questions from the database"
  );
  assert.ok(
    !quizPage.includes("QUIZ_QUESTIONS: Record"),
    "Quiz page must not contain static fallback question dictionary"
  );
});

test("Bookmarks Dynamic Connection: Bookmarks queried directly from database", () => {
  const bookmarksPage = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "(workspace)", "bookmarks", "page.tsx"),
    "utf-8"
  );
  assert.ok(
    bookmarksPage.includes("getBookmarks()"),
    "Bookmarks page must fetch from database getBookmarks()"
  );
  assert.ok(
    !bookmarksPage.includes("slice(0"),
    "Bookmarks page must not fake user bookmarks with static slicing"
  );
});

test("Supabase Data API Hardening: October 30 breaking change compliance migration", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261022000000_data_api_grants_hardening.sql"
  );
  assert.ok(
    fs.existsSync(migrationPath),
    "Migration 20261022000000_data_api_grants_hardening.sql must exist"
  );

  const content = fs.readFileSync(migrationPath, "utf-8");
  assert.ok(
    content.includes("ALTER DEFAULT PRIVILEGES IN SCHEMA public"),
    "Migration must configure ALTER DEFAULT PRIVILEGES for future table creations"
  );
  assert.ok(
    content.includes("GRANT SELECT ON TABLE public.%I TO anon"),
    "Migration must grant SELECT to anon role"
  );
  assert.ok(
    content.includes("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated"),
    "Migration must grant CRUD to authenticated role"
  );
  assert.ok(
    content.includes("GRANT ALL ON TABLE public.%I TO service_role"),
    "Migration must grant bypass privileges to service_role"
  );
});

