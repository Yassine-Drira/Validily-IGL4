"use client";

import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  Search,
  Trees,
  Flame,
  Award,
  Clock,
  User,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentPerformanceOverview, StudentPublicProfile } from "@/lib/actions/profile-actions";
import { StudentProfileModal } from "@/components/profile/student-profile-modal";
import { VipBadge } from "@/components/ui/vip-badge";
import { cn } from "@/lib/utils";

interface AdminStudentsViewProps {
  initialStudents?: StudentPerformanceOverview[];
}

export function AdminStudentsView({
  initialStudents = [],
}: AdminStudentsViewProps) {
  const [students, setStudents] = useState<StudentPerformanceOverview[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "student" | "vip" | "admin">("all");
  const [inspectedStudentId, setInspectedStudentId] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.displayName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterRole === "admin") return s.role === "admin";
      if (filterRole === "vip") return s.isVip;
      if (filterRole === "student") return s.role === "student" && !s.isVip;

      return true;
    });
  }, [students, searchQuery, filterRole]);

  // Aggregate stats
  const totalFocusMinutes = students.reduce((acc, s) => acc + s.totalFocusedMinutes, 0);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);
  const totalTreesPlanted = students.reduce((acc, s) => acc + s.healthyTreesCount, 0);
  const avgAchievements =
    students.length > 0
      ? (
          students.reduce((acc, s) => acc + s.achievementsUnlocked, 0) /
          students.length
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E4E8F0] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#68748A]">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">
              Effectif Suivi
            </span>
            <GraduationCap className="w-4 h-4 text-[#2855D9]" />
          </div>
          <div className="text-2xl font-extrabold text-[#111A2E] font-mono">
            {students.length}
          </div>
          <p className="text-[11px] text-[#68748A]">
            Comptes étudiants et délégués répertoriés
          </p>
        </div>

        <div className="bg-white border border-[#E4E8F0] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#68748A]">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">
              Temps Focus Global
            </span>
            <Clock className="w-4 h-4 text-[#2855D9]" />
          </div>
          <div className="text-2xl font-extrabold text-[#111A2E] font-mono">
            {totalFocusHours > 0
              ? `${totalFocusHours} h ${totalFocusMinutes % 60 > 0 ? `${totalFocusMinutes % 60} m` : ""}`.trim()
              : `${totalFocusMinutes} m`}
          </div>
          <p className="text-[11px] text-[#68748A]">
            Concentration totale vérifiée sur le cursus
          </p>
        </div>

        <div className="bg-white border border-[#E4E8F0] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">
              Forêt Collective
            </span>
            <Trees className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 font-mono">
            {totalTreesPlanted} {totalTreesPlanted > 1 ? "arbres" : "arbre"}
          </div>
          <p className="text-[11px] text-[#68748A]">
            Totalité des arbres sains cultivés en sessions
          </p>
        </div>

        <div className="bg-white border border-[#E4E8F0] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">
              Moy. Accomplissements
            </span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900 font-mono">
            {avgAchievements} / 12
          </div>
          <p className="text-[11px] text-[#68748A]">
            Jalons de persévérance débloqués en moyenne
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E8F0] p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#68748A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou adresse e-mail d'étudiant..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAFAF7] focus:bg-white border border-[#E4E8F0] focus:border-[#2855D9] rounded-xl text-xs text-[#111A2E] focus:outline-hidden transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
          {[
            { id: "all", label: "Tous" },
            { id: "student", label: "Étudiants" },
            { id: "vip", label: "VIP ✨" },
            { id: "admin", label: "Admins 🛡️" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterRole(f.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                filterRole === f.id
                  ? "bg-[#182235] text-white"
                  : "bg-[#FAFAF7] hover:bg-[#F4F6FA] text-[#68748A] border border-[#E4E8F0]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Students Performance Table */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-[#E4E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111A2E]">
              Tableau de bord de suivi ({filteredStudents.length})
            </h3>
            <p className="text-xs text-[#68748A]">
              Consultez instantanément les bosquets, séries et accomplissements de chaque membre.
            </p>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-[#68748A] text-xs">
            Aucun étudiant ne correspond aux critères de recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBFD] border-b border-[#E4E8F0] text-[11px] font-mono text-[#68748A] uppercase">
                  <th className="py-3 px-4 font-semibold">Étudiant</th>
                  <th className="py-3 px-3 font-semibold">Statut</th>
                  <th className="py-3 px-3 font-semibold text-center">Temps Focus</th>
                  <th className="py-3 px-3 font-semibold text-center">Série Active</th>
                  <th className="py-3 px-3 font-semibold text-center">Arbres Sains</th>
                  <th className="py-3 px-3 font-semibold text-center">Accomplissements</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F4F9]">
                {filteredStudents.map((s) => {
                  const hours = Math.floor(s.totalFocusedMinutes / 60);
                  const mins = s.totalFocusedMinutes % 60;
                  const initials = s.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-[#FAFBFD] transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-900 font-extrabold text-[11px] flex items-center justify-center border border-emerald-200 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-[#111A2E] block truncate">
                              {s.displayName}
                            </span>
                            {s.email && (
                              <span className="text-[10px] text-[#68748A] font-mono block truncate">
                                {s.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role & Badges */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          {s.role === "admin" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAFAF7] text-[#68748A] border border-[#E4E8F0]">
                              Étudiant
                            </span>
                          )}
                          {s.isVip && (
                            <VipBadge variant="compact" />
                          )}
                        </div>
                      </td>

                      {/* Focus Time */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-[#182235]">
                        {hours}h {mins}m
                      </td>

                      {/* Streak */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold font-mono border border-amber-200 text-[11px]">
                          <Flame className="w-3 h-3 text-orange-500 fill-orange-500/20" />
                          <span>{s.streak} j</span>
                        </span>
                      </td>

                      {/* Healthy Trees (Bosquet) */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold font-mono border border-emerald-200 text-[11px]">
                          <Trees className="w-3 h-3 text-emerald-600" />
                          <span>{s.healthyTreesCount}</span>
                        </span>
                      </td>

                      {/* Achievements */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold font-mono border border-blue-200 text-[11px]">
                          <Award className="w-3 h-3 text-[#2855D9]" />
                          <span>{s.achievementsUnlocked}/12</span>
                        </span>
                      </td>

                      {/* Action: Consult Full Profile */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectedStudentId(s.id)}
                          className="hover:border-[#2855D9] hover:text-[#2855D9] cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 mr-1 text-[#2855D9]" />
                          <span>Consulter</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Student Inspection Modal */}
      {(() => {
        const selected = inspectedStudentId
          ? students.find((s) => s.id === inspectedStudentId) || null
          : null;
        const initialProfile: StudentPublicProfile | null = selected
          ? {
              id: selected.id,
              displayName: selected.displayName,
              avatarUrl: selected.avatarUrl || null,
              role: selected.role,
              isVip: selected.isVip,
              email: selected.email,
              stats: {
                streak: selected.streak,
                totalFocusedMinutes: selected.totalFocusedMinutes,
                healthyTreesCount: selected.healthyTreesCount,
                witheredTreesCount: 0,
                totalSessions: selected.healthyTreesCount,
                speciesCount: Math.min(selected.healthyTreesCount, 5),
              },
              trees: [],
              achievements: [],
              unlockedAchievementsCount: selected.achievementsUnlocked,
            }
          : null;

        return (
          <StudentProfileModal
            studentId={inspectedStudentId}
            isOpen={Boolean(inspectedStudentId)}
            onClose={() => setInspectedStudentId(null)}
            initialProfile={initialProfile}
          />
        );
      })()}
    </div>
  );
}
