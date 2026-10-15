import test from "node:test";
import assert from "node:assert/strict";

test("Folder Hierarchy: Nested folder tree structure and breadcrumbs", () => {
  const folders = [
    { id: "f-root", subject_id: "s-flutter", name: "Cours Magistraux", parent_id: null },
    { id: "f-chap1", subject_id: "s-flutter", name: "Chapitre 1 - Introduction Dart", parent_id: "f-root" },
    { id: "f-tp", subject_id: "s-flutter", name: "Travaux Pratiques (TP)", parent_id: null },
    { id: "f-tp1", subject_id: "s-flutter", name: "TP 1 - Widgets de base", parent_id: "f-tp" },
  ];

  // Helper to build breadcrumb path
  function buildBreadcrumbs(folderId, allFolders) {
    const crumbs = [];
    let curr = allFolders.find((f) => f.id === folderId);
    while (curr) {
      crumbs.unshift(curr);
      curr = curr.parent_id ? allFolders.find((f) => f.id === curr.parent_id) : null;
    }
    return crumbs;
  }

  const breadcrumbsChap1 = buildBreadcrumbs("f-chap1", folders);
  assert.equal(breadcrumbsChap1.length, 2);
  assert.equal(breadcrumbsChap1[0].name, "Cours Magistraux");
  assert.equal(breadcrumbsChap1[1].name, "Chapitre 1 - Introduction Dart");

  const breadcrumbsTp1 = buildBreadcrumbs("f-tp1", folders);
  assert.equal(breadcrumbsTp1.length, 2);
  assert.equal(breadcrumbsTp1[0].name, "Travaux Pratiques (TP)");
  assert.equal(breadcrumbsTp1[1].name, "TP 1 - Widgets de base");
});

test("Folder Hierarchy: Recursive deletion gathers all descendant folder IDs", () => {
  const folders = [
    { id: "f-1", name: "Level 1", parent_id: null },
    { id: "f-2", name: "Level 2 A", parent_id: "f-1" },
    { id: "f-3", name: "Level 3 A", parent_id: "f-2" },
    { id: "f-4", name: "Level 2 B", parent_id: "f-1" },
    { id: "f-5", name: "Unrelated", parent_id: null },
  ];

  function getDescendantFolderIds(targetId, allFolders) {
    const ids = [targetId];
    const directChildren = allFolders.filter((f) => f.parent_id === targetId);
    for (const child of directChildren) {
      ids.push(...getDescendantFolderIds(child.id, allFolders));
    }
    return ids;
  }

  const idsToDelete = getDescendantFolderIds("f-1", folders);
  assert.equal(idsToDelete.length, 4);
  assert.ok(idsToDelete.includes("f-1"));
  assert.ok(idsToDelete.includes("f-2"));
  assert.ok(idsToDelete.includes("f-3"));
  assert.ok(idsToDelete.includes("f-4"));
  assert.ok(!idsToDelete.includes("f-5"));
});

test("External Links: Correctly identifies Google Drive URLs and assigns zero storage footprint", () => {
  const driveUrl = "https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing";
  const githubUrl = "https://github.com/flutter/samples";
  const webDocUrl = "https://docs.flutter.dev/ui/widgets";

  function classifyResourceLink(url) {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    const isGoogleDrive = normalized.includes("drive.google.com");
    const isGithub = normalized.includes("github.com");
    const mimeType = isGoogleDrive ? "application/vnd.google-apps" : "application/x-url";
    const storageBytes = 0; // External resources consume 0 Supabase storage bytes
    return { normalized, isGoogleDrive, isGithub, mimeType, storageBytes };
  }

  const driveMeta = classifyResourceLink(driveUrl);
  assert.equal(driveMeta.isGoogleDrive, true);
  assert.equal(driveMeta.mimeType, "application/vnd.google-apps");
  assert.equal(driveMeta.storageBytes, 0);

  const githubMeta = classifyResourceLink(githubUrl);
  assert.equal(githubMeta.isGithub, true);
  assert.equal(githubMeta.mimeType, "application/x-url");
  assert.equal(githubMeta.storageBytes, 0);

  const docMeta = classifyResourceLink(webDocUrl);
  assert.equal(docMeta.isGoogleDrive, false);
  assert.equal(docMeta.mimeType, "application/x-url");
});

test("File Library: Supported upload extensions and mime type classification", () => {
  function getUploadMimeType(filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "application/pdf";
      case "txt":
        return "text/plain";
      case "md":
      case "markdown":
        return "text/markdown";
      case "html":
        return "text/html";
      default:
        return null;
    }
  }

  assert.equal(getUploadMimeType("cours-flutter.pdf"), "application/pdf");
  assert.equal(getUploadMimeType("cheatsheet.md"), "text/markdown");
  assert.equal(getUploadMimeType("notes-dart.txt"), "text/plain");
  assert.equal(getUploadMimeType("interactive-drill.html"), "text/html");
  assert.equal(getUploadMimeType("unsupported.exe"), null);
});

test("Resource Movement: Assigning resource to destination folder or root", () => {
  const resource = {
    id: "res-1",
    title: "Syllabus Flutter 2024",
    chapter: null, // Root
  };

  // Move to folder f-chap1
  const movedToFolder = { ...resource, chapter: "f-chap1" };
  assert.equal(movedToFolder.chapter, "f-chap1");

  // Move back to root
  const movedToRoot = { ...movedToFolder, chapter: null };
  assert.equal(movedToRoot.chapter, null);
});
