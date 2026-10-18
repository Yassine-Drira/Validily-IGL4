"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  Sparkles,
  BookOpen,
  FileCode2,
  ThumbsUp,
  Headphones,
  Trees,
  Zap,
  ArrowRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  link?: string;
  created_at: string;
  release_version?: string;
}

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement?: AnnouncementData | null;
}

const PILLARS = [
  {
    icon: Calendar,
    title: "Planning & Calendrier Interactif",
    badge: "Emploi du temps",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100 text-blue-700",
    desc: "Visualisation de 08:00 à minuit, blocs d'étude continus multi-heures, gestion de conflits d'horaires et ligne temporelle en direct.",
  },
  {
    icon: CheckCircle2,
    title: "To-Do Académique & Sous-Tâches",
    badge: "Organisation",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-700",
    desc: "Suivez vos devoirs et TDs, découpez-les en sous-tâches, cochez avec réponse optimiste instantanée (< 1ms) et liaison calendrier.",
  },
  {
    icon: Sparkles,
    title: "Objectifs Personnels & Télémétrie",
    badge: "Motivation",
    color: "from-violet-500/10 to-purple-500/10 border-violet-200 text-violet-700",
    iconBg: "bg-violet-100 text-violet-700",
    desc: "Fixez vos cibles quotidiennes ou hebdos de temps d'étude ou d'exercices, synchronisées automatiquement avec vos sessions Focus.",
  },
  {
    icon: BookOpen,
    title: "Ressources & Raccourci NotebookLM",
    badge: "Analyse IA",
    color: "from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100 text-amber-700",
    desc: "Accédez en un clic à Google NotebookLM pour interroger vos supports de cours avec l'IA officielle sans transfert de données privées.",
  },
  {
    icon: Trees,
    title: "Focus Hub & Bosquet Interactif",
    badge: "Immersion",
    color: "from-green-500/10 to-emerald-500/10 border-green-200 text-green-700",
    iconBg: "bg-green-100 text-green-700",
    desc: "Déclenchez vos sessions Pomodoro directement depuis vos créneaux et visualisez votre forêt virtuelle sans duplication d'états.",
  },
  {
    icon: Zap,
    title: "Persistance Supabase & Zéro Quota",
    badge: "Haute Disponibilité",
    color: "from-cyan-500/10 to-blue-500/10 border-cyan-200 text-cyan-700",
    iconBg: "bg-cyan-100 text-cyan-700",
    desc: "Sécurité Row-Level Security stricte par utilisateur, isolation multi-tenant et mise en cache mémoire fluide sans saturation.",
  },
];

export function AnnouncementModal({
  isOpen,
  onClose,
  announcement,
}: AnnouncementModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined" || !document.body) return null;

  const version = announcement?.release_version || "v1.1";
  const title =
    announcement?.title ||
    "VALIDILY-IGL4 v1.1 — A New Chapter in Your Learning Experience";
  const targetLink = announcement?.link || "/my-space";

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BANNER */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white shrink-0 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs text-white border border-white/30">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Mise à Jour Majeure
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/90 text-slate-950 text-[11px] font-black tracking-wide shadow-xs">
                {version}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="relative mt-3 text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
            {title}
          </h2>

          <div className="relative mt-1 flex items-center space-x-2 text-xs text-blue-200/90">
            <Calendar className="w-3.5 h-3.5" />
            <span>Déploiement officiel • Écosystème Étudiant VALIDILY</span>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-slate-700 text-sm">
          {/* Welcome lead */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <p className="font-medium">
              We&apos;re excited to introduce <strong>VALIDILY-IGL4 v1.1</strong>! This update brings improvements designed to make studying, organizing resources, and staying focused easier and more enjoyable.
            </p>
          </div>

          {/* 6 Feature Pillars */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Ce qui change pour vous (6 piliers majeurs)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PILLARS.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`p-2 rounded-xl ${pillar.iconBg}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {pillar.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {pillar.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outro encouragement */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Communauté &amp; Entraide IGL4</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Thank you for being part of VALIDILY-IGL4. Your contributions and feedback help make our shared learning space better for everyone.
            </p>
            <p className="text-emerald-900 font-semibold pt-1">
              Keep learning. Keep growing. Build your Bosquet. 🌱
            </p>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
            Fermer
          </Button>

          <Link
            href={targetLink}
            onClick={onClose}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs hover:from-blue-700 hover:to-indigo-700 shadow-xs transition-all cursor-pointer"
          >
            <span>Explorer les nouveautés</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(modalContent, document.body);
}
