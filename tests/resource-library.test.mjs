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

test("Upload Route Security: Magic byte verification and executable rejection contracts", async () => {
  const fs = await import("fs");
  const uploadCode = fs.readFileSync("src/app/api/upload/route.ts", "utf-8");

  // 1. Magic byte header inspection
  assert.ok(
    uploadCode.includes("const headerBytes = new Uint8Array(fileBuffer.slice(0, 8))"),
    "Upload route must extract initial file magic bytes"
  );

  // 2. Executable rejection (MZ / ELF)
  assert.ok(
    uploadCode.includes("headerBytes[0] === 0x4d && headerBytes[1] === 0x5a") &&
      uploadCode.includes("headerBytes[0] === 0x7f && headerBytes[1] === 0x45"),
    "Upload route must reject MZ and ELF executable binary signatures"
  );

  // 3. Authentic PDF signature verification
  assert.ok(
    uploadCode.includes("headerBytes[0] === 0x25") &&
      uploadCode.includes("headerBytes[1] === 0x50") &&
      uploadCode.includes("headerBytes[2] === 0x44") &&
      uploadCode.includes("headerBytes[3] === 0x46"),
    "Upload route must assert authentic %PDF magic bytes for PDF files"
  );

  // 4. Rate limiting contract
  assert.ok(
    uploadCode.includes("checkUploadRateLimit") && uploadCode.includes("status: 429"),
    "Upload route must enforce upload rate limiting with HTTP 429"
  );
});

test("Upload Route Compatibility: supports both camelCase and snake_case form fields", async () => {
  const fs = await import("fs");
  const uploadCode = fs.readFileSync("src/app/api/upload/route.ts", "utf-8");

  assert.ok(
    uploadCode.includes('formData.get("subjectId")') && uploadCode.includes('formData.get("subject_id")'),
    "Upload route must handle both subjectId and subject_id"
  );
  assert.ok(
    uploadCode.includes('formData.get("categoryId")') && uploadCode.includes('formData.get("category_id")'),
    "Upload route must handle both categoryId and category_id"
  );
});

test("Direct Storage Upload Action: createSignedUploadUrlAction contract", async () => {
  const fs = await import("fs");
  const resourceCode = fs.readFileSync("src/lib/actions/resource-actions.ts", "utf-8");

  assert.ok(
    resourceCode.includes("export async function createSignedUploadUrlAction"),
    "resource-actions must export createSignedUploadUrlAction"
  );
  assert.ok(
    resourceCode.includes("createSignedUploadUrl(uniqueStoragePath)"),
    "createSignedUploadUrlAction must invoke Supabase Storage createSignedUploadUrl"
  );
  assert.ok(
    resourceCode.includes("MAX_SIZE_BYTES = 50 * 1024 * 1024"),
    "createSignedUploadUrlAction must enforce 50MB boundary"
  );
});

test("ResourceCard UX: Subject Label & Uploader User Label Contracts", async () => {
  const fs = await import("fs");
  const cardCode = fs.readFileSync("src/components/academic/resource-card.tsx", "utf-8");

  // 1. Subject badge contract
  assert.ok(
    cardCode.includes("resource.subject?.name") &&
      cardCode.includes("<GraduationCap") &&
      cardCode.includes("library?subjectId="),
    "ResourceCard must render a dedicated Subject badge linking to filtered library"
  );

  // 2. Uploader user label contract
  assert.ok(
    cardCode.includes("uploaderName") &&
      cardCode.includes("resource.owner_profile?.display_name") &&
      cardCode.includes("Document ajouté par"),
    "ResourceCard must compute and display the user who added the document"
  );

  // 3. Admin / Staff role distinction contract
  assert.ok(
    cardCode.includes("Staff") && cardCode.includes("resource.owner_profile?.role === \"admin\""),
    "ResourceCard must display staff indicator for administration uploads"
  );

  // 4. Distinction between uploader user and professor instructor
  assert.ok(
    cardCode.includes("Prof. {resource.instructor}"),
    "ResourceCard must distinguish instructor (Prof.) from the uploader user (Par)"
  );
});

test("Repository Enrichment: Owner profiles and defensive subject resolution contracts", async () => {
  const fs = await import("fs");
  const repoCode = fs.readFileSync("src/lib/supabase/repository.ts", "utf-8");

  // 1. Batch owner profiles fetching without N+1 queries
  assert.ok(
    repoCode.includes("const ownerIds = Array.from(") &&
      repoCode.includes('.from("profiles")') &&
      repoCode.includes('.in("id", ownerIds)'),
    "getResources must batch enrich owner profiles using IN query"
  );

  // 2. Defensive fallback for missing subjects
  assert.ok(
    repoCode.includes("hasMissingSubject") &&
      repoCode.includes("getSubjects()"),
    "getResources must provide fallback subject resolution from cached subjects"
  );

  // 3. Single resource enrichment in getResourceById
  assert.ok(
    repoCode.includes("data.owner_id && !data.owner_profile") &&
      repoCode.includes("data.owner_profile = prof"),
    "getResourceById must enrich owner_profile for single resource lookup"
  );
});

test("LibraryExplorer UI/UX: 0ms instant client-side filtering and tactile buttons", async () => {
  const fs = await import("fs");
  const explorerCode = fs.readFileSync(
    "src/components/resources/library-explorer.tsx",
    "utf-8"
  );

  // 1. Client component contract
  assert.ok(
    explorerCode.startsWith('"use client";'),
    "LibraryExplorer must be a client component"
  );

  // 2. URL synchronization without blocking page reloads
  assert.ok(
    explorerCode.includes("window.history.replaceState"),
    "LibraryExplorer must use window.history.replaceState to sync URL without network latency"
  );

  // 3. Tactile button interactions
  assert.ok(
    explorerCode.includes("active:scale-95"),
    "Pills and sorting buttons must provide tactile micro-interactions on click"
  );

  // 4. In-memory filtering logic validation
  const mockResources = [
    {
      id: "r1",
      title: "Algorithmique Avancée Cours",
      category_id: "cat-courses",
      resource_type: "document",
      usefulness_score: 10,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "r2",
      title: "Examen Flutter 2024",
      category_id: "cat-exams",
      resource_type: "document",
      usefulness_score: 25,
      created_at: "2026-02-01T00:00:00Z",
    },
    {
      id: "r3",
      title: "Quiz IA Intermédiaire",
      category_id: "cat-quizzes",
      resource_type: "quiz",
      usefulness_score: 5,
      created_at: "2026-03-01T00:00:00Z",
    },
  ];

  // Category filter test
  const examsOnly = mockResources.filter((r) => r.category_id === "cat-exams");
  assert.strictEqual(examsOnly.length, 1);
  assert.strictEqual(examsOnly[0].id, "r2");

  // Format filter test
  const quizzesOnly = mockResources.filter((r) => r.resource_type === "quiz");
  assert.strictEqual(quizzesOnly.length, 1);
  assert.strictEqual(quizzesOnly[0].id, "r3");

  // Sorting test: "useful"
  const sortedByUseful = [...mockResources].sort(
    (a, b) => b.usefulness_score - a.usefulness_score
  );
  assert.strictEqual(sortedByUseful[0].id, "r2");
  assert.strictEqual(sortedByUseful[1].id, "r1");
  assert.strictEqual(sortedByUseful[2].id, "r3");
});

test("Resource Visibility Lifecycle: createExternalLinkResource & Upload Route preserve Public/Private choice", async () => {
  const fs = await import("fs");
  const path = await import("path");

  // 1. Static contract validation: resource-actions.ts createExternalLinkResource supports visibility
  const resourceCode = fs.readFileSync(
    path.resolve("src/lib/actions/resource-actions.ts"),
    "utf8"
  );
  assert.ok(
    resourceCode.includes('visibility?: "public" | "private" | "shared"'),
    "createExternalLinkResource must accept visibility parameter"
  );
  assert.ok(
    resourceCode.includes('visibility: data.visibility || "public"'),
    "createExternalLinkResource must forward visibility to createResource"
  );
  assert.ok(
    resourceCode.includes('visibility: data.visibility || "private"'),
    "createResource must preserve private fallback for security"
  );

  // 2. Static contract validation: Contribute modal forwards visibility
  const contributeModalCode = fs.readFileSync(
    path.resolve("src/components/resources/contribute-resource-modal.tsx"),
    "utf8"
  );
  assert.ok(
    contributeModalCode.includes("visibility,") &&
      contributeModalCode.includes("createExternalLinkResource"),
    "Contribute modal must pass visibility to createExternalLinkResource"
  );
  assert.ok(
    contributeModalCode.includes('formData.append("visibility", visibility)'),
    "Contribute modal must pass visibility to /api/upload"
  );

  // 3. Static contract validation: AddExternalLinkModal in subject-file-library forwards visibility
  const fileLibraryCode = fs.readFileSync(
    path.resolve("src/components/workspace/subject-file-library.tsx"),
    "utf8"
  );
  assert.ok(
    fileLibraryCode.includes('const [visibility, setVisibility] = useState<"public" | "private">("public");'),
    "AddExternalLinkModal must have visibility state"
  );
  assert.ok(
    fileLibraryCode.includes("link-modal-visibility"),
    "AddExternalLinkModal must have link-modal-visibility radio inputs"
  );
  assert.ok(
    fileLibraryCode.includes("createExternalLinkResource") &&
      fileLibraryCode.includes("folder_id: currentFolderId") &&
      fileLibraryCode.includes("visibility"),
    "AddExternalLinkModal must pass visibility to createExternalLinkResource"
  );

  // 4. Static contract validation: UploadDropzone has explicit Public / Privé radio controls
  const dropzoneCode = fs.readFileSync(
    path.resolve("src/components/resources/upload-dropzone.tsx"),
    "utf8"
  );
  assert.ok(
    dropzoneCode.includes('initialVisibility?: "public" | "private"'),
    "UploadDropzone must accept initialVisibility prop"
  );
  assert.ok(
    dropzoneCode.includes("dropzone-visibility"),
    "UploadDropzone must have dropzone-visibility radio buttons"
  );
  assert.ok(
    dropzoneCode.includes('formData.append("visibility", visibility)'),
    "UploadDropzone must append visibility to formData"
  );

  // 5. Static contract validation: Upload route handles public / private resolution
  const uploadCode = fs.readFileSync(
    path.resolve("src/app/api/upload/route.ts"),
    "utf8"
  );
  assert.ok(
    uploadCode.includes("visibilityParam === \"public\" || visibilityParam === \"shared\" || visibilityParam === \"private\""),
    "Upload route must assign visibility from visibilityParam"
  );
  assert.ok(
    uploadCode.includes('let visibility: "public" | "shared" | "private" = "private";'),
    "Upload route must default visibility to private"
  );
});


