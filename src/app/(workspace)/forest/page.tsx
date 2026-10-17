"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyForest, updateForestPreferences } from "@/lib/actions/forest-actions";
import { ForestEntry, ForestPreferences, ForestVisibility } from "@/types/database";
import { ForestCanvas } from "@/components/forest/forest-canvas";
import { ForestTimeline } from "@/components/forest/forest-timeline";
import { ForestInsights } from "@/components/forest/forest-insights";
import { ForestAchievements } from "@/components/forest/forest-achievements";
import { useFocusTimer } from "@/components/focus/focus-provider";
import {
  Trees,
  Users,
  Compass,
  Play,
  ListFilter,
  Lock,
  Globe,
  RefreshCw,
  Sparkles,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForestPage() {
  const router = useRouter();
  const { setIsModalOpen } = useFocusTimer();

  const [viewMode, setViewMode] = useState<"canvas" | "timeline">("canvas");
  const [entries, setEntries] = useState<ForestEntry[]>([]);
  const [preferences, setPreferences] = useState<ForestPreferences | null>(null);
  const [forestStats, setForestStats] = useState<{
    healthyCount: number;
    leaflessCount: number;
    totalFocusedMinutes: number;
    currentStreak: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [selectedVisibility, setSelectedVisibility] = useState<ForestVisibility>("members");
  const [isSavingPrivacy, setIsSavingPrivacy] = useState<boolean>(false);

  // Rehydrate visibility preference immediately from local storage on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("validily_forest_visibility");
        if (cached === "private" || cached === "public" || cached === "members") {
          setSelectedVisibility(cached as ForestVisibility);
        }
      }
    } catch {}
  }, []);

  const fetchForest = async () => {
    setIsLoading(true);
    try {
      const res = await getMyForest();
      if (res) {
        setIsAuthenticated(res.authenticated);
        if (!res.authenticated) {
          window.location.href = "/login?next=/forest";
          return;
        }

        const serverTrees = res.trees || [];
        setEntries(serverTrees);

        // Keep local storage strictly synchronized for this authenticated user only
        try {
          if (typeof window !== "undefined") {
            const uid = res.preferences?.user_id;
            if (uid) {
              localStorage.setItem(`validily_forest_trees_${uid}`, JSON.stringify(serverTrees));
            }
          }
        } catch {}

        if (res.stats) {
          setForestStats(res.stats);
        }

        if (res.preferences) {
          setPreferences(res.preferences);
          setSelectedVisibility(res.preferences.visibility);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("validily_forest_visibility", res.preferences.visibility);
              if (res.preferences.user_id) {
                localStorage.setItem(`validily_forest_visibility_${res.preferences.user_id}`, res.preferences.visibility);
              }
            }
          } catch {}
        }
      }
    } catch {
      // Local / Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForest();

    const handleForestUpdate = () => {
      fetchForest();
    };

    window.addEventListener("validily_forest_updated", handleForestUpdate);
    window.addEventListener("storage", handleForestUpdate);
    return () => {
      window.removeEventListener("validily_forest_updated", handleForestUpdate);
      window.removeEventListener("storage", handleForestUpdate);
    };
  }, []);

  const handleSaveVisibility = async (vis: ForestVisibility) => {
    setSelectedVisibility(vis);
    setIsSavingPrivacy(true);
    if (preferences) {
      setPreferences({ ...preferences, visibility: vis });
    }
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("validily_forest_visibility", vis);
        if (preferences?.user_id) {
          localStorage.setItem(`validily_forest_visibility_${preferences.user_id}`, vis);
        }
      }
      await updateForestPreferences({ visibility: vis });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("validily_forest_updated"));
      }
      setShowPrivacyModal(false);
    } catch {
      // Fallback
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-[#E4E8F0] p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-[#2855D9]" />

          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-4">
            <Trees className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accès Protégé • Bosquet Focus IGL4</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111A2E] tracking-tight mb-3">
            Connexion Obligatoire pour Cultiver Votre Bosquet
          </h2>
          <p className="text-sm text-[#68748A] max-w-xl mx-auto mb-8 leading-relaxed">
            Pour garantir l&apos;intégrité académique, le suivi anti-triche des sessions Pomodoro et la synchronisation de votre clairière avec la promotion IGL4, l&apos;authentification est requise.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-10 max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Trees className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#111A2E]">Arbres Pérennes</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                  Chaque session de travail accomplie enrichit votre bosquet d&apos;un arbre unique.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#111A2E]">Contrôle Anti-Triche</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                  Horodatage serveur certifié pour éliminer toute validation prématurée.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#111A2E]">Galerie de Promo</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                  Explorez les clairières de vos camarades et échangez des encouragements.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#111A2E]">Séries & Statistiques</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                  Mesurez votre assiduité quotidienne et suivez vos espèces botaniques fétiches.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?next=/forest"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#2855D9] hover:bg-[#1E40AF] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <span>Se connecter à mon compte</span>
            </Link>
            <Link
              href="/register?next=/forest"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#F4F6FA] hover:bg-[#E4E8F0] text-[#182235] text-xs font-semibold transition-all border border-[#D1D5DB] flex items-center justify-center space-x-2"
            >
              <span>Créer un compte étudiant</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Trees className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111A2E] tracking-tight">
                  Bosquet Focus
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Diorama Isométrique
                </span>
              </div>
              <p className="text-xs text-[#68748A] mt-0.5">
                Chaque session Pomodoro accomplie sans interruption enrichit votre île d&apos;un arbre pérenne.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:space-x-2.5 self-start sm:self-auto w-full sm:w-auto">
          {/* Privacy Settings Button */}
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="flex-1 sm:flex-none px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E8F0] text-[#182235] hover:bg-[#F4F6FA] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            title="Paramètres de visibilité du bosquet"
          >
            {preferences?.visibility === "private" ? (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            ) : preferences?.visibility === "public" ? (
              <Globe className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="capitalize">
              {preferences?.visibility === "private"
                ? "Privé"
                : preferences?.visibility === "public"
                ? "Public"
                : "Membres"}
            </span>
          </button>

          {/* Peer Gallery Link */}
          <Link
            href="/forest/community"
            className="flex-1 sm:flex-none px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E8F0] text-[#182235] hover:bg-[#F4F6FA] flex items-center justify-center space-x-1.5 transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Galerie</span>
          </Link>

          {/* Launch Focus Timer */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#2855D9] hover:bg-[#1E40AF] text-white flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Lancer Focus</span>
          </button>
        </div>
      </div>

      {/* 2. Forest Insights Summary Cards */}
      <ForestInsights
        entries={entries}
        totalFocusedMinutes={forestStats?.totalFocusedMinutes}
        currentStreak={forestStats?.currentStreak}
        isLoading={isLoading}
      />

      {/* 3. Main View Switcher & Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-[#F4F6FA] p-1 rounded-2xl border border-[#E4E8F0]">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                viewMode === "canvas"
                  ? "bg-white text-[#111A2E] shadow-2xs font-bold"
                  : "text-[#68748A] hover:text-[#182235]"
              )}
            >
              <Trees className="w-3.5 h-3.5 text-emerald-600" />
              <span>Diorama 2.5D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                viewMode === "timeline"
                  ? "bg-white text-[#111A2E] shadow-2xs font-bold"
                  : "text-[#68748A] hover:text-[#182235]"
              )}
            >
              <ListFilter className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Chronologie</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchForest}
            disabled={isLoading}
            className="p-2 text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
            title="Rafraîchir les arbres"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* Content View */}
        {viewMode === "canvas" ? (
          <ForestCanvas entries={entries} isLoading={isLoading} />
        ) : (
          <ForestTimeline entries={entries} />
        )}
      </div>

      {/* 4. Forest Achievements & Milestones */}
      <ForestAchievements
        entries={entries}
        streak={forestStats?.currentStreak}
        totalFocusedMinutes={forestStats?.totalFocusedMinutes}
      />

      {/* 4. Privacy Configuration Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="bg-white border border-[#E4E8F0] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111A2E]">
                  Confidentialité du Bosquet Focus
                </h3>
                <p className="text-xs text-[#68748A]">
                  Choisissez qui peut contempler votre île et vos arbres.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSaveVisibility("members")}
                className={cn(
                  "w-full p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer",
                  selectedVisibility === "members"
                    ? "border-[#2855D9] bg-blue-50/40 text-[#111A2E] ring-1 ring-[#2855D9]"
                    : "border-[#E4E8F0] hover:bg-[#F8FAFC]"
                )}
              >
                <Users className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#111A2E]">
                    Promotion IGL4 uniquement (Recommandé)
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Visible exclusivement par vos camarades authentifiés sur la plateforme.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSaveVisibility("public")}
                className={cn(
                  "w-full p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer",
                  selectedVisibility === "public"
                    ? "border-[#2855D9] bg-blue-50/40 text-[#111A2E] ring-1 ring-[#2855D9]"
                    : "border-[#E4E8F0] hover:bg-[#F8FAFC]"
                )}
              >
                <Globe className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#111A2E]">
                    Public (Tous les visiteurs)
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Accessible publiquement dans la galerie des bosquets.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSaveVisibility("private")}
                className={cn(
                  "w-full p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer",
                  selectedVisibility === "private"
                    ? "border-[#2855D9] bg-blue-50/40 text-[#111A2E] ring-1 ring-[#2855D9]"
                    : "border-[#E4E8F0] hover:bg-[#F8FAFC]"
                )}
              >
                <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#111A2E]">
                    Strictement Privé (Moi seul)
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Votre île n&apos;apparaîtra dans aucune galerie ou recherche publique.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
              <div className="flex items-center space-x-1.5 text-[11px] text-[#64748B]">
                {isSavingPrivacy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#2855D9] animate-spin" />
                    <span className="text-[#2855D9] font-medium">Synchronisation en base...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Préférence persistée dans votre profil</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F4F6FA] hover:bg-[#E4E8F0] text-[#182235] transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
