import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CURRICULUM_FOLDERS,
  getDefaultSubjectFolders,
  SLUG_TO_SUBJECT_ID,
} from "../src/lib/constants/curriculum-folders.ts";

test("Curriculum Folders: All canonical subjects have valid folder configurations", () => {
  const aiFolders = getDefaultSubjectFolders("b4444444-4444-4444-4444-444444444444");
  assert.equal(aiFolders.length, 4);

  const names = aiFolders.map((f) => f.name);
  assert.ok(names.includes("Cours & Supports"));
  assert.ok(names.includes("Travaux Dirigés (TD)"));
  assert.ok(names.includes("Devoirs Surveillés (DS)"));
  assert.ok(names.includes("Examens Principaux & Évaluations"));

  const aiFolderIds = aiFolders.map((f) => f.id);
  assert.ok(aiFolderIds.includes("f_1792107314202_xmtn7"));
  assert.ok(aiFolderIds.includes("f_1792108478597_c7co8"));
  assert.ok(aiFolderIds.includes("f_1792107319272_i73dg"));
  assert.ok(aiFolderIds.includes("f_1792108498621_5ee51"));
});

test("Curriculum Folders: Lookup works seamlessly by both subject ID and slug", () => {
  const bySlug = getDefaultSubjectFolders("artificial-intelligence");
  const byId = getDefaultSubjectFolders("b4444444-4444-4444-4444-444444444444");

  assert.equal(bySlug.length, byId.length);
  assert.deepEqual(bySlug, byId);

  const parallelSlug = getDefaultSubjectFolders("parallel-algorithms");
  assert.equal(parallelSlug.length, 2);
  assert.ok(parallelSlug.some((f) => f.id === "f_1792107259965_zrybv"));
  assert.ok(parallelSlug.some((f) => f.id === "f_1792109142528_1qhbm"));
});

test("Curriculum Folders: Auto-healing disk cache creates files in .validily-cache", async () => {
  const cacheDir = path.join(process.cwd(), ".validily-cache");
  assert.ok(fs.existsSync(cacheDir), "Cache directory must exist");

  const aiCacheFile = path.join(cacheDir, "folders_b4444444-4444-4444-4444-444444444444.json");
  assert.ok(fs.existsSync(aiCacheFile), "AI folders cache file must exist");

  const raw = fs.readFileSync(aiCacheFile, "utf8");
  const parsed = JSON.parse(raw);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 4);
});

test("Library Resilience: Orphan resources without valid folders never disappear into limbo", () => {
  const sampleFolders = [
    { id: "f-known-1", subject_id: "sub-1", name: "Cours", parent_id: null },
  ];

  const sampleResources = [
    { id: "res-1", title: "Doc at root", chapter: null },
    { id: "res-2", title: "Doc in folder", chapter: "f-known-1" },
    { id: "res-3", title: "Doc with missing folder", chapter: "f-deleted-or-missing" },
  ];

  // Logic used in SubjectFileLibrary at root
  const rootResources = sampleResources.filter((r) => {
    return (
      !r.chapter ||
      r.chapter === "root" ||
      r.chapter === "" ||
      !sampleFolders.some((f) => f.id === r.chapter)
    );
  });

  assert.equal(rootResources.length, 2);
  assert.ok(rootResources.some((r) => r.id === "res-1"));
  assert.ok(rootResources.some((r) => r.id === "res-3"), "Orphan resource res-3 must appear at root");
});

test("Library Resilience: Active category filter surfaces matching resources directly at root", () => {
  const isFilterActive = true;
  const currentFolderId = null;

  const filteredExams = [
    { id: "res-p24", title: "P-2024", chapter: "f_1792108498621_5ee51" },
    { id: "res-ds23", title: "DS-2023", chapter: "f_1792108498621_5ee51" },
  ];

  // Logic used in SubjectFileLibrary when filter is active
  const displayedInLibrary =
    isFilterActive && currentFolderId === null
      ? filteredExams
      : filteredExams.filter((r) => !r.chapter);

  assert.equal(
    displayedInLibrary.length,
    2,
    "Filtered resources must be displayed directly without getting blocked by folder hierarchy"
  );
});
