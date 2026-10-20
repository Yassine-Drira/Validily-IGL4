"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateResourceVisibility, deleteResource, UserOverallRevisionMetrics } from "@/lib/actions/resource-actions";
import { updateNote, deleteNote } from "@/lib/actions/note-actions";
import { updateUserProfile, removeUserAvatar } from "@/lib/actions/profile-actions";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { VipBadge } from "@/components/ui/vip-badge";

interface StudentPrivateWorkspaceProps {
  user: {
    id: string;
    email?: string;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  isGuest: boolean;
  isVip?: boolean;
  quizAttempts: any[];
  mistakes: any[];
  privateNotes: any[];
  privateResources: any[];
  sharedResources?: any[];
  publicResources?: any[];
  bookmarkedCount: number;
  recentActivity?: any[];
  revisionProgress?: UserOverallRevisionMetrics;
}

export function StudentPrivateWorkspace({
  user,
  isGuest,
  isVip = false,
  quizAttempts: initialQuizAttempts,
  mistakes: initialMistakes,
  privateNotes: initialPrivateNotes,
  privateResources: initialPrivateResources,
  sharedResources: initialSharedResources = [],
  publicResources: initialPublicResources = [],
  bookmarkedCount,
  recentActivity = [],
  revisionProgress = {
    totalResources: 0,
    totalRevised: 0,
    totalInProgress: 0,
    totalNotStarted: 0,
    overallPercentage: 0,
    subjects: [],
  },
}: StudentPrivateWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "revisions" | "private" | "shared" | "public" | "quizzes" | "notes" | "activity" | "profile"
  >("overview");

  const [privateNotes, setPrivateNotes] = useState(() =>
    (initialPrivateNotes || []).filter(
      (n: any) =>
        n?.title &&
        !n.title.startsWith("__") &&
        !(Array.isArray(n.tags) && n.tags.some((t: string) => t.startsWith("system_")))
    )
  );
  const [privateResources, setPrivateResources] = useState(initialPrivateResources);
  const [sharedResources, setSharedResources] = useState(initialSharedResources);
  const [publicResources, setPublicResources] = useState(initialPublicResources);
  const [feedback, setFeedback] = useState<string>("");
  const [revisionFilter, setRevisionFilter] = useState<"all" | "in_progress" | "not_started" | "revised">("all");
  const [revisionSemesterFilter, setRevisionSemesterFilter] = useState<string>("all");
  const [revisionSearch, setRevisionSearch] = useState<string>("");
  const [activityPeriodFilter, setActivityPeriodFilter] = useState<"all" | "today" | "7d" | "30d">("all");

  // Modals & Confirmation
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string; type: "resource" | "note" } | null>(null);
  const [visibilityConfirmItem, setVisibilityConfirmItem] = useState<{
    id: string;
    title: string;
    currentVisibility: "private" | "shared" | "public";
    targetVisibility: "private" | "shared" | "public";
  } | null>(null);

  const router = useRouter();

  // Profile Management State
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile state when server user prop updates
  useEffect(() => {
    if (user?.display_name) setDisplayName(user.display_name);
    if (user?.avatar_url !== undefined) setAvatarPreview(user.avatar_url);
  }, [user?.display_name, user?.avatar_url]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  };

  // Avatar Selection, Client Validation & Optimized Canvas Compression
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Seuls les formats d'image (PNG, JPG, WebP) sont autorisés.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);

          setAvatarPreview(compressed);
          setSelectedAvatarFile(compressed);
        } catch {
          setAvatarPreview(rawDataUrl);
          setSelectedAvatarFile(rawDataUrl);
        }
      };
      img.onerror = () => {
        setAvatarPreview(rawDataUrl);
        setSelectedAvatarFile(rawDataUrl);
      };
      img.src = rawDataUrl;
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
        router.refresh();
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
      router.refresh();
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
      } else {
        setPublicResources((prev) => [updatedItem, ...prev]);
        showFeedback(`"${title}" est désormais public et accessible dans la bibliothèque.`);
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

  // Priority subjects for "Vue d'ensemble" (shows max 3 actionable subjects)
  const activeOrPrioritySubjects = useMemo(() => {
    const list = revisionProgress?.subjects || [];
    if (list.length === 0) return [];
    const inProgress = list.filter((s) => s.inProgressCount > 0);
    if (inProgress.length >= 3) return inProgress.slice(0, 3);

    const revised = list.filter((s) => s.revisedCount > 0 && s.percentage < 100);
    const combined = Array.from(new Set([...inProgress, ...revised]));
    if (combined.length >= 3) return combined.slice(0, 3);

    const remaining = list.filter((s) => !combined.includes(s));
    return [...combined, ...remaining].slice(0, 3);
  }, [revisionProgress?.subjects]);

  // Available semesters for "Mes Révisions" filter dropdown
  const availableSemesters = useMemo(() => {
    const s = new Set<string>();
    (revisionProgress?.subjects || []).forEach((subj) => {
      if (subj.semesterName) s.add(subj.semesterName);
    });
    return Array.from(s);
  }, [revisionProgress?.subjects]);

  // Filtered subjects for "Mes Révisions"
  const filteredRevisionSubjects = useMemo(() => {
    return (revisionProgress?.subjects || []).filter((subj) => {
      if (revisionFilter === "in_progress" && subj.inProgressCount === 0) return false;
      if (revisionFilter === "revised" && subj.percentage < 100) return false;
      if (revisionFilter === "not_started" && (subj.revisedCount > 0 || subj.inProgressCount > 0)) return false;

      if (revisionSemesterFilter !== "all" && subj.semesterName !== revisionSemesterFilter) return false;

      if (revisionSearch.trim()) {
        const query = revisionSearch.toLowerCase().trim();
        const matchesName = subj.subjectName.toLowerCase().includes(query);
        const matchesSemester = subj.semesterName.toLowerCase().includes(query);
        if (!matchesName && !matchesSemester) return false;
      }

      return true;
    });
  }, [revisionProgress?.subjects, revisionFilter, revisionSemesterFilter, revisionSearch]);

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
            {isVip && (
              <div className="absolute -top-1.5 -right-1.5 z-10">
                <VipBadge variant="avatar-badge" />
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
              {isVip && (
                <VipBadge variant="full" />
              )}
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
            <div className="text-[10px] uppercase font-mono text-[#68748A]">Publics</div>
            <div className="text-lg font-bold font-mono text-[#2855D9] mt-0.5">{publicResources.length + sharedResources.length}</div>
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
          onClick={() => setActiveTab("revisions")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "revisions" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Mes Révisions ({revisionProgress?.overallPercentage || 0}%)</span>
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
          onClick={() => setActiveTab("public")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "public" || activeTab === "shared" ? "bg-[#2855D9] text-white shadow-2xs" : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Documents Publics ({publicResources.length + sharedResources.length})</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Progression Révisions</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#111A2E]">
                {revisionProgress?.overallPercentage || 0}%
              </div>
              <div className="w-full bg-[#E4E8F0] h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-gradient-to-r from-[#2855D9] to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${revisionProgress?.overallPercentage || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-[#68748A]">
                {revisionProgress?.totalRevised || 0}/{revisionProgress?.totalResources || 0} documents révisés.
              </p>
            </div>

            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#68748A]">
                <span>Taux de Réussite Moyen</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#111A2E]">
                {totalQuizzes > 0 ? `${averageScore}%` : "—"}
              </div>
              <p className="text-[11px] text-[#68748A]">
                {totalQuizzes > 0 ? "Sur l'ensemble de vos évaluations IGL4." : "Aucun quiz complété pour le moment."}
              </p>
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

          {/* REPRENDRE VOS RÉVISIONS (ACTIONABLE JUMP-BACK-IN / TOP PRIORITIES) */}
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-base text-[#111A2E] flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-[#2855D9]" />
                    <span>Reprendre vos révisions</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-[#2855D9] border border-blue-200">
                    {activeOrPrioritySubjects.length} prioritaires
                  </span>
                </div>
                <p className="text-xs text-[#68748A] mt-1">
                  Accédez directement aux cours en cours ou démarrez vos priorités du cursus.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("revisions")}
                className="text-xs font-semibold text-[#2855D9] hover:text-[#1E40AF] flex items-center space-x-1.5 self-start sm:self-auto group cursor-pointer"
              >
                <span>Gérer les {revisionProgress?.subjects?.length || 11} matières dans Mes Révisions</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Smart 3-card priority display */}
            {activeOrPrioritySubjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {activeOrPrioritySubjects.map((subj) => (
                  <div
                    key={subj.subjectId}
                    className="bg-[#FAFBFD] border border-[#E4E8F0] hover:border-[#2855D9]/40 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E4E8F0] text-[#68748A]">
                          {subj.semesterName}
                        </span>
                        <h4 className="font-bold text-sm text-[#111A2E] mt-1.5 truncate">
                          {subj.subjectName}
                        </h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold font-mono text-[#2855D9]">
                          {subj.percentage}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="w-full bg-[#E4E8F0] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#2855D9] to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${subj.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-medium text-[#68748A] mt-1.5">
                        <span className="text-emerald-700 font-semibold">{subj.revisedCount} révisé{subj.revisedCount !== 1 ? "s" : ""}</span>
                        <span className="text-amber-700 font-semibold">{subj.inProgressCount} en cours</span>
                        <span>{subj.notStartedCount} restant{subj.notStartedCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <Link
                      href={`/subjects/${subj.subjectSlug}`}
                      className="text-xs font-semibold text-[#2855D9] hover:text-[#1E40AF] flex items-center justify-between pt-2 border-t border-[#E4E8F0]/70"
                    >
                      <span>{subj.percentage > 0 ? "Continuer la révision" : "Démarrer cette matière"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Quick Banner CTA */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#EDF2FF] to-white border border-[#2855D9]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-[#182235]">
                <Sparkles className="w-4 h-4 text-[#2855D9] shrink-0" />
                <span>
                  <strong>{revisionProgress?.totalResources || 51} cours au total</strong> répartis sur vos {revisionProgress?.subjects?.length || 11} matières. Planifiez l&apos;ensemble de votre semestre avec filtres et statuts.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("revisions")}
                className="px-3 py-1.5 rounded-lg bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                Ouvrir le Centre de Révision
              </button>
            </div>
          </div>

          {/* TWO-COLUMN COCKPIT SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Mistakes Review */}
            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span>Carnet d&apos;Erreurs & Consolidation</span>
                </h3>
                {initialMistakes.length > 0 && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {initialMistakes.length} à revoir
                  </span>
                )}
              </div>

              {initialMistakes.length > 0 ? (
                <div className="divide-y divide-[#F1F4F9]">
                  {initialMistakes.slice(0, 4).map((m: any, idx: number) => (
                    <div key={m.id || idx} className="py-2.5 text-xs space-y-1">
                      <p className="font-semibold text-[#182235]">{m.question_text}</p>
                      {m.explanation && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                          {m.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveTab("quizzes")}
                      className="text-xs text-[#2855D9] hover:underline font-semibold cursor-pointer"
                    >
                      Voir toutes mes erreurs →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-medium text-[#111A2E]">Aucune erreur active enregistrée</p>
                  <p className="text-[11px]">Vos évaluations sont parfaites ou vous n&apos;avez pas encore passé de quiz.</p>
                  <Link href="/quizzes" className="inline-block mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Passer un quiz d&apos;entraînement
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Activity / Recent Quiz attempts */}
            <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#2855D9]" />
                  <span>Dernières Activités & Évaluations</span>
                </h3>
                {initialQuizAttempts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("quizzes")}
                    className="text-xs text-[#2855D9] hover:underline font-semibold cursor-pointer"
                  >
                    Historique complet →
                  </button>
                )}
              </div>

              {initialQuizAttempts.length > 0 ? (
                <div className="divide-y divide-[#F1F4F9]">
                  {initialQuizAttempts.slice(0, 4).map((att: any, idx: number) => {
                    const pct = Math.round((att.score / (att.total_questions || 1)) * 100);
                    return (
                      <div key={att.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#182235] truncate">{att.quiz?.title || "Quiz évalué"}</p>
                          <p className="text-[11px] text-[#68748A]">{att.quiz?.subject?.name || "Matière"}</p>
                        </div>
                        <div className="shrink-0 flex items-center space-x-2">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                            pct >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {pct}%
                          </span>
                          {att.quiz_id && (
                            <Link href={`/quizzes/${att.quiz_id}`}>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]">
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl space-y-2">
                  <Award className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-medium text-[#111A2E]">Aucun quiz complété récemment</p>
                  <p className="text-[11px]">Évaluez vos connaissances pour calculer votre taux de réussite moyen.</p>
                  <Link href="/quizzes" className="inline-block mt-2">
                    <Button size="sm" variant="primary" className="text-xs">
                      Découvrir les quiz disponibles
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB REVISIONS: FULL DEDICATED REVISION VIEW */}
      {activeTab === "revisions" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#111A2E] flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-[#2855D9]" />
                  <span>Centre de Révision & Planification du Cursus</span>
                </h3>
                <p className="text-xs text-[#68748A] mt-1">
                  Suivez votre progression sur chaque matière, validez vos acquis document par document et filtrez selon vos priorités.
                </p>
              </div>

              {/* Progress Counters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{revisionProgress?.totalRevised || 0} Validés</span>
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{revisionProgress?.totalInProgress || 0} En cours</span>
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FAFAF7] border border-[#E4E8F0] text-[#68748A] flex items-center space-x-1.5">
                  <span>{revisionProgress?.totalNotStarted || 0} À réviser</span>
                </span>
              </div>
            </div>

            {/* Global Curriculum Progress Bar */}
            <div className="p-4 rounded-xl bg-[#FAFBFD] border border-[#E4E8F0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#111A2E]">
                  Progression globale : {revisionProgress?.totalRevised || 0} sur {revisionProgress?.totalResources || 51} cours validés
                </span>
                <span className="font-bold font-mono text-[#2855D9] text-sm">
                  {revisionProgress?.overallPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-[#E4E8F0] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#2855D9] to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${revisionProgress?.overallPercentage || 0}%` }}
                />
              </div>
            </div>

            {/* Filters Bar: Status Tabs, Semester Selector, Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-[#E4E8F0]">
              {/* Status Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRevisionFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    revisionFilter === "all"
                      ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                      : "bg-[#FAFAF7] text-[#68748A] hover:bg-[#F4F6FA] border border-[#E4E8F0]"
                  }`}
                >
                  Toutes ({revisionProgress?.subjects?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRevisionFilter("in_progress")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    revisionFilter === "in_progress"
                      ? "bg-amber-600 text-white shadow-2xs font-semibold"
                      : "bg-[#FAFAF7] text-[#68748A] hover:bg-[#F4F6FA] border border-[#E4E8F0]"
                  }`}
                >
                  En cours ({revisionProgress?.subjects?.filter((s) => s.inProgressCount > 0).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRevisionFilter("not_started")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    revisionFilter === "not_started"
                      ? "bg-[#182235] text-white shadow-2xs font-semibold"
                      : "bg-[#FAFAF7] text-[#68748A] hover:bg-[#F4F6FA] border border-[#E4E8F0]"
                  }`}
                >
                  À réviser ({revisionProgress?.subjects?.filter((s) => s.revisedCount === 0 && s.inProgressCount === 0).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRevisionFilter("revised")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    revisionFilter === "revised"
                      ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                      : "bg-[#FAFAF7] text-[#68748A] hover:bg-[#F4F6FA] border border-[#E4E8F0]"
                  }`}
                >
                  Validées ({revisionProgress?.subjects?.filter((s) => s.percentage === 100).length || 0})
                </button>
              </div>

              {/* Semester & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                {availableSemesters.length > 1 && (
                  <select
                    value={revisionSemesterFilter}
                    onChange={(e) => setRevisionSemesterFilter(e.target.value)}
                    aria-label="Filtrer par semestre"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E4E8F0] bg-white text-[#182235] focus:outline-none focus:ring-1 focus:ring-[#2855D9]"
                  >
                    <option value="all">Tous les semestres</option>
                    {availableSemesters.map((sem) => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={revisionSearch}
                    onChange={(e) => setRevisionSearch(e.target.value)}
                    placeholder="Filtrer une matière..."
                    className="pl-8 pr-3 py-1 text-xs rounded-lg border border-[#E4E8F0] bg-white text-[#182235] placeholder:text-[#68748A] focus:outline-none focus:ring-1 focus:ring-[#2855D9] w-40 sm:w-48"
                  />
                  {revisionSearch && (
                    <button
                      type="button"
                      onClick={() => setRevisionSearch("")}
                      className="absolute right-2 top-2 text-[#68748A] hover:text-[#182235] text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grid of Subjects */}
            {filteredRevisionSubjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {filteredRevisionSubjects.map((subj) => (
                  <div
                    key={subj.subjectId}
                    className="bg-[#FAFBFD] border border-[#E4E8F0] hover:border-[#2855D9]/40 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E4E8F0] text-[#68748A]">
                          {subj.semesterName}
                        </span>
                        <h4 className="font-bold text-sm text-[#111A2E] mt-1.5 truncate">
                          {subj.subjectName}
                        </h4>
                      </div>
                      <span className="text-base font-bold font-mono text-[#2855D9]">
                        {subj.percentage}%
                      </span>
                    </div>

                    <div>
                      <div className="w-full bg-[#E4E8F0] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#2855D9] to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${subj.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-[#68748A] mt-2">
                        <span className="text-emerald-700 font-semibold">{subj.revisedCount} révisé{subj.revisedCount !== 1 ? "s" : ""}</span>
                        <span className="text-amber-700 font-semibold">{subj.inProgressCount} en cours</span>
                        <span>{subj.notStartedCount} à réviser</span>
                      </div>
                    </div>

                    <Link
                      href={`/subjects/${subj.subjectSlug}`}
                      className="w-full text-center py-2 px-3 rounded-lg bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
                    >
                      <span>Réviser maintenant</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl space-y-2">
                <BookOpen className="w-8 h-8 text-[#68748A] mx-auto opacity-60" />
                <p className="font-semibold text-[#111A2E]">Aucune matière ne correspond à vos filtres</p>
                <p className="text-[11px]">Modifiez ou réinitialisez vos critères de recherche.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs mt-2"
                  onClick={() => {
                    setRevisionFilter("all");
                    setRevisionSemesterFilter("all");
                    setRevisionSearch("");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
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
            <Link href="/library?action=upload&visibility=private">
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
                      onClick={() => promptVisibilityChange(res.id, res.title, "private", "public")}
                      className="px-2.5 py-1 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7] text-xs text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1"
                      title="Rendre public dans la bibliothèque"
                    >
                      <Globe className="w-3 h-3 text-[#2855D9]" />
                      <span>Rendre Public</span>
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

      {/* TAB 3: DOCUMENTS PUBLICS & PARTAGÉS */}
      {(activeTab === "public" || activeTab === "shared") && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#111A2E]">Mes Documents Publics</h3>
            <p className="text-xs text-[#68748A]">
              Vos documents indexés et accessibles à tous les étudiants dans la bibliothèque académique.
            </p>
          </div>

          {[...publicResources, ...sharedResources].length > 0 ? (
            <div className="divide-y divide-[#F1F4F9]">
              {[...publicResources, ...sharedResources].map((res: any) => (
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
                      onClick={() => promptVisibilityChange(res.id, res.title, res.visibility || "public", "private")}
                      className="px-2.5 py-1 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7] text-xs text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1"
                      title="Rendre privé (accessible uniquement par vous)"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#111A2E]">Historique de vos Actions & Événements</h3>
              <p className="text-xs text-[#68748A]">
                Journal chronologique sécurisé des modifications, ajouts et partages récents.
              </p>
            </div>

            <div className="flex items-center space-x-1 bg-[#FAFBFD] p-1 rounded-xl border border-[#E4E8F0] text-xs">
              {(
                [
                  { key: "all", label: "Toutes" },
                  { key: "today", label: "Aujourd'hui" },
                  { key: "7d", label: "7 Jours" },
                  { key: "30d", label: "30 Jours" },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActivityPeriodFilter(p.key)}
                  className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    activityPeriodFilter === p.key
                      ? "bg-[#2855D9] text-white shadow-2xs font-bold"
                      : "text-[#68748A] hover:text-[#111A2E]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const filteredActivity = recentActivity.filter((event: any) => {
              if (activityPeriodFilter === "all") return true;
              if (!event.timestamp) return true;
              const t = new Date(event.timestamp).getTime();
              const now = Date.now();
              if (activityPeriodFilter === "today") {
                return new Date(event.timestamp).toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
              }
              if (activityPeriodFilter === "7d") {
                return t >= now - 7 * 24 * 60 * 60 * 1000;
              }
              if (activityPeriodFilter === "30d") {
                return t >= now - 30 * 24 * 60 * 60 * 1000;
              }
              return true;
            });

            return filteredActivity.length > 0 ? (
              <div className="relative pl-6 space-y-4 border-l-2 border-[#E4E8F0]">
                {filteredActivity.map((event: any, idx: number) => (
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
                Aucune action enregistrée pour cette période.
              </div>
            );
          })()}
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
                {visibilityConfirmItem.targetVisibility === "public"
                  ? "Rendre ce document public"
                  : "Rendre ce document privé"}
              </h3>
            </div>
            <div className="text-xs text-[#68748A] leading-relaxed space-y-2">
              <p>
                Vous allez changer la visibilité de{" "}
                <strong className="text-[#111A2E]">&quot;{visibilityConfirmItem.title}&quot;</strong> en{" "}
                <strong className="text-[#2855D9] font-bold">
                  {visibilityConfirmItem.targetVisibility === "public" ? "PUBLIC" : "PRIVÉ"}
                </strong>.
              </p>
              {visibilityConfirmItem.targetVisibility === "public" ? (
                <div className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  ⚠️ Attention : Ce document sera publié et accessible à tous les étudiants dans la bibliothèque académique.
                </div>
              ) : (
                <div className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  🔒 Ce document redeviendra strictement privé et ne sera plus visible que par vous seul dans votre espace.
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setVisibilityConfirmItem(null)}>
                Annuler
              </Button>
              <Button size="sm" variant="primary" onClick={executeVisibilityChange}>
                {visibilityConfirmItem.targetVisibility === "public" ? "Confirmer la publication" : "Confirmer le retrait"}
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
