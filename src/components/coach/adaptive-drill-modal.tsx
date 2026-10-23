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
} from "lucide-react";
import type { AdaptiveDrill, AdaptiveDrillQuestion } from "@/lib/ai/types";

interface AdaptiveDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  drill: AdaptiveDrill | null;
  isLoading?: boolean;
}

export function AdaptiveDrillModal({
  isOpen,
  onClose,
  drill,
  isLoading = false,
}: AdaptiveDrillModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{drill?.title || "Micro-Drill Adaptatif"}</h3>
              <p className="text-xs text-slate-400">
                {isFinished
                  ? "Bilan de la séance"
                  : `Question ${currentIndex + 1} sur ${questions.length}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <span className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-slate-400">Génération des questions adaptées à vos points faibles...</p>
            </div>
          ) : isFinished ? (
            /* Summary Screen */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-slate-100">Séance terminée !</h4>
                <p className="text-xs text-slate-400">
                  Votre score : <span className="font-bold text-emerald-400 text-sm">{score} / {questions.length}</span>
                </p>
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ce micro-drill renforce votre courbe de rétention mémorielle pour le module {drill?.subjectName}.
              </p>
            </div>
          ) : currentQuestion ? (
            /* Active Question */
            <div className="space-y-4">
              {/* Provenance Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#182234] border border-[#23334d] text-slate-300">
                  {currentQuestion.subjectName}
                </span>
                {currentQuestion.verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Basé sur vos erreurs réelles</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthèse pédagogique IA</span>
                  </span>
                )}
              </div>

              {/* Question Text */}
              <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                {currentQuestion.questionText}
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optionStyles = "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-200";

                  if (hasSubmittedAnswer) {
                    if (opt.isCorrect) {
                      optionStyles = "bg-emerald-950/40 border-emerald-500 text-emerald-200";
                    } else if (isSelected && !opt.isCorrect) {
                      optionStyles = "bg-rose-950/40 border-rose-500 text-rose-200";
                    } else {
                      optionStyles = "bg-slate-900/20 border-slate-800/40 opacity-40 text-slate-400";
                    }
                  } else if (isSelected) {
                    optionStyles = "bg-amber-950/30 border-amber-500/80 text-amber-200";
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={hasSubmittedAnswer}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 ${optionStyles}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {hasSubmittedAnswer && opt.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : hasSubmittedAnswer && isSelected && !opt.isCorrect ? (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected ? "border-amber-400 bg-amber-400/20" : "border-slate-700"
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
                <div className="p-3.5 rounded-xl bg-[#182234] border border-[#23334d] text-xs text-slate-300 space-y-1 animate-in fade-in duration-200">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Fermer
          </button>

          {isFinished ? (
            <button
              onClick={handleRestart}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Recommencer
            </button>
          ) : !hasSubmittedAnswer ? (
            <button
              onClick={handleValidateAnswer}
              disabled={!selectedOptionId}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-40"
            >
              Valider la réponse
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
            >
              <span>{currentIndex + 1 < questions.length ? "Question suivante" : "Voir le bilan"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
