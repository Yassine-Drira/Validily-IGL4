"use client";

import React, { useState, useTransition } from "react";
import {
  Upload,
  FileCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  FileText,
  Play,
  Layers,
  ArrowRight,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createQuiz } from "@/lib/actions/quiz-actions";
import {
  detectAndParseQuizImport,
  ParsedQuizPackage,
} from "@/lib/quizzes/quiz-importer";

interface QuizImportModalProps {
  subjectId: string;
  subjectName: string;
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated?: (quiz: any) => void;
  onLaunchHtmlDrill?: (drill: { title: string; htmlContent: string; quizId?: string }) => void;
}

export function QuizImportModal({
  subjectId,
  subjectName,
  isOpen,
  onClose,
  onQuizCreated,
  onLaunchHtmlDrill,
}: QuizImportModalProps) {
  const [activeMode, setActiveMode] = useState<"file" | "paste">("file");
  const [rawText, setRawText] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [parsedPackage, setParsedPackage] = useState<ParsedQuizPackage | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleProcessInput = (content: string, filename?: string) => {
    setParseError(null);
    try {
      const result = detectAndParseQuizImport(content, filename);
      if (result.format === "html") {
        if (!result.htmlContent) {
          setParseError("Le contenu HTML est vide ou invalide.");
          return;
        }
      } else if (!result.questions || result.questions.length === 0) {
        setParseError("Aucune question QCM valide détectée. Vérifiez le format (JSON ou texte).");
        return;
      }
      setParsedPackage(result);
      setTitleOverride(result.title);
      if (result.difficulty) setDifficulty(result.difficulty);
    } catch (err: any) {
      setParseError(err?.message || "Erreur lors de l'analyse du document.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessInput(content, file.name);
    };
    reader.onerror = () => {
      setParseError("Erreur lors de la lecture du fichier.");
    };
    reader.readAsText(file);
  };

  const handleFinalImport = () => {
    if (!parsedPackage) return;

    startTransition(async () => {
      // 1. If HTML format: persist as interactive HTML drill
      if (parsedPackage.format === "html") {
        const res = await createQuiz({
          subject_id: subjectId,
          title: titleOverride || parsedPackage.title,
          description: parsedPackage.description || "Atelier interactif complet (flashcards, QCM avec minuteur, guides).",
          difficulty,
          isHtmlDrill: true,
          htmlContent: parsedPackage.htmlContent,
        });

        if (res.error) {
          setParseError(`Erreur lors de la sauvegarde : ${res.error}`);
        } else {
          if (onQuizCreated && res.quiz) {
            onQuizCreated({
              ...res.quiz,
              isHtmlDrill: true,
              htmlContent: parsedPackage.htmlContent,
              question_count: "Atelier",
            });
          }
          if (onLaunchHtmlDrill && parsedPackage.htmlContent) {
            onLaunchHtmlDrill({
              quizId: res.quiz?.id,
              title: titleOverride || parsedPackage.title,
              htmlContent: parsedPackage.htmlContent,
            });
          }
          onClose();
        }
        return;
      }

      // 2. If JSON / Markdown QCM questions: persist to Supabase via createQuiz
      const res = await createQuiz({
        subject_id: subjectId,
        title: titleOverride || parsedPackage.title,
        description: parsedPackage.description || `Série de ${parsedPackage.questions?.length} questions importée.`,
        difficulty,
        questions: (parsedPackage.questions || []).map((q) => ({
          question_text: q.question_text,
          explanation: q.explanation,
          question_type: "single_choice",
          options: q.options.map((opt) => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct,
          })),
        })),
      });

      if (res.error) {
        setParseError(`Erreur lors de la sauvegarde : ${res.error}`);
      } else {
        if (onQuizCreated && res.quiz) {
          onQuizCreated({
            ...res.quiz,
            questions: parsedPackage.questions,
            question_count: parsedPackage.questions?.length || 0,
          });
        }
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto [scrollbar-width:thin] touch-scroll p-6 shadow-2xl border border-[#E4E8F0] space-y-5 my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E4E8F0]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-[#EDF2FF] text-[#2855D9] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {subjectName}
              </span>
              <span className="text-xs text-[#68748A]">• Import Express</span>
            </div>
            <h3 className="font-bold text-base text-[#111A2E] mt-1">
              Importer un Quiz ou Atelier Interactif
            </h3>
            <p className="text-xs text-[#68748A] mt-0.5">
              Glissez votre fichier prêt (.html, .json) ou collez le code directement sans saisie manuelle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1 rounded-lg text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] cursor-pointer active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#E4E8F0] gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode("file");
              setParsedPackage(null);
            }}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "file"
                ? "border-b-2 border-[#2855D9] text-[#2855D9]"
                : "text-[#68748A] hover:text-[#111A2E]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Fichier (.html / .json)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode("paste");
              setParsedPackage(null);
            }}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "paste"
                ? "border-b-2 border-[#2855D9] text-[#2855D9]"
                : "text-[#68748A] hover:text-[#111A2E]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Coller du Code Brut</span>
          </button>
        </div>

        {/* Mode 1: File Upload */}
        {activeMode === "file" && !parsedPackage && (
          <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#2855D9] rounded-xl p-8 text-center space-y-3 bg-[#FAFAF7] transition-colors">
            <div className="w-12 h-12 rounded-full bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center mx-auto">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#182235]">
                Sélectionnez un fichier HTML interactif ou un export JSON
              </p>
              <p className="text-[11px] text-[#68748A] mt-1">
                Fichiers acceptés : <span className="font-mono font-semibold">.html, .htm, .json</span> (Ateliers web interactifs, exports IA ou QCMs)
              </p>
            </div>
            <label className="inline-block">
              <input
                type="file"
                accept=".html,.htm,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer inline-flex items-center space-x-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Parcourir mon ordinateur</span>
              </span>
            </label>
          </div>
        )}

        {/* Mode 2: Paste Code */}
        {activeMode === "paste" && !parsedPackage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#68748A]">
              <span>Collez le code HTML complet ou la structure JSON :</span>
              <span className="font-mono text-[10px]">HTML5 / JSON / Markdown</span>
            </div>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`<!-- Exemple HTML -->\n<!DOCTYPE html><html><head><title>Mon Quiz</title>...</head>...\n\n/* Ou Exemple JSON */\n[\n  {\n    "question": "Quelle est la définition d'un Stub ?",\n    "options": ["...", "..."],\n    "answer": 0\n  }\n]`}
              className="w-full text-xs font-mono p-3 rounded-lg border border-[#CBD5E1] bg-[#FAFAF7] focus:bg-white focus:outline-hidden focus:border-[#2855D9]"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleProcessInput(rawText)}
                disabled={!rawText.trim()}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>Analyser et Valider le Code</span>
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {parseError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview & Confirmation Step */}
        {parsedPackage && (
          <div className="space-y-4 bg-[#F4F6FA] border border-[#E4E8F0] p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-[#111A2E] uppercase tracking-wide">
                  {parsedPackage.format === "html" ? "Atelier HTML Détecté" : "Série QCM Structurée Détectée"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setParsedPackage(null)}
                className="text-[11px] text-[#2855D9] hover:underline cursor-pointer"
              >
                Changer de contenu
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#182235] block mb-1">
                  Titre du Quiz / Atelier
                </label>
                <input
                  type="text"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#111A2E] font-medium focus:outline-hidden focus:border-[#2855D9]"
                />
              </div>

              {parsedPackage.format === "html" ? (
                <div className="p-3 bg-white rounded-lg border border-[#E4E8F0] text-xs space-y-1.5">
                  <div className="font-semibold text-[#2855D9] flex items-center space-x-1.5">
                    <FileCode className="w-4 h-4" />
                    <span>Contenu interactif autonome complet prêt à l&apos;exécution</span>
                  </div>
                  <p className="text-[#68748A] text-[11px] leading-relaxed">
                    {parsedPackage.description}
                  </p>
                  <div className="pt-2 flex items-center space-x-3 text-[11px] font-mono text-[#68748A]">
                    <span>Isolation : Sandboxed Frame</span>
                    <span>•</span>
                    <span>Taille : ~{Math.round((parsedPackage.htmlContent?.length || 0) / 1024)} Ko</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">Storage Shim actif</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#182235]">
                    <span>Questions détectées ({parsedPackage.questions?.length})</span>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="bg-white border border-[#CBD5E1] rounded px-2 py-0.5 text-xs"
                    >
                      <option value="beginner">Débutant</option>
                      <option value="intermediate">Intermédiaire</option>
                      <option value="advanced">Avancé</option>
                    </select>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {(parsedPackage.questions || []).slice(0, 5).map((q, idx) => (
                      <div
                        key={`preview-q-${idx}`}
                        className="bg-white p-2.5 rounded-lg border border-[#E4E8F0] text-[11px] space-y-1"
                      >
                        <div className="font-semibold text-[#182235]">
                          Q{idx + 1}: {q.question_text}
                        </div>
                        <div className="text-[#68748A] flex flex-wrap gap-2 text-[10px]">
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={`preview-q-${idx}-opt-${oIdx}`}
                              className={`px-1.5 py-0.5 rounded ${
                                opt.is_correct
                                  ? "bg-emerald-100 text-emerald-800 font-bold"
                                  : "bg-[#F4F6FA] text-[#68748A]"
                              }`}
                            >
                              {opt.option_text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {(parsedPackage.questions?.length || 0) > 5 && (
                      <div className="text-center text-[10px] text-[#68748A] italic">
                        + {(parsedPackage.questions?.length || 0) - 5} questions supplémentaires prêtes.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation Action */}
            <div className="pt-2 flex justify-end gap-2.5">
              <Button size="sm" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleFinalImport}
                disabled={isPending}
                className="bg-[#2855D9] hover:bg-[#1E40AF]"
              >
                {parsedPackage.format === "html" ? (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    <span>Lancer immédiatement l&apos;Atelier</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>{isPending ? "Création en cours..." : "Importer et Créer le Quiz"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
