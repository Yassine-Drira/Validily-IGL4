import type { SubjectFolder } from "../../types/database";

export interface FolderTreeNode {
  id: string; // "root" or folder.id
  folderId: string | null; // null for root
  name: string;
  depth: number;
  prefix: string; // ASCII tree prefix: e.g. "├── ", "└── ", "│   ├── "
  indent: string; // Visual indentation spaces or level
  path: string[]; // Path of folder names: ["Racine", "Chapitre 1", ...]
  parent_id: string | null;
  children: FolderTreeNode[];
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Returns a set of all descendant folder IDs (children, grandchildren, etc.)
 * plus the folder's own ID to prevent circular hierarchy loops.
 */
export function getDescendantFolderIds(
  folderId: string,
  allFolders: SubjectFolder[]
): Set<string> {
  const ids = new Set<string>([folderId]);

  function gatherChildren(parentId: string) {
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

/**
 * Builds a hierarchical tree from a flat list of folders,
 * computing tree branches (├──, └──, │   ) matching the Unix `tree` command.
 */
export function buildFolderTree(
  folders: SubjectFolder[],
  disabledIds: Set<string> = new Set()
): { root: FolderTreeNode; flatList: FolderTreeNode[] } {
  const childrenMap = new Map<string | null, SubjectFolder[]>();

  for (const f of folders) {
    const pId = f.parent_id || null;
    if (!childrenMap.has(pId)) childrenMap.set(pId, []);
    childrenMap.get(pId)!.push(f);
  }

  // Sort alphabetically at each level for deterministic order
  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  }

  const flatList: FolderTreeNode[] = [];

  const rootNode: FolderTreeNode = {
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

  function traverse(
    parentId: string | null,
    depth: number,
    ancestorPrefix: string,
    currentPath: string[]
  ): FolderTreeNode[] {
    const children = childrenMap.get(parentId) || [];
    const result: FolderTreeNode[] = [];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const branchPrefix = ancestorPrefix + connector;
      const nextAncestorPrefix = ancestorPrefix + (isLast ? "    " : "│   ");

      const nodePath = [...currentPath, child.name];
      const isDisabled = disabledIds.has(child.id);

      const node: FolderTreeNode = {
        id: child.id,
        folderId: child.id,
        name: child.name,
        depth: depth,
        prefix: branchPrefix,
        indent: "  ".repeat(depth),
        path: nodePath,
        parent_id: child.parent_id || null,
        children: [],
        disabled: isDisabled,
        disabledReason: isDisabled ? "Dossier source ou descendant" : undefined,
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
