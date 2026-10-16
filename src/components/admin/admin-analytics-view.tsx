"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  Compass,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Flame,
  Info,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsOverview, DeviceCategory } from "@/types/database";
import { getAnalyticsOverview } from "@/lib/actions/analytics-actions";

interface AdminAnalyticsViewProps {
  initialOverview: AnalyticsOverview | null;
}

export function AdminAnalyticsView({ initialOverview }: AdminAnalyticsViewProps) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(initialOverview);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [isLoading, setIsLoading] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);

  const handleTimeRangeChange = async (range: "24h" | "7d" | "30d") => {
    setTimeRange(range);
    setIsLoading(true);
    try {
      const res = await getAnalyticsOverview(range);
      if (res.success && res.overview) {
        setOverview(res.overview);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!overview) {
    return (
      <div className="bg-white border border-[#E4E8F0] rounded-2xl p-12 text-center text-xs text-[#68748A]">
        <BarChart3 className="w-8 h-8 mx-auto text-[#94A3B8] mb-2" />
        <p className="font-semibold text-[#111A2E]">Chargement des données télémétriques...</p>
      </div>
    );
  }

  // Device breakdown calculations
  const totalDevices =
    overview.deviceDistribution.desktop +
    overview.deviceDistribution.mobile +
    overview.deviceDistribution.tablet +
    overview.deviceDistribution.unknown || 1;

  const desktopPct = Math.round((overview.deviceDistribution.desktop / totalDevices) * 100);
  const mobilePct = Math.round((overview.deviceDistribution.mobile / totalDevices) * 100);
  const tabletPct = Math.round((overview.deviceDistribution.tablet / totalDevices) * 100);

  // Daily views max for relative scaling
  const maxDailyViews = Math.max(
    ...overview.pageViewsByDay.map((d) => d.views),
    1
  );

  return (
    <div className="space-y-6">
      {/* Analytics Header & Period Filter */}
      <div className="bg-white border border-[#E4E8F0] p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#111A2E] flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#2855D9]" />
              <span>Analytiques du Site & Télémétrie Respectueuse</span>
            </h2>
            <p className="text-xs text-[#68748A] mt-0.5">
              Mesures d&apos;audience, répartition d&apos;équipements et assiduité académique sans empreinte invasive.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#FAFBFD] border border-[#E4E8F0] p-1 rounded-xl text-xs">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => handleTimeRangeChange(range)}
                disabled={isLoading}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  timeRange === range
                    ? "bg-[#2855D9] text-white shadow-2xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                }`}
              >
                {range === "24h" ? "24 Heures" : range === "7d" ? "7 Jours" : "30 Jours"}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Primary KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#68748A]">
              <span>En ligne (Live)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#111A2E] mt-1">
              {overview.activeUsersEstimate}
            </div>
            <div className="text-[10px] text-[#68748A] mt-0.5">Battements &lt; 3 min</div>
          </div>

          <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#68748A]">
              <span>Sessions Focus En Cours</span>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#2855D9] mt-1">
              {overview.activeSessionsCount}
            </div>
            <div className="text-[10px] text-[#68748A] mt-0.5">Pomodoro actifs simultanés</div>
          </div>

          <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#68748A]">
              <span>Visiteurs Uniques ({timeRange})</span>
              <Users className="w-3.5 h-3.5 text-[#2855D9]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#111A2E] mt-1">
              {timeRange === "24h"
                ? overview.uniqueVisitors24h
                : timeRange === "7d"
                ? overview.uniqueVisitors7d
                : overview.uniqueVisitors30d}
            </div>
            <div className="text-[10px] text-[#68748A] mt-0.5">Sessions distinctes mesurées</div>
          </div>

          <div className="bg-white border border-[#E4E8F0] p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#68748A]">
              <span>Pages Vues Totales</span>
              <Eye className="w-3.5 h-3.5 text-[#2855D9]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#111A2E] mt-1">
              {overview.totalPageViews}
            </div>
            <div className="text-[10px] text-[#68748A] mt-0.5">Événements télémétriques</div>
          </div>
        </div>

        {/* Toggle Definitions Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDefinitions(!showDefinitions)}
            className="text-xs text-[#2855D9] hover:underline flex items-center space-x-1 font-medium cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>
              {showDefinitions
                ? "Masquer les définitions et garanties de confidentialité"
                : "Afficher les définitions exactes et la politique de confidentialité"}
            </span>
          </button>

          {showDefinitions && (
            <div className="mt-3 p-4 rounded-xl bg-[#FAFBFD] border border-[#E4E8F0] text-xs text-[#68748A] space-y-2 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <strong className="text-[#111A2E]">Visiteur & Session :</strong> Référence de session pseudo-anonyme générée côté client dans le sessionStorage, sans corrélation inter-sites.
                </div>
                <div>
                  <strong className="text-[#111A2E]">Page Vue :</strong> Transition d&apos;écran validée dans le routeur Next.js, sans aucun paramètre de requête sensible.
                </div>
                <div>
                  <strong className="text-[#111A2E]">En Ligne :</strong> Utilisateur authentifié ayant envoyé un signal d&apos;activité dans les 180 dernières secondes.
                </div>
                <div>
                  <strong className="text-[#111A2E]">Zéro Fingerprinting :</strong> Aucun fingerprinting matériel ou canvas invasif. Catégories génériques uniquement (ordinateur, mobile, tablette).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Page Views Over Time */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111A2E] flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Activité par Jour ({timeRange})</span>
            </span>
            <span className="text-[11px] text-[#68748A]">Pages vues</span>
          </div>

          {overview.pageViewsByDay.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              Aucun événement dans cette fenêtre temporelle.
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {overview.pageViewsByDay.map((day) => {
                const pct = Math.max(5, Math.round((day.views / maxDailyViews) * 100));
                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#68748A] font-mono">
                      <span>{day.date}</span>
                      <span className="font-semibold text-[#111A2E]">{day.views} vues</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F4F6FA] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2855D9] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Top Visited Pages */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111A2E] flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Sections les Plus Consultées</span>
            </span>
            <span className="text-[11px] text-[#68748A]">Classement</span>
          </div>

          {overview.topPages.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              Aucune consultation répertoriée.
            </div>
          ) : (
            <div className="space-y-2.5">
              {overview.topPages.map((page, index) => {
                const pct = Math.round((page.count / overview.totalPageViews) * 100) || 1;
                return (
                  <div key={page.route} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-md bg-[#EDF2FF] text-[#2855D9] font-mono text-[10px] font-bold flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-[#111A2E] text-[11px]">{page.route}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-[#68748A]">{page.count} vues</span>
                      <span className="text-[10px] font-semibold text-[#2855D9] bg-[#EDF2FF] px-1.5 py-0.5 rounded">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Equipment & Browser Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Categories */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[#111A2E] flex items-center space-x-2">
            <Laptop className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Répartition Appareils</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#68748A] flex items-center space-x-1.5">
                <Laptop className="w-3 h-3" />
                <span>Ordinateur de Bureau</span>
              </span>
              <span className="font-semibold text-[#111A2E]">{desktopPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F4F6FA] overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${desktopPct}%` }} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#68748A] flex items-center space-x-1.5">
                <Smartphone className="w-3 h-3" />
                <span>Mobile</span>
              </span>
              <span className="font-semibold text-[#111A2E]">{mobilePct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F4F6FA] overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${mobilePct}%` }} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#68748A] flex items-center space-x-1.5">
                <Tablet className="w-3 h-3" />
                <span>Tablette</span>
              </span>
              <span className="font-semibold text-[#111A2E]">{tabletPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F4F6FA] overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tabletPct}%` }} />
            </div>
          </div>
        </div>

        {/* Browser Families */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[#111A2E] flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Navigateurs</span>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(overview.browserDistribution).length === 0 ? (
              <span className="text-[11px] text-[#94A3B8]">Aucune donnée collectée</span>
            ) : (
              Object.entries(overview.browserDistribution)
                .slice(0, 4)
                .map(([browser, count]) => (
                  <div key={browser} className="flex items-center justify-between">
                    <span className="text-[#68748A]">{browser}</span>
                    <span className="font-mono text-[11px] font-semibold text-[#111A2E]">
                      {count} ({Math.round((count / overview.totalPageViews) * 100) || 0}%)
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Operating Systems */}
        <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[#111A2E] flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Systèmes d&apos;Exploitation</span>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(overview.osDistribution).length === 0 ? (
              <span className="text-[11px] text-[#94A3B8]">Aucune donnée collectée</span>
            ) : (
              Object.entries(overview.osDistribution)
                .slice(0, 4)
                .map(([os, count]) => (
                  <div key={os} className="flex items-center justify-between">
                    <span className="text-[#68748A]">{os}</span>
                    <span className="font-mono text-[11px] font-semibold text-[#111A2E]">
                      {count} ({Math.round((count / overview.totalPageViews) * 100) || 0}%)
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
