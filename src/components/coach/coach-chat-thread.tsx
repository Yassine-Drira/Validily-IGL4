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
  Flame,
  CheckCheck,
  TrendingUp,
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll inside container only on new message without moving the window
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  // Suggested starter prompts with luxury cards
  const suggestedPrompts = [
    {
      title: "Que dois-je étudier aujourd'hui, et pourquoi ?",
      desc: "Arbitrage stratégique basé sur vos échéances, charge mentale et créneaux libres",
      icon: Sparkles,
      gradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
      accent: "text-indigo-300",
      border: "border-indigo-500/30 hover:border-indigo-400/60",
    },
    {
      title: "Pourquoi considères-tu cela comme mon point faible ?",
      desc: weakestSubjectName
        ? `Audit mémoriel chiffré des résultats en ${weakestSubjectName}`
        : "Diagnostic factuel selon la courbe d'oubli d'Ebbinghaus",
      icon: Brain,
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      accent: "text-amber-300",
      border: "border-amber-500/30 hover:border-amber-400/60",
    },
    {
      title: "Planifie une révision de 30 minutes sur mon sujet le plus fragile.",
      desc: "Allocation d'un créneau certifié sans chevauchement sur votre temps disponible",
      icon: Calendar,
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      accent: "text-emerald-300",
      border: "border-emerald-500/30 hover:border-emerald-400/60",
    },
    {
      title: "Fais-moi réviser mes erreurs récurrentes.",
      desc: "Micro-drill adaptatif de 3 questions pour stabiliser vos ancrages réflexes",
      icon: Zap,
      gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
      accent: "text-cyan-300",
      border: "border-cyan-500/30 hover:border-cyan-400/60",
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
      setError(err.message || "Erreur de liaison avec le Coach.");
    } finally {
      setIsLoading(false);
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
        setBlockError({ id: block.tempId, msg: res.error || "Impossible d'inscrire ce créneau." });
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
    <div className="flex flex-col h-[780px] luxury-glass rounded-3xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Thread Header - Executive Cockpit Bar */}
      <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between bg-slate-950/40 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">Validily AI</h2>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Tuteur & Architecte Pédagogique
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Conseiller stratégique certifié • Synthèse RAG en temps réel de votre cursus IGL4
            </p>
          </div>
        </div>

        {/* Live Context Indicators */}
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-slate-300 text-xs flex items-center gap-2 shadow-sm backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-tabular font-medium">
              {Math.floor(availableMinutes / 60)}h{availableMinutes % 60}m disponibles
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-slate-300 text-xs flex items-center gap-2 shadow-sm backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-tabular font-medium">{activeTasksCount} devoirs</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 relative z-10 touch-scroll"
      >
        {/* Empty / Welcome State with Luxury Aesthetics */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fadeIn">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] text-indigo-300 mb-1">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">
                Prêt pour votre prochaine session d'excellence ?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
                Je suis directement synchronisé avec votre emploi du temps universitaire, vos devoirs à rendre et vos résultats d'évaluations pour arbitrer vos priorités sans aucune complaisance.
              </p>
            </div>

            {/* Suggested Starter Prompt Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {suggestedPrompts.map((prompt, idx) => {
                const IconComponent = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt.title)}
                    className={`p-4 rounded-2xl border text-left bg-gradient-to-br ${prompt.gradient} ${prompt.border} bg-slate-900/50 backdrop-blur-md hover:bg-slate-800/60 hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-lg`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`p-2 rounded-xl bg-slate-950/60 border border-white/10 ${prompt.accent}`}>
                        <IconComponent className="w-4 h-4" />
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
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
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.08] text-slate-300 text-xs flex items-center justify-between gap-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Données académiques certifiées</span>
                  <p className="text-[11px] text-slate-400">
                    {freeSlotsCount} créneau(x) libre(s) aujourd'hui • {activeTasksCount} devoir(s) en cours de suivi
                  </p>
                </div>
              </div>
              <button
                onClick={onRefreshContext}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] font-semibold text-indigo-300 transition-colors shrink-0"
              >
                Actualiser le contexte
              </button>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2 animate-fadeIn`}
            >
              {/* Message Label */}
              <div className="flex items-center gap-2 px-1 text-[11px]">
                <span className="font-semibold text-slate-400">
                  {isUser ? "Vous" : "Validily AI"}
                </span>
                <span className="text-slate-600 font-tabular">• {message.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-5 text-xs sm:text-sm leading-relaxed transition-all ${
                  isUser
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white rounded-tr-sm shadow-[0_8px_25px_rgba(79,70,229,0.3)] border border-white/20"
                    : "luxury-card text-slate-200 rounded-tl-sm border border-white/[0.08] shadow-2xl backdrop-blur-2xl"
                }`}
              >
                {/* Formatted Content */}
                <FormattedMessage content={message.content} />

                {/* Evidence Citations Bar */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-white/[0.08] space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="uppercase tracking-wider">Données & Preuves Réelles :</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          title={cite.detail}
                          className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-[11px] text-slate-200 flex items-center gap-2 shadow-sm"
                        >
                          {cite.type === "task" && <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          {cite.type === "availability" && <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {cite.type === "assessment" && <Brain className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          {cite.type === "mistake" && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          {cite.type === "calendar" && <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          <span className="font-semibold text-white">{cite.label}</span>
                          <span className="text-slate-400 hidden sm:inline">• {cite.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Proposed Schedule Timeblock Card */}
                {message.proposedSchedule && message.proposedSchedule.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {message.proposedSchedule.map((block) => {
                      const isApplied = appliedBlocks.has(block.tempId);
                      const isApplying = applyingBlockId === block.tempId;
                      const hasError = blockError?.id === block.tempId;

                      return (
                        <div
                          key={block.tempId}
                          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950/70 to-slate-900/60 border border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-3 relative overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                  Créneau Proposé
                                </span>
                                <span className="text-xs font-tabular font-bold text-slate-300">
                                  {block.date} • {block.startTime} → {block.endTime}
                                </span>
                              </div>
                              <h4 className="text-sm font-extrabold text-white tracking-tight">
                                {block.title}
                              </h4>
                            </div>

                            <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Sans conflit d'agenda
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {block.rationale}
                          </p>

                          {hasError && (
                            <p className="text-[11px] text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                              {blockError.msg}
                            </p>
                          )}

                          <div className="pt-2 flex flex-wrap items-center gap-3">
                            {isApplied ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-4 py-2.5 rounded-xl shadow-lg">
                                <CheckCheck className="w-4 h-4 text-emerald-400" />
                                <span>Inscrit avec succès à votre emploi du temps !</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConfirmBlock(block)}
                                disabled={isApplying}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:brightness-110 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                              >
                                {isApplying ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Vérification & Inscription...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Confirmer et inscrire à l'agenda</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              onClick={onOpenScheduleModal}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors border border-white/10"
                            >
                              Comparer avec le calendrier
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Proposed Drill Card */}
                {message.proposedDrill && (
                  <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-950/70 to-orange-950/30 border border-amber-500/40 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-extrabold text-amber-100">
                            Micro-Drill Adaptatif ({message.proposedDrill.questionCount} questions)
                          </span>
                          <p className="text-[10px] text-amber-400 font-medium">
                            Discipline ciblée : {message.proposedDrill.subjectName}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        ~3 minutes
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {message.proposedDrill.reason || "Ciblé sur vos erreurs pour consolider votre mémoire à long terme."}
                    </p>

                    <button
                      onClick={() => onStartDrill(message.proposedDrill?.subjectId)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Lancer le micro-drill maintenant</span>
                    </button>
                  </div>
                )}

                {/* Telemetry info */}
                {message.telemetry && (
                  <div className="mt-3.5 text-[10px] text-slate-500 flex items-center gap-2">
                    <span className="font-tabular">
                      Généré en {message.telemetry.latencyMs}ms ({message.telemetry.provider})
                    </span>
                    {message.telemetry.isFallback && (
                      <span className="text-amber-400/90">• Mode déterministe certifié</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator with Luxury Shimmer */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/20">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-3xl rounded-tl-sm luxury-card border border-white/10 text-xs text-slate-300 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Validily AI analyse vos documents et données académiques en temps réel...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when chat has messages) */}
      {messages.length > 0 && (
        <div className="px-6 py-2.5 border-t border-white/[0.06] bg-slate-950/60 backdrop-blur-md flex items-center gap-2 overflow-x-auto touch-scroll">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Suggestions :
          </span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.title)}
              disabled={isLoading}
              className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-white/[0.08] text-[11px] text-slate-300 whitespace-nowrap transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input Area with Luxury Glass Styling */}
      <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-slate-950/80 backdrop-blur-xl relative z-10">
        <div className="relative flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500/30 rounded-2xl transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question sur vos devoirs, créneaux ou points faibles... (Entrée pour envoyer)"
            disabled={isLoading}
            className="w-full resize-none rounded-2xl bg-slate-900/90 border border-white/10 px-5 py-3.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all disabled:opacity-50 pr-14 min-h-[50px] max-h-[140px] shadow-inner"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold transition-all disabled:opacity-30 disabled:hover:brightness-100 cursor-pointer shadow-lg shadow-indigo-600/30"
            title="Envoyer le message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2.5 px-2 text-[10px] text-slate-500 font-medium">
          <span>
            Touche <strong className="text-slate-400">Entrée</strong> pour envoyer • <strong className="text-slate-400">Maj+Entrée</strong> pour nouvelle ligne
          </span>
          <span className="hidden sm:inline text-indigo-400/80">
            ✓ Réponses déterministes vérifiées sur vos bases de données
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Safe, high-end Markdown & Typography Renderer for Coach answers
 */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // H3 Header
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-extrabold text-indigo-200 mt-3 mb-1 tracking-tight flex items-center gap-1.5">
              {line.replace("### ", "")}
            </h3>
          );
        }

        // H2 Header
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-extrabold text-white mt-3 mb-1 tracking-tight">
              {line.replace("## ", "")}
            </h2>
          );
        }

        // Bullet point
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-2">
              <span className="text-indigo-400 mt-1 text-xs">•</span>
              <span className="flex-1 text-slate-300">
                <InlineFormatting text={line.slice(2)} />
              </span>
            </div>
          );
        }

        // Numbered list item
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-1">
              <span className="font-bold text-indigo-400 min-w-[18px] font-tabular">{numMatch[1]}.</span>
              <span className="flex-1 text-slate-300">
                <InlineFormatting text={numMatch[2]} />
              </span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-slate-200">
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
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded-md bg-slate-950 border border-white/10 text-indigo-300 font-mono text-[11px]"
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
