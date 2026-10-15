"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Subject,
  ResourceCategory,
  AcademicResource,
  Note,
  Quiz,
  RevisionStatus,
  SubjectFolder,
} from "@/types/database";
import { CategoryBadge, getCategoryVisual } from "@/components/academic/category-badge";
import { SubjectIcon, getSubjectVisual } from "@/components/academic/subject-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { TextResourceViewer } from "@/components/workspace/text-resource-viewer";
import { SubjectFileLibrary } from "@/components/workspace/subject-file-library";
import { QuizRunner } from "@/components/quizzes/quiz-runner";
import { QuizImportModal } from "@/components/quizzes/quiz-import-modal";
import { InteractiveHtmlRunner } from "@/components/quizzes/interactive-html-runner";
import {
  createResource,
  updateRevisionStatus,
  deleteResource,
} from "@/lib/actions/resource-actions";
import { createQuiz, deleteQuiz, submitQuizAttempt } from "@/lib/actions/quiz-actions";
import { createNote, updateNote, deleteNote } from "@/lib/actions/note-actions";
import {
  BookOpen,
  FlaskConical,
  FileText,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  Copy,
  Check,
  Eye,
  AlertCircle,
  X,
  FileCode,
  FileEdit,
  BarChart3,
  Flame,
  Search,
  Maximize2,
  RotateCcw,
  Play,
  List,
  LayoutGrid,
  Filter,
  Folder,
  ShieldCheck,
} from "lucide-react";

interface SubjectLearningWorkspaceProps {
  subject: Subject;
  categories: ResourceCategory[];
  initialResources: AcademicResource[];
  initialNotes: Note[];
  initialQuizzes: any[];
  initialFolders?: SubjectFolder[];
}

export function SubjectLearningWorkspace({
  subject,
  categories,
  initialResources,
  initialNotes,
  initialQuizzes,
  initialFolders = [],
}: SubjectLearningWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"resources" | "quizzes" | "cheatsheets" | "notes" | "importexport">("resources");
  const [resources, setResources] = useState<AcademicResource[]>(initialResources);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [quizzes, setQuizzes] = useState<any[]>(initialQuizzes);
  const [folders, setFolders] = useState<SubjectFolder[]>(initialFolders);

  // In-app Viewer Modals
  const [viewingResource, setViewingResource] = useState<AcademicResource | null>(null);
  const [viewingTextResource, setViewingTextResource] = useState<AcademicResource | null>(null);
  const [activeQuizToRun, setActiveQuizToRun] = useState<any | null>(null);
  const [activeHtmlDrillToRun, setActiveHtmlDrillToRun] = useState<{
    title: string;
    htmlContent: string;
    quizId?: string;
  } | null>(null);

  // Modals for additions
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [targetUploadFolderId, setTargetUploadFolderId] = useState<string | undefined>(undefined);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | undefined>(undefined);
  const [isAddQuizModalOpen, setIsAddQuizModalOpen] = useState(false);
  const [isImportQuizModalOpen, setIsImportQuizModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isAddCheatModalOpen, setIsAddCheatModalOpen] = useState(false);

  // Status & Feedback
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  };

  // Subject Visual Theme (Icon Glyph & tailored colors)
  const subjectVisual = React.useMemo(() => {
    return getSubjectVisual(subject.slug || subject.name);
  }, [subject.slug, subject.name]);
  const SubjectGlyph = subjectVisual.icon;

  // --- DERIVED METRICS FOR PRACTICAL PROGRESS TRACKER ---
  const cheatSheets = notes.filter((n) => n.tags?.includes("cheat-sheet"));
  const regularNotes = notes.filter((n) => !n.tags?.includes("cheat-sheet"));

  const revisedResourcesCount = resources.filter((r) => r.revision_status === "revised").length;
  const inProgressResourcesCount = resources.filter((r) => r.revision_status === "in_progress").length;
  
  const totalTrackableItems = resources.length + quizzes.length;
  const progressPercentage =
    totalTrackableItems > 0
      ? Math.round(((revisedResourcesCount + (quizzes.length > 0 ? 1 : 0)) / totalTrackableItems) * 100)
      : 0;


  // --- HANDLERS: QUIZZES ---
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (!confirm(`Supprimer le quiz "${title}" ?`)) return;
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    startTransition(async () => {
      const res = await deleteQuiz(quizId);
      if (res.error) {
        alert(res.error);
      } else {
        showFeedback(`Quiz supprimé.`);
      }
    });
  };

  // --- HANDLERS: NOTES & CHEAT SHEETS ---
  const handleDeleteNote = async (noteId: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    startTransition(async () => {
      const res = await deleteNote(noteId);
      if (res.error) {
        alert(res.error);
      } else {
        showFeedback(`Élément supprimé.`);
      }
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // --- EXPORT HANDLERS ---
  const exportAsJson = () => {
    const data = {
      subject,
      resources,
      quizzes,
      cheatSheets,
      notes: regularNotes,
      exportedAt: new Date().toISOString(),
      platform: "validily-IGL4",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subject.slug}-workspace-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Workspace exporté en JSON avec succès.");
  };

  const exportAsStandaloneHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject.name} — Révision & Synthèse</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; line-height: 1.6; }
  .header { border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
  h1 { margin: 0 0 8px 0; color: #38bdf8; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
  .badge { background: #0284c7; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
  pre { background: #090d16; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 13px; color: #e2e8f0; }
</style>
</head>
<body>
<div class="header">
  <span class="badge">${subject.semester?.name || "Semestre 1"}</span>
  <h1>${subject.name} — Espace de Révision</h1>
  <p>${subject.description || "Supports de cours, fiches mémo et quiz de préparation aux examens."}</p>
</div>
<h2>Fiches Mémo & Résumés (${cheatSheets.length})</h2>
<div class="grid">
${cheatSheets
  .map(
    (c) => `<div class="card"><h3>${c.title}</h3><pre>${c.content.replace(/</g, "&lt;")}</pre></div>`
  )
  .join("\n")}
</div>
<h2>Ressources & Documents (${resources.length})</h2>
<ul>
${resources.map((r) => `<li><strong>${r.title}</strong> (${r.mime_type}) - ${r.storage_path}</li>`).join("\n")}
</ul>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subject.slug}-standalone-revision.html`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Document HTML autonome généré et téléchargé.");
  };

  return (
    <div className="space-y-7">
      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111A2E] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* TOP HERO HEADER */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle background glow tailored to subject theme */}
        <div
          className={cn(
            "absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none",
            subjectVisual.bgLight
          )}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105",
                subjectVisual.bgLight,
                subjectVisual.borderLight
              )}
            >
              <SubjectGlyph className={cn("w-9 h-9", subjectVisual.color)} />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs font-mono",
                    subjectVisual.badgeBg,
                    subjectVisual.borderLight
                  )}
                >
                  {subject.semester?.name || (subject.semester_id === "22222222-2222-2222-2222-222222222222" ? "Semestre 2" : "Semestre 1")}
                </span>
                <span className="text-xs text-[#68748A]">•</span>
                <span className="text-xs font-mono text-[#68748A]">
                  Code : {subject.slug}
                </span>
                <span className="text-xs text-[#68748A]">•</span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Module IGL4</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#111A2E] tracking-tight">
                {subject.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#68748A] mt-1 max-w-2xl leading-relaxed">
                {subject.description || "Espace d'apprentissage dédié aux cours, fiches mémos, TP, examens et quiz interactifs."}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPreselectedCategoryId(undefined);
                setIsAddResourceModalOpen(true);
              }}
              className="bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter Document</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportQuizModalOpen(true)}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Importer Quiz / Atelier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddCheatModalOpen(true)}
              className="bg-[#F4F6FA] hover:bg-[#EDF2FF] text-[#182235] border border-[#E4E8F0] text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Fiche Mémo</span>
            </button>
          </div>
        </div>

        {/* PRACTICAL PROGRESS TRACKER */}
        <div className="mt-7 pt-6 border-t border-[#E4E8F0] grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2855D9] flex items-center justify-center font-bold font-mono text-sm shrink-0 border border-blue-100">
              {progressPercentage}%
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#68748A] uppercase tracking-wider">
                Progression
              </div>
              <div className="w-full bg-[#E4E8F0] h-2 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#2855D9] to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#68748A] uppercase tracking-wider">
                Bibliothèque
              </div>
              <div className="text-xl font-bold font-mono text-[#111A2E] mt-0.5">
                {resources.length}{" "}
                <span className="text-xs font-normal text-[#68748A]">docs</span>
              </div>
              <div className="text-[10px] font-mono text-[#68748A] mt-0.5">
                {folders.length} dossier{folders.length !== 1 ? "s" : ""}
              </div>
            </div>
            <Folder className="w-6 h-6 text-[#2855D9]/40" />
          </div>

          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#68748A] uppercase tracking-wider">
                Quiz & Ateliers
              </div>
              <div className="text-xl font-bold font-mono text-[#111A2E] mt-0.5">
                {quizzes.length}
              </div>
            </div>
            <GraduationCap className="w-6 h-6 text-[#7C3AED]/40" />
          </div>

          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#68748A] uppercase tracking-wider">
                Fiches Mémo & Notes
              </div>
              <div className="text-xl font-bold font-mono text-[#111A2E] mt-0.5">
                {notes.length}
              </div>
            </div>
            <FileText className="w-6 h-6 text-emerald-600/40" />
          </div>
        </div>
      </div>

      {/* WORKSPACE NAVIGATION TABS */}
      <div className="flex border-b border-[#E4E8F0] overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
            activeTab === "resources"
              ? "border-[#2855D9] text-[#2855D9]"
              : "border-transparent text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Bibliothèque & Fichiers</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#EDF2FF] text-[#2855D9] font-mono">
            {resources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("quizzes")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
            activeTab === "quizzes"
              ? "border-[#2855D9] text-[#2855D9]"
              : "border-transparent text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>QCM & Quiz</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#F5F0FF] text-[#7C3AED] font-mono">
            {quizzes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cheatsheets")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
            activeTab === "cheatsheets"
              ? "border-[#2855D9] text-[#2855D9]"
              : "border-transparent text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Fiches Mémo / Anti-sèche</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-mono">
            {cheatSheets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
            activeTab === "notes"
              ? "border-[#2855D9] text-[#2855D9]"
              : "border-transparent text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Notes de cours</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#F4F6FA] text-[#68748A] font-mono">
            {regularNotes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("importexport")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
            activeTab === "importexport"
              ? "border-[#2855D9] text-[#2855D9]"
              : "border-transparent text-[#68748A] hover:text-[#182235]"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Import / Export</span>
        </button>
      </div>

      {/* --- TAB 1: COURS & RESSOURCES (DYNAMIC FOLDER-BASED FILE LIBRARY) --- */}
      {activeTab === "resources" && (
        <SubjectFileLibrary
          subject={subject}
          categories={categories}
          resources={resources}
          folders={folders}
          onResourcesChange={setResources}
          onFoldersChange={setFolders}
          onViewPdf={(res) => setViewingResource(res)}
          onViewText={(res) => setViewingTextResource(res)}
          onOpenUploadModal={(folderId) => {
            setTargetUploadFolderId(folderId);
            setIsAddResourceModalOpen(true);
          }}
          showFeedback={showFeedback}
        />
      )}

      {/* --- TAB 2: QCM & QUIZ --- */}
      {activeTab === "quizzes" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111A2E]">
                QCM et Ateliers de Révision pour {subject.name}
              </h2>
              <p className="text-xs text-[#68748A] mt-0.5">
                Passez vos QCM ou importez directement vos ateliers interactifs HTML prêts et fichiers JSON.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsImportQuizModalOpen(true)}
                className="bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer transition-all"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Importer un Quiz / Atelier</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddQuizModalOpen(true)}
                className="bg-[#F4F6FA] hover:bg-[#E4E8F0] text-[#182235] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#CBD5E1] flex items-center space-x-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Saisie Manuelle</span>
              </button>
            </div>
          </div>

          {quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => {
                const isHtml = Boolean(quiz.isHtmlDrill || quiz.htmlContent);
                return (
                  <div
                    key={quiz.id}
                    className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-sm ${
                      isHtml
                        ? "border-[#2855D9]/30 hover:border-[#2855D9]"
                        : "border-[#E4E8F0] hover:border-[#7C3AED]/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        {isHtml ? (
                          <span className="bg-[#EDF2FF] text-[#2855D9] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#2855D9]/20 uppercase">
                            Atelier HTML Interactif
                          </span>
                        ) : (
                          <span className="bg-[#F5F0FF] text-[#7C3AED] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#7C3AED]/20 uppercase">
                            {quiz.difficulty || "Intermédiaire"}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-[#68748A]">
                          {isHtml
                            ? "Interactif"
                            : `${quiz.question_count || quiz.questions?.length || 0} questions`}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[#111A2E] leading-snug">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-xs text-[#68748A] mt-1.5 leading-relaxed line-clamp-2">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#E4E8F0] flex items-center justify-between">
                      {isHtml ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveHtmlDrillToRun({
                              quizId: quiz.id,
                              title: quiz.title,
                              htmlContent: quiz.htmlContent,
                            })
                          }
                          className="bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Lancer l&apos;Atelier</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveQuizToRun(quiz)}
                          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Passer le test</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                        className="p-1.5 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Supprimer le quiz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-10 text-center space-y-4">
              <GraduationCap className="w-9 h-9 text-[#2855D9]/50 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-[#182235]">
                  Aucun QCM ou Atelier configuré pour {subject.name}
                </h4>
                <p className="text-xs text-[#68748A] max-w-md mx-auto mt-1 leading-relaxed">
                  Importez vos révisions prêtes en quelques secondes : code HTML interactif, fichiers JSON générés par IA, ou créez une série manuelle.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsImportQuizModalOpen(true)}
                  className="bg-[#2855D9] hover:bg-[#1E40AF]"
                >
                  <FileCode className="w-3.5 h-3.5 mr-1.5" />
                  <span>Importer un Quiz / Atelier (.html / .json)</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddQuizModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Saisie Manuelle</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: FICHES MÉMO (ANTI-SÈCHE / CHEAT SHEETS) --- */}
      {activeTab === "cheatsheets" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111A2E]">
                Fiches Mémo & Formules Clés
              </h2>
              <p className="text-xs text-[#68748A] mt-0.5">
                Snippets de code, définitions clés et fiches de synthèse rapide pour le cours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCheatModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une Fiche</span>
            </button>
          </div>

          {cheatSheets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cheatSheets.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#090D16] border border-[#1E293B] text-white rounded-2xl p-5 flex flex-col justify-between shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1E293B]">
                      <h4 className="font-mono text-xs font-bold text-sky-400">
                        {item.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.content, item.id)}
                        className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="font-mono text-xs text-slate-300 bg-[#06090F] p-3 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60">
                      {item.content}
                    </pre>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(item.id, item.title)}
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-10 text-center space-y-3">
              <FileCode className="w-8 h-8 text-[#68748A]/40 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-[#182235]">
                  Aucune fiche mémo enregistrée
                </h4>
                <p className="text-xs text-[#68748A] max-w-md mx-auto mt-1">
                  Enregistrez des morceaux de code, syntaxes, formules ou théorèmes à réviser en un coup d&apos;œil.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddCheatModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer une fiche mémo</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: NOTES DE COURS --- */}
      {activeTab === "notes" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111A2E]">
                Notes Personnelles & Remarques
              </h2>
              <p className="text-xs text-[#68748A] mt-0.5">
                Prenez des notes synchronisées pour préparer vos révisions de TD et d&apos;examens.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddNoteModalOpen(true)}
              className="bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Rédiger une Note</span>
            </button>
          </div>

          {regularNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regularNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white border border-[#E4E8F0] hover:border-[#2855D9]/40 hover:shadow-sm rounded-2xl p-5 flex flex-col justify-between transition-all"
                >
                  <div>
                    <h3 className="font-bold text-sm text-[#111A2E] mb-2">
                      {note.title}
                    </h3>
                    <p className="text-xs text-[#475569] whitespace-pre-wrap leading-relaxed line-clamp-6">
                      {note.content}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#E4E8F0] flex items-center justify-between text-xs text-[#68748A]">
                    <span className="font-mono text-[11px]">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id, note.title)}
                      className="p-1.5 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Supprimer la note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-10 text-center space-y-3">
              <FileEdit className="w-8 h-8 text-[#68748A]/40 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-[#182235]">
                  Aucune note personnelle rédigée
                </h4>
                <p className="text-xs text-[#68748A] max-w-md mx-auto mt-1">
                  Notez vos points d&apos;attention, questions pour le professeur et pièges fréquents d&apos;examen.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddNoteModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Rédiger ma première note</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 5: IMPORT / EXPORT --- */}
      {activeTab === "importexport" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#111A2E]">
                Import & Export de l&apos;espace d&apos;apprentissage
              </h2>
              <p className="text-xs text-[#68748A] mt-1 max-w-xl leading-relaxed">
                Sauvegardez vos révisions en local ou importez du contenu pédagogique prêt à l&apos;emploi (PDF, liens externes ou documents HTML interactifs).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E4E8F0]">
              {/* EXPORT OPTIONS */}
              <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-[#2855D9]">
                  <Download className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-[#111A2E]">
                    Exporter l&apos;espace ({subject.name})
                  </h3>
                </div>
                <p className="text-xs text-[#68748A] leading-relaxed">
                  Exportez l&apos;intégralité de vos notes, fiches mémo, questions de quiz et références de documents pour une portabilité totale.
                </p>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={exportAsJson}
                    className="w-full bg-white hover:bg-[#F4F6FA] text-[#182235] border border-[#E4E8F0] text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Format JSON Structuré (.json)</span>
                    <Download className="w-4 h-4 text-[#2855D9]" />
                  </button>

                  <button
                    type="button"
                    onClick={exportAsStandaloneHtml}
                    className="w-full bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Document HTML Autonome (.html)</span>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* IMPORT OPTIONS */}
              <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-emerald-600">
                  <Upload className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-[#111A2E]">
                    Importer du Contenu
                  </h3>
                </div>
                <p className="text-xs text-[#68748A] leading-relaxed">
                  Importez un document PDF ou un fichier HTML de révision prêt à l&apos;emploi. Les documents HTML sont sécurisés et isolés dans un conteneur sandbox.
                </p>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddResourceModalOpen(true)}
                    className="w-full bg-white hover:bg-[#F4F6FA] text-[#182235] border border-[#E4E8F0] text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Importer Document PDF / Lien Externe</span>
                    <Plus className="w-4 h-4 text-[#2855D9]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: IN-APP PDF VIEWER --- */}
      {viewingResource && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#E4E8F0]">
            <div className="bg-white px-5 py-3.5 border-b border-[#E4E8F0] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-[#2855D9]" />
                <div>
                  <h3 className="text-sm font-bold text-[#111A2E] truncate max-w-md">
                    {viewingResource.title}
                  </h3>
                  <span className="text-[10px] font-mono text-[#68748A]">
                    {viewingResource.original_filename}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingResource(null)}
                className="p-1.5 rounded-lg text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-stone-900 overflow-hidden">
              <PdfViewer
                url={`/api/download/${viewingResource.id}`}
                filename={viewingResource.original_filename}
                title={viewingResource.title}
                downloadUrl={`/api/download/${viewingResource.id}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: IN-APP TEXT / MARKDOWN VIEWER --- */}
      {viewingTextResource && (
        <TextResourceViewer
          resource={viewingTextResource}
          onClose={() => setViewingTextResource(null)}
        />
      )}

      {/* --- MODAL: IN-APP INTERACTIVE QUIZ RUNNER --- */}
      {activeQuizToRun && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto">
            <QuizRunner
              quizId={activeQuizToRun.id}
              quizTitle={activeQuizToRun.title}
              subjectName={subject.name}
              difficulty={activeQuizToRun.difficulty || "intermediate"}
              questions={(activeQuizToRun.questions || []).map((q: any, qIdx: number) => ({
                id: q.id || `quiz-${activeQuizToRun.id || "drill"}-q-${qIdx}`,
                question_text: q.question_text || `Question ${qIdx + 1}`,
                explanation: q.explanation || "Explication officielle fournie pour cette question.",
                options: (q.options || []).map((opt: any, optIdx: number) => ({
                  id: opt.id || `quiz-${activeQuizToRun.id || "drill"}-q-${qIdx}-opt-${optIdx}`,
                  text: opt.option_text || opt.text || `Option ${optIdx + 1}`,
                  option_text: opt.option_text || opt.text || `Option ${optIdx + 1}`,
                  is_correct: Boolean(opt.is_correct),
                })),
              }))}
              onClose={() => setActiveQuizToRun(null)}
            />
          </div>
        </div>
      )}

      {/* --- MODAL: IN-APP INTERACTIVE HTML ATELIER / DRILL --- */}
      {activeHtmlDrillToRun && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <InteractiveHtmlRunner
            quizId={activeHtmlDrillToRun.quizId}
            title={activeHtmlDrillToRun.title}
            subjectName={subject.name}
            htmlContent={activeHtmlDrillToRun.htmlContent}
            onClose={() => setActiveHtmlDrillToRun(null)}
          />
        </div>
      )}

      {/* --- MODAL: IMPORT QUIZ / ATELIER --- */}
      {isImportQuizModalOpen && (
        <QuizImportModal
          subjectId={subject.id}
          subjectName={subject.name}
          isOpen={isImportQuizModalOpen}
          onClose={() => setIsImportQuizModalOpen(false)}
          onQuizCreated={(newQuiz) => {
            setQuizzes([newQuiz, ...quizzes]);
            showFeedback("Série QCM importée avec succès!");
          }}
          onLaunchHtmlDrill={(drill) => {
            setActiveHtmlDrillToRun(drill);
            setQuizzes((prev) => [
              {
                id: drill.quizId || `drill-${Date.now()}`,
                title: drill.title,
                difficulty: "intermediate",
                question_count: "Atelier",
                isHtmlDrill: true,
                htmlContent: drill.htmlContent,
                description: "Atelier interactif complet (flashcards, QCM avec minuteur, guides).",
              },
              ...prev,
            ]);
            showFeedback("Atelier interactif prêt et lancé!");
          }}
        />
      )}

      {/* --- MODAL: AJOUT RESSOURCE --- */}
      {isAddResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E4E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E8F0]">
              <h3 className="font-bold text-sm text-[#111A2E]">
                Ajouter une ressource pour {subject.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddResourceModalOpen(false)}
                className="text-[#68748A] hover:text-[#111A2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action="/api/upload"
              method="POST"
              encType="multipart/form-data"
              className="space-y-4 text-xs"
            >
              <input type="hidden" name="subjectId" value={subject.id} />
              <input type="hidden" name="folderId" value={targetUploadFolderId || ""} />

              <div>
                <label className="block font-medium text-[#111A2E] mb-1">
                  Dossier de destination (Optionnel)
                </label>
                <select
                  value={targetUploadFolderId || ""}
                  onChange={(e) => setTargetUploadFolderId(e.target.value || undefined)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-hidden focus:border-[#2855D9]"
                >
                  <option value="">📁 Racine du cours (aucun sous-dossier)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#111A2E] mb-1">
                  Catégorie pédagogique *
                </label>
                <select
                  key={preselectedCategoryId || "default"}
                  name="categoryId"
                  required
                  defaultValue={preselectedCategoryId || (categories[0]?.id ?? "")}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#111A2E] mb-1">
                  Titre du document ou lien *
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Examen 2024 Corrigé / Syllabus Chapitre 1"
                  required
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#111A2E] mb-1">
                  Fichier du cours (PDF, Markdown, TXT, HTML) *
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.html,.txt,.md,.markdown"
                  required
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#111A2E] mb-1">
                  Enseignant / Auteur (Optionnel)
                </label>
                <input
                  type="text"
                  name="instructor"
                  placeholder="e.g. Prof. IGL4"
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddResourceModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" variant="primary">
                  Uploader & Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CRÉER UN QUIZ --- */}
      {isAddQuizModalOpen && (
        <CreateQuizModal
          subjectId={subject.id}
          onClose={() => setIsAddQuizModalOpen(false)}
          onCreated={(newQuiz) => {
            setQuizzes([newQuiz, ...quizzes]);
            setIsAddQuizModalOpen(false);
            showFeedback("Quiz créé avec succès!");
          }}
        />
      )}

      {/* --- MODAL: CRÉER UNE NOTE --- */}
      {isAddNoteModalOpen && (
        <CreateNoteModal
          subjectId={subject.id}
          isCheatSheet={false}
          onClose={() => setIsAddNoteModalOpen(false)}
          onCreated={(newNote) => {
            setNotes([newNote, ...notes]);
            setIsAddNoteModalOpen(false);
            showFeedback("Note enregistrée avec succès!");
          }}
        />
      )}

      {/* --- MODAL: CRÉER UNE FICHE MÉMO --- */}
      {isAddCheatModalOpen && (
        <CreateNoteModal
          subjectId={subject.id}
          isCheatSheet={true}
          onClose={() => setIsAddCheatModalOpen(false)}
          onCreated={(newNote) => {
            setNotes([newNote, ...notes]);
            setIsAddCheatModalOpen(false);
            showFeedback("Fiche mémo enregistrée avec succès!");
          }}
        />
      )}
    </div>
  );
}

// Subcomponent: Modal to create a Quiz with Question & Choices
function CreateQuizModal({
  subjectId,
  onClose,
  onCreated,
}: {
  subjectId: string;
  onClose: () => void;
  onCreated: (quiz: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [questionText, setQuestionText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions(options.map((opt, i) => (i === index ? { ...opt, text } : opt)));
  };

  const handleSetCorrect = (index: number) => {
    setOptions(options.map((opt, i) => ({ ...opt, isCorrect: i === index })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !questionText.trim()) return;

    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      setErrorMsg("Veuillez renseigner au moins 2 options de réponse.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createQuiz({
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty,
        questions: [
          {
            question_text: questionText.trim(),
            explanation: explanation.trim() || undefined,
            question_type: "single_choice",
            options: validOptions.map((o) => ({
              option_text: o.text.trim(),
              is_correct: o.isCorrect,
            })),
          },
        ],
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.quiz) {
        onCreated({
          ...res.quiz,
          questions: [
            {
              question_text: questionText,
              explanation,
              options: validOptions.map((o, idx) => ({ id: `opt-${idx}`, option_text: o.text, is_correct: o.isCorrect })),
            },
          ],
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de la création du quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-[#E4E8F0] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E8F0]">
          <h3 className="font-bold text-sm text-[#111A2E]">
            Créer un nouveau Quiz
          </h3>
          <button type="button" onClick={onClose} className="text-[#68748A] hover:text-[#111A2E]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#111A2E] mb-1">
              Titre du Quiz *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. QCM Révision - Chapitre 1"
              required
              className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#111A2E] mb-1">
              Niveau de difficulté
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            >
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
            </select>
          </div>

          <div className="pt-2 border-t border-[#E4E8F0]">
            <label className="block font-medium text-[#111A2E] mb-1">
              Première Question *
            </label>
            <textarea
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Énoncez clairement la question..."
              required
              className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-2.5 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-medium text-[#111A2E]">
              Options de réponse (Cochez la bonne réponse) *
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="correct-opt"
                  checked={opt.isCorrect}
                  onChange={() => handleSetCorrect(i)}
                  className="cursor-pointer"
                />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionTextChange(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  required={i < 2}
                  className="flex-1 bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-1.5 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block font-medium text-[#111A2E] mb-1">
              Explication de la réponse (Optionnel)
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Expliquez pourquoi cette réponse est la bonne..."
              className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Créer le Quiz"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Modal to create a Note or Cheat Sheet
function CreateNoteModal({
  subjectId,
  isCheatSheet,
  onClose,
  onCreated,
}: {
  subjectId: string;
  isCheatSheet: boolean;
  onClose: () => void;
  onCreated: (note: Note) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createNote({
        subject_id: subjectId,
        title: title.trim(),
        content: content.trim(),
        tags: isCheatSheet ? ["cheat-sheet"] : ["notes"],
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.note) {
        onCreated(res.note);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E4E8F0] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E8F0]">
          <h3 className="font-bold text-sm text-[#111A2E]">
            {isCheatSheet ? "Nouvelle Fiche Mémo / Anti-sèche" : "Nouvelle Note de Cours"}
          </h3>
          <button type="button" onClick={onClose} className="text-[#68748A] hover:text-[#111A2E]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#111A2E] mb-1">
              Titre / Concept clé *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isCheatSheet ? "e.g. Algorithme de Bellman-Ford (Formule)" : "e.g. Remarques Cours Séance 3"}
              required
              className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#111A2E] mb-1">
              {isCheatSheet ? "Contenu de la fiche (Code, Formule, Définition) *" : "Contenu de la note *"}
            </label>
            <textarea
              rows={isCheatSheet ? 6 : 5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isCheatSheet
                  ? "// Snippet de code ou formule mathématique\nint d[v] = d[u] + w(u, v);"
                  : "Rédigez vos notes personnelles..."
              }
              required
              className={`w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-2.5 text-[#111A2E] focus:outline-none focus:border-[#2855D9] ${
                isCheatSheet ? "font-mono" : ""
              }`}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
