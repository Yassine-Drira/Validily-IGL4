import test from "node:test";
import assert from "node:assert/strict";

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

function buildFolderTree(folders, disabledIds = new Set()) {
  const childrenMap = new Map();
  for (const f of folders) {
    const pId = f.parent_id || null;
    if (!childrenMap.has(pId)) childrenMap.set(pId, []);
    childrenMap.get(pId).push(f);
  }
  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  }

  const flatList = [];
  const rootNode = {
    id: "root",
    folderId: null,
    name: "Racine de la bibliothèque",
    depth: 0,
    prefix: "",
    indent: "",
    path: ["Racine"],
    parent_id: null,
    children: [],
    disabled: false,
  };
  flatList.push(rootNode);

  function traverse(parentId, depth, ancestorPrefix, currentPath) {
    const children = childrenMap.get(parentId) || [];
    const result = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const branchPrefix = ancestorPrefix + connector;
      const nextAncestorPrefix = ancestorPrefix + (isLast ? "    " : "│   ");
      const nodePath = [...currentPath, child.name];
      const isDisabled = disabledIds.has(child.id);

      const node = {
        id: child.id,
        folderId: child.id,
        name: child.name,
        depth,
        prefix: branchPrefix,
        indent: "  ".repeat(depth),
        path: nodePath,
        parent_id: child.parent_id,
        children: [],
        disabled: isDisabled,
        disabledReason: isDisabled ? "Cycle circulaire ou même dossier interdit" : undefined,
      };

      flatList.push(node);
      node.children = traverse(child.id, depth + 1, nextAncestorPrefix, nodePath);
      result.push(node);
    }
    return result;
  }

  rootNode.children = traverse(null, 1, "", ["Racine"]);
  return { root: rootNode, flatList };
}

test("Tree Arborescence: Recursively builds tree matching command-line tree connectors", () => {
  const folders = [
    { id: "f-root1", name: "Chapitre 1 - Fondamentaux Dart", parent_id: null },
    { id: "f-child1", name: "fils01", parent_id: "f-root1" },
    { id: "f-grandchild", name: "fils10", parent_id: "f-child1" },
    { id: "f-greatgrandchild", name: "fils110", parent_id: "f-grandchild" },
    { id: "f-child2", name: "fils02", parent_id: "f-root1" },
    { id: "f-root2", name: "Travaux Pratiques", parent_id: null },
  ];

  const { root, flatList } = buildFolderTree(folders);

  // Root verification
  assert.equal(root.id, "root");
  assert.equal(root.children.length, 2);

  // Verify flatList order (Pre-order traversal: parent before children)
  const names = flatList.map((n) => n.name);
  assert.deepEqual(names, [
    "Racine de la bibliothèque",
    "Chapitre 1 - Fondamentaux Dart",
    "fils01",
    "fils10",
    "fils110",
    "fils02",
    "Travaux Pratiques",
  ]);

  // Verify ASCII tree prefixes match Unix tree command
  const prefixes = flatList.map((n) => n.prefix);
  assert.equal(prefixes[0], ""); // Root
  assert.equal(prefixes[1], "├── "); // Chapitre 1
  assert.equal(prefixes[2], "│   ├── "); // fils01
  assert.equal(prefixes[3], "│   │   └── "); // fils10 (only child of fils01)
  assert.equal(prefixes[4], "│   │       └── "); // fils110 (only child of fils10)
  assert.equal(prefixes[5], "│   └── "); // fils02 (last child of Chapitre 1)
  assert.equal(prefixes[6], "└── "); // Travaux Pratiques (last root folder)
});

test("Tree Arborescence: Cycle Prevention disables moving folder and all its recursive descendants", () => {
  const folders = [
    { id: "f-root1", name: "Parent", parent_id: null },
    { id: "f-child1", name: "Child 1", parent_id: "f-root1" },
    { id: "f-grandchild1", name: "Grandchild 1", parent_id: "f-child1" },
    { id: "f-child2", name: "Child 2", parent_id: "f-root1" },
  ];

  // If moving Child 1, both Child 1 and Grandchild 1 must be marked disabled
  const disabledIds = getDescendantFolderIds("f-child1", folders);
  assert.equal(disabledIds.size, 2);
  assert.ok(disabledIds.has("f-child1"));
  assert.ok(disabledIds.has("f-grandchild1"));
  assert.ok(!disabledIds.has("f-root1"));
  assert.ok(!disabledIds.has("f-child2"));

  const { flatList } = buildFolderTree(folders, disabledIds);
  const child1Node = flatList.find((n) => n.id === "f-child1");
  const grandchild1Node = flatList.find((n) => n.id === "f-grandchild1");
  const parentNode = flatList.find((n) => n.id === "f-root1");

  assert.equal(child1Node?.disabled, true);
  assert.equal(grandchild1Node?.disabled, true);
  assert.equal(parentNode?.disabled, false);
});
