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
    <div id="rag-quiz-studio-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E4E8F0] rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#182235]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8F0] flex items-center justify-between bg-[#FAFBFD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9] shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#111A2E] tracking-tight">
                  {drill ? drill.title : "Studio Quiz Validily AI"}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDF2FF] text-[#2855D9] border border-[#2855D9]/20 font-mono">
                  Validé sur vos cours
                </span>
              </div>
              <p className="text-xs text-[#68748A]">
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
            className="p-2 rounded-xl text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9] mx-auto shadow-2xs">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#111A2E]">Validily AI extrait le contenu de cours...</p>
                <p className="text-xs text-[#68748A] max-w-xs mx-auto">
                  Vérification des sources autorisées et formulation des questions à choix multiples.
                </p>
              </div>
            </div>
          ) : !drill ? (
            /* Quiz Configurator Screen */
            <div className="space-y-5">
              {generationError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{generationError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111A2E] flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-[#2855D9]" />
                  Matière Cible (INSAT IGL4)
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] text-[#111A2E] text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2855D9]/20 focus:border-[#2855D9]"
                >
                  {subjects.length > 0 ? (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white text-[#111A2E]">
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-white text-[#111A2E]">
                      Tous les cours et notes disponibles
                    </option>
                  )}
                </select>
              </div>

              {/* Number of Questions Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111A2E] flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-[#2855D9]" />
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
                          ? "bg-[#EDF2FF] border-[#2855D9] text-[#2855D9] shadow-2xs"
                          : "bg-[#F8FAFC] border-[#E4E8F0] text-[#68748A] hover:text-[#111A2E] hover:bg-white"
                      }`}
                    >
                      <span className="text-sm font-bold block">{cnt} questions</span>
                      <span className="text-[10px] mt-0.5 block opacity-80">
                        {cnt === 3 ? "Micro-Drill" : cnt === 5 ? "Évaluation" : "Examen Blanc"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111A2E] flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-[#2855D9]" />
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
                          ? "bg-[#EDF2FF] border-[#2855D9] text-[#2855D9] shadow-2xs"
                          : "bg-[#F8FAFC] border-[#E4E8F0] text-[#68748A] hover:text-[#111A2E] hover:bg-white"
                      }`}
                    >
                      <span className="text-xs font-bold block">{diff.label}</span>
                      <span className="text-[10px] mt-0.5 block opacity-80">{diff.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#111A2E]">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  <span>Garantie de Fondement Académique</span>
                </div>
                <p className="text-[11px] text-[#68748A] leading-relaxed">
                  Validily AI synthétise uniquement les questions basées sur vos notes réelles et les supports de cours autorisés.
                </p>
              </div>

              <button
                id="submit-generate-rag-quiz"
                type="button"
                onClick={handleTriggerGenerate}
                className="w-full py-3.5 rounded-2xl bg-[#2855D9] hover:bg-[#1E42B0] text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Générer le Quiz IA ({selectedCount} questions)</span>
              </button>
            </div>
          ) : isFinished ? (
            /* Summary Screen */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-[#111A2E]">Séance d'évaluation terminée !</h4>
                <p className="text-xs text-[#68748A]">
                  Votre score :{" "}
                  <span className="font-bold text-[#059669] text-base">
                    {score} / {questions.length}
                  </span>{" "}
                  ({Math.round((score / Math.max(1, questions.length)) * 100)}%)
                </p>
              </div>
              <p className="text-xs text-[#68748A] max-w-sm mx-auto leading-relaxed">
                Ce micro-test consolide votre courbe de mémoire à long terme sur le module {drill?.subjectName}.
              </p>
            </div>
          ) : currentQuestion ? (
            /* Active Question */
            <div className="space-y-4">
              {/* Provenance Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E4E8F0] text-[#68748A]">
                  {currentQuestion.subjectName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#059669] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Source académique vérifiée</span>
                </span>
              </div>

              {/* Question Text */}
              <h4 className="text-sm font-bold text-[#111A2E] leading-snug">
                {currentQuestion.questionText}
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optionStyles = "bg-[#F8FAFC] border-[#E4E8F0] hover:border-[#2855D9]/40 hover:bg-white text-[#182235]";

                  if (hasSubmittedAnswer) {
                    if (opt.isCorrect) {
                      optionStyles = "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs";
                    } else if (isSelected && !opt.isCorrect) {
                      optionStyles = "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs";
                    } else {
                      optionStyles = "bg-slate-50 border-[#E4E8F0] opacity-40 text-[#94A3B8]";
                    }
                  } else if (isSelected) {
                    optionStyles = "bg-[#EDF2FF] border-[#2855D9] text-[#2855D9]";
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
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : hasSubmittedAnswer && isSelected && !opt.isCorrect ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected ? "border-[#2855D9] bg-[#2855D9]" : "border-[#E4E8F0] bg-white"
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
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] text-xs text-[#68748A] space-y-1.5 animate-in fade-in duration-200">
                  <div className="font-bold text-[#2855D9] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Explication pédagogique :</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#182235]">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-[#68748A] text-xs">
              Aucune question disponible.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E4E8F0] bg-[#FAFBFD] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA] text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>

          {drill && (
            <div>
              {isFinished ? (
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 rounded-xl bg-[#2855D9] hover:bg-[#1E42B0] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Recommencer ce quiz
                </button>
              ) : !hasSubmittedAnswer ? (
                <button
                  onClick={handleValidateAnswer}
                  disabled={!selectedOptionId}
                  className="px-5 py-2.5 rounded-xl bg-[#2855D9] hover:bg-[#1E42B0] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Valider la réponse
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
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
