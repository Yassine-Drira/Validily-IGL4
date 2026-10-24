"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Cpu,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RotateCcw,
  Crown,
  Search,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import type { AIMonitoringSummary, AIUsageLog } from "@/types/database";
import {
  getAdminAIMonitoringDataAction,
  adminResetUserAIQuotaAction,
  adminGrantVipPassAction,
  adminRevokeVipPassAction,
} from "@/lib/actions/admin-ai-actions";

export function AdminAIMonitorView() {
  const [data, setData] = useState<AIMonitoringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    try {
      const res = await getAdminAIMonitoringDataAction();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Error loading AI monitoring data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleResetQuota = async (userId: string, name: string) => {
    setActionLoadingId(`reset-${userId}`);
    setFeedback(null);
    try {
      const res = await adminResetUserAIQuotaAction(userId);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Quota réinitialisé avec succès pour ${name} (5 nouvelles requêtes accordées).`,
        });
        loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Erreur lors de la réinitialisation." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur de connexion." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleVip = async (userId: string, currentVip: boolean, name: string) => {
    setActionLoadingId(`vip-${userId}`);
    setFeedback(null);
    try {
      if (currentVip) {
        const res = await adminRevokeVipPassAction(userId);
        if (res.success) {
          setFeedback({ type: "success", message: `Pass VIP révoqué pour ${name}.` });
          loadData();
        } else {
          setFeedback({ type: "error", message: res.error || "Échec de révocation du VIP." });
        }
      } else {
        const res = await adminGrantVipPassAction(userId, 30);
        if (res.success) {
          setFeedback({ type: "success", message: `Pass VIP accordé pour 30 jours à ${name} !` });
          loadData();
        } else {
          setFeedback({ type: "error", message: res.error || "Échec d'attribution du VIP." });
        }
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur de connexion." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = (data?.userQuotas || []).filter((u) => {
    const q = searchUser.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855D9]" />
        <p className="text-xs text-[#68748A]">Chargement de la télémétrie et des quotas IA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold hover:underline shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EDF2FF] border border-[#2855D9]/20 flex items-center justify-center text-[#2855D9]">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#111A2E]">
              Console de Contrôle IA & Surveillance des Quotas
            </h2>
          </div>
          <p className="text-xs text-[#68748A] mt-1">
            Supervision en temps réel des jetons consommés, latences des modèles et quotas glissants 24h
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#111A2E] text-xs font-bold border border-[#E4E8F0] shadow-2xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#2855D9]" : ""}`} />
          <span>Actualiser les métriques</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#E4E8F0] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#68748A] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#2855D9]" />
            Requêtes (24h)
          </span>
          <p className="text-xl font-bold text-[#111A2E] mt-2 font-tabular">
            {data?.requests24h ?? 0}
          </p>
          <p className="text-[10px] text-[#68748A] mt-0.5">Sur {data?.totalRequests ?? 0} au total</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E4E8F0] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#68748A] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Blocages Quota
          </span>
          <p className="text-xl font-bold text-amber-700 mt-2 font-tabular">
            {data?.quotaBlockedCount ?? 0}
          </p>
          <p className="text-[10px] text-[#68748A] mt-0.5">Utilisateurs ayant atteint 5/5</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E4E8F0] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#68748A] flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            Accès VIP Actifs
          </span>
          <p className="text-xl font-bold text-[#111A2E] mt-2 font-tabular">
            {data?.activeVipUsersCount ?? 0}
          </p>
          <p className="text-[10px] text-[#059669] font-semibold mt-0.5">Quotas illimités</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E4E8F0] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#68748A] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#059669]" />
            Latence Moyenne
          </span>
          <p className="text-xl font-bold text-[#111A2E] mt-2 font-tabular">
            {data?.averageLatencyMs ?? 0} <span className="text-xs font-normal text-[#68748A]">ms</span>
          </p>
          <p className="text-[10px] text-[#68748A] mt-0.5">Temps de réponse neural</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E4E8F0] shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#68748A] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            Tokens Estimés
          </span>
          <p className="text-xl font-bold text-purple-700 mt-2 font-tabular">
            {data?.totalTokens.toLocaleString() ?? 0}
          </p>
          <p className="text-[10px] text-[#68748A] mt-0.5">Prompt + Complétion</p>
        </div>
      </div>

      {/* Provider Gateways Status */}
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E8F0] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#111A2E] uppercase tracking-wider font-mono">
            Passerelles IA Configurées :
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-[#E4E8F0] text-[#111A2E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Groq (GPT-OSS 120B)</span>
            </span>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-[#E4E8F0] text-[#111A2E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Google Gemini 1.5 Flash</span>
            </span>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-[#E4E8F0] text-[#111A2E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Moteur RAG Déterministe</span>
            </span>
          </div>
        </div>

        <span className="text-[11px] text-[#68748A]">
          Règle : 5 requêtes / 24h glissantes (Gratuit) • VIP Illimité
        </span>
      </div>

      {/* Section 1: User Quota Oversight & Administrative Reset */}
      <div className="bg-white rounded-3xl border border-[#E4E8F0] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#111A2E] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2855D9]" />
              <span>Gestion des Quotas Étudiants & Déblocage Immédiat</span>
            </h3>
            <p className="text-[11px] text-[#68748A]">
              Réinitialisez instantanément le compteur d'un étudiant bloqué ou accordez-lui un Pass VIP
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer un étudiant..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F8FAFC] border border-[#E4E8F0] focus:bg-white focus:border-[#2855D9] outline-none transition-all"
            />
          </div>
        </div>

        {/* User Quotas Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8F0] text-[10px] uppercase font-bold text-[#68748A] tracking-wider">
                <th className="pb-3 px-3">Étudiant</th>
                <th className="pb-3 px-3">Statut Quota (24h)</th>
                <th className="pb-3 px-3">Type d'accès</th>
                <th className="pb-3 px-3">Dernière activité</th>
                <th className="pb-3 px-3 text-right">Actions Administrateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8F0]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#68748A]">
                    Aucun étudiant ne correspond à la recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isBlocked = !u.isVip && u.used24h >= 5;
                  const isLoadingReset = actionLoadingId === `reset-${u.userId}`;
                  const isLoadingVip = actionLoadingId === `vip-${u.userId}`;

                  return (
                    <tr key={u.userId} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#111A2E]">{u.displayName}</p>
                        <p className="text-[10px] text-[#68748A]">{u.email}</p>
                      </td>

                      <td className="py-3 px-3">
                        {u.isVip ? (
                          <span className="text-[#059669] font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Illimité</span>
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold font-tabular text-[11px] ${
                                  isBlocked ? "text-rose-600 font-bold" : "text-[#111A2E]"
                                }`}
                              >
                                {u.used24h} / 5 requêtes
                              </span>
                              {isBlocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700">
                                  Bloqué
                                </span>
                              )}
                            </div>
                            {/* Visual Progress Meter */}
                            <div className="w-24 h-1.5 rounded-full bg-[#E4E8F0] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isBlocked
                                    ? "bg-rose-500"
                                    : u.used24h >= 4
                                    ? "bg-amber-500"
                                    : "bg-[#2855D9]"
                                }`}
                                style={{ width: `${Math.min(100, (u.used24h / 5) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {u.isVip ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1 w-fit">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Pass VIP</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#68748A] border border-[#E4E8F0] w-fit">
                            Standard (5 max)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[#68748A] text-[11px]">
                        {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString("fr-FR") : "Jamais"}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetQuota(u.userId, u.displayName)}
                            disabled={isLoadingReset}
                            className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#2855D9] border border-[#2855D9]/30 text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Remettre le quota à zéro (5 requêtes neuves)"
                          >
                            <RotateCcw className={`w-3 h-3 ${isLoadingReset ? "animate-spin" : ""}`} />
                            <span>Réinitialiser Quota</span>
                          </button>

                          <button
                            onClick={() => handleToggleVip(u.userId, u.isVip, u.displayName)}
                            disabled={isLoadingVip}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                              u.isVip
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300"
                            }`}
                          >
                            <Crown className="w-3 h-3" />
                            <span>{u.isVip ? "Révoquer VIP" : "Accorder VIP"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Recent AI Requests Telemetry Log */}
      <div className="bg-white rounded-3xl border border-[#E4E8F0] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#111A2E] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#059669]" />
            <span>Journal d'Inférence & Télémétrie en Direct (50 dernières requêtes)</span>
          </h3>
          <p className="text-[11px] text-[#68748A]">
            Suivi des appels LLM, latences par requête et détection d'erreurs
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8F0] text-[10px] uppercase font-bold text-[#68748A] tracking-wider">
                <th className="pb-3 px-3">Date & Heure</th>
                <th className="pb-3 px-3">Étudiant</th>
                <th className="pb-3 px-3">Passerelle & Modèle</th>
                <th className="pb-3 px-3">Action</th>
                <th className="pb-3 px-3">Tokens / Latence</th>
                <th className="pb-3 px-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8F0]">
              {(data?.recentLogs || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#68748A]">
                    Aucune requête enregistrée pour l'instant.
                  </td>
                </tr>
              ) : (
                (data?.recentLogs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 text-[#68748A] text-[11px] font-tabular">
                      {new Date(log.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[#111A2E]">{log.user_display_name}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] text-[#111A2E]">{log.provider}</span>
                      <p className="text-[10px] text-[#68748A] truncate max-w-[140px]">{log.model}</p>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDF2FF] text-[#2855D9] uppercase font-mono">
                        {log.action_type}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-tabular text-[11px]">
                      <span>{log.total_tokens || 0} tok</span>
                      <span className="text-[#68748A] ml-2">• {log.latency_ms || 0}ms</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {log.status === "success" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Succès</span>
                        </span>
                      )}
                      {log.status === "quota_exceeded" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Quota 5/5</span>
                        </span>
                      )}
                      {log.status === "error" && (
                        <span
                          title={log.error_message || "Erreur"}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Erreur</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
