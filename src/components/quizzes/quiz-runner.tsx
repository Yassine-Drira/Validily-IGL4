"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuestionData {
  id: string;
  question_text: string;
  explanation: string;
  options: {
    id: string;
    text?: string;
    option_text?: string;
    is_correct: boolean;
  }[];
}

interface QuizRunnerProps {
  quizTitle: string;
  subjectName: string;
  difficulty: string;
  questions: QuestionData[];
}

export function QuizRunner({
  quizTitle,
  subjectName,
  difficulty,
  questions,
}: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [answers, setAnswers] = useState<
    { questionId: string; selectedId: string; isCorrect: boolean }[]
  >([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 max-w-xl mx-auto text-center space-y-4">
        <HelpCircle className="w-10 h-10 text-[#68748A] mx-auto" />
        <h3 className="text-base font-semibold text-[#182235]">No questions available</h3>
        <p className="text-xs text-[#68748A]">
          This quiz currently does not have published questions. Check back soon or browse other module drills.
        </p>
        <Link href="/quizzes">
          <Button size="sm" variant="outline">
            Back to Quizzes
          </Button>
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelectOption = (optionId: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionId(optionId);
  };

  const handleCheckAnswer = () => {
    if (!selectedOptionId) return;

    const chosen = currentQ.options.find((o) => o.id === selectedOptionId);
    const isCorrect = Boolean(chosen?.is_correct);

    setAnswers([
      ...answers,
      {
        questionId: currentQ.id,
        selectedId: selectedOptionId,
        isCorrect,
      },
    ]);
    setIsAnswerSubmitted(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setAnswers([]);
    setIsCompleted(false);
  };

  const score = answers.filter((a) => a.isCorrect).length;
  const percentage = Math.round((score / questions.length) * 100);

  if (isCompleted) {
    return (
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-8 shadow-xs max-w-2xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs uppercase font-mono text-[#68748A] font-semibold tracking-wider">
            Quiz Completed
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#182235] mt-1">
            {quizTitle}
          </h2>
          <p className="text-xs text-[#68748A] mt-1">
            Module: {subjectName} • Difficulty: {difficulty}
          </p>
        </div>

        <div className="bg-[#FAFAF7] border border-[#E4E8F0] rounded-lg p-6 max-w-sm mx-auto">
          <div className="text-4xl font-bold font-mono font-tabular text-[#182235]">
            {score} / {questions.length}
          </div>
          <div className="text-xs font-semibold text-[#2855D9] mt-1 font-tabular">
            {percentage}% Mastery Score
          </div>
          <p className="text-[11px] text-[#68748A] mt-2">
            {percentage >= 80
              ? "Excellent exam readiness! You demonstrated mastery of core concepts."
              : percentage >= 50
              ? "Good foundation! Review the explanation notes below to reinforce weaker areas."
              : "Review the lecture notes and try this drill again to solidify understanding."}
          </p>
        </div>

        {/* Question Review Breakdown */}
        <div className="text-left space-y-3 pt-4 border-t border-[#E4E8F0]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#68748A] font-mono">
            Answer Review & Explanations
          </h3>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const attempt = answers.find((a) => a.questionId === q.id);
              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-lg border text-xs ${
                    attempt?.isCorrect
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-rose-50/50 border-rose-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[#182235]">
                      Q{idx + 1}: {q.question_text}
                    </span>
                    {attempt?.isCorrect ? (
                      <span className="text-emerald-700 font-semibold flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold flex items-center space-x-1 shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#182235] mt-1.5 leading-relaxed bg-white/90 p-2.5 rounded border border-[#E4E8F0] font-sans">
                    <strong className="text-[#2855D9]">Explanation:</strong> {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button size="md" variant="outline" onClick={handleRestart}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            <span>Retake Drill</span>
          </Button>
          <Link href="/quizzes">
            <Button size="md" variant="primary">
              <BookOpen className="w-4 h-4 mr-1.5" />
              <span>Back to Quizzes</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-6">
      {/* Quiz Header & Progress */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E4E8F0]">
        <div>
          <span className="text-[10px] font-mono uppercase bg-[#EDF2FF] text-[#2855D9] px-2 py-0.5 rounded border border-[#2855D9]/20 font-semibold">
            {subjectName}
          </span>
          <h1 className="text-lg font-serif font-bold text-[#182235] mt-1">
            {quizTitle}
          </h1>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono font-tabular text-[#68748A]">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="w-28 bg-[#F4F6FA] h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-[#2855D9] h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[#182235] leading-snug">
          {currentQ.question_text}
        </h2>

        {/* Options List */}
        <div className="space-y-2.5">
          {currentQ.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            const optionLabel = opt.text || opt.option_text;
            let optionStyles =
              "border-[#E4E8F0] bg-[#FAFAF7] hover:bg-white hover:border-[#2855D9]/40 text-[#182235]";

            if (isAnswerSubmitted) {
              if (opt.is_correct) {
                optionStyles = "border-emerald-500 bg-emerald-50 text-emerald-950 font-medium";
              } else if (isSelected && !opt.is_correct) {
                optionStyles = "border-rose-400 bg-rose-50 text-rose-950";
              } else {
                optionStyles = "border-[#E4E8F0] bg-[#F4F6FA] text-[#68748A] opacity-60";
              }
            } else if (isSelected) {
              optionStyles = "border-[#2855D9] bg-[#EDF2FF] text-[#2855D9] font-medium shadow-2xs";
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                disabled={isAnswerSubmitted}
                className={`w-full text-left p-3.5 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyles}`}
              >
                <span>{optionLabel}</span>
                {isAnswerSubmitted && opt.is_correct && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                {isAnswerSubmitted && isSelected && !opt.is_correct && (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Answer Explanation Box */}
      {isAnswerSubmitted && (
        <div className="p-4 rounded-lg bg-[#EDF2FF]/60 border border-[#2855D9]/20 text-xs text-[#182235] space-y-1 animate-in fade-in duration-200">
          <div className="font-semibold text-[#2855D9] flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Explanation & Concept</span>
          </div>
          <p className="leading-relaxed text-[#182235]">{currentQ.explanation}</p>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E4E8F0]">
        <Link href="/quizzes" className="text-xs text-[#68748A] hover:text-[#182235]">
          Exit Drill
        </Link>

        <div>
          {!isAnswerSubmitted ? (
            <Button
              size="md"
              variant="primary"
              onClick={handleCheckAnswer}
              disabled={!selectedOptionId}
            >
              Submit Answer
            </Button>
          ) : (
            <Button size="md" variant="primary" onClick={handleNext}>
              <span>{isLastQuestion ? "View Final Results" : "Next Question"}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
