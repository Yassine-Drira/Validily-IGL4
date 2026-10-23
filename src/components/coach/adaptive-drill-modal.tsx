"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Brain,
  Award,
  Layers,
  Sliders,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import type { AdaptiveDrill, AdaptiveDrillQuestion } from "@/lib/ai/types";

interface AdaptiveDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  drill: AdaptiveDrill | null;
  isLoading?: boolean;
  subjects?: Array<{ id: string; name: string }>;
  onGenerateQuiz?: (params: {
    subjectId?: string;
    questionCount: number;
    difficulty: "beginner" | "intermediate" | "advanced";
  }) => Promise<void>;
  generationError?: string | null;
}

export function AdaptiveDrillModal({
  isOpen,
  onClose,
  drill,
  isLoading = false,
  subjects = [],
  onGenerateQuiz,
  generationError = null,
}: AdaptiveDrillModalProps) {
  // Config state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [selectedCount, setSelectedCount] = useState<number>(3);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

  // Quiz play state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const questions = drill?.questions || [];
  const currentQuestion: AdaptiveDrillQuestion | undefined = questions[currentIndex];

  const handleSelectOption = (optionId: string) => {
    if (hasSubmittedAnswer) return;
    setSelectedOptionId(optionId);
  };

  const handleValidateAnswer = () => {
    if (!selectedOptionId || !currentQuestion) return;
    setHasSubmittedAnswer(true);

    const chosen = currentQuestion.options.find((o) => o.id === selectedOptionId);
    if (chosen?.isCorrect) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOptionId(null);
      setHasSubmittedAnswer(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setHasSubmittedAnswer(false);
    setScore(0);
    setIsFinished(false);
  };

  const handleTriggerGenerate = async () => {
    if (onGenerateQuiz) {
      await onGenerateQuiz({
        subjectId: selectedSubjectId || undefined,
        questionCount: selectedCount,
        difficulty: selectedDifficulty,
      });
      handleRestart();
    }
  };

  return (
    <div id="rag-quiz-studio-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="luxury-glass bg-[#0c1222] border border-white/10 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  {drill ? drill.title : "Studio Quiz Validily AI"}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  RAG Fondé
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {drill
                  ? isFinished
                    ? "Bilan de la séance"
                    : `Question ${currentIndex + 1} sur ${questions.length}`
                  : "Génération de questions certifiées sur documents autorisés"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-600/30">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Validily AI extrait le contenu de cours...</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Vérification des sources autorisées et formulation des questions à choix multiples.
                </p>
              </div>
            </div>
          ) : !drill ? (
            /* Quiz Configurator Screen */
            <div className="space-y-5">
              {generationError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{generationError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Matière Cible (INSAT IGL4)
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/10 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {subjects.length > 0 ? (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-slate-950 text-white">
                      Tous les cours et notes disponibles
                    </option>
                  )}
                </select>
              </div>

              {/* Number of Questions Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Nombre de Questions
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[3, 5, 10].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSelectedCount(cnt)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedCount === cnt
                          ? "bg-indigo-600/30 border-indigo-400 text-white ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-600/20"
                          : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800/80"
                      }`}
                    >
                      <span className="text-sm font-extrabold block">{cnt} questions</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {cnt === 3 ? "Micro-Drill" : cnt === 5 ? "Évaluation" : "Examen Blanc"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Niveau de Difficulté
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: "beginner", label: "Débutant", desc: "Fondamentaux" },
                      { key: "intermediate", label: "Intermédiaire", desc: "Cas Pratiques" },
                      { key: "advanced", label: "Avancé", desc: "Architecture" },
                    ] as const
                  ).map((diff) => (
                    <button
                      key={diff.key}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.key)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedDifficulty === diff.key
                          ? "bg-purple-600/30 border-purple-400 text-white ring-2 ring-purple-500/40 shadow-lg shadow-purple-600/20"
                          : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800/80"
                      }`}
                    >
                      <span className="text-xs font-extrabold block">{diff.label}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{diff.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Garantie de Fondement Académique</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Validily AI synthétise uniquement les questions basées sur vos notes réelles et les supports de cours autorisés.
                </p>
              </div>

              <button
                id="submit-generate-rag-quiz"
                type="button"
                onClick={handleTriggerGenerate}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Générer le Quiz RAG ({selectedCount} questions)</span>
              </button>
            </div>
          ) : isFinished ? (
            /* Summary Screen */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-white">Séance d'évaluation terminée !</h4>
                <p className="text-xs text-slate-300">
                  Votre score :{" "}
                  <span className="font-extrabold text-emerald-400 text-base">
                    {score} / {questions.length}
                  </span>{" "}
                  ({Math.round((score / Math.max(1, questions.length)) * 100)}%)
                </p>
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Ce micro-test consolide votre courbe de mémoire à long terme sur le module {drill?.subjectName}.
              </p>
            </div>
          ) : currentQuestion ? (
            /* Active Question */
            <div className="space-y-4">
              {/* Provenance Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-300">
                  {currentQuestion.subjectName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Source académique vérifiée</span>
                </span>
              </div>

              {/* Question Text */}
              <h4 className="text-sm font-bold text-white leading-snug">
                {currentQuestion.questionText}
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optionStyles = "bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-200";

                  if (hasSubmittedAnswer) {
                    if (opt.isCorrect) {
                      optionStyles = "bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/30";
                    } else if (isSelected && !opt.isCorrect) {
                      optionStyles = "bg-rose-950/60 border-rose-500 text-rose-200 shadow-md shadow-rose-950/30";
                    } else {
                      optionStyles = "bg-slate-900/20 border-white/[0.04] opacity-35 text-slate-500";
                    }
                  } else if (isSelected) {
                    optionStyles = "bg-indigo-950/50 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50";
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={hasSubmittedAnswer}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs font-medium transition-all flex items-start gap-3 cursor-pointer ${optionStyles}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {hasSubmittedAnswer && opt.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : hasSubmittedAnswer && isSelected && !opt.isCorrect ? (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected ? "border-indigo-400 bg-indigo-400/20" : "border-slate-700"
                            }`}
                          />
                        )}
                      </div>
                      <span className="flex-1 leading-snug">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation on submit */}
              {hasSubmittedAnswer && currentQuestion.explanation && (
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 space-y-1.5 animate-in fade-in duration-200">
                  <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Explication pédagogique :</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Aucune question disponible.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-xl flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>

          {drill && (
            <div>
              {isFinished ? (
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Recommencer ce quiz
                </button>
              ) : !hasSubmittedAnswer ? (
                <button
                  onClick={handleValidateAnswer}
                  disabled={!selectedOptionId}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-40 cursor-pointer"
                >
                  Valider la réponse
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  <span>{currentIndex + 1 < questions.length ? "Question suivante" : "Voir le bilan"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
