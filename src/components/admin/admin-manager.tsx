"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  Layers,
  BookOpen,
  Calendar,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Archive,
  Trash2,
  Edit2,
  ShieldAlert,
  ArrowRight,
  Lock,
  UserCheck,
  UserX,
  Users,
  Clock,
  Search,
  Activity,
  Eye,
  Sliders,
  Sparkles,
  Radio,
  Crown,
  BarChart3,
  Volume2,
  GraduationCap,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Semester,
  Subject,
  ResourceCategory,
  AudioCatalogEntry,
  VipEntitlement,
  UserPresence,
  AnalyticsOverview,
} from "@/types/database";
import {
  createSubject,
  updateSubject,
  deleteSubject,
  createSemester,
  grantTemporaryAdminRole,
  revokeAdminRole,
  ManagedUser,
} from "@/lib/actions/admin-actions";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { AuthenticatedActor } from "@/lib/auth/authorization";
import {
  AVAILABLE_SUBJECT_ICONS,
  PRESET_ACCESSIBLE_COLORS,
  getSubjectVisual,
} from "@/components/academic/subject-icon";
import { AdminAudioCatalog } from "./admin-audio-catalog";
import { AdminVipManager } from "./admin-vip-manager";
import { AdminPresenceView } from "./admin-presence-view";
import { AdminAnalyticsView } from "./admin-analytics-view";
import { AdminStudentsView } from "./admin-students-view";
import { AdminEmailBroadcastView } from "./admin-email-broadcast";
import { StudentPerformanceOverview } from "@/lib/actions/profile-actions";

interface AdminManagerProps {
  initialSemesters: Semester[];
  initialSubjects: Subject[];
  initialCategories: ResourceCategory[];
  totalResources: number;
  currentUser?: AuthenticatedActor | null;
  isAdmin?: boolean;
  initialUsers?: ManagedUser[];
  initialAuditLogs?: any[];
  initialCatalogEntries?: AudioCatalogEntry[];
  initialVipEntitlements?: VipEntitlement[];
  initialPresenceUsers?: Array<UserPresence & { isRecent: boolean; timeAgoSeconds: number }>;
  initialTotalActiveUsers?: number;
  initialAnalytics?: AnalyticsOverview | null;
  initialStudentsPerformance?: StudentPerformanceOverview[];
}

export function AdminManager({
  initialSemesters,
  initialSubjects,
  initialCategories,
  totalResources,
  currentUser = null,
  isAdmin = false,
  initialUsers = [],
  initialAuditLogs = [],
  initialCatalogEntries = [],
  initialVipEntitlements = [],
  initialPresenceUsers = [],
  initialTotalActiveUsers = 0,
  initialAnalytics = null,
  initialStudentsPerformance = [],
}: AdminManagerProps) {
  const [activeTab, setActiveTab] = useState<
    "curriculum" | "delegation" | "students" | "vip" | "audio" | "presence" | "analytics" | "audit" | "email"
  >("curriculum");
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [categories, setCategories] = useState<ResourceCategory[]>(initialCategories);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [userToRevoke, setUserToRevoke] = useState<ManagedUser | null>(null);

  // Role delegation state
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [userToDelegate, setUserToDelegate] = useState<ManagedUser | null>(null);
  const [delegationDuration, setDelegationDuration] = useState<number>(30); // 30 days
  const [customExpiresDate, setCustomExpiresDate] = useState<string>("");
  const [isDelegating, setIsDelegating] = useState<boolean>(false);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);

  // Subject Modal State (Create & Edit)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subSemesterId, setSubSemesterId] = useState(semesters[0]?.id || "");
  const [subDescription, setSubDescription] = useState("");
  const [selectedIconName, setSelectedIconName] = useState("BookOpen");
  const [selectedHexColor, setSelectedHexColor] = useState("#2563EB");
  const [customHexInput, setCustomHexInput] = useState("");
  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Semester Modal State
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [semName, setSemName] = useState("");
  const [semYear, setSemYear] = useState("2026-2027");
  const [isSubmittingSem, setIsSubmittingSem] = useState(false);

  // Audit Logs State
  const [auditLogs] = useState<any[]>(initialAuditLogs);
  const [auditFilter, setAuditFilter] = useState("");
  const [auditPeriodFilter, setAuditPeriodFilter] = useState<"all" | "today" | "7d" | "30d">("all");

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Filtered icons for picker
  const filteredIcons = useMemo(() => {
    if (!iconSearchQuery.trim()) return AVAILABLE_SUBJECT_ICONS;
    const q = iconSearchQuery.toLowerCase();
    return AVAILABLE_SUBJECT_ICONS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.label.toLowerCase().includes(q)
    );
  }, [iconSearchQuery]);

  // Dynamic preview visual
  const previewVisual = useMemo(() => {
    return getSubjectVisual(subName || "Aperçu Matière", `${selectedIconName}:${selectedHexColor}`);
  }, [subName, selectedIconName, selectedHexColor]);
  const PreviewIcon = previewVisual.icon;

  const handleSubNameChange = (name: string) => {
    setSubName(name);
    if (!subjectToEdit) {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSubSlug(slug);
    }
  };

  const openCreateSubjectModal = () => {
    setSubjectToEdit(null);
    setSubName("");
    setSubSlug("");
    setSubDescription("");
    setSubSemesterId(semesters[0]?.id || "");
    setSelectedIconName("BookOpen");
    setSelectedHexColor("#2563EB");
    setCustomHexInput("");
    setIconSearchQuery("");
    setErrorMsg("");
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = (sub: Subject) => {
    setSubjectToEdit(sub);
    setSubName(sub.name);
    setSubSlug(sub.slug);
    setSubDescription(sub.description || "");
    setSubSemesterId(sub.semester_id);

    // Parse icon and color
    if (sub.icon?.includes(":")) {
      const [ic, col] = sub.icon.split(":");
      setSelectedIconName(ic || "BookOpen");
      setSelectedHexColor(col || "#2563EB");
    } else {
      setSelectedIconName(sub.icon || "BookOpen");
      setSelectedHexColor("#2563EB");
    }
    setCustomHexInput("");
    setIconSearchQuery("");
    setErrorMsg("");
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    setIsSubmittingSub(true);
    setErrorMsg("");

    const finalIconConfig = `${selectedIconName}:${selectedHexColor}`;

    try {
      if (subjectToEdit) {
        // Edit Mode
        const res = await updateSubject(subjectToEdit.id, {
          name: subName,
          description: subDescription,
          semester_id: subSemesterId,
          icon: finalIconConfig,
        });

        if (res.error) {
          setErrorMsg(res.error);
          return;
        }

        if (res.subject) {
          setSubjects((prev) =>
            prev.map((s) => (s.id === subjectToEdit.id ? { ...s, ...res.subject! } : s))
          );
          setIsSubjectModalOpen(false);
          setFeedbackMsg(`Matière "${subName}" mise à jour avec succès !`);
          setTimeout(() => setFeedbackMsg(""), 4000);
        }
      } else {
        // Create Mode
        const res = await createSubject({
          semester_id: subSemesterId || semesters[0]?.id,
          name: subName,
          slug: subSlug,
          description: subDescription,
          icon: finalIconConfig,
          sort_order: subjects.length + 1,
        });

        if (res.error) {
          setErrorMsg(res.error);
          return;
        }

        if (res.subject) {
          setSubjects([...subjects, res.subject]);
          setIsSubjectModalOpen(false);
          setFeedbackMsg(`Matière "${subName}" créée avec succès !`);
          setTimeout(() => setFeedbackMsg(""), 4000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de l'enregistrement de la matière.");
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName.trim() || !semYear.trim()) return;

    if (currentUser?.isTemporaryAdmin) {
      setErrorMsg("Action restreinte : la création de semestres académiques est réservée à l'administrateur principal.");
      return;
    }

    setIsSubmittingSem(true);
    setErrorMsg("");
    try {
      const res = await createSemester({
        name: semName,
        academic_year: semYear,
        sort_order: semesters.length + 1,
      });

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      if (res.semester) {
        setSemesters([...semesters, res.semester]);
        setIsSemesterModalOpen(false);
        setSemName("");
        setFeedbackMsg(`Semestre "${semName}" créé avec succès !`);
        setTimeout(() => setFeedbackMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de la création du semestre.");
    } finally {
      setIsSubmittingSem(false);
    }
  };

  const executeDeleteSubject = async () => {
    if (!subjectToDelete) return;
    if (currentUser?.isTemporaryAdmin) {
      setErrorMsg("Action restreinte : les administrateurs temporaires ne peuvent pas supprimer les matières créées par l'administrateur principal.");
      setSubjectToDelete(null);
      return;
    }
    const sId = subjectToDelete.id;
    const sName = subjectToDelete.name;

    try {
      const res = await deleteSubject(sId);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setSubjects((prev) => prev.filter((s) => s.id !== sId));
      setFeedbackMsg(`Matière "${sName}" supprimée avec succès.`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de la suppression.");
    } finally {
      setSubjectToDelete(null);
    }
  };

  // Delegation Actions
  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelegate) return;

    if (currentUser?.isTemporaryAdmin) {
      setErrorMsg("Action non autorisée : les administrateurs temporaires ne peuvent ni déléguer ni modifier les rôles.");
      return;
    }

    if (userToDelegate.id === currentUser?.id) {
      setErrorMsg("Vous ne pouvez pas modifier ou prolonger vos propres prérogatives administratives.");
      return;
    }

    setIsDelegating(true);
    setErrorMsg("");

    try {
      let expiresAt: string;
      if (customExpiresDate) {
        expiresAt = new Date(customExpiresDate).toISOString();
      } else {
        const d = new Date();
        d.setDate(d.getDate() + delegationDuration);
        expiresAt = d.toISOString();
      }

      const res = await grantTemporaryAdminRole({
        userId: userToDelegate.id,
        customExpiresAt: expiresAt,
      });
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToDelegate.id
            ? {
                ...u,
                role: "admin",
                isTemporaryAdmin: true,
                expiresAt,
                isExpired: false,
              }
            : u
        )
      );

      setFeedbackMsg(`Privilèges Administrateur accordés à ${userToDelegate.displayName}.`);
      setUserToDelegate(null);
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de la délégation.");
    } finally {
      setIsDelegating(false);
    }
  };

  const executeRevokeRole = async () => {
    if (!userToRevoke) return;
    if (currentUser?.isTemporaryAdmin) {
      setErrorMsg("Action non autorisée : les administrateurs temporaires ne peuvent pas révoquer de rôles.");
      return;
    }
    if (userToRevoke.id === currentUser?.id) {
      setErrorMsg("Impossible de révoquer vos propres prérogatives administratives.");
      return;
    }
    const target = userToRevoke;
    setIsRevokingId(target.id);
    setErrorMsg("");

    try {
      const res = await revokeAdminRole(target.id);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? {
                ...u,
                role: "student",
                isTemporaryAdmin: false,
                isPermanentAdmin: false,
                expiresAt: null,
                isExpired: false,
              }
            : u
        )
      );

      setFeedbackMsg(`Privilèges Administrateur révoqués pour ${target.displayName}.`);
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de la révocation.");
    } finally {
      setIsRevokingId(null);
      setUserToRevoke(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alerts */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Admin Session Header */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#111A2E] tracking-tight">
              Paramètres & Console d&apos;Administration
            </h1>
            <p className="text-xs text-[#68748A] mt-0.5">
              Gestion du curriculum IGL4, personnalisation graphique des matières, délégation et audit de sécurité.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {!currentUser?.isTemporaryAdmin && (
            <Button size="sm" variant="outline" onClick={() => setIsSemesterModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Nouveau Semestre</span>
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={openCreateSubjectModal}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Créer une Matière</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-[#E4E8F0] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("curriculum")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "curriculum"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Curriculum ({subjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("delegation")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "delegation"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Délégation Admin ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "students"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Étudiants & Suivi ({initialStudentsPerformance.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audio")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "audio"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Catalogue Audio ({initialCatalogEntries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vip")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "vip"
              ? "bg-amber-600 text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Accès VIP ({initialVipEntitlements.filter((e) => e.status === "active").length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("presence")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "presence"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Présence Live ({initialTotalActiveUsers})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "analytics"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytiques</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "audit"
              ? "bg-[#2855D9] text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Journal d&apos;Audit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            activeTab === "email"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-[#68748A] hover:bg-[#F4F6FA]"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Diffusion Email ({users.length})</span>
        </button>
      </div>

      {/* TAB 1: CURRICULUM & SUBJECT MANAGEMENT */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
              <div className="text-xs text-[#68748A] font-medium">Semestres Actifs</div>
              <div className="text-xl font-bold font-mono text-[#111A2E] mt-1">{semesters.length}</div>
            </div>
            <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
              <div className="text-xs text-[#68748A] font-medium">Matières Enseignées</div>
              <div className="text-xl font-bold font-mono text-[#2855D9] mt-1">{subjects.length}</div>
            </div>
            <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
              <div className="text-xs text-[#68748A] font-medium">Catégories Contrôlées</div>
              <div className="text-xl font-bold font-mono text-[#111A2E] mt-1">{categories.length}</div>
            </div>
            <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
              <div className="text-xs text-[#68748A] font-medium">Ressources Référencées</div>
              <div className="text-xl font-bold font-mono text-[#111A2E] mt-1">{totalResources}</div>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#111A2E] flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-[#2855D9]" />
                  <span>Catalogue des Modules IGL4 ({subjects.length})</span>
                </h2>
                <p className="text-xs text-[#68748A] mt-0.5">
                  Configurez le nom, la couleur thématique, l&apos;icône et le semestre de chaque module.
                </p>
              </div>
              <Button size="sm" variant="primary" onClick={openCreateSubjectModal}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Ajouter un module</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4E8F0] text-[#68748A] font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Identité Visuelle</th>
                    <th className="py-2.5 px-3 font-semibold">Nom de la Matière</th>
                    <th className="py-2.5 px-3 font-semibold">Slug URL</th>
                    <th className="py-2.5 px-3 font-semibold">Semestre</th>
                    <th className="py-2.5 px-3 font-semibold">Statut</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E8F0]">
                  {subjects.map((sub) => {
                    const parentSem = semesters.find((s) => s.id === sub.semester_id);
                    const visual = getSubjectVisual(sub.slug || sub.name, sub.icon);
                    const IconComp = visual.icon;
                    return (
                      <tr key={sub.id} className="hover:bg-[#FAFBFD] transition-colors">
                        <td className="py-2.5 px-3">
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center ${visual.bgLight} ${visual.borderLight}`}
                          >
                            <IconComp className={`w-4 h-4 ${visual.color}`} />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#182235]">
                          <div>{sub.name}</div>
                          {sub.description && (
                            <div className="text-[11px] text-[#68748A] line-clamp-1 max-w-xs font-normal">
                              {sub.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#68748A]">{sub.slug}</td>
                        <td className="py-2.5 px-3 font-mono text-[#68748A]">
                          {parentSem?.name || "Semestre 1"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Actif
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openEditSubjectModal(sub)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#2855D9] hover:bg-[#EDF2FF] border border-[#2855D9]/20 transition-colors cursor-pointer shadow-2xs"
                            title="Modifier l'apparence et les infos"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              currentUser?.isTemporaryAdmin
                                ? setErrorMsg(
                                    "Action restreinte : les administrateurs temporaires ne peuvent pas supprimer les matières créées par l'administrateur principal."
                                  )
                                : setSubjectToDelete(sub)
                            }
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shadow-2xs ${
                              currentUser?.isTemporaryAdmin
                                ? "text-slate-400 border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                                : "text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200 hover:border-rose-600"
                            }`}
                            title={
                              currentUser?.isTemporaryAdmin
                                ? "Action réservée à l'administrateur permanent"
                                : `Supprimer ${sub.name}`
                            }
                          >
                            {currentUser?.isTemporaryAdmin ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>Supprimer</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE DELEGATION & USER MANAGEMENT */}
      {activeTab === "delegation" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#111A2E] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#2855D9]" />
              <span>Délégation des Rôles & Accès Temporaires</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              En tant qu&apos;administrateur principal, vous pouvez accorder un accès administrateur temporaire à un étudiant (ex: pour 1 mois), révocable à tout moment.
            </p>
          </div>

          {currentUser?.isTemporaryAdmin && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Privilèges Administrateur Délégué (Lecture Seule) :</span>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Vous êtes connecté sous mandat temporaire. Par mesure de sécurité et conformément aux règles de gouvernance, l&apos;attribution, la modification et la révocation des rôles d&apos;autres utilisateurs, ainsi que l&apos;auto-extension de vos droits et la modification des paramètres configurés par l&apos;administrateur principal, sont réservées exclusivement à l&apos;administrateur permanent.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E8F0] text-[#68748A] font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3 font-semibold">Utilisateur</th>
                  <th className="py-2.5 px-3 font-semibold">Email</th>
                  <th className="py-2.5 px-3 font-semibold">Rôle & Privilèges</th>
                  <th className="py-2.5 px-3 font-semibold">Validité</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8F0]">
                {users.map((u) => {
                  const isMaster = u.email === "yassinedrira3@gmail.com";
                  const isSelf = Boolean(currentUser?.id && u.id === currentUser.id);
                  const isCallerTemp = Boolean(currentUser?.isTemporaryAdmin);
                  return (
                    <tr key={u.id} className="hover:bg-[#FAFBFD] transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#182235]">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center font-bold text-[10px]">
                            {u.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{u.displayName}</span>
                          {isSelf && (
                            <span className="text-[10px] font-mono font-bold text-[#2855D9] bg-[#EDF2FF] px-1.5 py-0.2 rounded">
                              (Vous)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#68748A]">{u.email}</td>
                      <td className="py-2.5 px-3">
                        {isMaster ? (
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                            👑 Admin Permanent
                          </span>
                        ) : u.isTemporaryAdmin ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 w-fit">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>Admin Temporaire</span>
                          </span>
                        ) : (
                          <span className="bg-[#F4F6FA] text-[#68748A] border border-[#E4E8F0] px-2 py-0.5 rounded text-[10px] font-mono">
                            Étudiant
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#68748A]">
                        {isMaster
                          ? "Illimitée"
                          : u.expiresAt
                          ? `Expire le ${new Date(u.expiresAt).toLocaleDateString()}`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isMaster ? (
                          <span className="text-[11px] text-[#68748A] italic">Protégé</span>
                        ) : isCallerTemp ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] text-[#94A3B8] font-mono">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Lecture seule</span>
                          </span>
                        ) : isSelf ? (
                          <span className="text-[11px] text-[#68748A] italic">Verrouillé</span>
                        ) : u.isTemporaryAdmin ? (
                          <button
                            type="button"
                            onClick={() => setUserToRevoke(u)}
                            disabled={isRevokingId === u.id}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 cursor-pointer"
                          >
                            {isRevokingId === u.id ? "Révocation..." : "Révoquer l'accès"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUserToDelegate(u)}
                            className="text-xs text-[#2855D9] hover:text-[#1E40AF] font-semibold px-2.5 py-1 rounded-lg border border-[#2855D9]/30 hover:bg-[#EDF2FF] cursor-pointer"
                          >
                            Accorder Admin...
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS & MONITORING */}
      {activeTab === "audit" && (
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#111A2E] flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#2855D9]" />
                <span>Surveillance des Événements & Sécurité</span>
              </h2>
              <p className="text-xs text-[#68748A] mt-0.5">
                Audit chronologique des modifications sensibles (accès, suppressions, partages).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                    onClick={() => setAuditPeriodFilter(p.key)}
                    className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                      auditPeriodFilter === p.key
                        ? "bg-[#2855D9] text-white shadow-2xs font-bold"
                        : "text-[#68748A] hover:text-[#111A2E]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  placeholder="Filtrer l'audit..."
                  className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E8F0] text-[#68748A] font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3 font-semibold">Date & Heure</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Acteur</th>
                  <th className="py-2.5 px-3 font-semibold">Cible</th>
                  <th className="py-2.5 px-3 font-semibold">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8F0]">
                {auditLogs
                  .filter((l) => {
                    if (auditFilter) {
                      const matchText =
                        l.action?.toLowerCase().includes(auditFilter.toLowerCase()) ||
                        l.actor_id?.toLowerCase().includes(auditFilter.toLowerCase());
                      if (!matchText) return false;
                    }
                    if (auditPeriodFilter === "all") return true;
                    if (!l.timestamp) return true;
                    const logTime = new Date(l.timestamp).getTime();
                    const now = Date.now();
                    if (auditPeriodFilter === "today") {
                      return new Date(l.timestamp).toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                    }
                    if (auditPeriodFilter === "7d") {
                      return logTime >= now - 7 * 24 * 60 * 60 * 1000;
                    }
                    if (auditPeriodFilter === "30d") {
                      return logTime >= now - 30 * 24 * 60 * 60 * 1000;
                    }
                    return true;
                  })
                  .map((log, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFBFD]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#68748A]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Récent"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAFBFD] border border-[#E4E8F0] text-[#111A2E]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#68748A]">
                        {log.actor_id?.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3 text-[#182235]">
                        {log.target_type} ({log.target_id?.slice(0, 6)}...)
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#68748A]">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SHARED AUDIO CATALOG */}
      {activeTab === "audio" && (
        <AdminAudioCatalog
          initialEntries={initialCatalogEntries}
          onNotify={(msg, isErr) => (isErr ? setErrorMsg(msg) : setFeedbackMsg(msg))}
        />
      )}

      {/* TAB 5: VIP ENTITLEMENTS */}
      {activeTab === "vip" && (
        <AdminVipManager
          initialEntitlements={initialVipEntitlements}
          managedUsers={users}
          isTemporaryAdmin={Boolean(currentUser?.isTemporaryAdmin)}
          onNotify={(msg, isErr) => (isErr ? setErrorMsg(msg) : setFeedbackMsg(msg))}
        />
      )}

      {/* TAB 6: LIVE USER PRESENCE */}
      {activeTab === "presence" && (
        <AdminPresenceView
          initialUsers={initialPresenceUsers}
          initialTotalActive={initialTotalActiveUsers}
        />
      )}

      {/* TAB 7: SITE ANALYTICS */}
      {activeTab === "analytics" && (
        <AdminAnalyticsView initialOverview={initialAnalytics} />
      )}

      {/* TAB 8: STUDENTS PERFORMANCE & ACHIEVEMENTS */}
      {activeTab === "students" && (
        <AdminStudentsView initialStudents={initialStudentsPerformance} />
      )}

      {/* TAB 9: EMAIL ANNOUNCEMENTS & SMTP SERVICE */}
      {activeTab === "email" && (
        <AdminEmailBroadcastView />
      )}

      {/* MODAL: CREATE OR EDIT SUBJECT WITH ICON & COLOR PICKER */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#111A2E]">
                  {subjectToEdit ? "Modifier l'apparence du Module" : "Créer un Nouveau Module Académique"}
                </h3>
                <p className="text-xs text-[#68748A]">
                  Configurez son identité visuelle, son icône dynamique et sa palette accessible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-[#68748A] hover:text-[#111A2E] p-1 rounded-lg hover:bg-[#F4F6FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                    Semestre d&apos;attribution *
                  </label>
                  <select
                    value={subSemesterId}
                    onChange={(e) => setSubSemesterId(e.target.value)}
                    required
                    className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.academic_year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                    Titre du Module *
                  </label>
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => handleSubNameChange(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    required
                    className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                  />
                </div>
              </div>

              {!subjectToEdit && (
                <div>
                  <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                    Slug d&apos;URL *
                  </label>
                  <input
                    type="text"
                    value={subSlug}
                    onChange={(e) => setSubSlug(e.target.value)}
                    placeholder="distributed-systems"
                    required
                    className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs font-mono text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                  Description du Module
                </label>
                <textarea
                  rows={2}
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  placeholder="Objectifs pédagogiques, compétences et programme..."
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-2.5 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              {/* SECTION: ICON PICKER */}
              <div className="space-y-2 pt-2 border-t border-[#E4E8F0]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#111A2E]">
                    Sélection de l&apos;Icône :
                  </label>
                  <div className="relative w-48">
                    <Search className="w-3 h-3 text-[#68748A] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={iconSearchQuery}
                      onChange={(e) => setIconSearchQuery(e.target.value)}
                      placeholder="Chercher une icône..."
                      className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-lg pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:border-[#2855D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1.5 border border-[#E4E8F0] rounded-xl bg-[#FAFBFD]">
                  {filteredIcons.map((ic) => {
                    const IconComp = ic.icon;
                    const isSelected = selectedIconName.toLowerCase() === ic.name.toLowerCase();
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setSelectedIconName(ic.name)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#2855D9] text-white border-[#2855D9] shadow-xs"
                            : "bg-white text-[#182235] border-[#E4E8F0] hover:bg-[#F4F6FA]"
                        }`}
                        title={ic.label}
                      >
                        <IconComp className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-mono truncate w-full">{ic.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: COLOR SELECTION & HEX INPUT */}
              <div className="space-y-2 pt-2 border-t border-[#E4E8F0]">
                <label className="block text-xs font-semibold text-[#111A2E]">
                  Palette & Couleur Thématique :
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_ACCESSIBLE_COLORS.map((col) => {
                    const isSelected = selectedHexColor.toLowerCase() === col.hex.toLowerCase();
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => {
                          setSelectedHexColor(col.hex);
                          setCustomHexInput(col.hex);
                        }}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? "ring-2 ring-[#2855D9] ring-offset-1 border-[#2855D9]"
                            : "border-[#E4E8F0] bg-white hover:bg-[#FAFBFD]"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="text-[11px] text-[#182235]">{col.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2 pt-1 text-xs">
                  <span className="text-[#68748A]">Ou code HEX personnalisé :</span>
                  <input
                    type="text"
                    value={customHexInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomHexInput(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        setSelectedHexColor(val);
                      }
                    }}
                    placeholder="#2563EB"
                    className="w-24 bg-[#FAFBFD] border border-[#E4E8F0] rounded-lg px-2.5 py-1 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* SECTION: LIVE CARD & HEADER PREVIEW */}
              <div className="pt-2 border-t border-[#E4E8F0] space-y-1.5">
                <span className="text-xs font-semibold text-[#111A2E] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2855D9]" />
                  <span>Aperçu en Direct de l&apos;Apparence :</span>
                </span>
                <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 flex items-center space-x-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${previewVisual.bgLight} ${previewVisual.borderLight}`}
                  >
                    <PreviewIcon className={`w-6 h-6 ${previewVisual.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full border ${previewVisual.badgeBg} ${previewVisual.borderLight}`}>
                        Semestre 1
                      </span>
                      <span className="text-xs text-[#68748A]">• Code : {subSlug || "module"}</span>
                    </div>
                    <div className="font-bold text-sm text-[#111A2E] mt-0.5 truncate">
                      {subName || "Nom du Module"}
                    </div>
                    <div className="text-[11px] text-[#68748A] truncate">
                      {subDescription || "Description pédagogique du module..."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
                <Button type="button" size="sm" variant="ghost" onClick={() => setIsSubjectModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" variant="primary" disabled={isSubmittingSub}>
                  {isSubmittingSub ? "Enregistrement..." : subjectToEdit ? "Mettre à jour" : "Créer le Module"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SEMESTER */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="font-bold text-sm text-[#111A2E]">Ajouter un Semestre Académique</h3>
              <button
                type="button"
                onClick={() => setIsSemesterModalOpen(false)}
                className="text-[#68748A] hover:text-[#111A2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">Nom du Semestre *</label>
                <input
                  type="text"
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="e.g. Semestre 3"
                  required
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111A2E] mb-1">Année Universitaire *</label>
                <input
                  type="text"
                  value={semYear}
                  onChange={(e) => setSemYear(e.target.value)}
                  placeholder="2026-2027"
                  required
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#111A2E] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4E8F0]">
                <Button type="button" size="sm" variant="ghost" onClick={() => setIsSemesterModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" variant="primary" disabled={isSubmittingSem}>
                  {isSubmittingSem ? "Enregistrement..." : "Créer le Semestre"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ROLE DELEGATION MODAL */}
      {userToDelegate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="font-bold text-sm text-[#111A2E]">
                Délégation d&apos;Accès Administrateur Temporaire
              </h3>
              <button
                type="button"
                onClick={() => setUserToDelegate(null)}
                className="text-[#68748A] hover:text-[#111A2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#68748A]">
              Vous allez accorder un accès administrateur temporaire à{" "}
              <strong className="text-[#111A2E]">{userToDelegate.displayName}</strong> ({userToDelegate.email}).
              Cet utilisateur pourra gérer les matières, semestres et fichiers jusqu&apos;à expiration.
            </p>

            <form onSubmit={handleGrantRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111A2E] mb-2">
                  Durée de validité de l&apos;accès :
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "24 heures (1 jour)", days: 1 },
                    { label: "7 jours (1 semaine)", days: 7 },
                    { label: "30 jours (1 mois)", days: 30 },
                    { label: "90 jours (3 mois)", days: 90 },
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => {
                        setDelegationDuration(option.days);
                        setCustomExpiresDate("");
                      }}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                        delegationDuration === option.days && !customExpiresDate
                          ? "border-[#2855D9] bg-[#EDF2FF] text-[#2855D9] font-semibold"
                          : "border-[#E4E8F0] bg-[#FAFBFD] text-[#182235] hover:bg-[#F4F6FA]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                  Ou choisir une date personnalisée d&apos;expiration :
                </label>
                <input
                  type="date"
                  value={customExpiresDate}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  onChange={(e) => setCustomExpiresDate(e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
                <Button type="button" size="sm" variant="ghost" onClick={() => setUserToDelegate(null)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" variant="primary" disabled={isDelegating}>
                  {isDelegating ? "En cours..." : "Confirmer l'accès Administrateur"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(subjectToDelete)}
          onClose={() => setSubjectToDelete(null)}
          onConfirm={executeDeleteSubject}
          itemName={subjectToDelete.name}
          itemType="subject"
          itemFormat="Module Académique"
        />
      )}

      {/* Revoke Role Confirmation Modal */}
      {userToRevoke && (
        <DeleteConfirmModal
          isOpen={Boolean(userToRevoke)}
          onClose={() => setUserToRevoke(null)}
          onConfirm={executeRevokeRole}
          itemName={userToRevoke.displayName}
          itemType="user"
          itemFormat="Privilèges Administrateur"
        />
      )}
    </div>
  );
}
