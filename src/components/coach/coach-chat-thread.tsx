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
  Copy,
} from "lucide-react";
import type {
  ChatMessage,
  EvidenceCitation,
  ProposedTimeblock,
  ProposedDrillAction,
  CoachingRecommendation,
  PlanTelemetry,
} from "@/lib/ai/types";
import {
  sendCoachChatMessageAction,
  sendCoachConversationMessageAction,
  getCoachConversationMessagesAction,
  createCoachConversationAction,
} from "@/lib/actions/coach-actions";

interface CoachChatThreadProps {
  date: string;
  availableMinutes: number;
  bookedMinutes: number;
  activeTasksCount: number;
  weakestSubjectName?: string;
  freeSlotsCount: number;
  activeConversationId?: string | null;
  conversationTitle?: string;
  onConversationCreated?: (newId: string) => void;
  onToggleSidebar?: () => void;
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
  activeConversationId,
  conversationTitle,
  onConversationCreated,
  onToggleSidebar,
  onApplyBlock,
  onStartDrill,
  onOpenScheduleModal,
  onRefreshContext,
}: CoachChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingBlockId, setApplyingBlockId] = useState<string | null>(null);
  const [appliedBlocks, setAppliedBlocks] = useState<Set<string>>(new Set());
  const [blockError, setBlockError] = useState<{ id: string; msg: string } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load thread messages whenever activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    let isMounted = true;
    const loadThread = async () => {
      setIsLoadingThread(true);
      try {
        const res = await getCoachConversationMessagesAction(activeConversationId);
        if (isMounted && res.success && res.data) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error("Error loading conversation messages:", err);
      } finally {
        if (isMounted) setIsLoadingThread(false);
      }
    };
    loadThread();
    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  // Auto-scroll inside container only on new message without moving the window
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  // Handle clipboard copy
  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  // Suggested starter prompts with luxury cards
  const suggestedPrompts = [
    {
      title: "Que dois-je étudier aujourd'hui, et pourquoi ?",
      desc: "Arbitrage stratégique basé sur vos échéances, charge mentale et créneaux libres",
      icon: Sparkles,
      gradient: "from-blue-50/80 to-indigo-50/40",
      accent: "text-[#2855D9]",
      border: "border-[#E4E8F0] hover:border-[#2855D9]",
    },
    {
      title: "Pourquoi considères-tu cela comme mon point faible ?",
      desc: weakestSubjectName
        ? `Audit mémoriel chiffré des résultats en ${weakestSubjectName}`
        : "Diagnostic factuel selon la courbe d'oubli d'Ebbinghaus",
      icon: Brain,
      gradient: "from-amber-50/80 to-orange-50/40",
      accent: "text-amber-600",
      border: "border-[#E4E8F0] hover:border-amber-400",
    },
    {
      title: "Planifie une révision de 30 minutes sur mon sujet le plus fragile.",
      desc: "Allocation d'un créneau certifié sans chevauchement sur votre temps disponible",
      icon: Calendar,
      gradient: "from-emerald-50/80 to-teal-50/40",
      accent: "text-[#059669]",
      border: "border-[#E4E8F0] hover:border-emerald-400",
    },
    {
      title: "Fais-moi réviser mes erreurs récurrentes.",
      desc: "Micro-drill adaptatif de 3 questions pour stabiliser vos ancrages réflexes",
      icon: Zap,
      gradient: "from-purple-50/80 to-indigo-50/40",
      accent: "text-purple-600",
      border: "border-[#E4E8F0] hover:border-purple-400",
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
      let targetConvoId = activeConversationId;
      if (!targetConvoId) {
        const createRes = await createCoachConversationAction();
        if (createRes.success && createRes.data) {
          targetConvoId = createRes.data.id;
          onConversationCreated?.(targetConvoId);
        }
      }

      if (targetConvoId) {
        const convoRes = await sendCoachConversationMessageAction({
          conversationId: targetConvoId,
          content,
          targetDate: date,
        });

        if (convoRes.success && convoRes.data) {
          setMessages((prev) => [
            ...prev.slice(0, prev.length - 1),
            convoRes.data!.userMessage,
            convoRes.data!.assistantMessage,
          ]);
          onRefreshContext?.();
          return;
        } else if (convoRes.error) {
          throw new Error(convoRes.error);
        }
      }

      // Resilient fallback to sendCoachChatMessageAction
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
    <div className="flex flex-col h-[780px] bg-white rounded-3xl border border-[#E4E8F0] shadow-xs relative overflow-hidden">
      {/* Subtle luminous background wash */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Sidebar Toggle */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E8F0] bg-white/90 backdrop-blur-xs relative z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EDF2FF] text-[#68748A] hover:text-[#2855D9] border border-[#E4E8F0] hover:border-[#2855D9]/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
              title="Historique des discussions"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold hidden sm:inline">Historique</span>
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold text-[#111A2E] truncate">
              {conversationTitle || "Dialogue Interactif"}
            </h3>
            {messages.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#68748A] border border-[#E4E8F0] shrink-0 font-mono">
                {messages.length} msg
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setMessages([]);
              onConversationCreated?.("");
            }}
            className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-[#68748A] hover:text-[#111A2E] hover:bg-[#F8FAFC] border border-transparent hover:border-[#E4E8F0] transition-all cursor-pointer flex items-center gap-1.5"
            title="Démarrer une nouvelle discussion vierge"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nouveau dialogue</span>
          </button>
        </div>
      </div>



      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 relative z-10 touch-scroll"
      >
        {/* Empty / Welcome State with Light Luxury Aesthetics */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fadeIn">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] shadow-2xs mb-1">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-[#111A2E]">
                Prêt pour votre prochaine session d'excellence ?
              </h3>
              <p className="text-xs sm:text-sm text-[#68748A] leading-relaxed max-w-lg mx-auto">
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
                    className={`p-4 rounded-2xl border text-left bg-gradient-to-br ${prompt.gradient} ${prompt.border} hover:bg-white hover:shadow-xs transition-all duration-150 flex flex-col justify-between group cursor-pointer shadow-2xs`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`p-2 rounded-xl bg-white border border-[#E4E8F0] shadow-2xs ${prompt.accent}`}>
                        <IconComponent className="w-4 h-4" />
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#2855D9]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                        {prompt.title}
                      </p>
                      <p className="text-[11px] text-[#68748A] mt-1 leading-snug">
                        {prompt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Context Verification Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] text-[#182235] text-xs flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-[#111A2E]">Données académiques certifiées</span>
                  <p className="text-[11px] text-[#68748A]">
                    {freeSlotsCount} créneau(x) libre(s) aujourd'hui • {activeTasksCount} devoir(s) en cours de suivi
                  </p>
                </div>
              </div>
              <button
                onClick={onRefreshContext}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E4E8F0] text-[11px] font-semibold text-[#2855D9] transition-colors shrink-0 shadow-2xs"
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
                <span className={`font-semibold ${isUser ? "text-[#68748A]" : "text-[#2855D9]"}`}>
                  {isUser ? "Vous" : "Validily AI"}
                </span>
                <span className="text-[#94A3B8] font-tabular">• {message.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-5 text-xs sm:text-sm leading-relaxed transition-all ${
                  isUser
                    ? "bg-[#2855D9] text-white rounded-tr-xs shadow-xs"
                    : "bg-[#F8FAFC] text-[#182235] rounded-tl-xs border border-[#E4E8F0] shadow-2xs"
                }`}
              >
                {/* Formatted Content */}
                <FormattedMessage content={message.content} isUser={isUser} />

                {/* Evidence Citations Bar */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-[#E4E8F0] space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#2855D9]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2855D9]" />
                      <span className="uppercase tracking-wider">Données & Preuves Réelles :</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          title={cite.detail}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#E4E8F0] text-[11px] text-[#182235] flex items-center gap-2 shadow-2xs"
                        >
                          {cite.type === "task" && <BookOpen className="w-3.5 h-3.5 text-[#2855D9] shrink-0" />}
                          {cite.type === "availability" && <Clock className="w-3.5 h-3.5 text-[#059669] shrink-0" />}
                          {cite.type === "assessment" && <Brain className="w-3.5 h-3.5 text-[#D97706] shrink-0" />}
                          {cite.type === "mistake" && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          {cite.type === "calendar" && <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          <span className="font-semibold text-[#111A2E]">{cite.label}</span>
                          <span className="text-[#68748A] hidden sm:inline">• {cite.detail}</span>
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
                          className="p-4 sm:p-5 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-3 relative overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#EDF2FF] text-[#2855D9] border border-[#2855D9]/20 font-mono">
                                  Créneau Proposé
                                </span>
                                <span className="text-xs font-tabular font-bold text-[#111A2E]">
                                  {block.date} • {block.startTime} → {block.endTime}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-[#111A2E] tracking-tight">
                                {block.title}
                              </h4>
                            </div>

                            <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Sans conflit d'agenda
                            </span>
                          </div>

                          <p className="text-[12px] text-[#68748A] leading-relaxed">
                            {block.rationale}
                          </p>

                          {hasError && (
                            <p className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                              {blockError.msg}
                            </p>
                          )}

                          <div className="pt-2 flex flex-wrap items-center gap-3">
                            {isApplied ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl shadow-2xs">
                                <CheckCheck className="w-4 h-4 text-emerald-600" />
                                <span>Inscrit avec succès à votre emploi du temps !</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConfirmBlock(block)}
                                disabled={isApplying}
                                className="px-4 py-2.5 rounded-xl bg-[#2855D9] hover:bg-[#1E42B0] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
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
                              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#111A2E] font-medium text-xs transition-colors border border-[#E4E8F0] shadow-2xs"
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
                  <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-[#111A2E]">
                            Micro-Drill Adaptatif ({message.proposedDrill.questionCount} questions)
                          </span>
                          <p className="text-[11px] text-amber-700 font-medium">
                            Discipline ciblée : {message.proposedDrill.subjectName}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        ~3 minutes
                      </span>
                    </div>

                    <p className="text-[12px] text-[#68748A] leading-relaxed">
                      {message.proposedDrill.reason || "Ciblé sur vos erreurs pour consolider votre mémoire à long terme."}
                    </p>

                    <button
                      onClick={() => onStartDrill(message.proposedDrill?.subjectId)}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Lancer le micro-drill maintenant</span>
                    </button>
                  </div>
                )}

                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-[#E4E8F0] flex items-center justify-between text-[11px] text-[#68748A]">
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="inline-flex items-center gap-1.5 hover:text-[#2855D9] transition-colors cursor-pointer font-medium"
                      title="Copier la réponse"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                    {message.telemetry && (
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {message.telemetry.model || "Validily AI"} • {message.telemetry.latencyMs}ms
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9] shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-[#E4E8F0] text-xs text-[#68748A] flex items-center gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#2855D9] animate-pulse" />
              <span>Validily AI analyse vos documents et données académiques en temps réel...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
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
        <div className="px-6 py-2.5 border-t border-[#E4E8F0] bg-[#FAFBFD] flex items-center gap-2 overflow-x-auto touch-scroll">
          <span className="text-[10px] uppercase font-bold text-[#68748A] shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#2855D9]" />
            Suggestions :
          </span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.title)}
              disabled={isLoading}
              className="px-3 py-1 rounded-full bg-white hover:bg-[#EDF2FF] hover:text-[#2855D9] hover:border-[#2855D9]/30 border border-[#E4E8F0] text-[11px] text-[#182235] whitespace-nowrap transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input Area */}
      <div className="p-4 sm:p-5 border-t border-[#E4E8F0] bg-white relative z-10">
        <div className="relative flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#2855D9]/20 rounded-2xl transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question sur vos devoirs, créneaux ou points faibles... (Entrée pour envoyer)"
            disabled={isLoading}
            className="w-full resize-none rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] px-5 py-3.5 text-xs sm:text-sm text-[#182235] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2855D9] transition-all disabled:opacity-50 pr-14 min-h-[50px] max-h-[140px]"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-2.5 px-3.5 py-2.5 rounded-xl bg-[#2855D9] hover:bg-[#1E42B0] text-white font-bold transition-all disabled:opacity-30 cursor-pointer shadow-xs"
            title="Envoyer le message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2.5 px-2 text-[10px] text-[#94A3B8] font-medium">
          <span>
            Touche <strong className="text-[#68748A]">Entrée</strong> pour envoyer • <strong className="text-[#68748A]">Maj+Entrée</strong> pour nouvelle ligne
          </span>
          <span className="hidden sm:inline text-[#059669] font-medium">
            ✓ Synchronisé avec vos cours, devoirs et agenda universitaire
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * High-end Markdown & Typography Renderer for Coach answers
 */
function FormattedMessage({ content, isUser = false }: { content: string; isUser?: boolean }) {
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
            <h3 key={idx} className={`text-sm font-bold mt-3 mb-1 tracking-tight flex items-center gap-1.5 ${isUser ? "text-white" : "text-[#2855D9]"}`}>
              {line.replace("### ", "")}
            </h3>
          );
        }

        // H2 Header
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className={`text-base font-bold mt-3 mb-1 tracking-tight ${isUser ? "text-white" : "text-[#111A2E]"}`}>
              {line.replace("## ", "")}
            </h2>
          );
        }

        // Bullet point
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-2">
              <span className={`mt-1 text-xs ${isUser ? "text-white/80" : "text-[#2855D9]"}`}>•</span>
              <span className={`flex-1 ${isUser ? "text-white/95" : "text-[#182235]"}`}>
                <InlineFormatting text={line.slice(2)} isUser={isUser} />
              </span>
            </div>
          );
        }

        // Numbered list item
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-1">
              <span className={`font-bold min-w-[18px] font-tabular ${isUser ? "text-white" : "text-[#2855D9]"}`}>{numMatch[1]}.</span>
              <span className={`flex-1 ${isUser ? "text-white/95" : "text-[#182235]"}`}>
                <InlineFormatting text={numMatch[2]} isUser={isUser} />
              </span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className={isUser ? "text-white" : "text-[#182235]"}>
            <InlineFormatting text={line} isUser={isUser} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses bold (**text**), inline code (`code`), and italics (*text*)
 */
function InlineFormatting({ text, isUser = false }: { text: string; isUser?: boolean }) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className={`font-bold ${isUser ? "text-white" : "text-[#111A2E]"}`}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] ${
                isUser
                  ? "bg-white/20 text-white"
                  : "bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9]"
              }`}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className={`italic ${isUser ? "text-white/80" : "text-[#68748A]"}`}>
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
