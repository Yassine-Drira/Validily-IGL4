"use client";

import React, { useState } from "react";
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
  ShieldAlert,
  ArrowRight,
  Lock,
  UserCheck,
  UserX,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Semester, Subject, ResourceCategory } from "@/types/database";
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

interface AdminManagerProps {
  initialSemesters: Semester[];
  initialSubjects: Subject[];
  initialCategories: ResourceCategory[];
  totalResources: number;
  currentUser?: AuthenticatedActor | null;
  isAdmin?: boolean;
  initialUsers?: ManagedUser[];
}

export function AdminManager({
  initialSemesters,
  initialSubjects,
  initialCategories,
  totalResources,
  currentUser = null,
  isAdmin = false,
  initialUsers = [],
}: AdminManagerProps) {
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [categories, setCategories] = useState<ResourceCategory[]>(initialCategories);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Role delegation state
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [userToDelegate, setUserToDelegate] = useState<ManagedUser | null>(null);
  const [delegationDuration, setDelegationDuration] = useState<number>(30); // 30 days by default
  const [customExpiresDate, setCustomExpiresDate] = useState<string>("");
  const [isDelegating, setIsDelegating] = useState<boolean>(false);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subSemesterId, setSubSemesterId] = useState(semesters[0]?.id || "");
  const [subDescription, setSubDescription] = useState("");
  const [subIcon, setSubIcon] = useState("BookOpen");
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Semester Modal State
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [semName, setSemName] = useState("");
  const [semYear, setSemYear] = useState("2024-2025");
  const [isSubmittingSem, setIsSubmittingSem] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleSubNameChange = (name: string) => {
    setSubName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSubSlug(slug);
  };

  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    setIsSubmittingSub(true);
    setErrorMsg("");
    try {
      const res = await createSubject({
        semester_id: subSemesterId || semesters[0]?.id,
        name: subName,
        slug: subSlug,
        description: subDescription,
        icon: subIcon,
        sort_order: subjects.length + 1,
      });

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      if (res.subject) {
        setSubjects([...subjects, res.subject]);
        setIsSubjectModalOpen(false);
        setSubName("");
        setSubSlug("");
        setSubDescription("");
        setFeedbackMsg(`Subject "${subName}" created and persisted successfully!`);
        setTimeout(() => setFeedbackMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create subject.");
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName.trim() || !semYear.trim()) return;

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
        setSemesters([...semesters, { ...res.semester, subject_count: 0 }]);
      }
      setIsSemesterModalOpen(false);
      setSemName("");
      setFeedbackMsg(`Semester "${semName}" added to curriculum!`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create semester.");
    } finally {
      setIsSubmittingSem(false);
    }
  };

  const handleArchive = async (subjectId: string, subjectName: string) => {
    try {
      const res = await updateSubject(subjectId, { name: subjectName });
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setSubjects(
        subjects.map((s) => (s.id === subjectId ? { ...s, is_active: false } : s))
      );
      setFeedbackMsg(`Matière "${subjectName}" archivée.`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de l'archivage.");
    }
  };

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelegate) return;

    setIsDelegating(true);
    setErrorMsg("");
    try {
      const res = await grantTemporaryAdminRole({
        userId: userToDelegate.id,
        durationDays: customExpiresDate ? undefined : delegationDuration,
        customExpiresAt: customExpiresDate ? new Date(customExpiresDate).toISOString() : undefined,
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
                isPermanentAdmin: false,
                expiresAt: res.expiresAt || null,
                isExpired: false,
              }
            : u
        )
      );

      const formattedDate = res.expiresAt ? new Date(res.expiresAt).toLocaleDateString("fr-FR") : "";
      setFeedbackMsg(`Privilèges Administrateur temporaires accordés à ${userToDelegate.displayName} jusqu'au ${formattedDate}.`);
      setUserToDelegate(null);
      setCustomExpiresDate("");
      setDelegationDuration(30);
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de l'octroi du rôle administrateur.");
    } finally {
      setIsDelegating(false);
    }
  };

  const handleRevokeRole = async (user: ManagedUser) => {
    if (user.email === "yassinedrira3@gmail.com") {
      setErrorMsg("Impossible de révoquer l'administrateur principal.");
      return;
    }

    setIsRevokingId(user.id);
    setErrorMsg("");
    try {
      const res = await revokeAdminRole(user.id);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
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

      setFeedbackMsg(`Privilèges Administrateur révoqués pour ${user.displayName}.`);
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de la révocation.");
    } finally {
      setIsRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Admin Session Chip */}
      <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <span className="font-semibold text-emerald-800">
              Session Administrateur Active :
            </span>{" "}
            <span className="font-mono text-emerald-950 font-medium">
              {currentUser?.email || "yassinedrira3@gmail.com"}
            </span>{" "}
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono ml-1">
              Admin Principal
            </span>
          </div>
        </div>
        <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">
          Gestion du curriculum et délégation des rôles activées
        </span>
      </div>

      {/* Summary Cards */}
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[#182235] tracking-tight">
                Paramètres & Console d&apos;Administration
              </h1>
              <p className="text-xs text-[#68748A] mt-0.5">
                Configuration des semestres, des matières d&apos;IGL4 et gestion des catégories.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!isAdmin) {
                  setErrorMsg("Privilèges Administrateur requis. Cliquez sur 'Activer Mode Admin (1 clic)' ci-dessus.");
                  return;
                }
                setIsSemesterModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Semester</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (!isAdmin) {
                  setErrorMsg("Privilèges Administrateur requis. Cliquez sur 'Activer Mode Admin (1 clic)' ci-dessus.");
                  return;
                }
                setIsSubjectModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create Subject</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#E4E8F0] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-3 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Semesters</div>
            <div className="text-lg font-bold text-[#182235] mt-1 font-mono font-tabular">
              {semesters.length}
            </div>
          </div>
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-3 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Subjects Active</div>
            <div className="text-lg font-bold text-[#2855D9] mt-1 font-mono font-tabular">
              {subjects.filter((s) => s.is_active).length}
            </div>
          </div>
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-3 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Categories</div>
            <div className="text-lg font-bold text-[#182235] mt-1 font-mono font-tabular">
              {categories.length}
            </div>
          </div>
          <div className="bg-[#FAFAF7] border border-[#E4E8F0] p-3 rounded-lg">
            <div className="text-xs text-[#68748A] font-medium">Indexed Docs</div>
            <div className="text-lg font-bold text-[#182235] mt-1 font-mono font-tabular">
              {totalResources}
            </div>
          </div>
        </div>
      </div>

      {/* Semesters & Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semesters */}
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#2855D9]" />
              <span>Academic Semesters ({semesters.length})</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setIsSemesterModalOpen(true)}
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </Button>
          </div>

          <div className="space-y-2">
            {semesters.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-md border border-[#E4E8F0] bg-[#FAFAF7] text-xs"
              >
                <div>
                  <div className="font-semibold text-[#182235]">{s.name}</div>
                  <div className="text-[#68748A] font-mono text-[11px]">
                    AY {s.academic_year} • Order #{s.sort_order}
                  </div>
                </div>
                <span className="bg-[#F4F6FA] text-[#182235] px-2 py-0.5 rounded text-[11px] font-mono font-tabular border border-[#E4E8F0]">
                  {subjects.filter((sub) => sub.semester_id === s.id).length} subjects
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#2855D9]" />
              <span>Controlled Categories ({categories.length})</span>
            </h2>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-[#E4E8F0] bg-[#FAFAF7] text-xs"
              >
                <div>
                  <div className="font-semibold text-[#182235]">{c.name}</div>
                  <div className="text-[#68748A] font-mono text-[11px]">
                    slug: {c.slug}
                  </div>
                </div>
                <span className="bg-[#F4F6FA] text-[#68748A] px-2 py-0.5 rounded text-[11px] font-mono border border-[#E4E8F0]">
                  Order #{c.sort_order}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects Catalog Table */}
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#2855D9]" />
              <span>Curriculum Subject Registry ({subjects.length} Modules)</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Administrators can add, edit, and archive subjects without editing application code.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (!isAdmin) {
                setErrorMsg("Privilèges Administrateur requis pour créer des matières. Activez le mode Administrateur ci-dessus.");
                return;
              }
              setIsSubjectModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Subject</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8F0] text-[#68748A] font-mono uppercase text-[10px]">
                <th className="py-2 px-3 font-semibold">Order</th>
                <th className="py-2 px-3 font-semibold">Subject Name</th>
                <th className="py-2 px-3 font-semibold">Slug</th>
                <th className="py-2 px-3 font-semibold">Semester</th>
                <th className="py-2 px-3 font-semibold">Status</th>
                <th className="py-2 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8F0]">
              {subjects.map((sub) => {
                const parentSem = semesters.find((s) => s.id === sub.semester_id);
                return (
                  <tr key={sub.id} className="hover:bg-[#F4F6FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-tabular text-[#68748A]">
                      #{sub.sort_order}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#182235]">
                      {sub.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#68748A]">
                      {sub.slug}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#68748A]">
                      {parentSem?.name || "Semester 1"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          sub.is_active
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-[#F4F6FA] text-[#68748A] border border-[#E4E8F0]"
                        }`}
                      >
                        {sub.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAdmin) {
                            setErrorMsg("Privilèges Administrateur requis pour supprimer des matières. Activez le mode Administrateur ci-dessus.");
                            return;
                          }
                          setSubjectToDelete(sub);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer shadow-2xs"
                        title={`Supprimer ${sub.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {/* SECTION: USER ROLES & TEMPORARY ADMIN DELEGATION */}
      <div className="bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#182235] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#2855D9]" />
              <span>Délégation des Rôles & Accès Administrateur Temporaires</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              En tant qu&apos;administrateur principal, vous pouvez accorder un accès administrateur temporaire à un étudiant (ex: pour 1 mois), révocable à tout moment.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#68748A] bg-[#F4F6FA] px-2.5 py-1 rounded-md border border-[#E4E8F0] self-start sm:self-auto">
            {users.length} compte{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8F0] text-[#68748A] font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3 font-semibold">Utilisateur</th>
                <th className="py-2.5 px-3 font-semibold">Email</th>
                <th className="py-2.5 px-3 font-semibold">Rôle & Privilèges</th>
                <th className="py-2.5 px-3 font-semibold">Validité de l&apos;accès</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8F0]">
              {users.map((u) => {
                const isMaster = u.email === "yassinedrira3@gmail.com";
                const isTemp = u.isTemporaryAdmin && u.expiresAt;
                const expiresDate = u.expiresAt ? new Date(u.expiresAt) : null;
                const daysLeft = expiresDate ? Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 3600 * 24)) : null;

                return (
                  <tr key={u.id} className="hover:bg-[#F4F6FA] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#182235]">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center font-bold text-[10px]">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.displayName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#68748A]">
                      {u.email}
                    </td>
                    <td className="py-2.5 px-3">
                      {isMaster ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          <Shield className="w-3 h-3 text-emerald-600" />
                          <span>Admin Principal (Propriétaire)</span>
                        </span>
                      ) : isTemp ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          <span>Admin Temporaire</span>
                        </span>
                      ) : (
                        <span className="bg-[#F4F6FA] text-[#68748A] border border-[#E4E8F0] px-2 py-0.5 rounded text-[10px] font-medium">
                          Étudiant
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#68748A]">
                      {isMaster ? (
                        <span className="text-emerald-700 font-sans font-medium">Permanent</span>
                      ) : isTemp && expiresDate ? (
                        <span className="text-indigo-700 font-sans font-medium">
                          Expire le {expiresDate.toLocaleDateString("fr-FR")} ({daysLeft} jour{daysLeft && daysLeft > 1 ? "s" : ""} restant{daysLeft && daysLeft > 1 ? "s" : ""})
                        </span>
                      ) : (
                        <span className="text-[#A0AEC0]">Accès étudiant standard</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isMaster ? (
                        <span className="text-[10px] font-mono text-[#A0AEC0] italic">
                          Protégé
                        </span>
                      ) : isTemp ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeRole(u)}
                          disabled={isRevokingId === u.id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer"
                          title="Révoquer les droits administrateur"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>{isRevokingId === u.id ? "Révocation..." : "Révoquer Accès"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUserToDelegate(u)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#2855D9] hover:text-white hover:bg-[#2855D9] border border-[#2855D9]/30 hover:border-[#2855D9] transition-colors cursor-pointer"
                          title="Accorder un accès administrateur temporaire"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Accorder Accès Admin</span>
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

      {/* Modal: Grant Temporary Admin Role */}
      {userToDelegate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#2855D9]" />
                <h3 className="font-semibold text-sm text-[#182235]">
                  Déléguer l&apos;accès Administrateur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelegate(null)}
                className="text-[#68748A] hover:text-[#182235] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#68748A]">
              Vous allez accorder un accès administrateur temporaire à{" "}
              <strong className="text-[#182235]">{userToDelegate.displayName}</strong> ({userToDelegate.email}).
              Cet utilisateur pourra gérer les matières, semestres et fichiers jusqu&apos;à expiration.
            </p>

            <form onSubmit={handleGrantRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-2">
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
                      className={`p-2.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                        delegationDuration === option.days && !customExpiresDate
                          ? "border-[#2855D9] bg-[#EDF2FF] text-[#2855D9] font-semibold"
                          : "border-[#E4E8F0] bg-[#FAFAF7] text-[#182235] hover:bg-[#F4F6FA]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  Ou choisir une date personnalisée d&apos;expiration :
                </label>
                <input
                  type="date"
                  value={customExpiresDate}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  onChange={(e) => setCustomExpiresDate(e.target.value)}
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E8F0]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setUserToDelegate(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isDelegating}
                >
                  {isDelegating ? "En cours..." : "Confirmer l'accès Administrateur"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Subject */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="font-semibold text-sm text-[#182235]">
                Register New Subject Module
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-[#68748A] hover:text-[#182235] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Assign to Semester *
                </label>
                <select
                  value={subSemesterId}
                  onChange={(e) => setSubSemesterId(e.target.value)}
                  required
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] cursor-pointer"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  Subject Title *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => handleSubNameChange(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  required
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  placeholder="distributed-systems"
                  required
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] font-mono focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  placeholder="Module scope, topics, and syllabus overview..."
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md p-2.5 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4E8F0]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSubjectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isSubmittingSub}
                >
                  {isSubmittingSub ? "Creating..." : "Save Subject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Semester */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8F0] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="font-semibold text-sm text-[#182235]">
                Add Academic Semester
              </h3>
              <button
                type="button"
                onClick={() => setIsSemesterModalOpen(false)}
                className="text-[#68748A] hover:text-[#182235] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  Semester Name *
                </label>
                <input
                  type="text"
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="e.g. Semester 3 or Summer Session"
                  required
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#182235] mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  value={semYear}
                  onChange={(e) => setSemYear(e.target.value)}
                  placeholder="2025-2026"
                  required
                  className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4E8F0]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSemesterModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isSubmittingSem}
                >
                  {isSubmittingSem ? "Adding..." : "Add Semester"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Subject Confirmation */}
      {subjectToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title={`Supprimer la matière ${subjectToDelete.name}`}
          itemName={subjectToDelete.name}
          itemType="subject"
          warningMessage="Cette action supprimera définitivement cette matière ainsi que tous ses dossiers, ressources, QCM, mémos et données de révision."
          onClose={() => setSubjectToDelete(null)}
          onConfirm={async () => {
            const res = await deleteSubject(subjectToDelete.id);
            if (res.error) {
              throw new Error(res.error);
            }
            setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
            setFeedbackMsg(`Matière "${subjectToDelete.name}" définitivement supprimée.`);
            setTimeout(() => setFeedbackMsg(""), 4000);
            setSubjectToDelete(null);
          }}
        />
      )}
    </div>
  );
}
