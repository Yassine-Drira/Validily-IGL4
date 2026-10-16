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
} from "lucide-react";

export function FocusHubModal() {
  const {
    mode,
    timeLeft,
    isRunning,
    workDuration,
    soundscape,
    volume,
    isSoundMuted,
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
    setVolume,
    toggleSoundMute,
    setIsModalOpen,
    skipSession,
    setTreeSpecies,
    dismissCelebration,
    giveUpSession,
  } = useFocusTimer();

  const [confirmAbandon, setConfirmAbandon] = useState(false);

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

        {/* Ambient Soundscapes Engine */}
        <div className="space-y-3 border-t border-[#E4E8F0] pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#182235] flex items-center space-x-1.5">
              <Headphones className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Ambiances sonores d&apos;étude (Web Audio 0kB)</span>
            </span>

            {/* Quick 1-click sound mute button */}
            {soundscape !== "none" && (
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

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {soundscapesList.map((s) => {
              const Icon = s.icon;
              const isSelected = soundscape === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSoundscape(s.id)}
                  className={cn(
                    "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-blue-50 border-[#2855D9] text-[#2855D9] shadow-2xs font-semibold"
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

          {/* Volume Slider (if soundscape active) */}
          {soundscape !== "none" && (
            <div className="flex items-center space-x-3 bg-[#F4F6FA] p-2.5 rounded-xl border border-[#E4E8F0]">
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
