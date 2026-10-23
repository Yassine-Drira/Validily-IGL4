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
  subjectName?: string;
  htmlContent?: string;
  srcUrl?: string;
  onClose?: () => void;
}

export function InteractiveHtmlRunner({
  quizId,
  title,
  subjectName = "Atelier Interactif",
  htmlContent = "",
  srcUrl,
  onClose,
}: InteractiveHtmlRunnerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [selfScore, setSelfScore] = useState<number>(18);
  const [totalScore, setTotalScore] = useState<number>(20);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [fetchedHtml, setFetchedHtml] = useState<string>(htmlContent);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(!htmlContent && Boolean(srcUrl));
  const [capturedMistakes, setCapturedMistakes] = useState<any[]>([]);
  const [capturedAnswers, setCapturedAnswers] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch HTML content if srcUrl is provided without inline content
  useEffect(() => {
    if (htmlContent) {
      setFetchedHtml(htmlContent);
      setIsLoadingContent(false);
      return;
    }

    if (srcUrl) {
      let isCancelled = false;
      setIsLoadingContent(true);
      fetch(srcUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((text) => {
          if (!isCancelled) {
            setFetchedHtml(text);
            setIsLoadingContent(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error("Failed to load quiz from srcUrl:", err);
            setIsLoadingContent(false);
          }
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [htmlContent, srcUrl]);

  // Inject sandbox storage shim to prevent localStorage crash inside origin-null sandbox
  const safeHtml = React.useMemo(() => {
    return fetchedHtml ? injectSandboxShim(fetchedHtml) : "";
  }, [fetchedHtml]);

  // Listen for message events exclusively from the sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Strict origin isolation: ensure message originates strictly from our embedded sandboxed frame
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (!event.data || typeof event.data !== "object") return;

      const msgType = event.data.type;
      if (
        msgType === "VALIDILY_QUIZ_COMPLETED" ||
        msgType === "EDUFOCUS_QUIZ_COMPLETED" ||
        msgType === "QUIZ_COMPLETED"
      ) {
        const rawScore = Number(event.data.score);
        const rawTotal = Number(event.data.total);
        const total = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.round(rawTotal) : 20;
        const score = Number.isFinite(rawScore) ? Math.min(Math.max(0, Math.round(rawScore)), total) : 0;
        setSelfScore(score);
        setTotalScore(total);
        if (Array.isArray(event.data.mistakes)) {
          setCapturedMistakes(event.data.mistakes);
        }
        if (Array.isArray(event.data.answers)) {
          setCapturedAnswers(event.data.answers);
        }
        const percent = Math.round((score / total) * 100);
        const rawTime = Number(event.data.timeSpentSeconds);
        const timeInfo =
          Number.isFinite(rawTime) && rawTime > 0
            ? ` • Durée : ${Math.floor(rawTime / 60)}m ${Math.round(rawTime % 60)}s`
            : "";
        const mistakesInfo =
          Array.isArray(event.data.mistakes) && event.data.mistakes.length > 0
            ? ` • ${event.data.mistakes.length} erreur(s) à consolider`
            : "";
        setSubmitSuccess(
          `Score capturé depuis l'atelier : ${score} / ${total} (${percent}%)${timeInfo}${mistakesInfo}`
        );
      } else if (
        msgType === "VALIDILY_QUIZ_PROGRESS" ||
        msgType === "EDUFOCUS_QUIZ_PROGRESS" ||
        msgType === "QUIZ_PROGRESS"
      ) {
        const rawTotal = Number(event.data.total);
        const rawScore = Number(event.data.scoreSoFar);
        const total = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.round(rawTotal) : 20;
        const scoreSoFar = Number.isFinite(rawScore) ? Math.min(Math.max(0, Math.round(rawScore)), total) : 0;
        setSelfScore(scoreSoFar);
        setTotalScore(total);
        if (Array.isArray(event.data.mistakes)) {
          setCapturedMistakes(event.data.mistakes);
        }
        if (Array.isArray(event.data.answers)) {
          setCapturedAnswers(event.data.answers);
        }
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
        answers: capturedAnswers,
        mistakes: capturedMistakes,
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
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
          : "w-full h-[86dvh] min-h-[500px] max-w-6xl mx-auto"
      }`}
    >
      {/* Top Academic Navigation Bar */}
      <div className="bg-[#1E293B]/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0 max-w-[75%] sm:max-w-[80%]">
          <span className="bg-[#2855D9] text-white text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
            {subjectName}
          </span>
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight" title={title}>
              {title}
            </h2>
            <div className="hidden xs:flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-[#94A3B8]">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
              <span>Atelier HTML Interactif Sécurisé</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-lg bg-[#334155]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Recharger l'atelier"
            aria-label="Recharger l'atelier"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-lg bg-[#334155]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer active:scale-95"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-colors cursor-pointer ml-1 active:scale-95"
              title="Fermer l'atelier"
              aria-label="Fermer l'atelier"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Embedded Sandboxed Frame */}
      <div className="flex-1 w-full bg-black relative min-h-[300px]">
        {isLoadingContent ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b] text-[#94A3B8] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2855D9]" />
            <p className="text-xs">Chargement de l&apos;atelier interactif...</p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            srcDoc={safeHtml}
            title={title}
            sandbox="allow-scripts allow-forms"
            className="w-full h-full border-0 absolute inset-0 bg-[#09090b]"
          />
        )}
      </div>

      {/* Bottom Evaluation Bar */}
      <div className="bg-[#1E293B] px-3.5 sm:px-4 py-2 sm:py-2.5 border-t border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shrink-0">
        <div className="flex items-center space-x-2 text-[#94A3B8] min-w-0">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-slate-200 truncate">Progression d&apos;évaluation :</span>
          {submitSuccess && (
            <span className="text-emerald-400 font-semibold flex items-center space-x-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{submitSuccess}</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2">
          <div className="flex items-center bg-[#0F172A] border border-[#334155] rounded-lg px-2 py-1 text-xs shrink-0">
            <span className="text-[#94A3B8] mr-1.5">Note :</span>
            <input
              type="number"
              min={0}
              max={totalScore}
              value={selfScore}
              onChange={(e) => setSelfScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-10 sm:w-12 bg-transparent text-white font-mono text-center font-bold focus:outline-hidden"
              aria-label="Score obtenu"
            />
            <span className="text-[#94A3B8] mx-1">/</span>
            <input
              type="number"
              min={1}
              value={totalScore}
              onChange={(e) => setTotalScore(Math.max(1, parseInt(e.target.value) || 20))}
              className="w-10 sm:w-12 bg-transparent text-[#94A3B8] font-mono text-center focus:outline-hidden"
              aria-label="Total de questions"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleRecordScore}
            disabled={isSubmittingScore}
            className="bg-[#2855D9] hover:bg-[#1E40AF] text-white shrink-0 text-xs px-3 sm:px-4"
          >
            {isSubmittingScore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1" />
            )}
            <span>Enregistrer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
