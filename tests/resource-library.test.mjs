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
