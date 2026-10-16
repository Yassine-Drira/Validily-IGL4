"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  Award,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitQuizAttempt } from "@/lib/actions/quiz-actions";
import { injectSandboxShim } from "@/lib/quizzes/quiz-importer";

export interface InteractiveHtmlRunnerProps {
  quizId?: string;
  title: string;
  subjectName: string;
  htmlContent: string;
  onClose?: () => void;
}

export function InteractiveHtmlRunner({
  quizId,
  title,
  subjectName,
  htmlContent,
  onClose,
}: InteractiveHtmlRunnerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [selfScore, setSelfScore] = useState<number>(18);
  const [totalScore, setTotalScore] = useState<number>(20);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inject sandbox storage shim to prevent localStorage crash inside origin-null sandbox
  const safeHtml = React.useMemo(() => {
    return injectSandboxShim(htmlContent);
  }, [htmlContent]);

  // Listen for message events from the embedded HTML
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "VALIDILY_QUIZ_COMPLETED") {
        const score = Number(event.data.score) || 0;
        const total = Number(event.data.total) || 20;
        setSelfScore(score);
        setTotalScore(total);
        setSubmitSuccess(`Score capturé automatiquement depuis l'atelier : ${score} / ${total}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleRecordScore = async () => {
    if (!quizId) {
      setSubmitSuccess(`Score auto-évalué : ${selfScore} / ${totalScore} (Session locale)`);
      return;
    }

    setIsSubmittingScore(true);
    setSubmitSuccess(null);

    try {
      const res = await submitQuizAttempt({
        quiz_id: quizId,
        score: selfScore,
        total_questions: totalScore,
        answers: [],
      });

      if (res?.error) {
        if (
          res.error.toLowerCase().includes("authentification") ||
          res.error.toLowerCase().includes("connecté")
        ) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setSubmitSuccess(`Score local : ${selfScore}/${totalScore} (${res.error})`);
      } else if (res?.isGuest) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      } else {
        setSubmitSuccess(`Tentative enregistrée avec succès : ${selfScore} / ${totalScore}`);
      }
    } catch {
      setSubmitSuccess(`Score noté localement : ${selfScore} / ${totalScore}`);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0F172A] text-white rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen" : "w-full h-[88vh] max-w-6xl mx-auto"
      }`}
    >
      {/* Top Academic Navigation Bar */}
      <div className="bg-[#1E293B]/90 backdrop-blur-md px-4 py-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <span className="bg-[#2855D9] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
            {subjectName}
          </span>
          <div className="truncate">
            <h2 className="text-sm font-bold text-white truncate leading-tight">{title}</h2>
            <div className="flex items-center space-x-2 text-[11px] text-[#94A3B8]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atelier HTML Interactif Sécurisé</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-[#334155]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            title="Recharger l'atelier"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg bg-[#334155]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Fermer l'atelier"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Embedded Sandboxed Frame */}
      <div className="flex-1 w-full bg-black relative">
        <iframe
          key={iframeKey}
          srcDoc={safeHtml}
          title={title}
          sandbox="allow-scripts allow-modals allow-popups allow-forms"
          className="w-full h-full border-0 absolute inset-0 bg-[#09090b]"
        />
      </div>

      {/* Bottom Evaluation Bar */}
      <div className="bg-[#1E293B] px-4 py-2.5 border-t border-[#334155] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center space-x-2 text-[#94A3B8]">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-slate-200">Enregistrer votre progression d&apos;évaluation :</span>
          {submitSuccess && (
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitSuccess}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[#94A3B8] mr-1.5">Note :</span>
            <input
              type="number"
              min={0}
              max={totalScore}
              value={selfScore}
              onChange={(e) => setSelfScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 bg-transparent text-white font-mono text-center font-bold focus:outline-hidden"
            />
            <span className="text-[#94A3B8] mx-1">/</span>
            <input
              type="number"
              min={1}
              value={totalScore}
              onChange={(e) => setTotalScore(Math.max(1, parseInt(e.target.value) || 20))}
              className="w-12 bg-transparent text-[#94A3B8] font-mono text-center focus:outline-hidden"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleRecordScore}
            disabled={isSubmittingScore}
            className="bg-[#2855D9] hover:bg-[#1E40AF] text-white"
          >
            {isSubmittingScore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1" />
            )}
            <span>Enregistrer mon score</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
