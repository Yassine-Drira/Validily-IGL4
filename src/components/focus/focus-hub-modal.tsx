"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFocusTimer, TimerMode } from "./focus-provider";
import { SoundscapeType } from "@/lib/audio/ambient-soundscapes";
import { LiveTreeGrowth } from "@/components/forest/live-tree-growth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Headphones,
  Volume2,
  VolumeX,
  CloudRain,
  Flame,
  Brain,
  Waves,
  Sparkles,
  Clock,
  CheckCircle2,
  Zap,
  Trees,
  AlertOctagon,
  Compass,
  Plus,
  Trash2,
  Music,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getMyCustomAudio,
  addCustomAudio,
  deleteCustomAudio,
  getSharedAudioCatalog,
} from "@/lib/actions/custom-audio-actions";
import { CustomAudioEntry, AudioCatalogEntry } from "@/types/database";
import { parseAndValidateYouTubeUrl } from "@/lib/audio/youtube-parser";

export function FocusHubModal() {
  const {
    mode,
    timeLeft,
    isRunning,
    workDuration,
    soundscape,
    volume,
    isSoundMuted,
    activeAudioType,
    activeCustomAudio,
    activeCatalogAudio,
    completedPomodoros,
    totalFocusSecondsToday,
    isModalOpen,
    treeSpecies,
    isCelebrating,
    toggleTimer,
    resetTimer,
    setMode,
    setWorkDurationMinutes,
    setSoundscape,
    setActiveCustomAudio,
    setActiveCatalogAudio,
    setVolume,
    toggleSoundMute,
    setIsModalOpen,
    skipSession,
    setTreeSpecies,
    dismissCelebration,
    giveUpSession,
  } = useFocusTimer();

  const [confirmAbandon, setConfirmAbandon] = useState(false);

  // Audio Customization & Catalog State
  const [audioCategoryTab, setAudioCategoryTab] = useState<"synth" | "custom" | "catalog">("synth");
  const [customEntries, setCustomEntries] = useState<CustomAudioEntry[]>([]);
  const [catalogEntries, setCatalogEntries] = useState<AudioCatalogEntry[]>([]);
  const [audioQuota, setAudioQuota] = useState<{
    usedCount: number;
    maxAllowed: number;
    remainingSlots: number;
    isVip: boolean;
    isAdmin: boolean;
  }>({
    usedCount: 0,
    maxAllowed: 2,
    remainingSlots: 2,
    isVip: false,
    isAdmin: false,
  });
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isAddSoundOpen, setIsAddSoundOpen] = useState(false);
  const [newSoundTitle, setNewSoundTitle] = useState("");
  const [newSoundUrl, setNewSoundUrl] = useState("");
  const [soundFormError, setSoundFormError] = useState<string | null>(null);
  const [isSubmittingSound, setIsSubmittingSound] = useState(false);
  const [deletingSoundId, setDeletingSoundId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, setIsModalOpen]);

  const loadAudioData = async () => {
    setIsLoadingAudio(true);
    try {
      const [customRes, catalogRes] = await Promise.all([
        getMyCustomAudio(),
        getSharedAudioCatalog(),
      ]);

      if (customRes.success) {
        setCustomEntries(customRes.entries);
        setAudioQuota({
          usedCount: customRes.usedCount,
          maxAllowed: customRes.maxAllowed,
          remainingSlots: customRes.remainingSlots,
          isVip: customRes.isVip,
          isAdmin: customRes.isAdmin,
        });
      }

      if (catalogRes.success) {
        setCatalogEntries(catalogRes.catalog);
      }
    } catch {
      // Safe fallback
    } finally {
      setIsLoadingAudio(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      loadAudioData();
    }
  }, [isModalOpen]);

  const handleAddCustomSound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSoundFormError(null);

    const validation = parseAndValidateYouTubeUrl(newSoundUrl);
    if (!validation.valid) {
      setSoundFormError(validation.error || "URL YouTube invalide.");
      return;
    }

    setIsSubmittingSound(true);
    try {
      const res = await addCustomAudio({
        title: newSoundTitle,
        youtubeUrl: newSoundUrl,
      });

      if (!res.success) {
        if (
          res.error?.toLowerCase().includes("authentification") ||
          res.error?.toLowerCase().includes("connecté")
        ) {
          const next = typeof window !== "undefined" ? window.location.pathname : "/";
          window.location.href = `/login?next=${encodeURIComponent(next)}`;
          return;
        }
        setSoundFormError(res.error || "Échec de l'ajout du son.");
        return;
      }

      if (res.entry) {
        setCustomEntries((prev) => [res.entry!, ...prev]);
        setAudioQuota((prev) => ({
          ...prev,
          usedCount: prev.usedCount + 1,
          remainingSlots: Math.max(0, prev.remainingSlots - 1),
        }));
        // Select newly added sound immediately
        setActiveCustomAudio(res.entry);
        setNewSoundTitle("");
        setNewSoundUrl("");
        setIsAddSoundOpen(false);
      }
    } catch (err: any) {
      setSoundFormError(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmittingSound(false);
    }
  };

  const handleDeleteCustomSound = async (id: string) => {
    setDeletingSoundId(id);
    try {
      const res = await deleteCustomAudio(id);
      if (res.success) {
        setCustomEntries((prev) => prev.filter((s) => s.id !== id));
        setAudioQuota((prev) => ({
          ...prev,
          usedCount: Math.max(0, prev.usedCount - 1),
          remainingSlots: prev.remainingSlots + 1,
        }));
        if (activeCustomAudio?.id === id) {
          setActiveCustomAudio(null);
        }
      } else if (
        res.error?.toLowerCase().includes("authentification") ||
        res.error?.toLowerCase().includes("connecté")
      ) {
        const next = typeof window !== "undefined" ? window.location.pathname : "/";
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
    } catch {
      // Safe fallback
    } finally {
      setDeletingSoundId(null);
    }
  };

  if (!isModalOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const currentDuration =
    mode === "work" ? workDuration : mode === "shortBreak" ? 5 * 60 : 15 * 60;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentDuration - timeLeft) / currentDuration) * 100)
  );

  const elapsedSeconds = currentDuration - timeLeft;
  const isPastGracePeriod = elapsedSeconds > 120;

  // Formatter for live real-time focused time
  const formatFocusedTime = (totalSec: number) => {
    if (totalSec <= 0) return "0 min";
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const remSec = totalSec % 60;
    if (mins < 60) {
      return remSec > 0 ? `${mins}m ${remSec}s` : `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const soundscapesList: {
    id: SoundscapeType;
    label: string;
    desc: string;
    icon: typeof CloudRain;
  }[] = [
    { id: "none", label: "Silencieux", desc: "Sans son d'ambiance", icon: VolumeX },
    { id: "rain", label: "Pluie Zen", desc: "Bruit rose doux", icon: CloudRain },
    { id: "brown", label: "Bruit Brun", desc: "Fréquences graves", icon: Flame },
    { id: "binaural", label: "Gamma 40Hz", desc: "Ondes focus", icon: Brain },
    { id: "waves", label: "Océan", desc: "Ressac apaisant", icon: Waves },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={() => setIsModalOpen(false)}
    >
      <div
        className="bg-white/95 backdrop-blur-xl border border-[#E4E8F0] rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5 relative scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EDF2FF] to-[#DCE7FF] text-[#2855D9] flex items-center justify-center border border-[#BACDFE] shadow-2xs">
              <Zap className="w-5 h-5 text-[#2855D9] fill-[#2855D9]/20" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#111A2E] tracking-tight">
                  Focus Hub & Pomodoro
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#2855D9] border border-blue-200">
                  IGL4 Study
                </span>
              </div>
              <p className="text-[11px] text-[#68748A]">
                Concentration académique & croissance vivante de votre Bosquet
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/forest"
              onClick={() => setIsModalOpen(false)}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Voir mon Bosquet permanent"
            >
              <Trees className="w-4 h-4 text-emerald-600" />
              <span>Mon Bosquet</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] rounded-xl transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Focus / Pause courte / Pause longue) */}
        <div className="grid grid-cols-3 gap-1 bg-[#F4F6FA] p-1.5 rounded-2xl border border-[#E4E8F0]">
          {(
            [
              { key: "work", label: "Focus Forest", dur: `${Math.round(workDuration / 60)}m` },
              { key: "shortBreak", label: "Pause courte", dur: "5m" },
              { key: "longBreak", label: "Pause longue", dur: "15m" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key as TimerMode)}
              className={cn(
                "py-2 px-3 rounded-xl text-xs transition-all text-center flex flex-col items-center justify-center cursor-pointer",
                mode === t.key
                  ? "bg-white text-[#111A2E] shadow-xs font-bold border border-[#E4E8F0]"
                  : "text-[#68748A] hover:text-[#182235]"
              )}
            >
              <span>{t.label}</span>
              <span className="text-[10px] text-[#2855D9] font-mono font-semibold mt-0.5">
                {t.dur}
              </span>
            </button>
          ))}
        </div>

        {/* Live Tree Growth Centerpiece (Visible in Focus mode) */}
        {mode === "work" && (
          <div className="space-y-2">
            <LiveTreeGrowth
              species={treeSpecies}
              onSelectSpecies={setTreeSpecies}
              progressPercent={progressPercent}
              isRunning={isRunning}
              canChangeSpecies={!isRunning}
              isCelebrating={isCelebrating}
              onDismissCelebration={dismissCelebration}
            />
          </div>
        )}

        {/* Radial Timer Visual with Center Controls */}
        <div className="flex flex-col items-center justify-center py-1 relative">
          <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
            {/* Ambient Background Glow */}
            <div
              className={cn(
                "absolute inset-4 rounded-full blur-2xl opacity-20 pointer-events-none transition-colors duration-700",
                mode === "work" ? "bg-[#2855D9]" : "bg-emerald-500"
              )}
            />

            {/* SVG Radial Progress Circle */}
            <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2855D9" />
                  <stop offset="100%" stopColor="#4776F2" />
                </linearGradient>
                <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-[#EEF2F6]"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke={mode === "work" ? "url(#focusGradient)" : "url(#breakGradient)"}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl sm:text-5xl font-mono font-extrabold text-[#111A2E] tracking-tight font-tabular">
                {formattedTime}
              </span>

              <span className="text-xs font-semibold text-[#68748A] mt-1 capitalize">
                {mode === "work" ? "Session de travail" : "Temps de pause"}
              </span>

              {/* Quick Soundscape Indicator & 1-Click Mute Toggle */}
              {soundscape !== "none" && (
                <div className="flex items-center space-x-1.5 mt-2 bg-blue-50/90 text-[#2855D9] px-2.5 py-0.5 rounded-full border border-blue-200 text-[10px] font-mono shadow-2xs">
                  <Headphones className={cn("w-3 h-3", !isSoundMuted && isRunning && "animate-pulse")} />
                  <span className="font-semibold truncate max-w-[90px]">
                    {soundscapesList.find((s) => s.id === soundscape)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSoundMute();
                    }}
                    className={cn(
                      "ml-1 px-1 py-0.5 rounded text-[9px] font-sans font-bold flex items-center space-x-0.5 transition-colors cursor-pointer",
                      isSoundMuted
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-blue-100 text-[#2855D9] hover:bg-blue-200"
                    )}
                    title={isSoundMuted ? "Réactiver le son" : "Mettre en pause le son"}
                  >
                    {isSoundMuted ? (
                      <>
                        <VolumeX className="w-2.5 h-2.5 text-amber-700" />
                        <span>Mute</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-2.5 h-2.5 text-[#2855D9]" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center space-x-3.5 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetTimer}
              className="w-10 h-10 p-0 rounded-2xl text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] border-[#E4E8F0]"
              title="Réinitialiser le chronomètre"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={toggleTimer}
              className={cn(
                "h-12 px-8 rounded-2xl text-sm font-bold flex items-center space-x-2.5 shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5",
                mode === "work"
                  ? "bg-[#2855D9] hover:bg-[#1E40AF] text-white shadow-blue-500/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Mettre en Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Démarrer Focus</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={skipSession}
              className="w-10 h-10 p-0 rounded-2xl text-[#68748A] hover:text-[#182235] hover:bg-[#F4F6FA] border-[#E4E8F0]"
              title="Passer à la session suivante"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Explicit Give Up / Abandon Action during Work Session */}
          {isRunning && mode === "work" && (
            <div className="mt-3 text-center">
              {!confirmAbandon ? (
                <button
                  type="button"
                  onClick={() => setConfirmAbandon(true)}
                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline flex items-center space-x-1 mx-auto cursor-pointer"
                >
                  <AlertOctagon className="w-3 h-3 text-rose-500" />
                  <span>Abandonner la session en cours</span>
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5 animate-in fade-in duration-150 text-left max-w-sm">
                  <p className="text-[11px] text-rose-900 font-semibold mb-1">
                    {isPastGracePeriod
                      ? "Attention : plus de 2 min écoulées. Abandonner laissera un arbre défeuillé permanent dans votre bosquet."
                      : "Période de grâce (≤ 2 min) : l'abandon annulera la session sans pénalité."}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        giveUpSession("Abandon manuel");
                        setConfirmAbandon(false);
                      }}
                      className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Confirmer l&apos;abandon
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAbandon(false)}
                      className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-medium cursor-pointer transition-colors"
                    >
                      Continuer à étudier
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Focus Duration Quick Presets (Work Mode only) */}
        {mode === "work" && (
          <div className="space-y-2 border-t border-[#E4E8F0] pt-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#182235]">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-[#68748A]" />
                <span>Durée de concentration</span>
              </span>
              <span className="font-mono text-[#2855D9] font-bold">
                {Math.round(workDuration / 60)} minutes
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setWorkDurationMinutes(mins)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer",
                    Math.round(workDuration / 60) === mins
                      ? "bg-[#2855D9] border-[#2855D9] text-white shadow-xs font-bold"
                      : "bg-[#FAFAF7] border-[#E4E8F0] text-[#68748A] hover:bg-white hover:text-[#182235]"
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio Hub (Built-in, Custom YouTube & Shared Catalog) */}
        <div className="space-y-3 border-t border-[#E4E8F0] pt-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 bg-[#F4F6FA] p-1 rounded-2xl border border-[#E4E8F0]">
              <button
                type="button"
                onClick={() => setAudioCategoryTab("synth")}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                  audioCategoryTab === "synth"
                    ? "bg-white text-[#111A2E] shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#182235]"
                )}
              >
                <Headphones className="w-3.5 h-3.5 text-[#2855D9]" />
                <span>Synthèse (0kB)</span>
              </button>
              <button
                type="button"
                onClick={() => setAudioCategoryTab("custom")}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                  audioCategoryTab === "custom"
                    ? "bg-white text-[#111A2E] shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#182235]"
                )}
              >
                <Music className="w-3.5 h-3.5 text-red-500" />
                <span>Mes Sons & YouTube</span>
              </button>
              <button
                type="button"
                onClick={() => setAudioCategoryTab("catalog")}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer",
                  audioCategoryTab === "catalog"
                    ? "bg-white text-[#111A2E] shadow-2xs font-bold"
                    : "text-[#68748A] hover:text-[#182235]"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Catalogue Promo</span>
              </button>
            </div>

            {/* Quick 1-click sound mute button */}
            {(soundscape !== "none" || activeAudioType !== "none") && (
              <button
                type="button"
                onClick={toggleSoundMute}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 cursor-pointer",
                  isSoundMuted
                    ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                )}
                title={isSoundMuted ? "Reprendre le son d'ambiance" : "Couper le son d'ambiance"}
              >
                {isSoundMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-700" />
                    <span>Son en pause</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Son actif</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* TAB 1: Synthèse 0kB */}
          {audioCategoryTab === "synth" && (
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 animate-in fade-in duration-150">
              {soundscapesList.map((s) => {
                const Icon = s.icon;
                const isSelected = activeAudioType === "synth" && soundscape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSoundscape(s.id)}
                    className={cn(
                      "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-blue-50 border-[#2855D9] text-[#2855D9] shadow-2xs font-semibold ring-1 ring-[#2855D9]"
                        : "bg-[#FAFAF7] border-[#E4E8F0] text-[#68748A] hover:bg-white hover:text-[#182235]"
                    )}
                    title={s.desc}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 mb-1",
                        isSelected ? "text-[#2855D9]" : "text-[#68748A]"
                      )}
                    />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: Mes Sons & YouTube (Custom User Audio Library) */}
          {audioCategoryTab === "custom" && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              {/* Quota Header & Add Action */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-[#182235]">Mes Sons</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                      audioQuota.remainingSlots > 0
                        ? "bg-blue-50 border-blue-200 text-[#2855D9]"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    )}
                  >
                    {audioQuota.usedCount} / {audioQuota.maxAllowed} slots
                  </span>
                  {audioQuota.isVip && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold">
                      <Crown className="w-3 h-3 text-amber-700" />
                      <span>VIP Actif</span>
                    </span>
                  )}
                  {audioQuota.isAdmin && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold">
                      Admin Illimité
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddSoundOpen(!isAddSoundOpen)}
                  disabled={audioQuota.remainingSlots <= 0}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all",
                    audioQuota.remainingSlots > 0
                      ? "bg-[#2855D9] hover:bg-[#1D44B8] text-white cursor-pointer shadow-xs"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                  title={
                    audioQuota.remainingSlots <= 0
                      ? "Quota de 2 sons atteint. Débloquez l'accès VIP auprès de l'administrateur."
                      : "Ajouter un flux YouTube"
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              {/* Add Sound Inline Form */}
              {isAddSoundOpen && (
                <form
                  onSubmit={handleAddCustomSound}
                  className="p-3.5 rounded-2xl bg-white border border-[#2855D9]/40 shadow-md space-y-2.5 animate-in zoom-in-98 duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111A2E] flex items-center space-x-1.5">
                      <Music className="w-3.5 h-3.5 text-red-500" />
                      <span>Nouveau Son YouTube Personnel</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddSoundOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Titre du son (ex: Lofi Hip-Hop concentration)"
                      value={newSoundTitle}
                      onChange={(e) => setNewSoundTitle(e.target.value)}
                      required
                      maxLength={80}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2855D9]/30"
                    />
                    <input
                      type="url"
                      placeholder="URL YouTube (ex: https://youtu.be/... ou https://www.youtube.com/watch?v=...)"
                      value={newSoundUrl}
                      onChange={(e) => setNewSoundUrl(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2855D9]/30"
                    />
                  </div>

                  {soundFormError && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{soundFormError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddSoundOpen(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSound}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#2855D9] hover:bg-[#1D44B8] text-white flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      {isSubmittingSound && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Enregistrer</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Free Quota Exhausted Warning */}
              {audioQuota.remainingSlots <= 0 && !audioQuota.isVip && !audioQuota.isAdmin && (
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start space-x-2.5">
                  <Crown className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-900 leading-snug">
                    <p className="font-bold">Limite gratuite atteinte (2/2 sons)</p>
                    <p className="text-amber-800/90 mt-0.5">
                      Supprimez un son pour libérer un emplacement ou contactez un administrateur pour
                      bénéficier d&apos;un <strong>accès VIP</strong> temporaire étendu (jusqu&apos;à 25 sons).
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Sounds List */}
              {customEntries.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-dashed border-[#E4E8F0] text-center space-y-1">
                  <Music className="w-5 h-5 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Aucun son personnalisé</p>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                    Ajoutez vos musiques d&apos;étude préférées depuis YouTube grâce à vos 2 slots gratuits.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {customEntries.map((item) => {
                    const isSelected =
                      activeAudioType === "custom" && activeCustomAudio?.id === item.id;
                    const isDeleting = deletingSoundId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between transition-all",
                          isSelected
                            ? "bg-blue-50/70 border-[#2855D9] shadow-xs ring-1 ring-[#2855D9]"
                            : "bg-white border-[#E4E8F0] hover:border-slate-300"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setActiveCustomAudio(null);
                            } else {
                              setActiveCustomAudio(item);
                            }
                          }}
                          className="flex items-center space-x-2.5 text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs transition-colors",
                              isSelected ? "bg-[#2855D9]" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {isSelected ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-xs font-bold truncate",
                                isSelected ? "text-[#2855D9]" : "text-[#111A2E]"
                              )}
                            >
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              YouTube • {item.youtube_video_id}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomSound(item.id)}
                          disabled={isDeleting}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Supprimer ce son (libère le slot)"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Catalogue Promo (Admin-Curated Shared Library) */}
          {audioCategoryTab === "catalog" && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200/60 text-[11px] text-[#2855D9] flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Pistes d&apos;ambiance certifiées et partagées par l&apos;administration IGL4.</span>
              </div>

              {catalogEntries.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E4E8F0] text-center text-xs text-slate-500">
                  Aucune piste partagée pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {catalogEntries.map((track) => {
                    const isSelected =
                      activeAudioType === "catalog" && activeCatalogAudio?.id === track.id;

                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setActiveCatalogAudio(null);
                          } else {
                            setActiveCatalogAudio(track);
                          }
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group",
                          isSelected
                            ? "bg-blue-50/80 border-[#2855D9] ring-1 ring-[#2855D9] shadow-xs"
                            : "bg-white border-[#E4E8F0] hover:bg-[#FAFBFD] hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5 w-full">
                          <span
                            className={cn(
                              "text-xs font-bold leading-snug line-clamp-1",
                              isSelected ? "text-[#2855D9]" : "text-[#111A2E]"
                            )}
                          >
                            {track.title}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase shrink-0">
                            {track.category}
                          </span>
                        </div>

                        {track.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                            {track.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 w-full text-[10px]">
                          <span className="text-slate-400 capitalize">
                            {track.source_type === "youtube" ? "YouTube Stream" : "Web Audio"}
                          </span>
                          <span
                            className={cn(
                              "font-bold flex items-center space-x-1",
                              isSelected ? "text-[#2855D9]" : "text-slate-500 group-hover:text-slate-800"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Volume2 className="w-3 h-3 text-[#2855D9]" />
                                <span>Actif</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Écouter</span>
                              </>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Unified Volume Slider (Active whenever ANY audio is chosen) */}
          {(soundscape !== "none" || activeAudioType !== "none") && (
            <div className="flex items-center space-x-3 bg-[#F4F6FA] p-2.5 rounded-xl border border-[#E4E8F0] animate-in fade-in duration-200">
              <button
                type="button"
                onClick={toggleSoundMute}
                className="text-[#68748A] hover:text-[#182235] cursor-pointer"
                title={isSoundMuted ? "Réactiver le son" : "Couper le son"}
              >
                {isSoundMuted ? (
                  <VolumeX className="w-4 h-4 text-amber-600" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#2855D9]" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isSoundMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                }}
                className="w-full accent-[#2855D9] cursor-pointer"
                aria-label="Volume de l'ambiance sonore"
              />
              <span className="text-xs font-mono text-[#68748A] shrink-0 w-8 text-right font-tabular">
                {isSoundMuted ? "0%" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          )}
        </div>

        {/* Real-Time Live Daily Stats Summary + Forest Link */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#E4E8F0]">
          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#68748A] block font-medium">
                Pomodoros validés
              </span>
              <span className="text-lg font-bold text-[#111A2E] font-mono font-tabular">
                {completedPomodoros}
              </span>
            </div>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2855D9] flex items-center justify-center shrink-0 border border-blue-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#68748A] block font-medium">
                Temps concentré (live)
              </span>
              <span className="text-lg font-bold text-[#2855D9] font-mono font-tabular">
                {formatFocusedTime(totalFocusSecondsToday)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile direct link to Forest */}
        <div className="sm:hidden pt-2">
          <Link
            href="/forest"
            onClick={() => setIsModalOpen(false)}
            className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center space-x-2"
          >
            <Trees className="w-4 h-4 text-emerald-600" />
            <span>Consulter mon Bosquet & Galerie de Promo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
