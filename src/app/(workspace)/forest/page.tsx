"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMyForest, updateForestPreferences } from "@/lib/actions/forest-actions";
import { ForestEntry, ForestPreferences, ForestVisibility } from "@/types/database";
import { ForestCanvas } from "@/components/forest/forest-canvas";
import { ForestTimeline } from "@/components/forest/forest-timeline";
import { ForestInsights } from "@/components/forest/forest-insights";
import { useFocusTimer } from "@/components/focus/focus-provider";
import {
  Trees,
  Users,
  Compass,
  Play,
  ListFilter,
  Eye,
  Shield,
  Lock,
  Globe,
  Settings2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForestPage() {
  const { setIsModalOpen } = useFocusTimer();

  const [viewMode, setViewMode] = useState<"canvas" | "timeline">("canvas");
  const [entries, setEntries] = useState<ForestEntry[]>([]);
  const [preferences, setPreferences] = useState<ForestPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [selectedVisibility, setSelectedVisibility] = useState<ForestVisibility>("members");
  const [isSavingPref, setIsSavingPref] = useState<boolean>(false);

  const fetchForest = async () => {
    setIsLoading(true);
    try {
      const res = await getMyForest();
      if (res) {
        setIsAuthenticated(res.authenticated);
        if (res.trees) {
          setEntries(res.trees || []);
        }
        if (res.preferences) {
          setPreferences(res.preferences);
          setSelectedVisibility(res.preferences.visibility);
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
  }, []);

  const handleSaveVisibility = async (vis: ForestVisibility) => {
    setIsSavingPref(true);
    setSelectedVisibility(vis);
    try {
      await updateForestPreferences({ visibility: vis });
      if (preferences) {
        setPreferences({ ...preferences, visibility: vis });
      }
      setShowPrivacyModal(false);
    } catch {
      // Handle error
    } finally {
      setIsSavingPref(false);
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

          {/* Benefits Grid */}
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

          {/* Action CTAs */}
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
      {/* Page Header */}
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
                  Pomodoro Forest
                </span>
              </div>
              <p className="text-xs text-[#68748A] mt-0.5">
                Chaque session accomplie sans interruption enrichit votre forêt personnelle d&apos;un arbre pérenne.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Privacy Settings Button */}
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E8F0] text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Paramètres de visibilité du bosquet"
          >
            {preferences?.visibility === "private" ? (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            ) : preferences?.visibility === "public" ? (
              <Globe className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="capitalize hidden sm:inline">
              {preferences?.visibility === "private"
                ? "Privé"
                : preferences?.visibility === "public"
                ? "Public"
                : "Membres IGL4"}
            </span>
          </button>

          {/* Peer Gallery Link */}
          <Link
            href="/forest/community"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E8F0] text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1.5 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Galerie de Promo</span>
          </Link>

          {/* Launch Focus Timer */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2855D9] hover:bg-[#1E40AF] text-white flex items-center space-x-2 shadow-xs transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Lancer Focus</span>
          </button>
        </div>
      </div>

      {/* Forest Insights Summary Cards */}
      <ForestInsights entries={entries} />

      {/* Main View Switcher & Container */}
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
              <span>Clairière Végétale</span>
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
          <ForestCanvas entries={entries} />
        ) : (
          <ForestTimeline entries={entries} />
        )}
      </div>

      {/* Privacy Configuration Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="bg-white border border-[#E4E8F0] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2855D9] flex items-center justify-center border border-blue-200">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111A2E]">
                  Visibilité de votre Bosquet
                </h3>
                <p className="text-xs text-[#68748A]">
                  Contrôlez qui peut contempler votre forêt d&apos;étude.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {[
                {
                  id: "members",
                  title: "Membres IGL4 (Recommandé)",
                  desc: "Visible uniquement par vos camarades connectés et authentifiés.",
                  icon: Users,
                },
                {
                  id: "private",
                  title: "Privé (Strict)",
                  desc: "Votre forêt n'apparaît pas dans la galerie de la promotion.",
                  icon: Lock,
                },
                {
                  id: "public",
                  title: "Public",
                  desc: "Accessible publiquement via votre lien de profil académique.",
                  icon: Globe,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedVisibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSaveVisibility(opt.id as ForestVisibility)}
                    disabled={isSavingPref}
                    className={cn(
                      "w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3",
                      isSelected
                        ? "bg-blue-50/60 border-[#2855D9] ring-1 ring-[#2855D9]"
                        : "bg-[#FAFAF7] border-[#E4E8F0] hover:bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        isSelected
                          ? "bg-[#2855D9] text-white"
                          : "bg-white text-[#68748A] border border-[#E4E8F0]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#111A2E] block">
                        {opt.title}
                      </span>
                      <span className="text-[11px] text-[#68748A] leading-tight block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E4E8F0] text-[11px] text-[#68748A] space-y-1">
              <p className="font-semibold text-[#182235]">Règles de confidentialité strictes :</p>
              <p>• Vos notes privées, étiquettes et emails ne sont jamais divulgués.</p>
              <p>• Seuls le nombre d&apos;arbres et le temps cumulé sont partagés.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#68748A] hover:bg-[#F4F6FA] transition-colors cursor-pointer"
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
