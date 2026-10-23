"use client";

import React, { useState } from "react";
import {
  Users,
  Laptop,
  Smartphone,
  Tablet,
  HelpCircle,
  RefreshCw,
  Clock,
  Activity,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserPresence, DeviceCategory } from "@/types/database";
import { getLivePresenceList } from "@/lib/actions/presence-actions";

interface AdminPresenceViewProps {
  initialUsers: Array<UserPresence & { isRecent: boolean; timeAgoSeconds: number }>;
  initialTotalActive: number;
}

const DEVICE_ICONS: Record<DeviceCategory, React.ComponentType<{ className?: string }>> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: HelpCircle,
};

export function AdminPresenceView({
  initialUsers,
  initialTotalActive,
}: AdminPresenceViewProps) {
  const [users, setUsers] = useState(initialUsers);
  const [totalActive, setTotalActive] = useState(initialTotalActive);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getLivePresenceList();
      if (res.success) {
        setUsers(res.users);
        setTotalActive(res.totalActive);
        setLastUpdated(new Date());
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeNow = users.filter((u) => !u.isRecent);
  const recentNow = users.filter((u) => u.isRecent);

  return (
    <div className="space-y-6">
      {/* Presence Metrics & Refresh Bar */}
      <div className="bg-white border border-[#E4E8F0] p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#111A2E] flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Surveillance de Présence en Direct</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Estimation d&apos;activité en temps réel basée sur des battements de cœur (heartbeats 60s) légers et sans suivi intrusif.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-[#94A3B8]">
              Mis à jour : {lastUpdated.toLocaleTimeString("fr-FR")}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs h-8 px-3"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 text-[#2855D9] ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>Actualiser</span>
            </Button>
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-medium">En ligne (&lt; 3 min)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">{totalActive}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              Étudiants connectés en cours d&apos;activité
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl">
            <div className="text-xs text-blue-800 font-medium">Actifs récemment (&lt; 15 min)</div>
            <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
              {recentNow.length}
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">
              Sessions en arrière-plan ou pause
            </div>
          </div>

          <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl">
            <div className="text-xs text-[#68748A] font-medium">Total détecté récent</div>
            <div className="text-2xl font-bold font-mono text-[#111A2E] mt-1">
              {users.length}
            </div>
            <div className="text-[10px] text-[#68748A] mt-0.5">
              Purger automatique des inactifs après 30 min
            </div>
          </div>
        </div>

        {/* Privacy badge */}
        <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 flex items-center space-x-2 text-xs text-[#68748A]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Garantie de Confidentialité :</strong> Aucun contenu privé, note de révision, ou URL personnelle n&apos;est transmise. Seuls la section générale et le type d&apos;appareil générique sont mesurés.
          </span>
        </div>
      </div>

      {/* Online Users List */}
      <div className="bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E4E8F0] bg-[#FAFBFD] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#111A2E]">
            Étudiants Actifs Récemment ({users.length})
          </span>
          <span className="text-[11px] text-[#68748A]">Triés par dernière activité</span>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center text-[#68748A] text-xs space-y-2">
            <Users className="w-8 h-8 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#111A2E]">Aucun utilisateur actif détecté récemment.</p>
            <p>Les présences apparaîtront automatiquement dès que les étudiants exploreront la plateforme.</p>
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E8F0] bg-white text-[#68748A] font-semibold">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Appareil</th>
                  <th className="py-3 px-4">Section consultée</th>
                  <th className="py-3 px-4 text-right">Dernier contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8F0]">
                {users.map((user) => {
                  const DeviceIcon = DEVICE_ICONS[user.device_category] || HelpCircle;
                  const timeFormatted =
                    user.timeAgoSeconds < 60
                      ? `il y a ${user.timeAgoSeconds}s`
                      : user.timeAgoSeconds < 3600
                      ? `il y a ${Math.round(user.timeAgoSeconds / 60)} min`
                      : `il y a ${Math.round(user.timeAgoSeconds / 3600)} h`;

                  return (
                    <tr key={user.user_id} className="hover:bg-[#FAFBFD] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center font-bold text-xs shrink-0">
                            {user.display_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111A2E]">{user.display_name}</div>
                            <div className="text-[10px] text-[#94A3B8] font-mono">
                              ID: {user.user_id.slice(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            !user.isRecent
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !user.isRecent ? "bg-emerald-500" : "bg-blue-400"
                            }`}
                          />
                          <span>{!user.isRecent ? "En ligne" : "Actif récemment"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#68748A]">
                        <div className="flex items-center space-x-1.5 capitalize">
                          <DeviceIcon className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{user.device_category}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#68748A]">
                        <div className="flex items-center space-x-1 font-mono text-[11px]">
                          <Compass className="w-3 h-3 text-[#94A3B8]" />
                          <span>{user.current_route || "/"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#68748A] font-mono text-[11px]">
                        <div className="flex items-center justify-end space-x-1">
                          <Clock className="w-3 h-3 text-[#94A3B8]" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
