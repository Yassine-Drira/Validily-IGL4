"use client";

import React, { useState } from "react";
import {
  Crown,
  Plus,
  ShieldAlert,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Sparkles,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VipEntitlement } from "@/types/database";
import { grantVipAccess, revokeVipAccess } from "@/lib/actions/vip-actions";
import { ManagedUser } from "@/lib/actions/admin-actions";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface AdminVipManagerProps {
  initialEntitlements: VipEntitlement[];
  managedUsers: ManagedUser[];
  onNotify?: (msg: string, isError?: boolean) => void;
}

export function AdminVipManager({
  initialEntitlements,
  managedUsers,
  onNotify,
}: AdminVipManagerProps) {
  const [entitlements, setEntitlements] = useState<VipEntitlement[]>(initialEntitlements);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired" | "revoked">("all");

  // Grant VIP modal state
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [grantDurationDays, setGrantDurationDays] = useState<number>(30);
  const [customExpiresDate, setCustomExpiresDate] = useState<string>("");
  const [grantReason, setGrantReason] = useState<string>("");
  const [userSearchText, setUserSearchText] = useState("");
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [grantError, setGrantError] = useState("");

  // Revoke VIP modal state
  const [entitlementToRevoke, setEntitlementToRevoke] = useState<VipEntitlement | null>(null);

  // Filter entitlements
  const filteredEntitlements = entitlements.filter((ent) => {
    if (filterStatus !== "all" && ent.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (ent.user_display_name || "").toLowerCase();
      const reason = (ent.reason || "").toLowerCase();
      const granter = (ent.granter_display_name || "").toLowerCase();
      return name.includes(q) || reason.includes(q) || granter.includes(q);
    }
    return true;
  });

  // Eligible users for grant (students and non-super-admins)
  const eligibleUsers = managedUsers.filter((u) => {
    if (!userSearchText.trim()) return true;
    const q = userSearchText.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openGrantModal = () => {
    setSelectedUserId(eligibleUsers[0]?.id || "");
    setGrantDurationDays(30);
    setCustomExpiresDate("");
    setGrantReason("Bourse d'étude & accès sonothèque étendue");
    setUserSearchText("");
    setGrantError("");
    setIsGrantModalOpen(true);
  };

  const handleExecuteGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setGrantError("Veuillez sélectionner un étudiant.");
      return;
    }

    setIsSubmittingGrant(true);
    setGrantError("");

    try {
      const res = await grantVipAccess({
        targetUserId: selectedUserId,
        durationDays: customExpiresDate ? undefined : grantDurationDays,
        customExpiresAt: customExpiresDate || undefined,
        reason: grantReason,
      });

      if (!res.success || !res.entitlement) {
        setGrantError(res.error || "Échec de l'attribution VIP.");
        return;
      }

      const targetUser = managedUsers.find((u) => u.id === selectedUserId);
      const enhancedEnt: VipEntitlement = {
        ...res.entitlement,
        user_display_name: targetUser?.displayName || "Étudiant",
        granter_display_name: "Vous (Administrateur)",
      };

      setEntitlements((prev) => [
        enhancedEnt,
        ...prev.filter((e) => e.user_id !== selectedUserId),
      ]);

      onNotify?.(
        `Accès VIP accordé avec succès à ${targetUser?.displayName || "l'étudiant"}.`
      );
      setIsGrantModalOpen(false);
    } catch (err: any) {
      setGrantError(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  const handleExecuteRevoke = async () => {
    if (!entitlementToRevoke) return;
    const target = entitlementToRevoke;

    try {
      const res = await revokeVipAccess(target.id);
      if (!res.success) {
        onNotify?.(res.error || "Échec de la révocation.", true);
        return;
      }

      setEntitlements((prev) =>
        prev.map((e) => (e.id === target.id ? { ...e, status: "revoked" } : e))
      );

      onNotify?.(`Accès VIP révoqué pour ${target.user_display_name || "l'utilisateur"}.`);
      setEntitlementToRevoke(null);
    } catch (err: any) {
      onNotify?.(err?.message || "Erreur de révocation.", true);
    }
  };

  const activeCount = entitlements.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header & VIP Security Explanation */}
      <div className="bg-white border border-[#E4E8F0] p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#111A2E] flex items-center space-x-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Gestion des Accès VIP & Quotas Étendus ({activeCount} actifs)</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Accordez et révoquez des accès sonores VIP temporaires (25 emplacements audio personnalisés) en toute sécurité.
            </p>
          </div>

          <Button size="sm" variant="primary" onClick={openGrantModal}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Accorder un Accès VIP</span>
          </Button>
        </div>

        {/* Security Notice Box */}
        <div className="bg-[#FAFBFD] border border-amber-200/70 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-[#68748A]">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#111A2E]">Principe de Sécurité Supabase & RLS :</span>
            <p>
              L&apos;accès VIP est un <strong>titre d&apos;accès sonore (entitlement)</strong> et ne constitue en aucun cas un rôle d&apos;administration. L&apos;attribution de cet accès n&apos;expose aucune permission Supabase supplémentaire, n&apos;ouvre pas la console admin et protège l&apos;intégrité de la plateforme.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {(["all", "active", "expired", "revoked"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer capitalize ${
                filterStatus === status
                  ? "bg-[#2855D9] text-white shadow-2xs font-semibold"
                  : "bg-white border border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA]"
              }`}
            >
              {status === "all"
                ? `Tous (${entitlements.length})`
                : status === "active"
                ? `Actifs (${activeCount})`
                : status === "expired"
                ? "Expirés"
                : "Révoqués"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Filtrer étudiant ou motif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E4E8F0] rounded-xl text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
          />
        </div>
      </div>

      {/* Entitlements Table */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-xs">
        {filteredEntitlements.length === 0 ? (
          <div className="p-12 text-center text-[#68748A] text-xs space-y-2">
            <Crown className="w-8 h-8 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#111A2E]">Aucun octroi VIP correspondant trouvé.</p>
            <p>Utilisez &ldquo;Accorder un Accès VIP&rdquo; pour promouvoir un étudiant au statut sonore étendu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E8F0] bg-[#FAFBFD] text-[#68748A] font-semibold">
                  <th className="py-3 px-4">Bénéficiaire</th>
                  <th className="py-3 px-4">Motif d&apos;attribution</th>
                  <th className="py-3 px-4">Période & Expiration</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8F0]">
                {filteredEntitlements.map((ent) => {
                  const now = new Date();
                  const expDate = new Date(ent.expires_at);
                  const isActuallyExpired = ent.status === "active" && expDate < now;
                  const effectiveStatus = isActuallyExpired ? "expired" : ent.status;

                  return (
                    <tr key={ent.id} className="hover:bg-[#FAFBFD] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-[#111A2E]">
                              {ent.user_display_name || "Étudiant"}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] font-mono">
                              ID: {ent.user_id.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#68748A]">
                        <span className="line-clamp-1">{ent.reason || "Accès standard accordé"}</span>
                        {ent.granter_display_name && (
                          <div className="text-[10px] text-[#94A3B8]">
                            Par : {ent.granter_display_name}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#68748A]">
                        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-[#94A3B8]" />
                          <span>
                            {new Date(ent.starts_at).toLocaleDateString("fr-FR")} →{" "}
                            {expDate.toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            effectiveStatus === "active"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : effectiveStatus === "expired"
                              ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {effectiveStatus === "active"
                            ? "Actif"
                            : effectiveStatus === "expired"
                            ? "Expiré"
                            : "Révoqué"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {effectiveStatus === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEntitlementToRevoke(ent)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200 h-7 px-2.5"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            <span>Révoquer</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GRANT VIP MODAL */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="font-bold text-sm text-[#111A2E] flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Accorder un Accès Sonore VIP</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGrantModalOpen(false)}
                className="text-[#68748A] hover:text-[#111A2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {grantError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{grantError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteGrant} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  Sélectionner l&apos;étudiant bénéficiaire :
                </label>
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-1.5 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9] mb-2"
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                >
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  Durée de validité de l&apos;accès VIP :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "7 jours (1 semaine)", days: 7 },
                    { label: "14 jours (2 semaines)", days: 14 },
                    { label: "30 jours (1 mois)", days: 30 },
                    { label: "90 jours (3 mois)", days: 90 },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        setGrantDurationDays(opt.days);
                        setCustomExpiresDate("");
                      }}
                      className={`p-2.5 rounded-xl border text-left font-medium transition cursor-pointer ${
                        grantDurationDays === opt.days && !customExpiresDate
                          ? "border-amber-400 bg-amber-50 text-amber-900 font-semibold"
                          : "border-[#E4E8F0] bg-[#FAFBFD] text-[#68748A] hover:bg-[#F4F6FA]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  Ou date d&apos;expiration personnalisée :
                </label>
                <input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  value={customExpiresDate}
                  onChange={(e) => setCustomExpiresDate(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">
                  Motif administratif (traçabilité d&apos;audit) :
                </label>
                <input
                  type="text"
                  placeholder="ex: Bourse d'excellence / Participant concours"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsGrantModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isSubmittingGrant}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSubmittingGrant ? "Attribution..." : "Confirmer l'accès VIP"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE CONFIRM MODAL */}
      {entitlementToRevoke && (
        <DeleteConfirmModal
          isOpen={Boolean(entitlementToRevoke)}
          onClose={() => setEntitlementToRevoke(null)}
          onConfirm={handleExecuteRevoke}
          itemName={entitlementToRevoke.user_display_name || "l'étudiant"}
          itemType="user"
          itemFormat="Privilèges VIP (Sonothèque étendue)"
        />
      )}
    </div>
  );
}
