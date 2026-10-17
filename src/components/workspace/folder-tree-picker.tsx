"use client";

import React, { useState, useMemo } from "react";
import { SubjectFolder } from "@/types/database";
import { buildFolderTree, FolderTreeNode } from "@/lib/utils/folder-tree";
import { Folder, FolderOpen, Check, Search, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderTreePickerProps {
  folders: SubjectFolder[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  disabledFolderIds?: Set<string>;
  label?: string;
  className?: string;
}

export function FolderTreePicker({
  folders,
  selectedFolderId,
  onSelect,
  disabledFolderIds = new Set(),
  label = "Sélectionner l'emplacement cible dans l'arborescence",
  className,
}: FolderTreePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { root, flatList } = useMemo(() => {
    return buildFolderTree(folders, disabledFolderIds);
  }, [folders, disabledFolderIds]);

  // Filtered nodes based on search
  const displayedNodes = useMemo(() => {
    if (!searchQuery.trim()) return flatList;
    const q = searchQuery.toLowerCase();
    return flatList.filter((node) => node.name.toLowerCase().includes(q));
  }, [flatList, searchQuery]);

  const selectedNode = useMemo(() => {
    return flatList.find(
      (n) => (n.folderId === null && selectedFolderId === null) || n.folderId === selectedFolderId
    );
  }, [flatList, selectedFolderId]);

  return (
    <div className={cn("space-y-2.5 text-xs", className)}>
      <div className="flex items-center justify-between gap-1.5">
        <label className="font-semibold text-[#111A2E] truncate">{label}</label>
        {selectedNode && (
          <span className="text-[10px] font-mono text-[#2855D9] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 truncate max-w-[120px] sm:max-w-[200px] shrink-0">
            {selectedNode.path.join(" / ")}
          </span>
        )}
      </div>

      {/* Search Input for fast navigation in deep trees */}
      {flatList.length > 4 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer l'arborescence des dossiers..."
            className="w-full bg-[#FAFAF7] focus:bg-white border border-[#E4E8F0] focus:border-[#2855D9] rounded-xl pl-8 pr-8 py-1.5 text-xs text-[#111A2E] transition-colors focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#68748A] hover:text-[#111A2E] p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Visual Interactive Tree View Box */}
      <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-2 max-h-48 sm:max-h-60 overflow-y-auto space-y-1">
        {displayedNodes.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#68748A]">
            Aucun dossier ne correspond à votre recherche.
          </div>
        ) : (
          displayedNodes.map((node) => {
            const isSelected =
              (node.folderId === null && selectedFolderId === null) ||
              node.folderId === selectedFolderId;
            const isDisabled = Boolean(node.disabled);

            return (
              <div
                key={node.id}
                onClick={() => {
                  if (!isDisabled) {
                    onSelect(node.folderId);
                  }
                }}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all font-mono select-none text-[11px] sm:text-xs",
                  isDisabled
                    ? "opacity-40 bg-stone-100 cursor-not-allowed text-[#68748A]"
                    : isSelected
                    ? "bg-[#2855D9] text-white font-bold shadow-xs cursor-pointer"
                    : "text-[#182235] hover:bg-white hover:border-[#D1D9E6] border border-transparent cursor-pointer"
                )}
                title={node.disabledReason || node.path.join(" / ")}
              >
                <div className="flex items-center space-x-1.5 min-w-0 flex-1 truncate">
                  {/* Tree branch connector (├──, └──, │   ) */}
                  {node.prefix ? (
                    <span
                      className={cn(
                        "whitespace-pre font-mono shrink-0",
                        isSelected ? "text-blue-100" : "text-[#8C9AAE]"
                      )}
                    >
                      {node.prefix}
                    </span>
                  ) : null}

                  {/* Folder Icon */}
                  {isSelected ? (
                    <FolderOpen className="w-4 h-4 shrink-0 text-white fill-white/20" />
                  ) : (
                    <Folder
                      className={cn(
                        "w-4 h-4 shrink-0",
                        node.folderId === null
                          ? "text-[#2855D9] fill-[#2855D9]/20"
                          : "text-amber-500 fill-amber-500/20"
                      )}
                    />
                  )}

                  {/* Folder Name */}
                  <span className="truncate font-sans font-medium text-xs">
                    {node.name}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  {isDisabled && (
                    <span className="text-[9px] font-sans px-1.5 py-0.5 rounded-sm bg-stone-200 text-stone-700">
                      Invalide
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Synchronized native select for accessibility & fast keyboard browsing */}
      <div className="pt-1">
        <label className="text-[10px] text-[#68748A] block mb-1">
          Ou sélection directe dans la liste arborescente :
        </label>
        <select
          value={selectedFolderId || "root"}
          onChange={(e) => onSelect(e.target.value === "root" ? null : e.target.value)}
          className="w-full bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs font-mono text-[#111A2E] focus:outline-hidden focus:border-[#2855D9]"
        >
          {flatList.map((node) => (
            <option
              key={node.id}
              value={node.folderId || "root"}
              disabled={node.disabled}
            >
              {node.prefix ? `${node.prefix}📁 ${node.name}` : `📁 ${node.name}`}
              {node.disabled ? " (Désactivé)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
