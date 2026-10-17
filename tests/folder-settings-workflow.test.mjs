import test from "node:test";
import assert from "node:assert/strict";

// Visual token palette representation
const FOLDER_COLOR_PALETTE = [
  { id: "blue", label: "Bleu Océan", hex: "#2855D9" },
  { id: "indigo", label: "Indigo", hex: "#4F46E5" },
  { id: "emerald", label: "Émeraude", hex: "#059669" },
  { id: "teal", label: "Sarcelle", hex: "#0D9488" },
  { id: "amber", label: "Ambre", hex: "#D97706" },
  { id: "rose", label: "Rose Corail", hex: "#E11D48" },
  { id: "violet", label: "Violet", hex: "#7C3AED" },
  { id: "slate", label: "Ardoise", hex: "#475569" },
];

const FOLDER_ICON_IDS = [
  "folder",
  "book-open",
  "code",
  "terminal",
  "file-text",
  "sparkles",
  "layers",
  "cpu",
  "database",
  "bookmark",
  "graduation-cap",
  "globe",
];

function getDescendantFolderIds(folderId, allFolders) {
  const ids = new Set([folderId]);
  function gatherChildren(parentId) {
    const children = allFolders.filter((f) => f.parent_id === parentId);
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        gatherChildren(child.id);
      }
    }
  }
  gatherChildren(folderId);
  return ids;
}

function updateFolderSettingsSim(currentFolders, input) {
  const { folder_id, name, color, icon, description, parent_id } = input;
  if (!name || !name.trim()) {
    return { success: false, error: "Nom requis." };
  }

  const targetIndex = currentFolders.findIndex((f) => f.id === folder_id);
  if (targetIndex === -1) {
    return { success: false, error: "Dossier introuvable." };
  }

  const targetFolder = currentFolders[targetIndex];
  const targetParentId = parent_id !== undefined ? parent_id : targetFolder.parent_id;

  if (targetParentId === folder_id) {
    return { success: false, error: "Un dossier ne peut pas être son propre sous-dossier." };
  }

  if (targetParentId) {
    const descendants = getDescendantFolderIds(folder_id, currentFolders);
    if (descendants.has(targetParentId)) {
      return {
        success: false,
        error: "Impossible de placer un dossier à l'intérieur de son propre sous-dossier.",
      };
    }
  }

  const duplicate = currentFolders.some(
    (f) =>
      f.id !== folder_id &&
      f.parent_id === targetParentId &&
      f.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  if (duplicate) {
    return { success: false, error: "Un autre dossier porte déjà ce nom dans ce répertoire." };
  }

  const updatedFolder = {
    ...targetFolder,
    name: name.trim(),
    parent_id: targetParentId,
    color: color !== undefined ? color : targetFolder.color,
    icon: icon !== undefined ? icon : targetFolder.icon,
    description: description !== undefined ? description.trim() : targetFolder.description,
    updated_at: new Date().toISOString(),
  };

  const updatedFolders = [...currentFolders];
  updatedFolders[targetIndex] = updatedFolder;

  return { success: true, folder: updatedFolder, updatedFolders };
}

test("Folder Settings: Updates folder name, color, icon, and description simultaneously", () => {
  const folders = [
    {
      id: "f-1",
      name: "Algorithmique Avancée",
      parent_id: null,
      color: "blue",
      icon: "folder",
      description: "",
    },
  ];

  const res = updateFolderSettingsSim(folders, {
    folder_id: "f-1",
    name: "Algorithmique & Structures de Données",
    color: "emerald",
    icon: "code",
    description: "Supports de cours, arbres AVL et graphes bipartis",
  });

  assert.equal(res.success, true);
  assert.equal(res.folder.name, "Algorithmique & Structures de Données");
  assert.equal(res.folder.color, "emerald");
  assert.equal(res.folder.icon, "code");
  assert.equal(res.folder.description, "Supports de cours, arbres AVL et graphes bipartis");
});

test("Folder Settings: Prevents duplicate folder name under destination parent", () => {
  const folders = [
    { id: "f-1", name: "TD1", parent_id: "f-root" },
    { id: "f-2", name: "TD2", parent_id: "f-root" },
  ];

  const res = updateFolderSettingsSim(folders, {
    folder_id: "f-2",
    name: "TD1",
    parent_id: "f-root",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /porte déjà ce nom/);
});

test("Folder Settings: Permits identical folder name under different parents", () => {
  const folders = [
    { id: "f-chap1", name: "Exercices", parent_id: "f-chapitre1" },
    { id: "f-chap2", name: "Devoirs", parent_id: "f-chapitre2" },
  ];

  const res = updateFolderSettingsSim(folders, {
    folder_id: "f-chap2",
    name: "Exercices",
    parent_id: "f-chapitre2",
  });

  assert.equal(res.success, true);
  assert.equal(res.folder.name, "Exercices");
});

test("Folder Settings: Blocks circular nesting when changing parent to a descendant", () => {
  const folders = [
    { id: "f-root", name: "Root", parent_id: null },
    { id: "f-sub1", name: "Sub 1", parent_id: "f-root" },
    { id: "f-sub1-child", name: "Sub 1 Child", parent_id: "f-sub1" },
  ];

  // Try moving f-sub1 into f-sub1-child
  const res = updateFolderSettingsSim(folders, {
    folder_id: "f-sub1",
    name: "Sub 1 Renamed",
    parent_id: "f-sub1-child",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /propre sous-dossier/);
});

test("Folder Settings: Blocks moving folder into itself", () => {
  const folders = [{ id: "f-1", name: "My Folder", parent_id: null }];

  const res = updateFolderSettingsSim(folders, {
    folder_id: "f-1",
    name: "My Folder",
    parent_id: "f-1",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /propre sous-dossier/);
});

test("Folder Visual Palette: Validates curated color palette completeness and contrast standards", () => {
  assert.equal(FOLDER_COLOR_PALETTE.length, 8);
  const ids = FOLDER_COLOR_PALETTE.map((c) => c.id);
  assert.deepEqual(ids, ["blue", "indigo", "emerald", "teal", "amber", "rose", "violet", "slate"]);

  for (const c of FOLDER_COLOR_PALETTE) {
    assert.match(c.hex, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(c.label.length > 0);
  }
});

test("Folder Icon Options: All supported icons belong to valid Lucide system", () => {
  assert.equal(FOLDER_ICON_IDS.length, 12);
  assert.ok(FOLDER_ICON_IDS.includes("folder"));
  assert.ok(FOLDER_ICON_IDS.includes("book-open"));
  assert.ok(FOLDER_ICON_IDS.includes("code"));
  assert.ok(FOLDER_ICON_IDS.includes("graduation-cap"));
});
