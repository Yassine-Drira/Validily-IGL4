"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Subject,
  ResourceCategory,
  AcademicResource,
  SubjectFolder,
  RevisionStatus,
} from "@/types/database";
import {
  createFolderAction,
  renameFolderAction,
  updateFolderSettingsAction,
  moveFolderAction,
  deleteFolderAction,
} from "@/lib/actions/folder-actions";
import {
  createExternalLinkResource,
  moveResourceAction,
  renameResourceAction,
  deleteResource,
  updateRevisionStatus,
} from "@/lib/actions/resource-actions";
import {
  Folder,
  FolderPlus,
  FilePlus,
  Link2,
  ChevronRight,
  Search,
  X,
  LayoutGrid,
  List,
  MoreVertical,
  Edit2,
  Trash2,
  FolderInput,
  ExternalLink,
  Download,
  Eye,
  FileText,
  FileCode,
  File,
  CheckCircle2,
  Clock,
  ArrowRight,
  Share2,
  AlertCircle,
  Plus,
  Globe,
  HardDrive,
  Layers,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderTree } from "lucide-react";
import { FolderTreePicker } from "@/components/workspace/folder-tree-picker";
import { getDescendantFolderIds } from "@/lib/utils/folder-tree";
import { SubjectTreeView } from "@/components/workspace/subject-tree-view";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { cn } from "@/lib/utils";
import { ResourceVoteControl } from "@/components/resources/resource-vote-control";
import {
  getFolderVisual,
  FOLDER_COLOR_PALETTE,
  FOLDER_ICON_OPTIONS,
} from "@/lib/utils/folder-visual";

interface SubjectFileLibraryProps {
  subject: Subject;
  categories: ResourceCategory[];
  resources: AcademicResource[];
  folders: SubjectFolder[];
  isFilterActive?: boolean;
  onResourcesChange: (updater: (prev: AcademicResource[]) => AcademicResource[]) => void;
  onFoldersChange: (updater: (prev: SubjectFolder[]) => SubjectFolder[]) => void;
  onViewPdf: (res: AcademicResource) => void;
  onViewText: (res: AcademicResource) => void;
  onOpenUploadModal: (folderId?: string) => void;
  showFeedback: (msg: string) => void;
}

export function SubjectFileLibrary({
  subject,
  categories,
  resources,
  folders,
  isFilterActive = false,
  onResourcesChange,
  onFoldersChange,
  onViewPdf,
  onViewText,
  onOpenUploadModal,
  showFeedback,
}: SubjectFileLibraryProps) {
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "tree">("list");
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<SubjectFolder | null>(null);
  const [folderToMove, setFolderToMove] = useState<SubjectFolder | null>(null);
  const [resourceToRename, setResourceToRename] = useState<AcademicResource | null>(null);
  const [resourceToMove, setResourceToMove] = useState<AcademicResource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<AcademicResource | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<SubjectFolder | null>(null);

  // Active folder object
  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Breadcrumbs path calculation: [Root, ...ancestors, currentFolder]
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "Bibliothèque du Module" },
    ];

    if (!currentFolderId) return crumbs;

    const path: SubjectFolder[] = [];
    let curr = folders.find((f) => f.id === currentFolderId);
    while (curr) {
      path.unshift(curr);
      curr = curr.parent_id ? folders.find((f) => f.id === curr!.parent_id) : undefined;
    }

    return [...crumbs, ...path.map((f) => ({ id: f.id, name: f.name }))];
  }, [folders, currentFolderId]);

  // Subfolders in current level
  const currentSubfolders = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return folders.filter((f) => f.name.toLowerCase().includes(q));
    }
    // When a filter is actively selected at root, show matching folders
    if (isFilterActive && currentFolderId === null) {
      const matchingFolderIds = new Set(resources.map((r) => r.chapter).filter(Boolean));
      return folders.filter((f) => f.parent_id === null && matchingFolderIds.has(f.id));
    }
    return folders.filter((f) => f.parent_id === currentFolderId);
  }, [folders, resources, currentFolderId, searchQuery, isFilterActive]);

  // Resources in current level
  const currentResources = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return resources.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.original_filename?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    // When a filter is actively selected at root, display all matching resources directly
    if (isFilterActive && currentFolderId === null) {
      return resources;
    }
    return resources.filter((r) => {
      if (currentFolderId === null) {
        return (
          !r.chapter ||
          r.chapter === "root" ||
          r.chapter === "" ||
          !folders.some((f) => f.id === r.chapter)
        );
      }
      return r.chapter === currentFolderId;
    });
  }, [resources, folders, currentFolderId, searchQuery, isFilterActive]);

  // Status toggle handler
  const handleToggleRevision = (resId: string, currentStatus?: RevisionStatus) => {
    const nextStatus: RevisionStatus =
      currentStatus === "not_started" || !currentStatus
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "revised"
        : "not_started";

    onResourcesChange((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, revision_status: nextStatus } : r))
    );

    startTransition(async () => {
      await updateRevisionStatus(resId, nextStatus);
    });
  };

  // Delete Resource execution from modal
  const executeDeleteResource = async () => {
    if (!resourceToDelete) return;
    const resId = resourceToDelete.id;
    const res = await deleteResource(resId);
    if (res.error) {
      throw new Error(res.error);
    }
    onResourcesChange((prev) => prev.filter((r) => r.id !== resId));
    showFeedback("Ressource supprimée avec succès.");
    setResourceToDelete(null);
  };

  // Delete Folder execution from modal
  const executeDeleteFolder = async (options?: { deleteContents?: boolean }) => {
    if (!folderToDelete) return;
    const fId = folderToDelete.id;
    const deleteContents = Boolean(options?.deleteContents);

    const res = await deleteFolderAction({
      subject_id: subject.id,
      folder_id: fId,
      deleteContents,
    });

    if (!res.success) {
      throw new Error(res.error || "Échec de la suppression du dossier.");
    }

    onFoldersChange((prev) => prev.filter((f) => f.id !== fId));
    if (deleteContents) {
      onResourcesChange((prev) => prev.filter((r) => r.chapter !== fId));
    } else {
      onResourcesChange((prev) =>
        prev.map((r) => (r.chapter === fId ? { ...r, chapter: folderToDelete.parent_id || null } : r))
      );
    }
    showFeedback("Dossier supprimé avec succès.");
    setFolderToDelete(null);
  };

  // Open resource according to type
  const handleOpenResource = (res: AcademicResource) => {
    const isPdf =
      res.mime_type === "application/pdf" ||
      res.original_filename?.toLowerCase().endsWith(".pdf");
    const isText =
      res.mime_type === "text/plain" ||
      res.mime_type === "text/markdown" ||
      res.original_filename?.toLowerCase().endsWith(".txt") ||
      res.original_filename?.toLowerCase().endsWith(".md");
    const isExternal =
      res.mime_type?.includes("url") ||
      res.mime_type?.includes("google-apps") ||
      res.storage_path?.startsWith("http");

    if (isExternal) {
      window.open(res.storage_path, "_blank", "noopener,noreferrer");
    } else if (isPdf) {
      onViewPdf(res);
    } else if (isText) {
      onViewText(res);
    } else {
      window.open(`/api/download/${res.id}`, "_blank");
    }
  };

  // Helper to determine file icon and format metadata
  const getResourceMeta = (res: AcademicResource) => {
    const isExternal =
      res.mime_type?.includes("url") ||
      res.mime_type?.includes("google-apps") ||
      res.storage_path?.startsWith("http");
    const isGdrive =
      res.storage_path?.includes("drive.google.com") ||
      res.tags?.includes("gdrive");
    const isPdf =
      res.mime_type === "application/pdf" ||
      res.original_filename?.toLowerCase().endsWith(".pdf");
    const isMarkdown =
      res.mime_type === "text/markdown" ||
      res.original_filename?.toLowerCase().endsWith(".md");
    const isText =
      res.mime_type === "text/plain" ||
      res.original_filename?.toLowerCase().endsWith(".txt");

    if (isGdrive) {
      return {
        type: "gdrive",
        label: "Google Drive",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        icon: HardDrive,
        iconColor: "text-emerald-600",
      };
    }
    if (isExternal) {
      return {
        type: "link",
        label: "Lien Web",
        color: "text-blue-700 bg-blue-50 border-blue-200",
        icon: Globe,
        iconColor: "text-blue-600",
      };
    }
    if (isPdf) {
      return {
        type: "pdf",
        label: "PDF",
        color: "text-rose-700 bg-rose-50 border-rose-200",
        icon: FileText,
        iconColor: "text-rose-600",
      };
    }
    if (isMarkdown) {
      return {
        type: "md",
        label: "Markdown",
        color: "text-purple-700 bg-purple-50 border-purple-200",
        icon: FileCode,
        iconColor: "text-purple-600",
      };
    }
    if (isText) {
      return {
        type: "txt",
        label: "Texte",
        color: "text-slate-700 bg-slate-100 border-slate-200",
        icon: FileText,
        iconColor: "text-slate-600",
      };
    }
    return {
      type: "file",
      label: "Fichier",
      color: "text-slate-700 bg-slate-50 border-slate-200",
      icon: File,
      iconColor: "text-slate-600",
    };
  };

  return (
    <div className="space-y-5">
      {/* TOOLBAR & CONTROL BAR */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Breadcrumbs Path */}
          <div className="flex items-center space-x-1 overflow-x-auto py-1 text-xs text-[#68748A]">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id || "root"}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFolderId(crumb.id);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-1.5",
                      isLast
                        ? "font-bold text-[#111A2E] bg-[#FAFAF7]"
                        : "hover:text-[#2855D9] hover:bg-[#F4F6FA]"
                    )}
                  >
                    {idx === 0 ? (
                      <Folder className="w-3.5 h-3.5 text-[#2855D9]" />
                    ) : (
                      (() => {
                        const f = folders.find((folder) => folder.id === crumb.id);
                        const visual = f ? getFolderVisual(f.color, f.icon) : null;
                        const CrumbIcon = visual ? visual.Icon : Folder;
                        return (
                          <CrumbIcon
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              visual ? visual.color.text : "text-[#68748A]"
                            )}
                          />
                        );
                      })()
                    )}
                    <span>{crumb.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">

            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="bg-white hover:bg-[#F4F6FA] text-[#182235] border border-[#E4E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Nouveau Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenUploadModal(currentFolderId || undefined)}
              className="bg-white hover:bg-[#F4F6FA] text-[#182235] border border-[#E4E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <FilePlus className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Déposer Fichier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddLinkModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Lien Google Drive</span>
            </button>
          </div>
        </div>

        {/* Search & Layout Toggles */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#F4F6FA]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans cette bibliothèque..."
              className="w-full bg-[#FAFAF7] focus:bg-white border border-[#E4E8F0] focus:border-[#2855D9] rounded-xl pl-8 pr-8 py-1.5 text-xs text-[#182235] transition-colors focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#68748A] hover:text-[#182235] p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#68748A]">
            <span className="font-mono text-[11px]">
              {currentSubfolders.length} dossier{currentSubfolders.length !== 1 ? "s" : ""} •{" "}
              {currentResources.length} ressource{currentResources.length !== 1 ? "s" : ""}
            </span>

            <div className="flex items-center bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === "list" ? "bg-white text-[#2855D9] shadow-xs" : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Vue Liste"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === "grid" ? "bg-white text-[#2855D9] shadow-xs" : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Vue Grille"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "px-2 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold",
                  viewMode === "tree" ? "bg-white text-[#2855D9] shadow-xs" : "text-[#68748A] hover:text-[#111A2E]"
                )}
                title="Vue Arborescence (Arbre complet)"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Arborescence</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT LISTING (FOLDERS & FILES) */}
      {viewMode === "tree" ? (
        <SubjectTreeView
          subject={subject}
          folders={folders}
          resources={resources}
          onOpenFolder={(fId) => {
            setCurrentFolderId(fId);
            setViewMode("list");
          }}
          onViewPdf={onViewPdf}
          onViewText={onViewText}
          onOpenUploadModal={onOpenUploadModal}
          onOpenLinkModal={(fId) => {
            setCurrentFolderId(fId || null);
            setIsAddLinkModalOpen(true);
          }}
          onOpenCreateFolderModal={(pId) => {
            setCurrentFolderId(pId || null);
            setIsCreateFolderModalOpen(true);
          }}
          onRenameFolder={(f) => setFolderToRename(f)}
          onMoveFolder={(f) => setFolderToMove(f)}
          onDeleteFolder={(f) => setFolderToDelete(f)}
          onRenameResource={(r) => setResourceToRename(r)}
          onMoveResource={(r) => setResourceToMove(r)}
          onDeleteResource={(r) => setResourceToDelete(r)}
          onToggleRevision={(resId, cur) => handleToggleRevision(resId, cur)}
        />
      ) : currentSubfolders.length === 0 && currentResources.length === 0 ? (
        /* Empty Folder State */
        <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2855D9] flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#111A2E]">Ce dossier est vide</h4>
            <p className="text-xs text-[#68748A] max-w-sm mx-auto mt-1">
              Organisez vos cours en créant un sous-dossier, en déposant des fichiers (PDF, TXT, MD) ou en liant un Google Drive.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateFolderModalOpen(true)}
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1 text-[#2855D9]" />
              <span>Créer un sous-dossier</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onOpenUploadModal(currentFolderId || undefined)}
            >
              <FilePlus className="w-3.5 h-3.5 mr-1" />
              <span>Uploader un fichier</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddLinkModalOpen(true)}
            >
              <Link2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Ajouter un Google Drive</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SUBFOLDERS SECTION */}
          {currentSubfolders.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#68748A] uppercase tracking-wider font-mono">
                <span>Dossiers ({currentSubfolders.length})</span>
              </div>

              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5"
                    : "space-y-2"
                )}
              >
                {currentSubfolders.map((folder) => {
                  const itemsCount =
                    resources.filter((r) => r.chapter === folder.id).length +
                    folders.filter((f) => f.parent_id === folder.id).length;
                  const visual = getFolderVisual(folder.color, folder.icon);
                  const FolderIconComp = visual.Icon;

                  if (viewMode === "grid") {
                    return (
                      <div
                        key={folder.id}
                        className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 transition-all flex flex-col justify-between"
                      >
                        <div
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="cursor-pointer space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform",
                                visual.color.bg,
                                visual.color.border,
                                visual.color.text
                              )}
                            >
                              <FolderIconComp className={cn("w-5 h-5", visual.color.fill)} />
                            </div>
                            <span className="text-[11px] font-mono text-[#68748A] bg-[#FAFAF7] border border-[#E4E8F0] px-2 py-0.5 rounded-full">
                              {itemsCount} élément{itemsCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors line-clamp-1 leading-snug">
                              {folder.name}
                            </h4>
                            {folder.description ? (
                              <p className="text-[11px] text-[#68748A] line-clamp-2 mt-1">
                                {folder.description}
                              </p>
                            ) : (
                              <p className="text-[11px] text-[#8C9AAE] italic mt-1 line-clamp-1">
                                Aucun sous-titre
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-3 pt-2.5 border-t border-[#F1F4F9] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="text-[11px] font-semibold text-[#2855D9] hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Ouvrir</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setFolderToRename(folder)}
                              className="p-1 rounded-md text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] cursor-pointer"
                              title="Paramètres du dossier (renommer, couleur, icône, description)"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFolderToMove(folder)}
                              className="p-1 rounded-md text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] cursor-pointer"
                              title="Déplacer le dossier"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFolderToDelete(folder)}
                              className="p-1 rounded-md text-[#68748A] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Supprimer le dossier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // List View Row
                  return (
                    <div
                      key={folder.id}
                      className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9]/50 hover:bg-[#FAFBFD] rounded-xl px-4 py-3 transition-colors flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                            visual.color.bg,
                            visual.color.border,
                            visual.color.text
                          )}
                        >
                          <FolderIconComp className={cn("w-4 h-4", visual.color.fill)} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors truncate">
                            {folder.name}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-[#68748A]">
                            <span className="font-mono">
                              {itemsCount} élément{itemsCount !== 1 ? "s" : ""}
                            </span>
                            {folder.description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-sm text-[#8C9AAE]">
                                  {folder.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFolderToRename(folder)}
                          className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-white cursor-pointer"
                          title="Paramètres du dossier (renommer, couleur, icône, description)"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFolderToMove(folder)}
                          className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-white cursor-pointer"
                          title="Déplacer"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFolderToDelete(folder)}
                          className="p-1.5 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="ml-1 text-xs font-semibold text-[#2855D9] hover:text-[#1E40AF] px-2 py-1 rounded-md hover:bg-[#EDF2FF] flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Ouvrir</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FILES & RESOURCES SECTION */}
          {currentResources.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#68748A] uppercase tracking-wider font-mono">
                <span>Fichiers & Documents ({currentResources.length})</span>
              </div>

              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5"
                    : "divide-y divide-[#F1F4F9] bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-2xs"
                )}
              >
                {currentResources.map((res) => {
                  const meta = getResourceMeta(res);
                  const IconComp = meta.icon;
                  const isExternal = meta.type === "gdrive" || meta.type === "link";
                  const sizeFormatted =
                    res.file_size_bytes > 0
                      ? `${(res.file_size_bytes / (1024 * 1024)).toFixed(1)} Mo`
                      : "";

                  const parentFolder = folders.find((f) => f.id === res.chapter);

                  if (viewMode === "grid") {
                    return (
                      <div
                        key={res.id}
                        className="group bg-white border border-[#E4E8F0] hover:border-[#2855D9] hover:shadow-xs rounded-2xl p-4 transition-all flex flex-col justify-between"
                      >
                        <div
                          onClick={() => handleOpenResource(res)}
                          className="cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105",
                                meta.color
                              )}
                            >
                              <IconComp className={cn("w-5 h-5", meta.iconColor)} />
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                meta.color
                              )}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors line-clamp-2 leading-snug">
                              {res.title}
                            </h4>
                            <div className="flex items-center space-x-1.5 text-[10px] text-[#68748A] font-mono mt-1">
                              {sizeFormatted && <span>{sizeFormatted}</span>}
                              {res.instructor && <span>• {res.instructor}</span>}
                            </div>
                            {parentFolder && (isFilterActive || searchQuery.trim()) && (
                              <div className="flex items-center space-x-1 text-[10px] text-[#2855D9] bg-blue-50/70 border border-blue-200/60 px-1.5 py-0.5 rounded-md mt-1.5 font-medium truncate">
                                <Folder className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{parentFolder.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-3 pt-2.5 border-t border-[#F1F4F9] flex flex-wrap items-center justify-between gap-1.5">
                          <ResourceVoteControl
                            resourceId={res.id}
                            initialScore={res.vote_summary?.score ?? res.usefulness_score ?? 0}
                            initialUpvotes={res.vote_summary?.upvotes ?? res.upvotes_count ?? 0}
                            initialDownvotes={res.vote_summary?.downvotes ?? res.downvotes_count ?? 0}
                            initialUserVote={res.vote_summary?.userVote ?? 0}
                            size="sm"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleRevision(res.id, res.revision_status)
                            }
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer transition-all",
                              res.revision_status === "revised"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : res.revision_status === "in_progress"
                                ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-[#FAFAF7] text-[#68748A] border-[#E4E8F0]"
                            )}
                          >
                            {res.revision_status === "revised"
                              ? "Révisé"
                              : res.revision_status === "in_progress"
                              ? "En cours"
                              : "À réviser"}
                          </button>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setResourceToRename(res)}
                              className="p-1 text-[#68748A] hover:text-[#182235] rounded-md hover:bg-[#F4F6FA] cursor-pointer"
                              title="Renommer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResourceToMove(res)}
                              className="p-1 text-[#68748A] hover:text-[#182235] rounded-md hover:bg-[#F4F6FA] cursor-pointer"
                              title="Déplacer"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResourceToDelete(res)}
                              className="p-1 text-[#68748A] hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // List View Row
                  return (
                    <div
                      key={res.id}
                      className="p-3.5 sm:p-4 hover:bg-[#FAFBFD] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div
                        onClick={() => handleOpenResource(res)}
                        className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                            meta.color
                          )}
                        >
                          <IconComp className={cn("w-4 h-4", meta.iconColor)} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                            <span className="font-bold text-xs sm:text-sm text-[#111A2E] group-hover:text-[#2855D9] transition-colors truncate">
                              {res.title}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.2 rounded-md border",
                                meta.color
                              )}
                            >
                              {meta.label}
                            </span>
                            {parentFolder && (isFilterActive || searchQuery.trim()) && (
                              <span className="text-[10px] text-[#2855D9] bg-blue-50/70 border border-blue-200/60 px-1.5 py-0.2 rounded-md font-medium flex items-center space-x-1 shrink-0">
                                <Folder className="w-2.5 h-2.5" />
                                <span>{parentFolder.name}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-[#68748A] font-mono mt-0.5">
                            {res.original_filename && <span>{res.original_filename}</span>}
                            {sizeFormatted && (
                              <>
                                <span>•</span>
                                <span>{sizeFormatted}</span>
                              </>
                            )}
                            {res.instructor && (
                              <>
                                <span>•</span>
                                <span>{res.instructor}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F4F9]">
                        <ResourceVoteControl
                          resourceId={res.id}
                          initialScore={res.vote_summary?.score ?? res.usefulness_score ?? 0}
                          initialUpvotes={res.vote_summary?.upvotes ?? res.upvotes_count ?? 0}
                          initialDownvotes={res.vote_summary?.downvotes ?? res.downvotes_count ?? 0}
                          initialUserVote={res.vote_summary?.userVote ?? 0}
                          size="sm"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleRevision(res.id, res.revision_status)
                          }
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-2xs",
                            res.revision_status === "revised"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : res.revision_status === "in_progress"
                              ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                              : "bg-[#FAFAF7] text-[#68748A] border-[#E4E8F0] hover:text-[#111A2E]"
                          )}
                          title="Changer le statut de révision"
                        >
                          {res.revision_status === "revised" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Révisé</span>
                            </>
                          ) : res.revision_status === "in_progress" ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>En cours</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#68748A]" />
                              <span>À réviser</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenResource(res)}
                            className="p-1.5 rounded-lg bg-[#EDF2FF] text-[#2855D9] hover:bg-[#2855D9] hover:text-white transition-colors cursor-pointer"
                            title={isExternal ? "Ouvrir le lien" : "Visualiser"}
                          >
                            {isExternal ? (
                              <ExternalLink className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {!isExternal && (
                            <a
                              href={`/api/download/${res.id}`}
                              download={res.original_filename}
                              className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] cursor-pointer"
                              title="Télécharger"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setResourceToRename(res)}
                            className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] cursor-pointer"
                            title="Renommer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setResourceToMove(res)}
                            className="p-1.5 rounded-lg text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] cursor-pointer"
                            title="Déplacer"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setResourceToDelete(res)}
                            className="p-1.5 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: NOUVEAU DOSSIER --- */}
      {isCreateFolderModalOpen && (
        <CreateFolderModal
          subjectId={subject.id}
          currentFolderId={currentFolderId}
          onClose={() => setIsCreateFolderModalOpen(false)}
          onCreated={(newFolder) => {
            onFoldersChange((prev) => [...prev, newFolder]);
            setIsCreateFolderModalOpen(false);
            showFeedback(`Dossier "${newFolder.name}" créé.`);
          }}
        />
      )}

      {/* --- MODAL: AJOUTER LIEN GOOGLE DRIVE / WEB --- */}
      {isAddLinkModalOpen && (
        <AddExternalLinkModal
          subjectId={subject.id}
          categories={categories}
          currentFolderId={currentFolderId}
          onClose={() => setIsAddLinkModalOpen(false)}
          onCreated={(newRes) => {
            onResourcesChange((prev) => [newRes, ...prev]);
            setIsAddLinkModalOpen(false);
            showFeedback(`Lien "${newRes.title}" enregistré.`);
          }}
        />
      )}

      {/* --- MODAL: PARAMÈTRES DU DOSSIER --- */}
      {folderToRename && (
        <FolderSettingsModal
          folder={folderToRename}
          allFolders={folders}
          subjectId={subject.id}
          onClose={() => setFolderToRename(null)}
          onSaved={(updatedFolder) => {
            onFoldersChange((prev) =>
              prev.map((f) => (f.id === updatedFolder.id ? updatedFolder : f))
            );
            setFolderToRename(null);
            showFeedback(`Paramètres du dossier "${updatedFolder.name}" mis à jour.`);
          }}
        />
      )}

      {/* --- MODAL: DÉPLACER DOSSIER --- */}
      {folderToMove && (
        <MoveFolderModal
          folder={folderToMove}
          allFolders={folders}
          subjectId={subject.id}
          onClose={() => setFolderToMove(null)}
          onMoved={(newParentId) => {
            onFoldersChange((prev) =>
              prev.map((f) => (f.id === folderToMove.id ? { ...f, parent_id: newParentId } : f))
            );
            setFolderToMove(null);
            showFeedback("Dossier déplacé.");
          }}
        />
      )}

      {/* --- MODAL: RENOMMER RESSOURCE --- */}
      {resourceToRename && (
        <RenameResourceModal
          resource={resourceToRename}
          onClose={() => setResourceToRename(null)}
          onRenamed={(newTitle) => {
            onResourcesChange((prev) =>
              prev.map((r) => (r.id === resourceToRename.id ? { ...r, title: newTitle } : r))
            );
            setResourceToRename(null);
            showFeedback("Ressource renommée.");
          }}
        />
      )}

      {/* --- MODAL: DÉPLACER RESSOURCE --- */}
      {resourceToMove && (
        <MoveResourceModal
          resource={resourceToMove}
          allFolders={folders}
          onClose={() => setResourceToMove(null)}
          onMoved={(targetFolderId) => {
            onResourcesChange((prev) =>
              prev.map((r) =>
                r.id === resourceToMove.id ? { ...r, chapter: targetFolderId } : r
              )
            );
            setResourceToMove(null);
            showFeedback("Ressource déplacée.");
          }}
        />
      )}
      {/* --- MODAL: CONFIRMATION SUPPRESSION RESSOURCE --- */}
      {resourceToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title="Supprimer la ressource"
          itemName={resourceToDelete.title}
          itemType="resource"
          itemFormat={
            resourceToDelete.storage_path?.startsWith("http")
              ? resourceToDelete.storage_path?.includes("drive.google.com")
                ? "Google Drive"
                : "Lien externe"
              : resourceToDelete.mime_type?.includes("pdf")
              ? "PDF"
              : "Fichier"
          }
          onClose={() => setResourceToDelete(null)}
          onConfirm={async () => {
            const res = await deleteResource(resourceToDelete.id);
            if (!res.success) {
              throw new Error(res.error || "Échec de la suppression.");
            }
            onResourcesChange((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
            setResourceToDelete(null);
            showFeedback(`Ressource "${resourceToDelete.title}" supprimée.`);
          }}
        />
      )}

      {/* --- MODAL: CONFIRMATION SUPPRESSION DOSSIER --- */}
      {folderToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title="Supprimer le dossier"
          itemName={folderToDelete.name}
          itemType="folder"
          hasChildren={
            folders.some((f) => f.parent_id === folderToDelete.id) ||
            resources.some((r) => r.chapter === folderToDelete.id)
          }
          childCount={
            folders.filter((f) => f.parent_id === folderToDelete.id).length +
            resources.filter((r) => r.chapter === folderToDelete.id).length
          }
          onClose={() => setFolderToDelete(null)}
          onConfirm={async (options) => {
            const res = await deleteFolderAction({
              folder_id: folderToDelete.id,
              subject_id: subject.id,
              deleteContents: options?.deleteContents ?? false,
            });
            if (!res.success) {
              throw new Error(res.error || "Échec de la suppression du dossier.");
            }
            if (options?.deleteContents) {
              const descendantIds = new Set(getDescendantFolderIds(folderToDelete.id, folders));
              descendantIds.add(folderToDelete.id);
              onFoldersChange((prev) => prev.filter((f) => !descendantIds.has(f.id)));
              onResourcesChange((prev) =>
                prev.filter((r) => !r.chapter || !descendantIds.has(r.chapter))
              );
            } else {
              onFoldersChange((prev) =>
                prev
                  .filter((f) => f.id !== folderToDelete.id)
                  .map((f) =>
                    f.parent_id === folderToDelete.id
                      ? { ...f, parent_id: folderToDelete.parent_id }
                      : f
                  )
              );
              onResourcesChange((prev) =>
                prev.map((r) =>
                  r.chapter === folderToDelete.id
                    ? { ...r, chapter: folderToDelete.parent_id }
                    : r
                )
              );
            }
            if (currentFolderId === folderToDelete.id) {
              setCurrentFolderId(folderToDelete.parent_id || null);
            }
            setFolderToDelete(null);
            showFeedback(`Dossier "${folderToDelete.name}" supprimé.`);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------------
// MODAL COMPONENTS
// ----------------------------------------------------------------------------------------

function CreateFolderModal({
  subjectId,
  currentFolderId,
  onClose,
  onCreated,
}: {
  subjectId: string;
  currentFolderId: string | null;
  onClose: () => void;
  onCreated: (folder: SubjectFolder) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState("folder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createFolderAction({
      subject_id: subjectId,
      name: name.trim(),
      parent_id: currentFolderId,
      color,
      icon,
    });

    setIsSubmitting(false);
    if (!res.success || !res.folder) {
      setError(res.error || "Impossible de créer le dossier.");
    } else {
      onCreated(res.folder);
    }
  };

  const activeVisual = getFolderVisual(color, icon);
  const FolderIconComp = activeVisual.Icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E4E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center border",
                activeVisual.color.bg,
                activeVisual.color.border,
                activeVisual.color.text
              )}
            >
              <FolderIconComp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">Créer un Nouveau Dossier</h3>
              <p className="text-[11px] text-[#68748A]">
                Organisez vos cours et examens avec précision
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#68748A] hover:text-[#111A2E] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#111A2E] mb-1">
              Nom du dossier *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Chapitre 1 - Widgets / TP 2 / Examen 2024"
              className="w-full bg-[#FAFAF7] border border-[#E4E8F0] focus:border-[#2855D9] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#111A2E] outline-hidden transition-all"
            />
          </div>

          {/* Color Palette Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#111A2E] mb-1.5 flex items-center justify-between">
              <span>Couleur</span>
              <span className="text-[11px] font-normal text-[#68748A]">
                {activeVisual.color.label}
              </span>
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              {FOLDER_COLOR_PALETTE.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setColor(pal.id)}
                  title={pal.label}
                  className={cn(
                    "h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer relative",
                    pal.bg,
                    pal.border,
                    color === pal.id ? "ring-2 ring-offset-1 ring-[#182235]" : "hover:scale-105"
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: pal.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#F1F4F9]">
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Création..." : "Créer le dossier"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExternalLinkModal({
  subjectId,
  categories,
  currentFolderId,
  onClose,
  onCreated,
}: {
  subjectId: string;
  categories: ResourceCategory[];
  currentFolderId: string | null;
  onClose: () => void;
  onCreated: (res: AcademicResource) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [instructor, setInstructor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isGoogleDrive = url.includes("drive.google.com");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createExternalLinkResource({
      subject_id: subjectId,
      category_id: categoryId,
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      instructor: instructor.trim() || undefined,
      folder_id: currentFolderId,
    });

    setIsSubmitting(false);
    if (!res.success || !res.resource) {
      setError(res.error || "Impossible d'enregistrer le lien.");
    } else {
      onCreated(res.resource);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E4E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">Ajouter un Lien / Google Drive</h3>
              <p className="text-[11px] text-[#68748A]">
                Partagez un dossier Drive ou document en ligne sans duplication de stockage.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#68748A] hover:text-[#111A2E]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[#111A2E] mb-1">
              URL externe ou Google Drive *
            </label>
            <input
              type="url"
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/... ou https://..."
              className="w-full bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl px-3.5 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            />
            {isGoogleDrive && (
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Format Google Drive détecté</span>
              </span>
            )}
          </div>

          <div>
            <label className="block font-semibold text-[#111A2E] mb-1">
              Titre du document ou dossier *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Google Drive TD & TP Corrigés"
              className="w-full bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl px-3.5 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111A2E] mb-1">
                Catégorie pédagogique
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#111A2E] mb-1">
                Enseignant / Auteur (Optionnel)
              </label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Ex: Dr. Professeur"
                className="w-full bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#F1F4F9]">
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={isSubmitting || !title.trim() || !url.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer le lien"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FolderSettingsModal({
  folder,
  allFolders,
  subjectId,
  onClose,
  onSaved,
}: {
  folder: SubjectFolder;
  allFolders: SubjectFolder[];
  subjectId: string;
  onClose: () => void;
  onSaved: (updatedFolder: SubjectFolder) => void;
}) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState(folder.color || "blue");
  const [icon, setIcon] = useState(folder.icon || "folder");
  const [description, setDescription] = useState(folder.description || "");
  const [targetParentId, setTargetParentId] = useState<string | null>(folder.parent_id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const disabledFolderIds = useMemo(() => {
    return getDescendantFolderIds(folder.id, allFolders);
  }, [folder.id, allFolders]);

  const activeVisual = useMemo(() => {
    return getFolderVisual(color, icon);
  }, [color, icon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await updateFolderSettingsAction({
      subject_id: subjectId,
      folder_id: folder.id,
      name: name.trim(),
      color,
      icon,
      description: description.trim() || undefined,
      parent_id: targetParentId,
    });

    setIsSubmitting(false);

    if (!res.success || !res.folder) {
      setError(res.error || "Échec de l'enregistrement des paramètres du dossier.");
    } else {
      onSaved(res.folder);
    }
  };

  const PreviewIcon = activeVisual.Icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E8F0] my-auto overflow-hidden">
        {/* Header (sticky top) */}
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-[#F1F4F9] shrink-0 bg-white">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                activeVisual.color.bg,
                activeVisual.color.border,
                activeVisual.color.text
              )}
            >
              <PreviewIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-[#111A2E] truncate">Paramètres du Dossier</h3>
              <p className="text-[11px] text-[#68748A] truncate">
                Personnalisez le nom, la couleur, l'icône et l'arborescence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#68748A] hover:text-[#111A2E] p-1.5 rounded-lg hover:bg-[#F4F6FA] transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form with scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs flex-1 overscroll-contain">
            {/* Live Preview Card */}
            <div className="bg-[#FAFAF7] border border-[#E4E8F0] rounded-xl p-3 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#68748A] font-semibold">
                Aperçu en direct du dossier
              </div>
              <div className="flex items-start space-x-3 bg-white p-3 rounded-lg border border-[#E4E8F0] shadow-2xs">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    activeVisual.color.bg,
                    activeVisual.color.border,
                    activeVisual.color.text
                  )}
                >
                  <PreviewIcon className={cn("w-5 h-5", activeVisual.color.fill)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-[#111A2E] truncate">
                    {name.trim() || "Nom du dossier"}
                  </div>
                  <p className="text-[11px] text-[#68748A] line-clamp-2 mt-0.5">
                    {description.trim() || "Aucune description (optionnelle)."}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                Nom du dossier *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Chapitre 1 - Fondamentaux Dart"
                className="w-full bg-[#FAFAF7] border border-[#E4E8F0] focus:border-[#2855D9] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#111A2E] transition-all outline-hidden"
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                Description <span className="font-normal text-[#68748A]">(optionnelle)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Expliquez brièvement le contenu ou les objectifs de ce dossier..."
                className="w-full bg-[#FAFAF7] border border-[#E4E8F0] focus:border-[#2855D9] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#111A2E] transition-all outline-hidden resize-none"
              />
            </div>

            {/* Color Palette Picker */}
            <div>
              <label className="block text-xs font-semibold text-[#111A2E] mb-1.5 flex items-center justify-between">
                <span>Couleur thématique</span>
                <span className="text-[11px] font-normal text-[#68748A]">
                  {activeVisual.color.label}
                </span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {FOLDER_COLOR_PALETTE.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setColor(pal.id)}
                    title={pal.label}
                    className={cn(
                      "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer relative",
                      pal.bg,
                      pal.border,
                      color === pal.id
                        ? "ring-2 ring-offset-1 ring-[#182235] shadow-xs"
                        : "hover:scale-105"
                    )}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: pal.hex }}
                    />
                    {color === pal.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#182235] absolute -top-1 -right-1 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Picker (3 cols on phone, 6 cols on sm) */}
            <div>
              <label className="block text-xs font-semibold text-[#111A2E] mb-1.5">
                Icône représentative
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FOLDER_ICON_OPTIONS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      title={item.label}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer",
                        isSelected
                          ? "bg-[#2855D9]/10 border-[#2855D9] text-[#2855D9] font-bold shadow-2xs"
                          : "bg-white border-[#E4E8F0] text-[#68748A] hover:text-[#111A2E] hover:border-[#CCD4E0]"
                      )}
                    >
                      <ItemIcon className="w-4 h-4 mb-1" />
                      <span className="text-[10px] truncate max-w-full leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Organization / Parent folder selection */}
            <div className="pt-2 border-t border-[#F1F4F9]">
              <FolderTreePicker
                folders={allFolders}
                selectedFolderId={targetParentId}
                onSelect={setTargetParentId}
                disabledFolderIds={disabledFolderIds}
                label="Emplacement parent dans l'arborescence :"
              />
            </div>
          </div>

          {/* Modal Actions Footer (sticky bottom) */}
          <div className="p-4 sm:p-5 pt-3 border-t border-[#F1F4F9] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0 bg-white">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={isSubmitting || !name.trim()}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center space-x-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </span>
              ) : (
                "Enregistrer les paramètres"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveFolderModal({
  folder,
  allFolders,
  subjectId,
  onClose,
  onMoved,
}: {
  folder: SubjectFolder;
  allFolders: SubjectFolder[];
  subjectId: string;
  onClose: () => void;
  onMoved: (targetParentId: string | null) => void;
}) {
  const [targetParentId, setTargetParentId] = useState<string | null>(folder.parent_id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Gather folder itself and all its recursive descendants to prevent circular loops
  const disabledFolderIds = useMemo(() => {
    return getDescendantFolderIds(folder.id, allFolders);
  }, [folder.id, allFolders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await moveFolderAction({
      subject_id: subjectId,
      folder_id: folder.id,
      new_parent_id: targetParentId,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Échec du déplacement.");
    } else {
      onMoved(targetParentId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E4E8F0] my-auto overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-[#E4E8F0] shrink-0 bg-white">
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#111A2E] truncate">
              Déplacer le dossier "{folder.name}"
            </h3>
            <p className="text-[11px] text-[#68748A] truncate">
              Sélectionnez son nouvel emplacement dans l'arborescence.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#68748A] hover:text-[#111A2E] p-1.5 rounded-lg hover:bg-[#F4F6FA] cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs flex-1">
            <FolderTreePicker
              folders={allFolders}
              selectedFolderId={targetParentId}
              onSelect={setTargetParentId}
              disabledFolderIds={disabledFolderIds}
              label="Choisir le dossier parent cible :"
            />
          </div>

          <div className="p-4 sm:p-5 pt-3 border-t border-[#E4E8F0] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0 bg-white">
            <Button type="button" size="sm" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Déplacement..." : "Déplacer ici"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameResourceModal({
  resource,
  onClose,
  onRenamed,
}: {
  resource: AcademicResource;
  onClose: () => void;
  onRenamed: (newTitle: string) => void;
}) {
  const [title, setTitle] = useState(resource.title);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const res = await renameResourceAction(resource.id, title.trim());
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Échec du renommage.");
    } else {
      onRenamed(title.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E4E8F0] my-auto space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E4E8F0]">
          <h3 className="font-bold text-sm text-[#111A2E]">Renommer la Ressource</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#68748A] hover:text-[#111A2E] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && <div className="text-xs text-rose-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#FAFAF7] border border-[#E4E8F0] focus:border-[#2855D9] rounded-xl px-3.5 py-2 text-xs text-[#111A2E] outline-hidden"
          />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" size="sm" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isSubmitting || !title.trim()} className="w-full sm:w-auto">
              {isSubmitting ? "Enregistrement..." : "Renommer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveResourceModal({
  resource,
  allFolders,
  onClose,
  onMoved,
}: {
  resource: AcademicResource;
  allFolders: SubjectFolder[];
  onClose: () => void;
  onMoved: (targetFolderId: string | null) => void;
}) {
  const [targetFolderId, setTargetFolderId] = useState<string | null>(resource.chapter || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await moveResourceAction(resource.id, targetFolderId);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Échec du déplacement.");
    } else {
      onMoved(targetFolderId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E4E8F0] my-auto overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-[#E4E8F0] shrink-0 bg-white">
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#111A2E] truncate">
              Déplacer la ressource "{resource.title}"
            </h3>
            <p className="text-[11px] text-[#68748A] truncate">
              Sélectionnez son dossier de destination dans l'arborescence.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#68748A] hover:text-[#111A2E] p-1.5 rounded-lg hover:bg-[#F4F6FA] cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs flex-1">
            <FolderTreePicker
              folders={allFolders}
              selectedFolderId={targetFolderId}
              onSelect={setTargetFolderId}
              label="Sélectionner le dossier de destination :"
            />
          </div>

          <div className="p-4 sm:p-5 pt-3 border-t border-[#E4E8F0] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0 bg-white">
            <Button type="button" size="sm" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Déplacement..." : "Déplacer ici"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
