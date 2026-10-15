"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  FileEdit,
  Bookmark,
  Share2,
  Trash2,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Upload,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateResourceVisibility } from "@/lib/actions/resource-actions";
import { updateNote } from "@/lib/actions/note-actions";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface StudentPrivateWorkspaceProps {
  user: {
    id: string;
    email?: string;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  isGuest: boolean;
  quizAttempts: any[];
  mistakes: any[];
  privateNotes: any[];
  privateResources: any[];
  bookmarkedCount: number;
}

export function StudentPrivateWorkspace({
  user,
  isGuest,
  quizAttempts: initialQuizAttempts,
  mistakes: initialMistakes,
  privateNotes: initialPrivateNotes,
  privateResources: initialPrivateResources,
  bookmarkedCount,
}: StudentPrivateWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"continuity" | "notes" | "files" | "settings">("continuity");
  const [privateNotes, setPrivateNotes] = useState(initialPrivateNotes);
  const [privateResources, setPrivateResources] = useState(initialPrivateResources);
  const [feedback, setFeedback] = useState<string>("");
  const [resourceToShare, setResourceToShare] = useState<any | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  };

  const handleShareResource = async (res: any) => {
    const newVisibility = res.visibility === "shared" ? "private" : "shared";
    const result = await updateResourceVisibility(res.id, newVisibility);
    if (result.success) {
      setPrivateResources((prev) =>
        prev.map((r) => (r.id === res.id ? { ...r, visibility: newVisibility } : r))
      );
      showFeedback(
        newVisibility === "shared"
          ? `"${res.title}" est désormais partagé avec votre promotion !`
          : `"${res.title}" est de nouveau privé.`
      );
    } else {
      alert(result.error || "Impossible de modifier la visibilité.");
    }
  };

  const handleShareNote = async (note: any) => {
    const newVis = note.visibility === "public" ? "private" : "public";
    const result = await updateNote(note.id, { visibility: newVis });
    if (result.success) {
      setPrivateNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, visibility: newVis } : n))
      );
      showFeedback(
        newVis === "public"
          ? `Fiche mémo "${note.title}" rendue accessible à la promotion.`
          : `Fiche mémo "${note.title}" repassée en privé.`
      );
    }
  };

  // Compute actual metrics
  const totalQuizzes = initialQuizAttempts.length;
  const averageScore = totalQuizzes > 0
    ? Math.round(
        (initialQuizAttempts.reduce((acc, q) => acc + (q.score / (q.total_questions || 1)), 0) /
          totalQuizzes) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Guest Warning Banner if anonymous */}
      {isGuest && (
        <div className="bg-[#FAFBFD] border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2855D9] flex items-center justify-center shrink-0 border border-blue-100">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#111A2E]">
                Mode Invité Activé (Stockage local sur cet appareil)
              </h4>
              <p className="text-xs text-[#68748A] mt-0.5">
                Vos quiz et favoris sont calculés sur votre navigateur. Connectez-vous pour synchroniser votre espace étudiant sur mobile et PC.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link href="/login">
              <Button size="sm" variant="primary" className="text-xs">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" variant="outline" className="text-xs">
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Student Identity Card */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] font-serif font-bold text-xl flex items-center justify-center shadow-xs">
            {user?.display_name
              ? user.display_name.slice(0, 2).toUpperCase()
              : isGuest
              ? "INV"
              : "ET"}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-serif font-bold text-[#111A2E] tracking-tight">
                {user?.display_name || (isGuest ? "Étudiant Invité" : "Espace Étudiant")}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FAFAF7] border border-[#E4E8F0] text-[#68748A]">
                {isGuest ? "Session Locale" : "IGL4 - Promo 2026"}
              </span>
            </div>
            <p className="text-xs text-[#68748A] mt-0.5">
              {user?.email || "Consultez vos révisions, documents personnels et suivi d'erreurs."}
            </p>
          </div>
        </div>

        {/* Real Stats Cards */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[90px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Quiz Passés</div>
            <div className="text-lg font-bold font-mono text-[#111A2E] mt-0.5">{totalQuizzes}</div>
          </div>
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[90px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Moyenne</div>
            <div className="text-lg font-bold font-mono text-[#2855D9] mt-0.5">{averageScore}%</div>
          </div>
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[90px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Favoris</div>
            <div className="text-lg font-bold font-mono text-[#111A2E] mt-0.5">{bookmarkedCount}</div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-[#E4E8F0] pb-2 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab("continuity")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === "continuity"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Continuité & Erreurs ({initialMistakes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === "notes"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
          }`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>Mes Fiches Privées ({privateNotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === "files"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Mes Documents Privés ({privateResources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:text-[#111A2E] hover:bg-[#F4F6FA]"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profil & Préférences</span>
        </button>
      </div>

      {/* TAB 1: CONTINUITY & MISTAKE TRACKER */}
      {activeTab === "continuity" && (
        <div className="space-y-6">
          {/* Recent Quiz Attempts */}
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#111A2E]">
                  Historique Récent des Quiz
                </h3>
                <p className="text-xs text-[#68748A]">
                  Vos derniers ateliers et scores validés.
                </p>
              </div>
              <Link href="/quizzes">
                <Button size="sm" variant="outline" className="text-xs">
                  <span>Tous les quiz</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>

            {initialQuizAttempts.length > 0 ? (
              <div className="divide-y divide-[#F1F4F9]">
                {initialQuizAttempts.map((attempt: any) => {
                  const pct = Math.round((attempt.score / (attempt.total_questions || 1)) * 100);
                  return (
                    <div key={attempt.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#111A2E] truncate">
                          {attempt.quiz?.title || "Quiz"}
                        </h4>
                        <div className="text-[11px] text-[#68748A] flex items-center space-x-2 mt-0.5">
                          <span>{attempt.quiz?.subject?.name || "Matière"}</span>
                          <span>•</span>
                          <span>{new Date(attempt.completed_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                          pct >= 70
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : pct >= 50
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}>
                          {attempt.score}/{attempt.total_questions} ({pct}%)
                        </span>
                        {attempt.quiz_id && (
                          <Link href={`/quizzes/${attempt.quiz_id}`}>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              <RotateCcw className="w-3 h-3 mr-1" />
                              <span>Recommencer</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#CBD5E1] text-xs text-[#68748A]">
                Aucun quiz encore complété. Lancez votre premier atelier interactif pour démarrer votre suivi de maîtrise !
              </div>
            )}
          </div>

          {/* Carnet d'Erreurs (Mistake Tracker) */}
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>Carnet d'Erreurs Ciblées ({initialMistakes.length})</span>
                </h3>
                <p className="text-xs text-[#68748A]">
                  Questions manquées lors de vos dernières sessions pour révision prioritaire.
                </p>
              </div>
            </div>

            {initialMistakes.length > 0 ? (
              <div className="space-y-3">
                {initialMistakes.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="bg-[#FAFBFD] border border-rose-100 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-[#111A2E]">
                        {item.question?.question_text || "Question"}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        À revoir
                      </span>
                    </div>

                    {item.question?.explanation && (
                      <div className="bg-white p-2.5 rounded-lg border border-[#E4E8F0] text-[11px] text-[#475569] leading-relaxed">
                        <strong className="text-[#2855D9]">Explication : </strong>
                        {item.question.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Excellent travail ! Aucune erreur en attente de révision dans vos récents quiz.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRIVATE NOTES & CHEAT SHEETS */}
      {activeTab === "notes" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">
                Fiches Mémo & Notes Personnelles
              </h3>
              <p className="text-xs text-[#68748A]">
                Vos synthèses rédigées. Choisissez de les garder privées ou de les partager avec la promo.
              </p>
            </div>
            <Link href="/notes">
              <Button size="sm" variant="primary" className="text-xs">
                + Nouvelle fiche
              </Button>
            </Link>
          </div>

          {privateNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {privateNotes.map((note) => (
                <div key={note.id} className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#E4E8F0] text-[#68748A]">
                        {note.subject?.name || "Général"}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        note.visibility === "public"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}>
                        {note.visibility === "public" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{note.visibility === "public" ? "Partagée" : "Privée"}</span>
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-[#111A2E]">{note.title}</h4>
                    <p className="text-xs text-[#68748A] mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E4E8F0] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#68748A] font-mono">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleShareNote(note)}
                      className="h-7 text-xs"
                    >
                      <Share2 className="w-3 h-3 mr-1" />
                      <span>{note.visibility === "public" ? "Rendre Privée" : "Partager"}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#CBD5E1] text-xs text-[#68748A]">
              Aucune fiche mémo encore enregistrée. Créez des formules, synthèses ou pièges d'examen pour vos révisions !
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRIVATE DOCUMENTS & RESOURCES */}
      {activeTab === "files" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">
                Documents Personnels Uploadés
              </h3>
              <p className="text-xs text-[#68748A]">
                Vos PDFs et liens Drive stockés de manière sécurisée.
              </p>
            </div>
            <Link href="/library?action=upload">
              <Button size="sm" variant="primary" className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1" />
                <span>Téléverser</span>
              </Button>
            </Link>
          </div>

          {privateResources.length > 0 ? (
            <div className="divide-y divide-[#F1F4F9]">
              {privateResources.map((res) => (
                <div key={res.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#111A2E] truncate">
                      {res.title}
                    </h4>
                    <div className="text-[11px] text-[#68748A] flex items-center space-x-2 mt-0.5">
                      <span>{res.subject?.name || "Matière"}</span>
                      <span>•</span>
                      <span>{res.mime_type?.includes("pdf") ? "PDF" : "Document"}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      res.visibility === "shared"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-stone-100 text-stone-600 border border-stone-200"
                    }`}>
                      {res.visibility === "shared" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{res.visibility === "shared" ? "Partagé" : "Privé"}</span>
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleShareResource(res)}
                      className="h-7 text-xs"
                    >
                      <Share2 className="w-3 h-3 mr-1" />
                      <span>{res.visibility === "shared" ? "Rendre Privé" : "Partager"}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#CBD5E1] text-xs text-[#68748A]">
              Aucun fichier privé. Vos cours officiels sont disponibles dans la Bibliothèque partagée.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS & PREFERENCES */}
      {activeTab === "settings" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs max-w-xl space-y-5">
          <div>
            <h3 className="font-bold text-sm text-[#111A2E]">
              Préférences du Compte Étudiant
            </h3>
            <p className="text-xs text-[#68748A]">
              Gérez votre identité et vos paramètres d'affichage.
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#111A2E] mb-1">
                Nom d'affichage
              </label>
              <input
                type="text"
                disabled={isGuest}
                defaultValue={user?.display_name || (isGuest ? "Invité" : "")}
                className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#111A2E] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111A2E] mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                disabled
                defaultValue={user?.email || "Non connecté"}
                className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#68748A]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111A2E] mb-1">
                Parcours Académique
              </label>
              <input
                type="text"
                disabled
                defaultValue="IGL4 — Génie Logiciel"
                className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl px-3 py-2 text-[#68748A]"
              />
            </div>

            <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between">
              {isGuest ? (
                <Link href="/login">
                  <Button size="sm" variant="primary" className="text-xs">
                    Créer mon profil permanent
                  </Button>
                </Link>
              ) : (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Profil synchronisé avec la base Supabase</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
