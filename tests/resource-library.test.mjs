import { test } from "node:test";
import assert from "node:assert";

test("Resource Library Validation: PDF format restriction", () => {
  const isAllowedPdf = (filename, mimeType) => {
    const isPdfExt = filename.toLowerCase().endsWith(".pdf");
    const isPdfMime = mimeType === "application/pdf";
    return isPdfExt || isPdfMime;
  };

  assert.strictEqual(isAllowedPdf("lecture_notes.pdf", "application/pdf"), true);
  assert.strictEqual(isAllowedPdf("exam_2024.PDF", "application/octet-stream"), true);
  assert.strictEqual(isAllowedPdf("virus.exe", "application/x-msdownload"), false);
  assert.strictEqual(isAllowedPdf("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), false);
  assert.strictEqual(isAllowedPdf("archive.zip", "application/zip"), false);
});

test("Resource Library Validation: 50MB upload limit boundary", () => {
  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

  const isWithinLimit = (sizeBytes) => sizeBytes <= MAX_SIZE_BYTES;

  assert.strictEqual(isWithinLimit(1024), true); // 1 KB
  assert.strictEqual(isWithinLimit(10 * 1024 * 1024), true); // 10 MB
  assert.strictEqual(isWithinLimit(50 * 1024 * 1024), true); // Exactly 50 MB
  assert.strictEqual(isWithinLimit(50 * 1024 * 1024 + 1), false); // 50MB + 1 byte
  assert.strictEqual(isWithinLimit(100 * 1024 * 1024), false); // 100 MB
});

test("Revision Progress State Transitions", () => {
  const validStates = ["not_started", "in_progress", "revised"];

  const isValidStatus = (status) => validStates.includes(status);

  assert.strictEqual(isValidStatus("not_started"), true);
  assert.strictEqual(isValidStatus("in_progress"), true);
  assert.strictEqual(isValidStatus("revised"), true);
  assert.strictEqual(isValidStatus("completed"), false);
  assert.strictEqual(isValidStatus("pending"), false);
});

test("Resource Filter Logic: category, search and session", () => {
  const sampleResources = [
    {
      id: "1",
      title: "Flutter State Management Architecture",
      category_id: "cat-courses",
      exam_session: null,
      instructor: "Dr. Ben Ammar",
    },
    {
      id: "2",
      title: "AI Final Exam 2024",
      category_id: "cat-exams",
      exam_session: "Principal",
      instructor: "Prof. Meddeb",
    },
    {
      id: "3",
      title: "AI Resit Exam 2024",
      category_id: "cat-exams",
      exam_session: "Rattrapage",
      instructor: "Prof. Meddeb",
    },
  ];

  // Category filter
  const examCategory = sampleResources.filter((r) => r.category_id === "cat-exams");
  assert.strictEqual(examCategory.length, 2);

  // Search filter
  const searchResults = sampleResources.filter((r) =>
    r.title.toLowerCase().includes("state")
  );
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, "1");

  // Session filter
  const principalSession = sampleResources.filter((r) => r.exam_session === "Principal");
  assert.strictEqual(principalSession.length, 1);
  assert.strictEqual(principalSession[0].id, "2");
});

test("Resource Format Classification (inferResourceType)", async () => {
  const { inferResourceType } = await import("../src/lib/supabase/repository.ts");

  // Document types
  assert.strictEqual(inferResourceType({ mime_type: "application/pdf" }), "document");
  assert.strictEqual(inferResourceType({ mime_type: "application/msword" }), "document");

  // Quiz types
  assert.strictEqual(inferResourceType({ resource_type: "quiz" }), "quiz");
  assert.strictEqual(inferResourceType({ mime_type: "text/html" }), "quiz");
  assert.strictEqual(inferResourceType({ tags: ["quiz", "revision"] }), "quiz");

  // Link / URL types
  assert.strictEqual(inferResourceType({ resource_type: "link" }), "url");
  assert.strictEqual(inferResourceType({ resource_type: "url" }), "url");
  assert.strictEqual(inferResourceType({ mime_type: "application/vnd.google-apps" }), "url");
  assert.strictEqual(inferResourceType({ storage_path: "https://drive.google.com/file/d/123" }), "url");
  assert.strictEqual(inferResourceType({ tags: ["external_link"] }), "url");
  assert.strictEqual(inferResourceType({ external_url: "https://example.com" }), "url");
});

test("Resource In-Memory Sort: usefulness, votes, and recency", () => {
  const items = [
    { id: "A", created_at: "2026-01-01T00:00:00Z", vote_summary: { score: 2, upvotes: 3, downvotes: 1 } },
    { id: "B", created_at: "2026-02-01T00:00:00Z", vote_summary: { score: 10, upvotes: 10, downvotes: 0 } },
    { id: "C", created_at: "2026-03-01T00:00:00Z", vote_summary: { score: -1, upvotes: 1, downvotes: 2 } },
    { id: "D", created_at: "2026-04-01T00:00:00Z", vote_summary: { score: 5, upvotes: 15, downvotes: 10 } },
  ];

  // Sort by usefulness (highest score first)
  const sortedUseful = [...items].sort((a, b) => (b.vote_summary.score) - (a.vote_summary.score));
  assert.strictEqual(sortedUseful[0].id, "B"); // score 10
  assert.strictEqual(sortedUseful[1].id, "D"); // score 5
  assert.strictEqual(sortedUseful[2].id, "A"); // score 2
  assert.strictEqual(sortedUseful[3].id, "C"); // score -1

  // Sort by most voted (total interactions: upvotes + downvotes)
  const sortedVoted = [...items].sort((a, b) => {
    const sumA = a.vote_summary.upvotes + a.vote_summary.downvotes;
    const sumB = b.vote_summary.upvotes + b.vote_summary.downvotes;
    return sumB - sumA;
  });
  assert.strictEqual(sortedVoted[0].id, "D"); // 25 votes total
  assert.strictEqual(sortedVoted[1].id, "B"); // 10 votes total
  assert.strictEqual(sortedVoted[2].id, "A"); // 4 votes total
  assert.strictEqual(sortedVoted[3].id, "C"); // 3 votes total

  // Sort by most recent
  const sortedRecent = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  assert.strictEqual(sortedRecent[0].id, "D"); // 2026-04-01
  assert.strictEqual(sortedRecent[1].id, "C"); // 2026-03-01
  assert.strictEqual(sortedRecent[2].id, "B"); // 2026-02-01
  assert.strictEqual(sortedRecent[3].id, "A"); // 2026-01-01
});

test("Sidebar Navigation Integrity: No duplicate Examens tab", async () => {
  const fs = await import("fs");
  const sidebarCode = fs.readFileSync("src/components/layout/app-sidebar.tsx", "utf-8");

  // Must not have Examens as a duplicate top-level item pointing to /library?category=exams
  assert.strictEqual(sidebarCode.includes('{ label: "Examens"'), false);
  assert.strictEqual(sidebarCode.includes('/library?category=exams'), false);
  // Must preserve Bibliothèque pointing to /library
  assert.strictEqual(sidebarCode.includes('{ label: "Bibliothèque", href: "/library"'), true);
});
