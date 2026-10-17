"use client";

import React, { useState, useMemo } from "react";
import {
  Subject,
  SubjectFolder,
  AcademicResource,
} from "@/types/database";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  FileCode,
  File,
  HardDrive,
  Globe,
  ExternalLink,
  Download,
  Eye,
  Plus,
  Edit2,
  FolderInput,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  X,
  Layers,
  FolderPlus,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFolderVisual } from "@/lib/utils/folder-visual";

interface SubjectTreeViewProps {
  subject: Subject;
  folders: SubjectFolder[];
  resources: AcademicResource[];
  onOpenFolder: (folderId: string) => void;
  onViewPdf: (res: AcademicResource) => void;
  onViewText: (res: AcademicResource) => void;
  onOpenUploadModal: (folderId?: string) => void;
  onOpenLinkModal: (folderId?: string) => void;
  onOpenCreateFolderModal: (parentId?: string) => void;
  onRenameFolder: (folder: SubjectFolder) => void;
  onMoveFolder: (folder: SubjectFolder) => void;
  onDeleteFolder: (folder: SubjectFolder) => void;
  onRenameResource: (resource: AcademicResource) => void;
  onMoveResource: (resource: AcademicResource) => void;
  onDeleteResource: (resource: AcademicResource) => void;
  onToggleRevision: (resourceId: string, currentStatus?: any) => void;
}

interface TreeFolderItem {
  folder: SubjectFolder | null; // null represents Root
  id: string; // 'root' or folder.id
  name: string;
  depth: number;
  prefix: string;
  isLast: boolean;
  childrenFolders: TreeFolderItem[];
  files: AcademicResource[];
}

export function SubjectTreeView({
  subject,
  folders,
  resources,
  onOpenFolder,
  onViewPdf,
  onViewText,
  onOpenUploadModal,
  onOpenLinkModal,
  onOpenCreateFolderModal,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onRenameResource,
  onMoveResource,
  onDeleteResource,
  onToggleRevision,
}: SubjectTreeViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const collapseAll = () => {
    const allIds = new Set<string>(["root", ...folders.map((f) => f.id)]);
    setCollapsedIds(allIds);
  };

  const expandAll = () => {
    setCollapsedIds(new Set());
  };

  // Build recursive tree
  const treeRoot = useMemo(() => {
    const childrenMap = new Map<string | null, SubjectFolder[]>();
    for (const f of folders) {
      const pId = f.parent_id || null;
      if (!childrenMap.has(pId)) childrenMap.set(pId, []);
      childrenMap.get(pId)!.push(f);
    }

    for (const list of childrenMap.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    }

    // Group resources by chapter (folder_id)
    const knownFolderIds = new Set(folders.map((f) => f.id));
    const filesMap = new Map<string | null, AcademicResource[]>();
    for (const res of resources) {
      const folderId = res.chapter && knownFolderIds.has(res.chapter) ? res.chapter : null;
      if (!filesMap.has(folderId)) filesMap.set(folderId, []);
      filesMap.get(folderId)!.push(res);
    }

    function buildNode(
      folder: SubjectFolder | null,
      depth: number,
      ancestorPrefix: string,
      isLast: boolean
    ): TreeFolderItem {
      const folderId = folder ? folder.id : null;
      const subFolders = childrenMap.get(folderId) || [];
      const nodeFiles = filesMap.get(folderId) || [];

      const children: TreeFolderItem[] = [];
      for (let i = 0; i < subFolders.length; i++) {
        const sf = subFolders[i];
        const isChildLast = i === subFolders.length - 1 && nodeFiles.length === 0;
        const connector = isChildLast ? "└── " : "├── ";
        const childPrefix = ancestorPrefix + connector;
        const nextAncestorPrefix = ancestorPrefix + (isChildLast ? "    " : "│   ");

        children.push(buildNode(sf, depth + 1, nextAncestorPrefix, isChildLast));
      }

      return {
        folder,
        id: folder ? folder.id : "root",
        name: folder ? folder.name : `Bibliothèque du Cours (${subject.name})`,
        depth,
        prefix: ancestorPrefix,
        isLast,
        childrenFolders: children,
        files: nodeFiles,
      };
    }

    return buildNode(null, 0, "", true);
  }, [folders, resources, subject.name]);

  // Handle resource click
  const handleResourceClick = (res: AcademicResource) => {
    const isGdrive = res.tags?.includes("gdrive") || res.mime_type === "application/vnd.google-apps";
    const isExternal = res.tags?.includes("external_link") || res.mime_type === "application/x-url";

    if (isGdrive || isExternal) {
      const targetUrl = res.external_url || res.storage_path;
      if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const mime = (res.mime_type || "").toLowerCase();
    const filename = (res.original_filename || "").toLowerCase();
    if (
      mime.includes("text") ||
      mime.includes("markdown") ||
      filename.endsWith(".txt") ||
      filename.endsWith(".md") ||
      filename.endsWith(".markdown")
    ) {
      onViewText(res);
      return;
    }

    onViewPdf(res);
  };

  const renderResourceRow = (
    res: AcademicResource,
    ancestorPrefix: string,
    isLastFile: boolean,
    depth: number
  ) => {
    const isGdrive = res.tags?.includes("gdrive") || res.mime_type === "application/vnd.google-apps";
    const isExternal = res.tags?.includes("external_link") || res.mime_type === "application/x-url";
    const isMd =
      res.mime_type?.includes("markdown") ||
      res.original_filename?.endsWith(".md") ||
      res.original_filename?.endsWith(".markdown");
    const isTxt = res.mime_type?.includes("text") || res.original_filename?.endsWith(".txt");
    const isHtml = res.mime_type?.includes("html") || res.original_filename?.endsWith(".html");

    const connector = isLastFile ? "└── " : "├── ";
    const branchText = ancestorPrefix + connector;

    let IconComp = FileText;
    let badgeColor = "text-rose-700 bg-rose-50 border-rose-200";
    let badgeLabel = "PDF";

    if (isGdrive) {
      IconComp = HardDrive;
      badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
      badgeLabel = "Drive";
    } else if (isMd) {
      IconComp = FileCode;
      badgeColor = "text-blue-700 bg-blue-50 border-blue-200";
      badgeLabel = "MD";
    } else if (isTxt) {
      IconComp = FileText;
      badgeColor = "text-amber-700 bg-amber-50 border-amber-200";
      badgeLabel = "TXT";
    } else if (isHtml) {
      IconComp = Globe;
      badgeColor = "text-purple-700 bg-purple-50 border-purple-200";
      badgeLabel = "HTML";
    } else if (isExternal) {
      IconComp = Globe;
      badgeColor = "text-indigo-700 bg-indigo-50 border-indigo-200";
      badgeLabel = "Lien";
    }

    return (
      <div
        key={res.id}
        className="group flex items-center justify-between py-1.5 px-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#E4E8F0] select-none text-xs"
      >
        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
          <span className="font-mono text-[#8C9AAE] text-[11px] whitespace-pre select-none shrink-0">
            {branchText}
          </span>
          <div
            onClick={() => handleResourceClick(res)}
            className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer"
          >
            <IconComp className="w-4 h-4 shrink-0 text-[#2855D9]" />
            <span className="font-medium text-[#111A2E] group-hover:text-[#2855D9] transition-colors truncate">
              {res.title}
            </span>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded-sm border shrink-0", badgeColor)}>
              {badgeLabel}
            </span>
            {res.file_size_bytes > 0 && (
              <span className="text-[10px] text-[#68748A] font-mono shrink-0 hidden sm:inline">
                ({(res.file_size_bytes / (1024 * 1024)).toFixed(1)} Mo)
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <button
            type="button"
            onClick={() => onToggleRevision(res.id, res.revision_status)}
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer",
              res.revision_status === "revised"
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : res.revision_status === "in_progress"
                ? "bg-amber-50 text-amber-700 border-amber-300"
                : "bg-stone-50 text-stone-600 border-stone-200"
            )}
            title="Changer statut de révision"
          >
            {res.revision_status === "revised" ? "Révisé" : res.revision_status === "in_progress" ? "En cours" : "À réviser"}
          </button>
          <button
            type="button"
            onClick={() => onRenameResource(res)}
            className="p-1 rounded-md text-[#68748A] hover:text-[#182235] hover:bg-stone-100 cursor-pointer"
            title="Renommer la ressource"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onMoveResource(res)}
            className="p-1 rounded-md text-[#68748A] hover:text-[#182235] hover:bg-stone-100 cursor-pointer"
            title="Déplacer vers un autre dossier"
          >
            <FolderInput className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteResource(res)}
            className="p-1 rounded-md text-[#68748A] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            title="Supprimer la ressource"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderFolderNode = (
    item: TreeFolderItem,
    ancestorPrefix: string,
    isLastNode: boolean
  ) => {
    const isRoot = item.id === "root";
    const isCollapsed = collapsedIds.has(item.id);
    const totalItems = item.childrenFolders.length + item.files.length;

    const connector = isRoot ? "" : isLastNode ? "└── " : "├── ";
    const branchText = isRoot ? "" : ancestorPrefix + connector;
    const nextAncestorPrefix = isRoot
      ? ""
      : ancestorPrefix + (isLastNode ? "    " : "│   ");

    const visual = item.folder ? getFolderVisual(item.folder.color, item.folder.icon) : null;
    const FolderIconComp = visual ? visual.Icon : isCollapsed ? Folder : FolderOpen;

    return (
      <div key={item.id} className="space-y-0.5">
        {/* Folder Header Row */}
        <div className="group flex items-center justify-between py-1.5 px-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#E4E8F0] select-none text-xs">
          <div className="flex items-center space-x-1.5 min-w-0 flex-1">
            {!isRoot && (
              <span className="font-mono text-[#8C9AAE] text-[11px] whitespace-pre select-none shrink-0">
                {branchText}
              </span>
            )}

            {/* Expand / Collapse Chevron */}
            <button
              type="button"
              onClick={() => toggleCollapse(item.id)}
              className="p-0.5 rounded text-[#68748A] hover:text-[#111A2E] cursor-pointer shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Folder Icon & Name */}
            <div
              onClick={() => {
                if (item.folder) {
                  onOpenFolder(item.folder.id);
                } else {
                  toggleCollapse(item.id);
                }
              }}
              className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer"
            >
              <FolderIconComp
                className={cn(
                  "w-4 h-4 shrink-0",
                  visual
                    ? cn(visual.color.text, visual.color.fill)
                    : isCollapsed
                    ? "text-amber-500 fill-amber-500/20"
                    : "text-[#2855D9] fill-[#2855D9]/20"
                )}
              />
              <span className={cn("font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors truncate", isRoot ? "text-sm text-[#2855D9]" : "")}>
                {item.name}
              </span>
              <span className="text-[10px] font-mono text-[#68748A] bg-[#F1F4F9] px-1.5 py-0.2 rounded-full shrink-0">
                {totalItems} élément{totalItems !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Folder Quick Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
            <button
              type="button"
              onClick={() => onOpenCreateFolderModal(item.folder?.id)}
              className="p-1 rounded-md text-[#68748A] hover:text-[#2855D9] hover:bg-blue-50 cursor-pointer"
              title="Créer un sous-dossier ici"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onOpenUploadModal(item.folder?.id)}
              className="p-1 rounded-md text-[#68748A] hover:text-[#2855D9] hover:bg-blue-50 cursor-pointer"
              title="Uploader un fichier ici"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onOpenLinkModal(item.folder?.id)}
              className="p-1 rounded-md text-[#68748A] hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              title="Ajouter un lien Google Drive ici"
            >
              <HardDrive className="w-3 h-3" />
            </button>

            {!isRoot && item.folder && (
              <>
                <button
                  type="button"
                  onClick={() => onRenameFolder(item.folder!)}
                  className="p-1 rounded-md text-[#68748A] hover:text-[#182235] hover:bg-stone-100 cursor-pointer"
                  title="Paramètres du dossier (renommer, couleur, icône, description)"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveFolder(item.folder!)}
                  className="p-1 rounded-md text-[#68748A] hover:text-[#182235] hover:bg-stone-100 cursor-pointer"
                  title="Déplacer le dossier"
                >
                  <FolderInput className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFolder(item.folder!)}
                  className="p-1 rounded-md text-[#68748A] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Supprimer le dossier"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Folder Content (Nested Subfolders & Files) */}
        {!isCollapsed && (
          <div className="space-y-0.5">
            {/* Subfolders */}
            {item.childrenFolders.map((child, idx) => {
              const isChildLast =
                idx === item.childrenFolders.length - 1 && item.files.length === 0;
              return renderFolderNode(child, nextAncestorPrefix, isChildLast);
            })}

            {/* Nested Files */}
            {item.files.map((file, idx) => {
              const isFileLast = idx === item.files.length - 1;
              return renderResourceRow(file, nextAncestorPrefix, isFileLast, item.depth + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Arborescence Header Controls */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[#111A2E] flex items-center space-x-1.5">
            <span>Arborescence Complète</span>
            <span className="text-[11px] font-mono text-[#68748A] font-normal">
              ({folders.length} dossiers • {resources.length} documents)
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={expandAll}
            className="text-xs h-8 px-2.5"
          >
            Tout déplier
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={collapseAll}
            className="text-xs h-8 px-2.5"
          >
            Tout replier
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenCreateFolderModal()}
            className="text-xs h-8 px-2.5 text-[#2855D9] border-blue-200"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1" />
            <span>Nouveau Dossier</span>
          </Button>
        </div>
      </div>

      {/* Full Tree Container */}
      <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-2xl p-4 sm:p-5 shadow-2xs overflow-x-auto">
        {renderFolderNode(treeRoot, "", true)}
      </div>
    </div>
  );
}
