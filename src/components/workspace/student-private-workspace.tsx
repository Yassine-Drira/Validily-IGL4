"use client";

import React, { useState } from "react";
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
  Camera,
  ExternalLink,
  Eye,
  Activity,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateResourceVisibility, deleteResource } from "@/lib/actions/resource-actions";
import { updateNote, deleteNote } from "@/lib/actions/note-actions";
import { updateUserProfile, removeUserAvatar } from "@/lib/actions/profile-actions";
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
  sharedResources?: any[];
  publicResources?: any[];
  bookmarkedCount: number;
  recentActivity?: any[];
}

export function StudentPrivateWorkspace({
  user,
  isGuest,
  quizAttempts: initialQuizAttempts,
  mistakes: initialMistakes,
  privateNotes: initialPrivateNotes,
  privateResources: initialPrivateResources,
  sharedResources: initialSharedResources = [],
  publicResources: initialPublicResources = [],
  bookmarkedCount,
  recentActivity = [],
}: StudentPrivateWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "private" | "shared" | "public" | "quizzes" | "notes" | "activity" | "profile"
  >("overview");

  const [privateNotes, setPrivateNotes] = useState(initialPrivateNotes);
  const [privateResources, setPrivateResources] = useState(initialPrivateResources);
  const [sharedResources, setSharedResources] = useState(initialSharedResources);
  const [publicResources, setPublicResources] = useState(initialPublicResources);
  const [feedback, setFeedback] = useState<string>("");

  // Modals & Confirmation
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string; type: "resource" | "note" } | null>(null);
  const [visibilityConfirmItem, setVisibilityConfirmItem] = useState<{
    id: string;
    title: string;
    currentVisibility: "private" | "shared" | "public";
    targetVisibility: "private" | "shared" | "public";
  } | null>(null);

  // Profile Management State
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  };

  // Avatar Selection & Client Validation
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Seuls les formats d'image (PNG, JPG, WebP) sont autorisés.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
      setSelectedAvatarFile(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setIsSavingProfile(true);

    try {
      const res = await updateUserProfile({
        displayName,
        avatarUrl: avatarPreview,
      });

      if (res.error) {
        setProfileError(res.error);
      } else {
        setProfileMsg("Profil et photo mis à jour avec succès !");
        showFeedback("Profil enregistré avec succès.");
      }
    } catch (err: any) {
      setProfileError(err?.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRemovePhoto = async () => {
    setProfileError("");
    setAvatarPreview(null);
    setSelectedAvatarFile(null);
    setIsSavingProfile(true);
    try {
      await removeUserAvatar();
      setProfileMsg("Photo de profil retirée.");
      showFeedback("Photo de profil retirée.");
    } catch (err: any) {
      setProfileError(err?.message || "Erreur lors de la suppression de la photo.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Visibility Handlers with Confirmation Warnings
  const promptVisibilityChange = (
    id: string,
    title: string,
    currentVisibility: "private" | "shared" | "public",
    targetVisibility: "private" | "shared" | "public"
  ) => {
    setVisibilityConfirmItem({ id, title, currentVisibility, targetVisibility });
  };

  const executeVisibilityChange = async () => {
    if (!visibilityConfirmItem) return;
    const { id, targetVisibility, title } = visibilityConfirmItem;

    const res = await updateResourceVisibility(id, targetVisibility);
    if (res.success) {
      // Re-partition resources
      setPrivateResources((prev) => prev.filter((r) => r.id !== id));
      setSharedResources((prev) => prev.filter((r) => r.id !== id));
      setPublicResources((prev) => prev.filter((r) => r.id !== id));

      const updatedItem = {
        ...(privateResources.find((r) => r.id === id) ||
          sharedResources.find((r) => r.id === id) ||
          publicResources.find((r) => r.id === id)),
        visibility: targetVisibility,
      };

      if (targetVisibility === "private") {
        setPrivateResources((prev) => [updatedItem, ...prev]);
        showFeedback(`"${title}" est maintenant privé (accessible uniquement par vous).`);
      } else if (targetVisibility === "shared") {
        setSharedResources((prev) => [updatedItem, ...prev]);
        showFeedback(`"${title}" est partagé avec votre promotion.`);
      } else {
        setPublicResources((prev) => [updatedItem, ...prev]);
        showFeedback(`"${title}" est désormais public pour toute l'université.`);
      }
    } else {
      showFeedback(res.error || "Impossible de modifier la visibilité.");
    }
    setVisibilityConfirmItem(null);
  };

  // Delete Resource & Note
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "resource") {
        const res = await deleteResource(itemToDelete.id);
        if (res.error) throw new Error(res.error);
        setPrivateResources((prev) => prev.filter((r) => r.id !== itemToDelete.id));
        setSharedResources((prev) => prev.filter((r) => r.id !== itemToDelete.id));
        setPublicResources((prev) => prev.filter((r) => r.id !== itemToDelete.id));
        showFeedback("Document supprimé avec succès.");
      } else {
        const res = await deleteNote(itemToDelete.id);
        if (res.error) throw new Error(res.error);
        setPrivateNotes((prev) => prev.filter((n) => n.id !== itemToDelete.id));
        showFeedback("Note supprimée avec succès.");
      }
    } catch (err: any) {
      showFeedback(err.message || "Erreur lors de la suppression.");
    } finally {
      setItemToDelete(null);
    }
  };

  // Compute metrics
  const totalQuizzes = initialQuizAttempts.length;
  const averageScore =
    totalQuizzes > 0
      ? Math.round(
          (initialQuizAttempts.reduce((acc, q) => acc + q.score / (q.total_questions || 1), 0) /
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

      {/* Student Identity Banner */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-14 h-14 rounded-2xl object-cover border border-[#2855D9]/20 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] font-serif font-bold text-xl flex items-center justify-center shadow-xs">
                {user?.display_name ? user.display_name.slice(0, 2).toUpperCase() : isGuest ? "INV" : "ET"}
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2855D9] text-white flex items-center justify-center shadow-xs hover:bg-[#1E40AF] transition-colors"
              title="Modifier la photo"
            >
              <Camera className="w-3 h-3" />
            </button>
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
        <div className="grid grid-cols-4 gap-2.5 w-full md:w-auto">
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[75px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Privés</div>
            <div className="text-lg font-bold font-mono text-[#111A2E] mt-0.5">{privateResources.length}</div>
          </div>
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[75px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Partagés</div>
            <div className="text-lg font-bold font-mono text-[#2855D9] mt-0.5">{sharedResources.length}</div>
          </div>
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[75px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Quiz</div>
            <div className="text-lg font-bold font-mono text-[#111A2E] mt-0.5">{totalQuizzes}</div>
          </div>
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 text-center min-w-[75px]">
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Favoris</div>
            <div className="text-lg font-bold font-mono text-[#111A2E] mt-0.5">{bookmarkedCount}</div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-[#E4E8F0] pb-2 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "overview" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Vue d&apos;ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("private")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "private" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Mes Fichiers Privés ({privateResources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shared")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "shared" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Partagés ({sharedResources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "public" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Contributions Publiques ({publicResources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("quizzes")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "quizzes" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quiz ({totalQuizzes})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "notes" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>Notes & Mémos ({privateNotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "activity" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activité Récente</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "profile" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Mon Profil</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Taux de Réussite Moyen</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#111A2E]">{averageScore}%</div>
              <p className="text-[11px] text-[#68748A]">Sur l&apos;ensemble de vos évaluations IGL4.</p>
            </div>

            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Carnet d&apos;erreurs Actives</span>
                <RotateCcw className="w-4 h-4 text-[#2855D9]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#2855D9]">{initialMistakes.length}</div>
              <p className="text-[11px] text-[#68748A]">Questions à réviser en priorité.</p>
            </div>

            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Favoris & Signets</span>
                <Bookmark className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">{bookmarkedCount}</div>
              <Link href="/bookmarks" className="text-[11px] text-[#2855D9] hover:underline flex items-center space-x-1">
                <span>Ouvrir mes favoris</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Quick Mistakes Review */}
          {initialMistakes.length > 0 && (
            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Questions à consolider (Carnet d&apos;Erreurs)</span>
              </h3>
              <div className="divide-y divide-[#F1F4F9]">
                {initialMistakes.slice(0, 5).map((m: any, idx: number) => (
                  <div key={m.id || idx} className="py-2.5 text-xs space-y-1">
                    <p className="font-semibold text-[#182235]">{m.question_text}</p>
                    {m.explanation && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                        {m.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MES DOCUMENTS PRIVÉS */}
      {activeTab === "private" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">Mes Fichiers Privés</h3>
              <p className="text-xs text-[#68748A]">
                Uniquement accessibles par votre compte. Aucune fuite vers les autres étudiants.
              </p>
            </div>
            <Link href="/library?action=upload">
              <Button size="sm" variant="primary" className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1" />
                <span>Ajouter un fichier privé</span>
              </Button>
            </Link>
          </div>

          {privateResources.length > 0 ? (
            <div className="divide-y divide-[#F1F4F9]">
              {privateResources.map((res: any) => (
                <div key={res.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#111A2E] truncate">{res.title}</h4>
                    <div className="text-[11px] text-[#68748A] flex items-center space-x-2 mt-0.5">
                      <span>{res.subject?.name || "Matière"}</span>
                      <span>•</span>
                      <span className="text-rose-600 font-mono text-[10px] font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                        Privé
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => promptVisibilityChange(res.id, res.title, "private", "shared")}
                      className="px-2.5 py-1 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7] text-xs text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1"
                      title="Partager avec la promotion"
                    >
                      <Share2 className="w-3 h-3 text-[#2855D9]" />
                      <span>Partager</span>
                    </button>
                    <Link href={`/resources/${res.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Voir</span>
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ id: res.id, title: res.title, type: "resource" })}
                      className="p-1 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl">
              Vous n&apos;avez aucun document privé pour le moment.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESSOURCES PARTAGÉES */}
      {activeTab === "shared" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#111A2E]">Ressources Partagées avec la Promotion</h3>
            <p className="text-xs text-[#68748A]">
              Documents collaboratifs accessibles aux étudiants inscrits en IGL4.
            </p>
          </div>

          {sharedResources.length > 0 ? (
            <div className="divide-y divide-[#F1F4F9]">
              {sharedResources.map((res: any) => (
                <div key={res.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#111A2E] truncate">{res.title}</h4>
                    <div className="text-[11px] text-[#68748A] flex items-center space-x-2 mt-0.5">
                      <span>{res.subject?.name || "Matière"}</span>
                      <span>•</span>
                      <span className="text-blue-700 font-mono text-[10px] font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        Partagé Promo
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => promptVisibilityChange(res.id, res.title, "shared", "private")}
                      className="px-2.5 py-1 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7] text-xs text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1"
                      title="Révoquer le partage et repasser en privé"
                    >
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Rendre Privé</span>
                    </button>
                    <Link href={`/resources/${res.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Voir</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl">
              Aucun document partagé pour le moment.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONTRIBUTIONS PUBLIQUES */}
      {activeTab === "public" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#111A2E]">Mes Contributions Publiques</h3>
            <p className="text-xs text-[#68748A]">
              Vos documents indexés et accessibles publiquement dans la bibliothèque générale.
            </p>
          </div>

          {publicResources.length > 0 ? (
            <div className="divide-y divide-[#F1F4F9]">
              {publicResources.map((res: any) => (
                <div key={res.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#111A2E] truncate">{res.title}</h4>
                    <div className="text-[11px] text-[#68748A] flex items-center space-x-2 mt-0.5">
                      <span>{res.subject?.name || "Matière"}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-mono text-[10px] font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                        Public
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => promptVisibilityChange(res.id, res.title, "public", "private")}
                      className="px-2.5 py-1 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7] text-xs text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1"
                    >
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Rendre Privé</span>
                    </button>
                    <Link href={`/resources/${res.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Voir</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl">
              Vous n&apos;avez pas encore publié de document public.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: QUIZZES */}
      {activeTab === "quizzes" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">Historique Complet des Quiz & Ateliers</h3>
              <p className="text-xs text-[#68748A]">
                Toutes vos sessions d&apos;évaluation chronologiques.
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
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border bg-[#FAFBFD] text-[#111A2E] border-[#E4E8F0]">
                        {attempt.score}/{attempt.total_questions} ({pct}%)
                      </span>
                      {attempt.quiz_id && (
                        <Link href={`/quizzes/${attempt.quiz_id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            <span>Rejouer</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl">
              Aucun quiz passé pour le moment.
            </div>
          )}

          {/* Carnet d'Erreurs Section */}
          <div className="pt-6 border-t border-[#E4E8F0] space-y-3">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Carnet d&apos;Erreurs & Questions à Revoir</span>
              </h3>
              <p className="text-xs text-[#68748A]">
                Questions manquées lors de vos dernières tentatives pour cibler vos révisions.
              </p>
            </div>

            {initialMistakes && initialMistakes.length > 0 ? (
              <div className="space-y-2">
                {initialMistakes.map((mistake: any) => (
                  <div
                    key={mistake.id}
                    className="p-3 rounded-xl bg-[#FAFBFD] border border-amber-200/60 text-xs flex flex-col gap-1"
                  >
                    <span className="font-semibold text-[#111A2E]">
                      {mistake.question?.question_text || mistake.question_text || "Question"}
                    </span>
                    {mistake.explanation && (
                      <span className="text-[#68748A] text-[11px] leading-relaxed">
                        Explication : {mistake.explanation}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FAFBFD] border border-[#E4E8F0] text-center text-xs text-[#68748A]">
                Aucune erreur enregistrée dans votre carnet d&apos;erreurs !
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: NOTES & FICHES */}
      {activeTab === "notes" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">Mes Fiches Mémo & Notes Privées</h3>
              <p className="text-xs text-[#68748A]">Vos synthèses rédigées et mémos personnels.</p>
            </div>
            <Link href="/notes">
              <Button size="sm" variant="outline" className="text-xs">
                <span>Espace Notes</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {privateNotes.length > 0 ? (
            <div className="divide-y divide-[#F1F4F9]">
              {privateNotes.map((note: any) => (
                <div key={note.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#111A2E] truncate">{note.title}</h4>
                    <div className="text-[11px] text-[#68748A] flex items-center space-x-2 mt-0.5">
                      <span>{note.subject?.name || "Matière"}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-[#68748A]">
                        {note.visibility === "public" ? "Public" : "Privé"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ id: note.id, title: note.title, type: "note" })}
                      className="p-1 rounded-lg text-[#68748A] hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl">
              Aucune note ou fiche enregistrée pour le moment.
            </div>
          )}
        </div>
      )}

      {/* TAB 7: HISTORIQUE D'ACTIVITÉ */}
      {activeTab === "activity" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#111A2E]">Historique de vos Actions & Événements</h3>
            <p className="text-xs text-[#68748A]">
              Journal chronologique sécurisé des modifications, ajouts et partages récents.
            </p>
          </div>

          {recentActivity.length > 0 ? (
            <div className="relative pl-6 space-y-4 border-l-2 border-[#E4E8F0]">
              {recentActivity.map((event: any, idx: number) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#2855D9] border-2 border-white shadow-xs" />
                  <div className="text-xs">
                    <span className="font-bold text-[#111A2E]">{event.action}</span>
                    <span className="text-[#68748A] ml-2 font-mono text-[11px]">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Récemment"}
                    </span>
                    {event.metadata && (
                      <p className="text-[11px] text-[#68748A] mt-0.5">
                        {event.metadata.title || event.target_type || "Opération validée"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl">
              Aucune action récente enregistrée dans le journal.
            </div>
          )}
        </div>
      )}

      {/* TAB 8: PROFIL & AVATAR */}
      {activeTab === "profile" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs max-w-xl space-y-5">
          <div>
            <h3 className="font-bold text-sm text-[#111A2E]">Gestion du Profil & Photo</h3>
            <p className="text-xs text-[#68748A]">
              Personnalisez votre nom d&apos;affichage et téléversez votre avatar étudiant.
            </p>
          </div>

          {profileMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar Preview & File Input */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Aperçu Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#2855D9] shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] font-bold text-xl flex items-center justify-center">
                    {displayName ? displayName.slice(0, 2).toUpperCase() : "ET"}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="bg-[#FAFBFD] hover:bg-[#F4F6FA] text-[#182235] border border-[#E4E8F0] px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center space-x-1.5 font-medium shadow-2xs">
                  <Camera className="w-3.5 h-3.5 text-[#2855D9]" />
                  <span>Changer la photo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs text-rose-600 hover:underline block"
                  >
                    Supprimer la photo
                  </button>
                )}
                <p className="text-[10px] text-[#68748A]">Formats : PNG, JPG, WebP. Taille max : 2 Mo.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182235] mb-1">
                Nom d&apos;affichage public :
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Votre prénom et nom"
                className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3.5 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" size="sm" variant="primary" disabled={isSavingProfile}>
                {isSavingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Visibility Change Warning Dialog */}
      {visibilityConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E4E8F0] space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-[#111A2E]">
                Confirmer la modification de visibilité
              </h3>
            </div>
            <p className="text-xs text-[#68748A] leading-relaxed">
              Vous allez changer la visibilité de{" "}
              <strong className="text-[#111A2E]">&quot;{visibilityConfirmItem.title}&quot;</strong> en{" "}
              <strong className="text-[#2855D9] uppercase font-mono">{visibilityConfirmItem.targetVisibility}</strong>.
              {visibilityConfirmItem.targetVisibility !== "private" && (
                <span className="block mt-1.5 text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ Attention : Ce contenu sera accessible aux autres étudiants de la promotion.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setVisibilityConfirmItem(null)}>
                Annuler
              </Button>
              <Button size="sm" variant="primary" onClick={executeVisibilityChange}>
                Confirmer le changement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          onConfirm={confirmDelete}
          itemName={itemToDelete.title}
          itemType={itemToDelete.type}
          itemFormat="Personnel"
        />
      )}
    </div>
  );
}
