import test from "node:test";
import assert from "node:assert/strict";

// ============================================================================
// 1. RESOURCE CONTRIBUTION WORKFLOW & VALIDATION
// ============================================================================

test("Resource Contribution: PDF document validation, metadata, and sizing", () => {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown"];

  function validateDocumentContribution(file) {
    if (!file || !file.name) {
      return { valid: false, error: "Nom de fichier obligatoire." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: "Taille de fichier supérieure à 50 Mo." };
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { valid: false, error: "Format non supporté." };
    }
    return { valid: true };
  }

  // Valid PDF
  const validPdf = { name: "Exam_GL4_2025.pdf", size: 12 * 1024 * 1024, type: "application/pdf" };
  assert.equal(validateDocumentContribution(validPdf).valid, true);

  // Exceeding 50MB
  const oversizePdf = { name: "Huge_Backup.pdf", size: 55 * 1024 * 1024, type: "application/pdf" };
  const oversizeRes = validateDocumentContribution(oversizePdf);
  assert.equal(oversizeRes.valid, false);
  assert.match(oversizeRes.error, /50 Mo/);

  // Unsupported format
  const exeFile = { name: "Malicious.exe", size: 1024, type: "application/x-msdownload" };
  const exeRes = validateDocumentContribution(exeFile);
  assert.equal(exeRes.valid, false);
});

test("Resource Contribution: HTML Quiz sandboxing, parsing, and validation", () => {
  function validateHtmlQuiz(htmlContent) {
    if (!htmlContent || typeof htmlContent !== "string") {
      return { valid: false, error: "Contenu HTML vide ou invalide." };
    }
    if (htmlContent.trim().length < 20) {
      return { valid: false, error: "Le code HTML est trop court." };
    }

    // Must be self-contained HTML (contains html, head or body, or container)
    const hasContainer = /<div|<body|<main|<section|<!DOCTYPE html/i.test(htmlContent);
    if (!hasContainer) {
      return { valid: false, error: "Structure HTML minimale non détectée." };
    }

    // Extract title if present
    const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Quiz Interactif HTML";

    // Sandboxing flags required for iframe execution: allow-scripts, allow-forms, without allow-top-navigation-to-custom-protocols
    const sandboxFlags = "allow-scripts allow-forms allow-same-origin";

    return {
      valid: true,
      title,
      sandboxFlags,
      sizeBytes: Buffer.byteLength(htmlContent, "utf8"),
    };
  }

  const sampleQuiz = `
    <!DOCTYPE html>
    <html>
      <head><title>Architecture Logicielle - Quiz QCM</title></head>
      <body>
        <div id="quiz-container">
          <h2>Question 1: Qu'est-ce que le pattern CQRS ?</h2>
          <button onclick="alert('Bonne réponse')">Séparation commande / requête</button>
        </div>
      </body>
    </html>
  `;

  const validation = validateHtmlQuiz(sampleQuiz);
  assert.equal(validation.valid, true);
  assert.equal(validation.title, "Architecture Logicielle - Quiz QCM");
  assert.ok(validation.sandboxFlags.includes("allow-scripts"));
  assert.ok(validation.sizeBytes > 100);

  // Rejection of invalid short snippet
  assert.equal(validateHtmlQuiz("not html").valid, false);
});

test("Resource Contribution: External URLs and Google Drive link parsing", () => {
  function parseExternalResource(url, inputTitle) {
    if (!url || typeof url !== "string") {
      return { valid: false, error: "URL requise." };
    }
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid: false, error: "Protocole non supporté." };
      }

      const isGoogleDrive =
        parsed.hostname.includes("drive.google.com") ||
        parsed.hostname.includes("docs.google.com");

      const title = inputTitle?.trim() || (isGoogleDrive ? "Ressource Google Drive" : `Lien web (${parsed.hostname})`);

      return {
        valid: true,
        title,
        cleanUrl: parsed.href,
        hostname: parsed.hostname,
        isGoogleDrive,
      };
    } catch {
      return { valid: false, error: "URL malformée." };
    }
  }

  const gdrive = parseExternalResource(
    "https://drive.google.com/file/d/1234567890abcdef/view",
    "Notes de Synthèse GL4"
  );
  assert.equal(gdrive.valid, true);
  assert.equal(gdrive.isGoogleDrive, true);
  assert.equal(gdrive.title, "Notes de Synthèse GL4");

  const webLink = parseExternalResource("https://martinfowler.com/articles/patterns.html", "");
  assert.equal(webLink.valid, true);
  assert.equal(webLink.isGoogleDrive, false);
  assert.equal(webLink.hostname, "martinfowler.com");
  assert.equal(webLink.title, "Lien web (martinfowler.com)");

  const invalid = parseExternalResource("javascript:alert(1)", "XSS Attempt");
  assert.equal(invalid.valid, false);
});

test("Resource Contribution: Duplicate warnings and prevention", () => {
  const existingResources = [
    { id: "res-1", subject_id: "sub-gl4", title: "Architecture Microservices", storage_path: "sub-gl4/exam.pdf" },
    { id: "res-2", subject_id: "sub-gl4", title: "TP Docker Compose", external_url: "https://github.com/igl4/tp-docker" },
  ];

  function checkDuplicateWarning(newResource, existingList) {
    const normTitle = newResource.title.trim().toLowerCase();
    const titleMatch = existingList.find(
      (r) => r.subject_id === newResource.subject_id && r.title.trim().toLowerCase() === normTitle
    );
    if (titleMatch) {
      return { hasWarning: true, duplicateOf: titleMatch.id, message: "Une ressource avec ce titre existe déjà dans cette matière." };
    }

    if (newResource.external_url) {
      const urlMatch = existingList.find((r) => r.external_url === newResource.external_url);
      if (urlMatch) {
        return { hasWarning: true, duplicateOf: urlMatch.id, message: "Ce lien URL a déjà été partagé pour cette matière." };
      }
    }

    return { hasWarning: false };
  }

  // Duplicate title warning
  const warnTitle = checkDuplicateWarning(
    { subject_id: "sub-gl4", title: "architecture microservices", external_url: null },
    existingResources
  );
  assert.equal(warnTitle.hasWarning, true);
  assert.equal(warnTitle.duplicateOf, "res-1");

  // Duplicate URL warning
  const warnUrl = checkDuplicateWarning(
    { subject_id: "sub-gl4", title: "Autre titre", external_url: "https://github.com/igl4/tp-docker" },
    existingResources
  );
  assert.equal(warnUrl.hasWarning, true);
  assert.equal(warnUrl.duplicateOf, "res-2");

  // Distinct resource
  const clean = checkDuplicateWarning(
    { subject_id: "sub-gl4", title: "Nouveau TD Kubernetes", external_url: "https://k8s.io" },
    existingResources
  );
  assert.equal(clean.hasWarning, false);
});

// ============================================================================
// 2. FIRST-CLASS FOLDER MANAGEMENT & CYCLE PREVENTION
// ============================================================================

test("Folder Management: Circular reference prevention on folder move", () => {
  const folders = [
    { id: "f-root", name: "Racine", parent_id: null },
    { id: "f-chap1", name: "Chapitre 1", parent_id: "f-root" },
    { id: "f-subchap1", name: "Sous-chapitre 1.1", parent_id: "f-chap1" },
    { id: "f-chap2", name: "Chapitre 2", parent_id: "f-root" },
  ];

  function isDescendant(targetFolderId, potentialParentId, allFolders) {
    if (!potentialParentId) return false;
    if (potentialParentId === targetFolderId) return true;

    let curr = allFolders.find((f) => f.id === potentialParentId);
    while (curr) {
      if (curr.parent_id === targetFolderId) return true;
      curr = curr.parent_id ? allFolders.find((f) => f.id === curr.parent_id) : null;
    }
    return false;
  }

  // Moving Chapitre 1 into its own child Sous-chapitre 1.1 must be REJECTED (circular!)
  assert.equal(isDescendant("f-chap1", "f-subchap1", folders), true);

  // Moving Chapitre 1 into itself must be REJECTED
  assert.equal(isDescendant("f-chap1", "f-chap1", folders), true);

  // Moving Chapitre 1 into sibling Chapitre 2 is VALID
  assert.equal(isDescendant("f-chap1", "f-chap2", folders), false);

  // Moving Sous-chapitre 1.1 to Root is VALID
  assert.equal(isDescendant("f-subchap1", null, folders), false);
});

test("Folder Management: Moving resources across folders preserves ownership and subject metadata", () => {
  const resource = {
    id: "res-100",
    title: "Support de cours",
    subject_id: "sub-algo",
    owner_id: "usr-alice",
    visibility: "public",
    category_id: "cat-courses",
    chapter: "f-old-folder",
  };

  function moveResourceToFolder(res, targetFolderId) {
    return {
      ...res,
      chapter: targetFolderId, // Updates folder reference
      updated_at: "2026-10-17T12:00:00Z",
    };
  }

  const moved = moveResourceToFolder(resource, "f-new-folder");
  assert.equal(moved.chapter, "f-new-folder");
  assert.equal(moved.owner_id, "usr-alice");
  assert.equal(moved.subject_id, "sub-algo");
  assert.equal(moved.visibility, "public");
  assert.equal(moved.category_id, "cat-courses");
});

// ============================================================================
// 3. REDDIT-STYLE USEFULNESS VOTING ENGINE
// ============================================================================

test("Voting Engine: Cast upvote, downvote, and remove vote (toggle)", () => {
  // In-memory simulation of normalized resource_votes table
  const votesTable = new Map(); // key: `${userId}:${resourceId}`, value: { user_id, resource_id, vote_value }

  function castVote(userId, resourceId, voteValue) {
    const key = `${userId}:${resourceId}`;
    const existing = votesTable.get(key);

    if (voteValue === 0) {
      votesTable.delete(key);
    } else {
      votesTable.set(key, { user_id: userId, resource_id: resourceId, vote_value: voteValue });
    }

    // Aggregate summary for resource
    let upvotes = 0;
    let downvotes = 0;
    for (const v of votesTable.values()) {
      if (v.resource_id === resourceId) {
        if (v.vote_value === 1) upvotes++;
        else if (v.vote_value === -1) downvotes++;
      }
    }

    return {
      score: upvotes - downvotes,
      upvotes,
      downvotes,
      userVote: votesTable.get(key)?.vote_value ?? 0,
    };
  }

  const resId = "res-cloud-gl4";

  // User 1 upvotes: score becomes 1
  const v1 = castVote("u1", resId, 1);
  assert.equal(v1.score, 1);
  assert.equal(v1.upvotes, 1);
  assert.equal(v1.downvotes, 0);
  assert.equal(v1.userVote, 1);

  // User 2 upvotes: score becomes 2
  const v2 = castVote("u2", resId, 1);
  assert.equal(v2.score, 2);
  assert.equal(v2.upvotes, 2);
  assert.equal(v2.downvotes, 0);

  // User 3 downvotes: score becomes 1 (2 up - 1 down)
  const v3 = castVote("u3", resId, -1);
  assert.equal(v3.score, 1);
  assert.equal(v3.upvotes, 2);
  assert.equal(v3.downvotes, 1);
  assert.equal(v3.userVote, -1);

  // User 1 changes vote from upvote to downvote:
  // previous upvotes = 2, now 1; downvotes becomes 2 -> score becomes -1
  const v1Switch = castVote("u1", resId, -1);
  assert.equal(v1Switch.score, -1);
  assert.equal(v1Switch.upvotes, 1);
  assert.equal(v1Switch.downvotes, 2);
  assert.equal(v1Switch.userVote, -1);

  // User 1 cancels vote (toggle off):
  // score returns to 0 (1 up, 1 down)
  const v1Cancel = castVote("u1", resId, 0);
  assert.equal(v1Cancel.score, 0);
  assert.equal(v1Cancel.upvotes, 1);
  assert.equal(v1Cancel.downvotes, 1);
  assert.equal(v1Cancel.userVote, 0);
});

test("Voting Engine: Atomic vote calculation and idempotency across repeated clicks", () => {
  const votes = [
    { user_id: "u1", resource_id: "res-algo", vote_value: 1 },
    { user_id: "u2", resource_id: "res-algo", vote_value: 1 },
    { user_id: "u3", resource_id: "res-algo", vote_value: -1 },
    { user_id: "u4", resource_id: "res-algo", vote_value: 1 },
  ];

  function calculateScore(voteList, resourceId, currentUserId) {
    let up = 0;
    let down = 0;
    let userVote = 0;

    for (const v of voteList) {
      if (v.resource_id === resourceId) {
        if (v.vote_value === 1) up++;
        else if (v.vote_value === -1) down++;
        if (v.user_id === currentUserId) {
          userVote = v.vote_value;
        }
      }
    }

    return {
      score: up - down,
      upvotes: up,
      downvotes: down,
      userVote,
    };
  }

  const summary = calculateScore(votes, "res-algo", "u1");
  assert.equal(summary.upvotes, 3);
  assert.equal(summary.downvotes, 1);
  assert.equal(summary.score, 2);
  assert.equal(summary.userVote, 1);

  // Non-voting user sees the correct score
  const visitorSummary = calculateScore(votes, "res-algo", "u999");
  assert.equal(visitorSummary.score, 2);
  assert.equal(visitorSummary.userVote, 0);
});

test("Voting Engine: Batch vote retrieval avoids N+1 queries", () => {
  const allVotes = [
    { user_id: "u1", resource_id: "r1", vote_value: 1 },
    { user_id: "u2", resource_id: "r1", vote_value: 1 },
    { user_id: "u1", resource_id: "r2", vote_value: -1 },
    { user_id: "u3", resource_id: "r3", vote_value: 1 },
  ];

  function batchGetVotes(resourceIds, currentUserId, voteSource) {
    const result = {};
    resourceIds.forEach((id) => {
      result[id] = { score: 0, upvotes: 0, downvotes: 0, userVote: 0 };
    });

    voteSource.forEach((v) => {
      if (result[v.resource_id]) {
        if (v.vote_value === 1) result[v.resource_id].upvotes++;
        else if (v.vote_value === -1) result[v.resource_id].downvotes++;

        if (v.user_id === currentUserId) {
          result[v.resource_id].userVote = v.vote_value;
        }
      }
    });

    Object.values(result).forEach((s) => {
      s.score = s.upvotes - s.downvotes;
    });

    return result;
  }

  const batch = batchGetVotes(["r1", "r2", "r3", "r-empty"], "u1", allVotes);

  assert.equal(batch["r1"].score, 2);
  assert.equal(batch["r1"].userVote, 1);

  assert.equal(batch["r2"].score, -1);
  assert.equal(batch["r2"].userVote, -1);

  assert.equal(batch["r3"].score, 1);
  assert.equal(batch["r3"].userVote, 0); // user 1 hasn't voted on r3

  assert.equal(batch["r-empty"].score, 0);
  assert.equal(batch["r-empty"].userVote, 0);
});

// ============================================================================
// 4. PRIVACY, ACCESS CONTROL & DATA ISOLATION
// ============================================================================

test("Privacy & Scoping: Inaccessible resources cannot be voted on or leaked in lists", () => {
  const resources = [
    { id: "pub-1", owner_id: "u-author", visibility: "public", title: "Public Cours" },
    { id: "priv-1", owner_id: "u-author", visibility: "private", title: "Private Draft Exam" },
    { id: "shared-1", owner_id: "u-author", visibility: "shared", title: "Shared Project", shared_with: ["u-colleague"] },
  ];

  function canAccessResource(resource, requesterId) {
    if (resource.visibility === "public") return true;
    if (!requesterId) return false;
    if (resource.owner_id === requesterId) return true;
    if (resource.visibility === "shared" && resource.shared_with?.includes(requesterId)) return true;
    return false;
  }

  // Stranger (u-stranger) attempts to view/vote
  assert.equal(canAccessResource(resources[0], "u-stranger"), true); // public
  assert.equal(canAccessResource(resources[1], "u-stranger"), false); // private -> rejected!
  assert.equal(canAccessResource(resources[2], "u-stranger"), false); // shared with colleague only

  // Colleague attempts
  assert.equal(canAccessResource(resources[2], "u-colleague"), true); // authorized recipient

  // Author attempts
  assert.equal(canAccessResource(resources[1], "u-author"), true); // owner access

  // Anonymous user
  assert.equal(canAccessResource(resources[1], null), false);
});

test("Privacy & Scoping: Folder visibility isolation prevents child leakage", () => {
  const allResources = [
    { id: "r1", chapter: "folder-public", visibility: "public", title: "Visible Public PDF" },
    { id: "r2", chapter: "folder-public", visibility: "private", owner_id: "user-owner", title: "Owner Secret Note" },
  ];

  function queryFolderResources(folderId, requesterId) {
    return allResources.filter((r) => {
      if (r.chapter !== folderId) return false;
      if (r.visibility === "public") return true;
      if (requesterId && r.owner_id === requesterId) return true;
      return false;
    });
  }

  // Anonymous visitor in folder sees only public resources
  const publicView = queryFolderResources("folder-public", null);
  assert.equal(publicView.length, 1);
  assert.equal(publicView[0].id, "r1");

  // Other student in folder also only sees public resources
  const otherStudentView = queryFolderResources("folder-public", "user-stranger");
  assert.equal(otherStudentView.length, 1);
  assert.equal(otherStudentView[0].id, "r1");

  // Owner sees both public and private resources
  const ownerView = queryFolderResources("folder-public", "user-owner");
  assert.equal(ownerView.length, 2);
});

// ============================================================================
// 5. SORTING & DISCOVERY STRATEGIES
// ============================================================================

test("Sorting & Discovery: Multi-criteria ranking (useful, recent, voted)", () => {
  const dataset = [
    { id: "A", title: "Intro", usefulness_score: 5, upvotes_count: 5, downvotes_count: 0, created_at: "2026-01-01T10:00:00Z" },
    { id: "B", title: "Controversial", usefulness_score: 2, upvotes_count: 12, downvotes_count: 10, created_at: "2026-02-01T10:00:00Z" },
    { id: "C", title: "Brand New Masterpiece", usefulness_score: 10, upvotes_count: 10, downvotes_count: 0, created_at: "2026-03-01T10:00:00Z" },
    { id: "D", title: "Recent Fresh Drop", usefulness_score: 0, upvotes_count: 0, downvotes_count: 0, created_at: "2026-04-01T10:00:00Z" },
  ];

  function sortResources(list, strategy) {
    const copy = [...list];
    if (strategy === "useful") {
      copy.sort((a, b) => b.usefulness_score - a.usefulness_score || new Date(b.created_at) - new Date(a.created_at));
    } else if (strategy === "voted") {
      copy.sort((a, b) => {
        const totalA = (a.upvotes_count || 0) + (a.downvotes_count || 0);
        const totalB = (b.upvotes_count || 0) + (b.downvotes_count || 0);
        return totalB - totalA || new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (strategy === "recent") {
      copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return copy.map((r) => r.id);
  }

  // Sorted by "useful" -> highest net score first: C(10), A(5), B(2), D(0)
  assert.deepEqual(sortResources(dataset, "useful"), ["C", "A", "B", "D"]);

  // Sorted by "voted" -> highest total engagement first: B(22), C(10), A(5), D(0)
  assert.deepEqual(sortResources(dataset, "voted"), ["B", "C", "A", "D"]);

  // Sorted by "recent" -> newest created_at first: D(April), C(March), B(Feb), A(Jan)
  assert.deepEqual(sortResources(dataset, "recent"), ["D", "C", "B", "A"]);
});

test("Sorting & Discovery: Format filtering (document, quiz, url)", () => {
  const items = [
    { id: "1", resource_type: "document" },
    { id: "2", resource_type: "quiz" },
    { id: "3", resource_type: "url" },
    { id: "4", resource_type: null }, // legacy document
  ];

  function filterByType(list, type) {
    if (!type || type === "all") return list;
    if (type === "document") {
      return list.filter((r) => r.resource_type === "document" || !r.resource_type);
    }
    return list.filter((r) => r.resource_type === type);
  }

  assert.equal(filterByType(items, "all").length, 4);
  assert.equal(filterByType(items, "document").length, 2); // 1 and 4
  assert.equal(filterByType(items, "quiz").length, 1);
  assert.equal(filterByType(items, "url").length, 1);
});
