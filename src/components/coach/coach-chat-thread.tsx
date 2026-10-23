"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Brain,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Check,
  Loader2,
  BookOpen,
  HelpCircle,
  Zap,
  Info,
  ExternalLink,
} from "lucide-react";
import type {
  ChatMessage,
  EvidenceCitation,
  ProposedTimeblock,
  ProposedDrillAction,
  CoachingRecommendation,
  PlanTelemetry,
} from "@/lib/ai/types";
import { sendCoachChatMessageAction } from "@/lib/actions/coach-actions";

interface CoachChatThreadProps {
  date: string;
  availableMinutes: number;
  bookedMinutes: number;
  activeTasksCount: number;
  weakestSubjectName?: string;
  freeSlotsCount: number;
  onApplyBlock: (block: ProposedTimeblock) => Promise<{ success: boolean; error?: string }>;
  onStartDrill: (subjectId?: string) => void;
  onOpenScheduleModal: () => void;
  onRefreshContext: () => void;
}

export function CoachChatThread({
  date,
  availableMinutes,
  bookedMinutes,
  activeTasksCount,
  weakestSubjectName,
  freeSlotsCount,
  onApplyBlock,
  onStartDrill,
  onOpenScheduleModal,
  onRefreshContext,
}: CoachChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingBlockId, setApplyingBlockId] = useState<string | null>(null);
  const [appliedBlocks, setAppliedBlocks] = useState<Set<string>>(new Set());
  const [blockError, setBlockError] = useState<{ id: string; msg: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Suggested starter prompts based on actual context
  const suggestedPrompts = [
    {
      title: "Que dois-je étudier aujourd'hui, et pourquoi ?",
      desc: "Analyse d'urgence des tâches, créneaux libres et arbitrage",
      icon: Sparkles,
      color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30",
    },
    {
      title: "Pourquoi considères-tu cela comme mon point faible ?",
      desc: weakestSubjectName
        ? `Justification chiffrée des résultats en ${weakestSubjectName}`
        : "Justification factuelle basée sur vos évaluations",
      icon: Brain,
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Planifie une révision de 30 minutes sur mon sujet le plus fragile.",
      desc: "Allocation d'un créneau sans conflit sur votre temps disponible",
      icon: Calendar,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Fais-moi réviser mes erreurs récurrentes.",
      desc: "Micro-drill ciblé sur vos erreurs passées",
      icon: Zap,
      color: "from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/30",
    },
  ];

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? inputMessage).trim();
    if (!content || isLoading) return;

    setError(null);
    setInputMessage("");

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Map to server action payload
      const historyPayload = newHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await sendCoachChatMessageAction(historyPayload, date);

      if (!res.success || !res.data) {
        throw new Error(res.error || "Le coach n'a pas pu répondre.");
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.data.reply,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        citations: res.data.citations,
        recommendations: res.data.recommendations,
        proposedSchedule: res.data.proposedSchedule,
        proposedDrill: res.data.proposedDrill,
        telemetry: res.data.telemetry,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Erreur lors de la communication avec le Coach.");
    } finally {
      setIsLoading(false);
      // Refocus textarea on desktop
      if (typeof window !== "undefined" && window.innerWidth > 768) {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  };

  // Confirm and apply proposed schedule block
  const handleConfirmBlock = async (block: ProposedTimeblock) => {
    setApplyingBlockId(block.tempId);
    setBlockError(null);
    try {
      const res = await onApplyBlock(block);
      if (res.success) {
        setAppliedBlocks((prev) => new Set(prev).add(block.tempId));
        onRefreshContext();
      } else {
        setBlockError({ id: block.tempId, msg: res.error || "Impossible d'appliquer ce créneau." });
      }
    } catch (err: any) {
      setBlockError({ id: block.tempId, msg: err.message || "Erreur lors de l'application." });
    } finally {
      setApplyingBlockId(null);
    }
  };

  // Keydown handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[750px] bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Thread Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Coach IA & Tuteur Personnel</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Grounded RAG
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Guidé par vos devoirs réels, créneaux d'emploi du temps et historique d'évaluations
            </p>
          </div>
        </div>

        {/* Quick Context Summary Badges */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{Math.floor(availableMinutes / 60)}h{availableMinutes % 60}m libres</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activeTasksCount} tâche(s)</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Empty / Welcome State */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-6 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">
                Bonjour ! Que pouvons-nous optimiser aujourd'hui ?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
                Je suis directement connecté à votre emploi du temps universitaire, vos devoirs à rendre et vos résultats de quiz pour vous conseiller en toute transparence.
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {suggestedPrompts.map((prompt, idx) => {
                const IconComponent = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt.title)}
                    className={`p-3.5 rounded-xl border text-left bg-gradient-to-br ${prompt.color} hover:brightness-125 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-slate-900/40 text-current">
                        <IconComponent className="w-4 h-4" />
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-slate-300" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 group-hover:text-indigo-200 transition-colors">
                        {prompt.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {prompt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Context Verification Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Données d'authentification vérifiées : <strong>{freeSlotsCount} créneau(x) libre(s)</strong> aujourd'hui, <strong>{activeTasksCount} devoir(s)</strong> en cours.
                </span>
              </div>
              <button
                onClick={onRefreshContext}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
              >
                Actualiser
              </button>
            </div>
          </div>
        )}

        {/* Message History */}
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold text-slate-400">
                  {isUser ? "Vous" : "Coach IA"}
                </span>
                <span className="text-[10px] text-slate-500">{message.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-md"
                }`}
              >
                {/* Markdown text parser */}
                <FormattedMessage content={message.content} />

                {/* Evidence Citations Section */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Sources & Données Réelles Utilisées :</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {message.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          title={cite.detail}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-1.5 shadow-sm"
                        >
                          {cite.type === "task" && <BookOpen className="w-3 h-3 text-sky-400" />}
                          {cite.type === "availability" && <Clock className="w-3 h-3 text-emerald-400" />}
                          {cite.type === "assessment" && <Brain className="w-3 h-3 text-amber-400" />}
                          {cite.type === "mistake" && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {cite.type === "calendar" && <Calendar className="w-3 h-3 text-indigo-400" />}
                          <span className="font-medium text-slate-200">{cite.label}</span>
                          <span className="text-slate-500 hidden sm:inline">• {cite.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Proposed Schedule Block Card */}
                {message.proposedSchedule && message.proposedSchedule.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {message.proposedSchedule.map((block) => {
                      const isApplied = appliedBlocks.has(block.tempId);
                      const isApplying = applyingBlockId === block.tempId;
                      const hasError = blockError?.id === block.tempId;

                      return (
                        <div
                          key={block.tempId}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 shadow-lg space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  Créneau Proposé
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {block.date} • {block.startTime} → {block.endTime}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-100">{block.title}</h4>
                            </div>

                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Sans conflit
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400">{block.rationale}</p>

                          {hasError && (
                            <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                              {blockError.msg}
                            </p>
                          )}

                          <div className="pt-1 flex items-center gap-2">
                            {isApplied ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                                <Check className="w-4 h-4" />
                                <span>Ajouté avec succès à votre emploi du temps !</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConfirmBlock(block)}
                                disabled={isApplying}
                                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                              >
                                {isApplying ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Vérification & Ajout...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Confirmer et ajouter au planning</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              onClick={onOpenScheduleModal}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                            >
                              Voir l'agenda complet
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Proposed Drill Card */}
                {message.proposedDrill && (
                  <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-200">
                          Micro-Drill Recommandé ({message.proposedDrill.questionCount} questions)
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400/80 font-medium">
                        Matière : {message.proposedDrill.subjectName}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      {message.proposedDrill.reason || "Ciblé sur vos erreurs pour consolider votre mémoire."}
                    </p>

                    <button
                      onClick={() => onStartDrill(message.proposedDrill?.subjectId)}
                      className="mt-1 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Lancer le micro-quiz maintenant</span>
                    </button>
                  </div>
                )}

                {/* Telemetry info */}
                {message.telemetry && (
                  <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-2">
                    <span>
                      Généré en {message.telemetry.latencyMs}ms ({message.telemetry.provider})
                    </span>
                    {message.telemetry.isFallback && (
                      <span className="text-amber-500/80">• Mode résilient déterministe</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Le Coach analyse votre emploi du temps et vos performances...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when chat has messages) */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Suggestions :
          </span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.title)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700/60 text-[11px] text-slate-300 whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer"
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input Area */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90">
        <div className="relative flex items-center gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question sur vos révisions, créneaux ou points faibles... (Entrée pour envoyer)"
            disabled={isLoading}
            className="w-full resize-none rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50 pr-12 min-h-[46px] max-h-[120px]"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-30 disabled:hover:bg-indigo-600 cursor-pointer shadow-md shadow-indigo-600/20"
            title="Envoyer le message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
          <span>Touche <strong>Entrée</strong> pour envoyer • <strong>Maj+Entrée</strong> pour sauter une ligne</span>
          <span className="hidden sm:inline">Réponses fondées sur vos données académiques réelles</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight, safe Markdown renderer for Coach answers
 */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // H3 Header
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-indigo-300 mt-2 mb-1">
              {line.replace("### ", "")}
            </h3>
          );
        }

        // H2 Header
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-bold text-indigo-200 mt-2 mb-1">
              {line.replace("## ", "")}
            </h2>
          );
        }

        // Bullet point
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="text-indigo-400 mt-1">•</span>
              <span className="flex-1">
                <InlineFormatting text={line.slice(2)} />
              </span>
            </div>
          );
        }

        // Numbered list item (e.g. "1. ")
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-1">
              <span className="font-semibold text-indigo-400 min-w-[16px]">{numMatch[1]}.</span>
              <span className="flex-1">
                <InlineFormatting text={numMatch[2]} />
              </span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx}>
            <InlineFormatting text={line} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses bold (**text**), inline code (`code`), and italics (*text*)
 */
function InlineFormatting({ text }: { text: string }) {
  // Split on bold, code, and links
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-slate-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className="italic text-slate-300">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
