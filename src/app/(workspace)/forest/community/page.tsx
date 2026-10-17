"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getCommunityForests, getMyForest, sendClassmateCheer } from "@/lib/actions/forest-actions";
import { MemberForestSummary, ForestEntry } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "@/components/forest/tree-models";
import { ForestCanvas } from "@/components/forest/forest-canvas";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Trees,
  Clock,
  ArrowLeft,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Compass,
  Lock,
  Shield,
  Heart,
  User,
  Award,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentProfileModal } from "@/components/profile/student-profile-modal";

export default function CommunityForestPage() {
  const searchParams = useSearchParams();
  const studentParam = searchParams ? searchParams.get("student") : null;

  const [members, setMembers] = useState<MemberForestSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<MemberForestSummary | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(studentParam || null);
  const [peerTrees, setPeerTrees] = useState<ForestEntry[] | null>(null);
  const [isLoadingPeer, setIsLoadingPeer] = useState<boolean>(false);
  const [cheerFeedback, setCheerFeedback] = useState<string>("");
  const [isCheering, setIsCheering] = useState<boolean>(false);

  useEffect(() => {
    if (studentParam) {
      setProfileModalUserId(studentParam);
    }
  }, [studentParam]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await getCommunityForests();
      if (Array.isArray(res)) {
        setMembers(res);
        setIsAuthenticated(res.length > 0);
      }
    } catch {
      // Local fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (!selectedMember) {
      setPeerTrees(null);
      return;
    }
    let cancelled = false;
    setIsLoadingPeer(true);
    getMyForest(selectedMember.userId)
      .then((res) => {
        if (!cancelled) {
          setPeerTrees(res?.trees || []);
        }
      })
      .catch(() => {
        if (!cancelled) setPeerTrees([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPeer(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMember]);

  const handleSendCheer = async (type: "water" | "clap" | "fire" | "muscle") => {
    if (!selectedMember || isCheering) return;
    setIsCheering(true);
    setCheerFeedback("");

    try {
      const res = await sendClassmateCheer({
        recipientId: selectedMember.userId,
        recipientName: selectedMember.displayName,
        cheerType: type,
      });

      if (res.success) {
        setCheerFeedback(res.message);
        setTimeout(() => setCheerFeedback(""), 4500);
      } else {
        if (
          res.error?.toLowerCase().includes("connecté") ||
          res.error?.toLowerCase().includes("authentification")
        ) {
          window.location.href = "/login?next=/forest/community";
          return;
        }
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

  const filteredMembers = useMemo(() => {
    return members.filter((m) =>
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const activePeerEntries = peerTrees || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <Link
              href="/forest"
              className="p-2 text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] rounded-xl transition-colors cursor-pointer"
              title="Retour à mon bosquet"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111A2E] tracking-tight">
                  Galerie des Bosquets — Promo IGL4
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#2855D9] border border-blue-200">
                  Motivation Partagée
                </span>
              </div>
              <p className="text-xs text-[#68748A] mt-0.5">
                Explorez les forêts grandissantes de vos camarades et célébrez la régularité d&apos;étude sans esprit de rivalité toxique.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchMembers}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E8F0] text-[#182235] hover:bg-[#F4F6FA] flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Peer Grove Modal when a member is selected */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white border border-[#E4E8F0] rounded-3xl max-w-4xl w-full max-h-[94vh] sm:max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 relative scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs sm:text-sm border border-emerald-200 shrink-0">
                  {selectedMember.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[#111A2E] truncate">
                    Bosquet de {selectedMember.displayName}
                  </h3>
                  <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] sm:text-xs text-[#68748A] font-mono">
                    <span className="text-emerald-700 font-semibold">
                      {selectedMember.healthyTreeCount} arbres
                    </span>
                    <span>•</span>
                    <span className="text-[#2855D9] font-semibold">
                      {Math.round(selectedMember.totalFocusedMinutes / 60)}h focus
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalUserId(selectedMember.userId);
                    setSelectedMember(null);
                  }}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2855D9] hover:bg-[#1E43B2] text-white transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profil &amp; Accomplissements</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F4F6FA] hover:bg-[#E4E8F0] text-[#182235] transition-colors cursor-pointer shrink-0"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Read-only interactive landscape */}
            {isLoadingPeer ? (
              <div className="h-[280px] sm:h-[340px] rounded-3xl bg-[#FAFBFD] border border-[#E4E8F0] flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-[#2855D9] animate-spin" />
                <span className="text-xs text-[#68748A] font-medium">
                  Chargement du bosquet de {selectedMember.displayName}...
                </span>
              </div>
            ) : (
              <ForestCanvas
                entries={activePeerEntries}
                readOnly={true}
                ownerName={selectedMember.displayName}
              />
            )}

            {/* Encouragement & Cheers Interaction Toolbar */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50/70 via-teal-50/60 to-blue-50/70 rounded-2xl border border-emerald-200/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-[#111A2E] truncate">
                    Encourager {selectedMember.displayName} :
                  </span>
                  {activePeerEntries.length === 0 && (
                    <span className="text-[11px] text-[#68748A] hidden md:inline">
                      (Arrosez son île pour faire naître sa première pousse !)
                    </span>
                  )}
                </div>
                {cheerFeedback && (
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs animate-in fade-in self-start sm:self-auto">
                    {cheerFeedback}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={isCheering}
                  onClick={() => handleSendCheer("water")}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                  title="Arroser son bosquet pour soutenir ses efforts"
                >
                  <span className="text-sm">💧</span>
                  <span>Arroser<span className="hidden sm:inline">&nbsp;le bosquet</span></span>
                </button>
                <button
                  type="button"
                  disabled={isCheering}
                  onClick={() => handleSendCheer("clap")}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                  title="Féliciter pour les sessions accomplies"
                >
                  <span className="text-sm">👏</span>
                  <span>Félicitations</span>
                </button>
                <button
                  type="button"
                  disabled={isCheering}
                  onClick={() => handleSendCheer("fire")}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                  title="Saluer l'assiduité d'étude"
                >
                  <span className="text-sm">🔥</span>
                  <span>Assiduité<span className="hidden sm:inline">&nbsp;au top</span></span>
                </button>
                <button
                  type="button"
                  disabled={isCheering}
                  onClick={() => handleSendCheer("muscle")}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-purple-200 hover:bg-purple-50 text-purple-800 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                  title="Envoyer de la force pour les révisions"
                >
                  <span className="text-sm">💪</span>
                  <span>Force<span className="hidden sm:inline">&nbsp;& Révisions</span></span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#68748A] pt-2">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Lecture seule sécurisée — notes personnelles protégées</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-[#2855D9] hover:underline font-semibold"
              >
                Retour à la galerie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar & Community Statistics Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#68748A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un camarade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4E8F0] rounded-xl text-xs text-[#111A2E] placeholder-[#68748A] focus:outline-hidden focus:ring-2 focus:ring-[#2855D9]/20 focus:border-[#2855D9]"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#68748A] self-end sm:self-auto font-mono">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>{filteredMembers.length} camarades visibles</span>
        </div>
      </div>

      {/* Members Forest Grid */}
      {filteredMembers.length === 0 ? (
        !isAuthenticated ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E4E8F0] p-8 space-y-4 shadow-2xs">
            <Lock className="w-10 h-10 text-[#2855D9] mx-auto opacity-75" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111A2E]">
                Galerie réservée aux membres de la promo IGL4
              </h3>
              <p className="text-xs text-[#68748A] max-w-md mx-auto">
                Par respect pour la vie privée, les bosquets partagés sont réservés aux étudiants authentifiés. Connectez-vous pour célébrer les efforts de vos camarades !
              </p>
            </div>
            <div>
              <Link
                href="/login?next=/forest/community"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#2855D9] text-white text-xs font-semibold hover:bg-[#1E43B2] transition-colors shadow-2xs cursor-pointer"
              >
                <span>Se connecter pour voir les bosquets</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E4E8F0] p-8 space-y-3 shadow-2xs">
            <Compass className="w-10 h-10 text-[#68748A] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-[#111A2E]">
              {searchQuery ? `Aucun camarade trouvé pour "${searchQuery}"` : "Aucun bosquet trouvé"}
            </h3>
            <p className="text-xs text-[#68748A] max-w-sm mx-auto">
              {searchQuery
                ? "Vérifiez l'orthographe du prénom ou du nom de votre camarade."
                : "Invitez vos camarades à valider leur première session de concentration dans leur Bosquet Focus."}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const initials = member.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const hours = Math.floor(member.totalFocusedMinutes / 60);

            return (
              <div
                key={member.userId}
                onClick={() => setSelectedMember(member)}
                className="bg-white border border-[#E4E8F0] hover:border-[#BACDFE] rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center border border-emerald-200">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#111A2E] group-hover:text-[#2855D9] transition-colors">
                          {member.displayName}
                        </h3>
                        <span className="text-[11px] text-[#68748A] font-mono">
                          Étudiant IGL4
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl text-[#68748A] group-hover:text-[#2855D9] group-hover:bg-blue-50 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 gap-2 mt-4 bg-[#FAFBFD] p-3 rounded-2xl border border-[#E4E8F0]">
                    <div className="flex items-center space-x-2">
                      <Trees className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#68748A] block leading-none">
                          Arbres sains
                        </span>
                        <span className="text-sm font-bold text-emerald-800 font-mono font-tabular">
                          {member.healthyTreeCount}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 border-l border-[#E4E8F0] pl-2.5">
                      <Clock className="w-4 h-4 text-[#2855D9] shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#68748A] block leading-none">
                          Focus total
                        </span>
                        <span className="text-sm font-bold text-[#2855D9] font-mono font-tabular">
                          {hours}h {member.totalFocusedMinutes % 60}m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tree Species Thumbnails */}
                <div className="pt-2 border-t border-[#E4E8F0] flex items-center justify-between">
                  <div className="flex items-center -space-x-2">
                    {member.healthyTreeCount > 0 ? (
                      member.recentSpecies.slice(0, 4).map((sp, idx) => (
                        <div
                          key={idx}
                          className="w-7 h-7 rounded-full bg-white border border-[#E4E8F0] shadow-2xs flex items-center justify-center overflow-hidden"
                          title={`Espèce : ${SPECIES_METADATA[sp]?.name || sp}`}
                        >
                          <TreeSvg
                            species={sp}
                            status="healthy"
                            size={24}
                            showMound={false}
                          />
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#68748A] italic">
                        Bosquet naissant
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileModalUserId(member.userId);
                      }}
                      className="text-[11px] font-semibold text-[#2855D9] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <User className="w-3 h-3" />
                      <span>Profil &amp; badges</span>
                    </button>
                    <span className="text-[11px] font-semibold text-[#68748A] group-hover:text-[#2855D9] flex items-center space-x-0.5">
                      <span>Bosquet</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Student Profile Modal */}
      <StudentProfileModal
        studentId={profileModalUserId}
        isOpen={Boolean(profileModalUserId)}
        onClose={() => setProfileModalUserId(null)}
      />
    </div>
  );
}
