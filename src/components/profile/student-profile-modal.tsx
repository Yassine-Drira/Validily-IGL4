"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  Trees,
  Award,
  Flame,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Loader2,
  Zap,
  Sprout,
  Trophy,
  Compass,
  Heart,
  Droplets,
  Calendar,
  ExternalLink,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TreeSvg, SPECIES_METADATA } from "@/components/forest/tree-models";
import { ForestCanvas } from "@/components/forest/forest-canvas";
import { AchievementBadgeIcon } from "@/components/forest/achievement-badge-icon";
import {
  getStudentPublicProfile,
  StudentPublicProfile,
} from "@/lib/actions/profile-actions";
import { sendClassmateCheer } from "@/lib/actions/forest-actions";
import { cn } from "@/lib/utils";

interface StudentProfileModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: StudentPublicProfile | null;
}

function sanitizeErrorMessage(msg?: string): string {
  if (!msg) return "";
  if (
    msg.includes("use server") ||
    msg.includes("POST") ||
    msg.includes("module evaluation") ||
    msg.includes("chunk") ||
    msg.includes("digest")
  ) {
    return "Synchronisation détaillée temporairement indisponible.";
  }
  return msg;
}

export function StudentProfileModal({
  studentId,
  isOpen,
  onClose,
  initialProfile = null,
}: StudentProfileModalProps) {
  const [profile, setProfile] = useState<StudentPublicProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProfile);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"bosquet" | "achievements" | "streak">("bosquet");
  const [cheerFeedback, setCheerFeedback] = useState<string>("");
  const [isCheering, setIsCheering] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !studentId) {
      if (!isOpen) {
        setProfile(null);
        setError("");
        setCheerFeedback("");
      }
      return;
    }

    let isCancelled = false;
    if (initialProfile && initialProfile.id === studentId) {
      setProfile(initialProfile);
      if (initialProfile.trees && initialProfile.trees.length > 0) {
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }
    setError("");

    getStudentPublicProfile(studentId)
      .then((res) => {
        if (!isCancelled) {
          if (res.success && res.profile) {
            setProfile(res.profile);
            setError("");
          } else if (!initialProfile || !initialProfile.displayName) {
            setError(sanitizeErrorMessage(res.error) || "Impossible de charger le profil de cet étudiant.");
          }
        }
      })
      .catch((err) => {
        if (!isCancelled && (!initialProfile || !initialProfile.displayName)) {
          setError(sanitizeErrorMessage(err?.message) || "Erreur de connexion lors du chargement.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, studentId, initialProfile]);

  if (!isOpen || !mounted || typeof document === "undefined" || !document.body) return null;

  const handleSendCheer = async (type: "water" | "clap" | "fire" | "muscle") => {
    if (!profile || isCheering) return;
    setIsCheering(true);
    setCheerFeedback("");

    try {
      const res = await sendClassmateCheer({
        recipientId: profile.id,
        recipientName: profile.displayName,
        cheerType: type,
      });

      if (res.success) {
        setCheerFeedback(res.message);
        setTimeout(() => setCheerFeedback(""), 4500);
      } else {
        setCheerFeedback(res.error || "Erreur d'envoi");
        setTimeout(() => setCheerFeedback(""), 4000);
      }
    } catch {
      setCheerFeedback("Échec lors de l'envoi de l'encouragement.");
      setTimeout(() => setCheerFeedback(""), 4000);
    } finally {
      setIsCheering(false);
    }
  };

  const initials = profile?.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ET";

  const totalHours = profile ? Math.floor(profile.stats.totalFocusedMinutes / 60) : 0;
  const totalMinsRemainder = profile ? profile.stats.totalFocusedMinutes % 60 : 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] bg-[#111A2E]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white border border-[#E4E8F0] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
      >
        {/* HEADER SECTION */}
        <div className="relative bg-gradient-to-r from-[#F0F5FF] via-emerald-50/40 to-teal-50/30 border-b border-[#E4E8F0] p-5 sm:p-6 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#68748A] hover:text-[#182235] hover:bg-white/80 rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="flex items-center space-x-4 py-2">
              <div className="w-16 h-16 rounded-2xl bg-[#E4E8F0] animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 bg-[#E4E8F0] rounded-md animate-pulse" />
                <div className="h-3.5 w-32 bg-[#E4E8F0] rounded-md animate-pulse" />
              </div>
            </div>
          ) : !profile ? (
            <div className="flex items-center space-x-3 py-1">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E4E8F0] shadow-xs flex items-center justify-center text-[#68748A]">
                <User className="w-6 h-6 text-[#94A3B8]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111A2E]">Profil Étudiant</h3>
                <span className="text-xs text-rose-600 font-medium">
                  {error || "Espace confidentiel ou introuvable"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2855D9] to-indigo-700 text-white font-extrabold text-lg flex items-center justify-center border-2 border-white shadow-md">
                      {initials}
                    </div>
                  )}

                  {profile.isVip && (
                    <span
                      className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold text-[9px] border border-white shadow-xs flex items-center space-x-0.5"
                      title="Membre VIP Validily"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>VIP</span>
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h2
                      id="student-profile-title"
                      className="text-lg sm:text-xl font-bold text-[#111A2E] tracking-tight"
                    >
                      {profile.displayName}
                    </h2>
                    {profile.role === "admin" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Admin IGL4
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#68748A] mt-0.5 font-mono">
                    Étudiant promotion IGL4 • Espace d&apos;Étude Public
                  </p>
                </div>
              </div>

              {/* Top Quick Metric Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-emerald-200 flex items-center space-x-1.5 shadow-2xs">
                  <Trees className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900 font-mono">
                    {profile.stats.healthyTreesCount} arbres
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-amber-200 flex items-center space-x-1.5 shadow-2xs">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                  <span className="text-xs font-bold text-amber-900 font-mono">
                    {profile.stats.streak} {profile.stats.streak > 1 ? "jours" : "jour"}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-blue-200 flex items-center space-x-1.5 shadow-2xs">
                  <Award className="w-4 h-4 text-[#2855D9]" />
                  <span className="text-xs font-bold text-blue-900 font-mono">
                    {profile.unlockedAchievementsCount}/12 badges
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TAB CONTROLS */}
        {profile && !isLoading && (
          <div className="flex items-center space-x-2 px-5 sm:px-6 pt-3 border-b border-[#E4E8F0] bg-[#FAFAF7]">
            <button
              type="button"
              onClick={() => setActiveTab("bosquet")}
              className={cn(
                "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5",
                activeTab === "bosquet"
                  ? "border-[#2855D9] text-[#2855D9]"
                  : "border-transparent text-[#68748A] hover:text-[#182235]"
              )}
            >
              <Trees className="w-3.5 h-3.5" />
              <span>Le Bosquet ({profile.stats.healthyTreesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("achievements")}
              className={cn(
                "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5",
                activeTab === "achievements"
                  ? "border-[#2855D9] text-[#2855D9]"
                  : "border-transparent text-[#68748A] hover:text-[#182235]"
              )}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Accomplissements ({profile.unlockedAchievementsCount}/12)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("streak")}
              className={cn(
                "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5",
                activeTab === "streak"
                  ? "border-[#2855D9] text-[#2855D9]"
                  : "border-transparent text-[#68748A] hover:text-[#182235]"
              )}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Série & Assiduité ({profile.stats.streak}j)</span>
            </button>
          </div>
        )}

        {/* TAB CONTENT BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2855D9] animate-spin" />
              <p className="text-xs text-[#68748A]">Chargement des données académiques...</p>
            </div>
          ) : !profile ? (
            <div className="py-12 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-[#111A2E]">Profil Privé ou Indisponible</p>
                <p className="text-xs text-[#68748A] leading-relaxed">
                  {error || "Cet étudiant a configuré son espace d'étude en mode privé ou ce profil n'est plus accessible."}
                </p>
              </div>
              <div className="pt-2">
                <Button size="sm" variant="outline" onClick={onClose} className="text-xs cursor-pointer">
                  Fermer la vue
                </Button>
              </div>
            </div>
          ) : activeTab === "bosquet" ? (
            <div className="space-y-4">
              {/* Isometric Landscape Viewer */}
              <div className="relative">
                <ForestCanvas
                  entries={profile.trees}
                  readOnly={true}
                  ownerName={profile.displayName}
                />
              </div>

              {/* Peer Encouragement Toolbar */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-teal-50/60 to-blue-50/70 rounded-2xl border border-emerald-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-[#111A2E]">
                      Encourager {profile.displayName} :
                    </span>
                  </div>
                  {cheerFeedback && (
                    <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                      {cheerFeedback}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={isCheering}
                    onClick={() => handleSendCheer("water")}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    <span>Arroser le bosquet</span>
                  </button>
                  <button
                    type="button"
                    disabled={isCheering}
                    onClick={() => handleSendCheer("clap")}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Féliciter la session</span>
                  </button>
                  <button
                    type="button"
                    disabled={isCheering}
                    onClick={() => handleSendCheer("fire")}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>Saluer l&apos;assiduité</span>
                  </button>
                  <button
                    type="button"
                    disabled={isCheering}
                    onClick={() => handleSendCheer("muscle")}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white border border-purple-200 hover:bg-purple-50 text-purple-800 flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    <span>Transmettre force</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === "achievements" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111A2E]">
                    Accomplissements académiques
                  </h3>
                  <p className="text-xs text-[#68748A]">
                    {profile.unlockedAchievementsCount} sur 12 jalons débloqués par {profile.displayName}.
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-[#2855D9] bg-[#EDF2FF] px-2.5 py-1 rounded-lg">
                  {Math.round((profile.unlockedAchievementsCount / 12) * 100)}% complété
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profile.achievements.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5",
                      item.isUnlocked
                        ? "bg-white border-emerald-200 shadow-2xs"
                        : "bg-[#FAFAF7]/70 border-[#E4E8F0] opacity-80"
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="shrink-0 mt-0.5">
                        <AchievementBadgeIcon
                          id={item.id}
                          isUnlocked={item.isUnlocked}
                          progressPercent={item.progressPercent}
                          size={44}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#111A2E] truncate">
                            {item.title}
                          </h4>
                          {item.isUnlocked && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#68748A] leading-snug line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="pt-2 border-t border-[#F1F4F9] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#68748A]">{item.progressLabel}</span>
                        <span
                          className={cn(
                            "font-bold",
                            item.isUnlocked ? "text-emerald-700" : "text-[#68748A]"
                          )}
                        >
                          {item.isUnlocked ? "Débloqué" : `${item.progressPercent}%`}
                        </span>
                      </div>
                      <div className="w-full bg-[#E4E8F0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            item.isUnlocked ? "bg-emerald-500" : "bg-[#2855D9]/70"
                          )}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STREAK & FOCUS PERFORMANCE TAB */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FAFBFD] border border-amber-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-2 text-amber-700">
                    <Flame className="w-4 h-4 fill-amber-500/20" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      Série Actuelle
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-amber-900 font-mono">
                    {profile.stats.streak} {profile.stats.streak > 1 ? "jours" : "jour"}
                  </div>
                  <p className="text-[11px] text-[#68748A]">
                    Sessions consécutives vérifiées en base de données.
                  </p>
                </div>

                <div className="bg-[#FAFBFD] border border-blue-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-2 text-[#2855D9]">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      Temps de Focus
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-[#111A2E] font-mono">
                    {totalHours}h {totalMinsRemainder}m
                  </div>
                  <p className="text-[11px] text-[#68748A]">
                    {profile.stats.totalSessions} sessions de concentration menées.
                  </p>
                </div>

                <div className="bg-[#FAFBFD] border border-emerald-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <Trees className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      Arbres Cultivés
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-900 font-mono">
                    {profile.stats.healthyTreesCount} sains
                  </div>
                  <p className="text-[11px] text-[#68748A]">
                    {profile.stats.speciesCount} espèces végétales différentes cultivées.
                  </p>
                </div>
              </div>

              {/* Biodiversity Summary */}
              <div className="p-4 bg-white border border-[#E4E8F0] rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#111A2E] flex items-center space-x-2">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  <span>Diversité Botanique Cultivée</span>
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(SPECIES_METADATA).map(([key, meta]) => {
                    const hasSpecies = profile.trees.some(
                      (t) => t.tree_status === "healthy" && t.tree_species === key
                    );
                    return (
                      <div
                        key={key}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all",
                          hasSpecies
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-[#FAFAF7] border-[#E4E8F0] text-[#68748A] opacity-60"
                        )}
                      >
                        <TreeSvg species={key as any} status={hasSpecies ? "healthy" : "leafless"} size={20} showMound={false} />
                        <span>{meta.name}</span>
                        {hasSpecies && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER NOTICE */}
        <div className="px-5 sm:px-6 py-3 bg-[#FAFAF7] border-t border-[#E4E8F0] flex items-center justify-between text-xs text-[#68748A] shrink-0">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Lecture publique sécurisée — Notes et cours privés protégés</span>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(modalContent, document.body);
}
