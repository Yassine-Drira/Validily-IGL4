"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2, Folder, FileText, HardDrive, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options?: { deleteContents?: boolean }) => Promise<void>;
  title?: string;
  itemName: string;
  itemType?: "resource" | "folder" | "quiz" | "note" | "subject" | "user";
  itemFormat?: string; // e.g. "PDF", "Google Drive", "Markdown"
  hasChildren?: boolean;
  childCount?: number;
  warningMessage?: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = "resource",
  itemFormat,
  hasChildren = false,
  childCount = 0,
  warningMessage,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>("");
  const [deleteContents, setDeleteContents] = useState(false);

  if (!isOpen) return null;

  const defaultTitle =
    itemType === "folder"
      ? "Supprimer le dossier"
      : itemType === "quiz"
      ? "Supprimer le quiz"
      : itemType === "note"
      ? "Supprimer la note"
      : itemType === "subject"
      ? "Supprimer la matière"
      : itemType === "user"
      ? "Révoquer les privilèges administrateur"
      : "Supprimer la ressource";

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError("");
      await onConfirm({ deleteContents });
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setError(err?.message || "Une erreur est survenue lors de la suppression.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E4E8F0] space-y-4">
        {/* Modal Header with Warning Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#111A2E]">
                {title || defaultTitle}
              </h3>
              <p className="text-xs text-[#68748A]">
                Confirmation de suppression
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-[#68748A] hover:text-[#111A2E] p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Target Item Details Card */}
        <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            {itemType === "folder" ? (
              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
            ) : itemType === "subject" ? (
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            ) : itemFormat?.includes("Drive") ? (
              <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-[#2855D9] shrink-0" />
            )}
            <span className="font-bold text-xs text-[#111A2E] truncate font-sans">
              {itemName}
            </span>
          </div>
          {itemFormat && (
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border bg-white border-[#E4E8F0] text-[#68748A] shrink-0 ml-2">
              {itemFormat}
            </span>
          )}
        </div>

        {/* Folder children options if deleting a non-empty folder */}
        {hasChildren && itemType === "folder" ? (
          <div className="space-y-2 text-xs pt-1">
            <p className="text-xs text-[#182235] font-medium">
              Ce dossier contient <span className="font-bold">{childCount} élément(s)</span>. Choisissez l'action pour les fichiers et sous-dossiers :
            </p>

            <div className="space-y-1.5">
              <label className={cn(
                "flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-colors",
                !deleteContents
                  ? "bg-blue-50/60 border-blue-200 text-[#111A2E]"
                  : "bg-white border-[#E4E8F0] text-[#68748A] hover:bg-stone-50"
              )}>
                <input
                  type="radio"
                  name="folder_delete_choice"
                  checked={!deleteContents}
                  onChange={() => setDeleteContents(false)}
                  className="mt-0.5 text-[#2855D9]"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-[#111A2E]">Conserver les éléments (Recommandé)</div>
                  <div className="text-[11px] text-[#68748A]">Déplace les fichiers et sous-dossiers vers le dossier parent ou la racine.</div>
                </div>
              </label>

              <label className={cn(
                "flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-colors",
                deleteContents
                  ? "bg-rose-50/60 border-rose-200 text-rose-900"
                  : "bg-white border-[#E4E8F0] text-[#68748A] hover:bg-stone-50"
              )}>
                <input
                  type="radio"
                  name="folder_delete_choice"
                  checked={deleteContents}
                  onChange={() => setDeleteContents(true)}
                  className="mt-0.5 text-rose-600"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-rose-700">Supprimer tout le contenu</div>
                  <div className="text-[11px] text-rose-600/80">Supprime définitivement le dossier ainsi que tous les fichiers et sous-dossiers contenus.</div>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#68748A] leading-relaxed">
            {warningMessage || "Cette action est irréversible. L'élément sera définitivement supprimé de la base de données."}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            Annuler
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>Suppression...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Supprimer définitivement</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
