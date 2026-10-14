import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

test("Academic Hierarchy: 10 Initial Semester 1 Subjects are present and correct", () => {
  const expectedSubjects = [
    "Flutter",
    "Blockchain",
    "Parallel Algorithms",
    "Artificial Intelligence",
    "Cybersecurity",
    "Project Management",
    "Enterprise",
    "Cloud Computing",
    "Combinatorial Optimization",
    "Stochastic Processes",
  ];

  const seedContent = fs.readFileSync(
    path.join(process.cwd(), "supabase", "seed.sql"),
    "utf-8"
  );

  for (const subject of expectedSubjects) {
    assert.ok(
      seedContent.includes(subject),
      `Subject "${subject}" must be in supabase/seed.sql`
    );
  }
});

test("Academic Hierarchy: 9 Controlled Resource Categories exist", () => {
  const expectedCategories = [
    "Courses and lecture notes",
    "TP / Practical Work",
    "DS / Continuous Assessment",
    "Exams",
    "Cheat Sheets",
    "Quizzes",
    "Exercises and Solutions",
    "Summaries",
    "Other Resources",
  ];

  const seedContent = fs.readFileSync(
    path.join(process.cwd(), "supabase", "seed.sql"),
    "utf-8"
  );

  for (const category of expectedCategories) {
    assert.ok(
      seedContent.includes(category),
      `Category "${category}" must be present in supabase/seed.sql`
    );
  }
});

test("Database Schema: RLS Policies and Storage Policies defined", () => {
  const migrationContent = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "20241015000000_initial_schema.sql"),
    "utf-8"
  );

  assert.ok(
    migrationContent.includes("alter table public.resources enable row level security;"),
    "Resources table must have RLS enabled"
  );
  assert.ok(
    migrationContent.includes("create policy \"Published public resources are readable by all\""),
    "Must have publication policy for public resources"
  );
  assert.ok(
    migrationContent.includes("create policy \"Users can insert their own resources\""),
    "Must enforce owner_id = auth.uid() on upload"
  );
});

test("Semester 2 is supported without invented subjects", () => {
  const seedContent = fs.readFileSync(
    path.join(process.cwd(), "supabase", "seed.sql"),
    "utf-8"
  );

  assert.ok(seedContent.includes("Semester 2"), "Semester 2 must be defined in seed.sql");
  // Check that no initial subjects link to semester 2
  const s2Id = "22222222-2222-2222-2222-222222222222";
  const subjectsSection = seedContent.split("-- 3. Insert the 10 Initial Semester 1 Subjects")[1] || "";
  assert.ok(
    !subjectsSection.includes(s2Id),
    "Semester 2 must not have invented initial subjects"
  );
});
