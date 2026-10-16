"use client";

import { useFocusTimer } from "./focus-provider";
import { Play, Pause, Headphones, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function FocusHeaderWidget() {
  const {
    mode,
    timeLeft,
    isRunning,
    toggleTimer,
    setIsModalOpen,
    soundscape,
    isSoundMuted,
  } = useFocusTimer();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isBreak = mode === "shortBreak" || mode === "longBreak";

  return (
    <div className="flex items-center space-x-1.5 bg-[#F4F6FA] hover:bg-[#EEF2F6] border border-[#E4E8F0] rounded-xl p-1 transition-all">
      {/* Quick Play or Hub Trigger Button (No pause during work mode) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isRunning && !isBreak) {
            setIsModalOpen(true);
          } else {
            toggleTimer();
          }
        }}
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer",
          isRunning
            ? isBreak
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-[#2855D9] text-white shadow-xs"
            : "bg-white text-[#182235] hover:text-[#2855D9] shadow-2xs"
        )}
        aria-label={
          isRunning
            ? isBreak
              ? "Mettre en pause la pause"
              : "Session de concentration active - Ouvrir le Focus Hub"
            : "Démarrer le Pomodoro"
        }
        title={
          isRunning
            ? isBreak
              ? "Mettre en pause"
              : "Session de travail active (Pas de pause autorisée) - Ouvrir Focus Hub"
            : "Démarrer"
        }
      >
        {isRunning ? (
          isBreak ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
          )
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Timer & Soundscape Clickable Pill */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center space-x-2 px-2 py-0.5 text-xs font-mono font-medium text-[#182235] cursor-pointer"
        title="Ouvrir le Focus Hub & Ambiances"
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isRunning
              ? isBreak
                ? "bg-emerald-500 animate-pulse"
                : "bg-blue-600 animate-pulse"
              : "bg-[#94A3B8]"
          )}
        />
        <span className="font-semibold tracking-tight">{formattedTime}</span>

        {soundscape !== "none" && (
          <span
            className={cn(
              "flex items-center",
              isSoundMuted ? "text-[#94A3B8]" : "text-[#2855D9] animate-pulse"
            )}
            title={isSoundMuted ? `Ambiance ${soundscape} en pause` : `Ambiance ${soundscape} active`}
          >
            <Headphones className="w-3 h-3 ml-0.5" />
          </span>
        )}

        <span className="hidden lg:inline text-[10px] font-sans text-[#68748A] bg-white border border-[#E4E8F0] px-1.5 py-0.2 rounded-md font-medium">
          {mode === "work" ? "Focus" : "Pause"}
        </span>
      </button>
    </div>
  );
}
