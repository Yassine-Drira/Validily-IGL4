"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  UploadCloud,
  FileText,
  FileCode,
  Link2,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Globe,
  Loader2,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, cn } from "@/lib/utils";
import { Subject, ResourceCategory, SubjectFolder, AcademicResource } from "@/types/database";
import {
  createResource,
  createExternalLinkResource,
  createHtmlQuizResourceAction,
} from "@/lib/actions/resource-actions";
import { createFolderAction } from "@/lib/actions/folder-actions";

type ContributionType = "document" | "quiz" | "link" | "folder";

interface ContributeResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  categories: ResourceCategory[];
  folders?: SubjectFolder[];
  defaultSubjectId?: string;
  defaultFolderId?: string | null;
  onResourceCreated?: (resource: AcademicResource) => void;
  onFolderCreated?: (folder: SubjectFolder) => void;
}

export function ContributeResourceModal({
  isOpen,
  onClose,
  subjects,
  categories,
  folders = [],
  defaultSubjectId = "",
  defaultFolderId = null,
  onResourceCreated,
  onFolderCreated,
}: ContributeResourceModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quizFileInputRef = useRef<HTMLInputElement>(null);

  const [activeType, setActiveType] = useState<ContributionType>("document");
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || subjects[0]?.id || "");
  const [targetFolderId, setTargetFolderId] = useState<string | null>(defaultFolderId);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [examSession, setExamSession] = useState<string>("");
  const [instructor, setInstructor] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026-2027");

  // Document state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // HTML Quiz state
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [showQuizPreview, setShowQuizPreview] = useState(false);

  // Link state
  const [url, setUrl] = useState<string>("");

  // Folder state
  const [folderName, setFolderName] = useState<string>("");
  const [folderColor, setFolderColor] = useState<string>("blue");

  // Tags
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  // Status
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [duplicateWarning, setDuplicateWarning] = useState<string>("");
  const [createdResource, setCreatedResource] = useState<AcademicResource | null>(null);
  const [createdFolder, setCreatedFolder] = useState<SubjectFolder | null>(null);

  // Sync default subject & folder on open
  useEffect(() => {
    if (isOpen) {
      if (defaultSubjectId) setSubjectId(defaultSubjectId);
      if (defaultFolderId !== undefined) setTargetFolderId(defaultFolderId);
      setErrorMsg("");
      setCreatedResource(null);
      setCreatedFolder(null);
    }
  }, [isOpen, defaultSubjectId, defaultFolderId]);

  if (!isOpen) return null;

  // Filter folders for selected subject
  const subjectFolders = folders.filter((f) => f.subject_id === subjectId);

  // File drop validation
  const validatePdfFile = (selectedFile: File) => {
    setErrorMsg("");
    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setErrorMsg("Format non supporté. Veuillez sélectionner un document PDF (.pdf).");
      return;
    }
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > MAX_SIZE) {
      setErrorMsg(`Le fichier (${formatBytes(selectedFile.size)}) dépasse la limite autorisée de 50 Mo.`);
      return;
    }
    setFile(selectedFile);
    if (!title.trim()) {
      const cleanName = selectedFile.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      setTitle(cleanName);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const resetFormForNext = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setHtmlContent("");
    setUrl("");
    setFolderName("");
    setTags([]);
    setErrorMsg("");
    setDuplicateWarning("");
    setCreatedResource(null);
    setCreatedFolder(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!subjectId) {
      setErrorMsg("Veuillez sélectionner une matière.");
      return;
    }

    startTransition(async () => {
      try {
        if (activeType === "folder") {
          if (!folderName.trim()) {
            setErrorMsg("Veuillez saisir un nom pour le dossier.");
            return;
          }
          const res = await createFolderAction({
            subject_id: subjectId,
            name: folderName.trim(),
            parent_id: targetFolderId,
            color: folderColor,
          });
          if (res.success && res.folder) {
            setCreatedFolder(res.folder);
            onFolderCreated?.(res.folder);
            router.refresh();
          } else {
            setErrorMsg(res.error || "Échec de création du dossier.");
          }
          return;
        }

        if (!title.trim()) {
          setErrorMsg("Veuillez renseigner un titre pour cette ressource.");
          return;
        }

        if (activeType === "document") {
          if (!file) {
            setErrorMsg("Veuillez sélectionner un fichier PDF à téléverser.");
            return;
          }

          // Upload to /api/upload
          const formData = new FormData();
          formData.append("file", file);
          formData.append("subject_id", subjectId);
          formData.append("category_id", categoryId || categories[0]?.id || "cat-courses");
          formData.append("title", title.trim());
          if (description) formData.append("description", description.trim());
          if (instructor) formData.append("instructor", instructor.trim());
          if (academicYear) formData.append("academic_year", academicYear);
          if (examSession) formData.append("exam_session", examSession);
          if (targetFolderId) formData.append("chapter", targetFolderId);
          formData.append("visibility", visibility);
          tags.forEach((t) => formData.append("tags", t));

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setCreatedResource(data.resource);
            onResourceCreated?.(data.resource);
            router.refresh();
          } else {
            setErrorMsg(data.error || "Échec du téléversement du document.");
          }
        } else if (activeType === "quiz") {
          if (!htmlContent.trim()) {
            setErrorMsg("Veuillez coller le code HTML du quiz interactif.");
            return;
          }

          const res = await createHtmlQuizResourceAction({
            subject_id: subjectId,
            category_id: categoryId || categories[0]?.id || "cat-courses",
            title: title.trim(),
            html_content: htmlContent,
            description: description.trim() || undefined,
            folder_id: targetFolderId,
            instructor: instructor.trim() || undefined,
            exam_session: examSession || undefined,
            tags,
            visibility,
          });

          if (res.success && res.resource) {
            setCreatedResource(res.resource);
            onResourceCreated?.(res.resource);
            router.refresh();
          } else {
            setErrorMsg(res.error || "Échec de création du quiz HTML.");
          }
        } else if (activeType === "link") {
          if (!url.trim()) {
            setErrorMsg("Veuillez saisir l'adresse URL du lien externe.");
            return;
          }

          const res = await createExternalLinkResource({
            subject_id: subjectId,
            category_id: categoryId || categories[0]?.id || "cat-courses",
            title: title.trim(),
            url: url.trim(),
            folder_id: targetFolderId,
            description: description.trim() || undefined,
            instructor: instructor.trim() || undefined,
          });

          if (res.success && res.resource) {
            setCreatedResource(res.resource);
            onResourceCreated?.(res.resource);
            router.refresh();
          } else {
            setErrorMsg(res.error || "Échec de l'ajout du lien externe.");
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Une erreur inattendue est survenue.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E4E8F0] rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E4E8F0] bg-[#FAFBFD]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2855D9]/10 text-[#2855D9] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111A2E] tracking-tight">
                Contribuer une ressource académique
              </h2>
              <p className="text-xs text-[#68748A]">
                Partagez des examens, fiches, quiz interactifs ou cours avec la promotion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] rounded-xl transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {createdResource || createdFolder ? (
          <div className="p-8 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111A2E]">
                {createdFolder ? "Dossier créé avec succès !" : "Ressource enregistrée avec succès !"}
              </h3>
              <p className="text-xs text-[#68748A] mt-1.5 max-w-md mx-auto leading-relaxed">
                {createdFolder
                  ? `Le dossier "${createdFolder.name}" est disponible pour classer et organiser vos documents.`
                  : `"${createdResource?.title}" est maintenant répertorié dans la bibliothèque académique.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={resetFormForNext}
                className="cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Ajouter une autre</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  if (createdResource) router.push(`/resources/${createdResource.id}`);
                }}
                className="cursor-pointer"
              >
                <span>{createdFolder ? "Terminer" : "Voir le document"}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
            {/* Resource Type Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F4F6FA] p-1.5 rounded-2xl border border-[#E4E8F0]">
              <button
                type="button"
                onClick={() => {
                  setActiveType("document");
                  setErrorMsg("");
                }}
                className={cn(
                  "flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  activeType === "document"
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Document PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveType("quiz");
                  setErrorMsg("");
                }}
                className={cn(
                  "flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  activeType === "quiz"
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Quiz HTML</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveType("link");
                  setErrorMsg("");
                }}
                className={cn(
                  "flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  activeType === "link"
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Lien Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveType("folder");
                  setErrorMsg("");
                }}
                className={cn(
                  "flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  activeType === "folder"
                    ? "bg-white text-[#2855D9] shadow-xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                )}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Nouveau Dossier</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Context Selectors: Subject & Folder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1">
                  Matière associée <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setTargetFolderId(null);
                  }}
                  className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                  required
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1">
                  Emplacement / Dossier
                </label>
                <select
                  value={targetFolderId || ""}
                  onChange={(e) => setTargetFolderId(e.target.value || null)}
                  className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                >
                  <option value="">Racine de la matière (Général)</option>
                  {subjectFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* FOLDER SPECIFIC FORM */}
            {activeType === "folder" ? (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Nom du dossier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Ex: TP 2026, Examens Principale, Chapitre 3..."
                    className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3.5 py-2.5 text-[#182235] placeholder:text-[#68748A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1.5">
                    Pastille de couleur
                  </label>
                  <div className="flex items-center space-x-2">
                    {["blue", "emerald", "amber", "purple", "rose"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFolderColor(c)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all cursor-pointer",
                          c === "blue" && "bg-blue-500",
                          c === "emerald" && "bg-emerald-500",
                          c === "amber" && "bg-amber-500",
                          c === "purple" && "bg-purple-500",
                          c === "rose" && "bg-rose-500",
                          folderColor === c ? "border-[#111A2E] scale-110" : "border-transparent"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* RESOURCE SPECIFIC FIELDS */
              <>
                {/* Document Type Dropzone */}
                {activeType === "document" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1.5">
                      Fichier PDF <span className="text-rose-500">*</span> (Max 50 Mo)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validatePdfFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {file ? (
                      <div className="p-3.5 rounded-2xl bg-[#FAFBFD] border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-[#111A2E] truncate max-w-xs">{file.name}</p>
                            <p className="text-[10px] text-[#68748A] font-mono">{formatBytes(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="p-1 text-[#68748A] hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            validatePdfFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                          isDragging
                            ? "border-[#2855D9] bg-[#EDF2FF]/40"
                            : "border-[#E4E8F0] hover:border-[#2855D9]/50 bg-[#FAFBFD]"
                        )}
                      >
                        <UploadCloud className="w-8 h-8 text-[#2855D9] mx-auto mb-2" />
                        <p className="text-xs font-bold text-[#111A2E]">
                          Cliquez pour parcourir ou glissez votre document PDF ici
                        </p>
                        <p className="text-[11px] text-[#68748A] mt-1">
                          Cours, énoncés, corrigés officiels ou fiches de révision
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* HTML Quiz Code Input */}
                {activeType === "quiz" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#182235]">
                        Code HTML du Quiz Interactif <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => quizFileInputRef.current?.click()}
                          className="text-[11px] text-[#2855D9] hover:underline cursor-pointer"
                        >
                          Importer fichier .html
                        </button>
                        {htmlContent && (
                          <button
                            type="button"
                            onClick={() => setShowQuizPreview(!showQuizPreview)}
                            className="text-[11px] text-[#68748A] hover:text-[#111A2E] flex items-center space-x-1 cursor-pointer bg-[#F4F6FA] px-2 py-0.5 rounded-lg border border-[#E4E8F0]"
                          >
                            {showQuizPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showQuizPreview ? "Masquer aperçu" : "Aperçu sécurisé"}</span>
                          </button>
                        )}
                      </div>
                      <input
                        ref={quizFileInputRef}
                        type="file"
                        accept=".html,text/html"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const content = ev.target?.result as string;
                              if (content) {
                                setHtmlContent(content);
                                if (!title.trim()) {
                                  setTitle(f.name.replace(/\.html$/i, "").replace(/[_-]+/g, " "));
                                }
                              }
                            };
                            reader.readAsText(f);
                          }
                        }}
                      />
                    </div>

                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Collez ici le code HTML autonome généré ou conçu pour le quiz interactif..."
                      rows={5}
                      className="w-full text-xs font-mono bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                      required
                    />

                    {showQuizPreview && htmlContent && (
                      <div className="rounded-2xl border border-[#E4E8F0] overflow-hidden bg-white shadow-xs">
                        <div className="bg-[#FAFBFD] px-3 py-1.5 border-b border-[#E4E8F0] text-[10px] text-[#68748A] font-mono">
                          Aperçu dans bac à sable (Sandbox isolée)
                        </div>
                        <iframe
                          srcDoc={htmlContent}
                          sandbox="allow-scripts"
                          className="w-full h-48 border-0"
                          title="Aperçu du Quiz"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* External Link Input */}
                {activeType === "link" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      URL du lien externe <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (!title && e.target.value) {
                          try {
                            const parsed = new URL(e.target.value);
                            setTitle(`Lien ${parsed.hostname}`);
                          } catch {}
                        }
                      }}
                      placeholder="https://drive.google.com/... ou https://github.com/..."
                      className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3.5 py-2.5 text-[#182235] placeholder:text-[#68748A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                      required
                    />
                  </div>
                )}

                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Titre de la ressource <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Examen Synthèse 2026 Corrigé..."
                      className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3.5 py-2 text-[#182235] placeholder:text-[#68748A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Catégorie
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exam Session, Year, Instructor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Session d&apos;examen
                    </label>
                    <select
                      value={examSession}
                      onChange={(e) => setExamSession(e.target.value)}
                      className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                    >
                      <option value="">Non spécifiée</option>
                      <option value="Principale">Principale</option>
                      <option value="Rattrapage">Rattrapage</option>
                      <option value="DS">Devoir Surveillé (DS)</option>
                      <option value="TP">Travaux Pratiques (TP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Année académique
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2026-2027"
                      className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Enseignant / Auteur
                    </label>
                    <input
                      type="text"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      placeholder="Dr. ..."
                      className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#182235] focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Description ou conseils utiles
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Précisez les points clés abordés, chapitres couverts ou astuces de résolution..."
                    rows={2}
                    className="w-full text-xs bg-white border border-[#E4E8F0] rounded-xl p-3 text-[#182235] placeholder:text-[#68748A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]"
                  />
                </div>

                {/* Visibility & Community Sharing */}
                <div className="flex items-center justify-between p-3.5 bg-[#FAFBFD] rounded-2xl border border-[#E4E8F0]">
                  <div className="flex items-center space-x-2.5">
                    {visibility === "public" ? (
                      <Globe className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-[#111A2E]">
                        {visibility === "public"
                          ? "Visibilité Publique (Partagé avec la promotion)"
                          : "Visibilité Privée (Personnel)"}
                      </p>
                      <p className="text-[11px] text-[#68748A]">
                        {visibility === "public"
                          ? "Tous les étudiants de la promotion IGL4 pourront consulter et évaluer cette ressource."
                          : "Visible uniquement par vous et les personnes avec qui vous la partagez expressément."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVisibility(visibility === "public" ? "private" : "public")}
                    className="text-xs font-bold text-[#2855D9] hover:underline cursor-pointer"
                  >
                    Changer
                  </button>
                </div>
              </>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E4E8F0]">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={isPending}
                className="cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isPending}
                className="cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Publication en cours...</span>
                  </>
                ) : (
                  <span>
                    {activeType === "folder" ? "Créer le dossier" : "Publier la ressource"}
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
