"use client";

import React from "react";
import { useFocus } from "@/components/focus/focus-provider";
import { Play, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusTriggerButtonProps {
  title: string;
  estimatedMinutes?: number;
  taskId?: string;
  className?: string;
  size?: "sm" | "md";
}

export function FocusTriggerButton({
  title,
  estimatedMinutes = 25,
  taskId,
  className,
  size = "sm",
}: FocusTriggerButtonProps) {
  const {
    setIsModalOpen,
    setWorkDurationMinutes,
    toggleTimer,
    isRunning,
    isPaused,
  } = useFocus();

  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();

    // CRITICAL SAFETY: Never interrupt or overwrite an active focus session
    if (isRunning || isPaused) {
      // Reopen the active hub without disturbing the running session
      setIsModalOpen(true);
      return;
    }

    // When idle, clamp study duration safely between 5 and 180 minutes
    const validMinutes = Math.max(5, Math.min(180, Math.round(estimatedMinutes || 25)));
    setWorkDurationMinutes(validMinutes);

    // Open existing FocusHubModal & start timer
    setIsModalOpen(true);
    toggleTimer();
  };

  const isSessionActive = isRunning || isPaused;

  return (
    <button
      type="button"
      onClick={handleStartFocus}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all select-none",
        isSessionActive
          ? "bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20 border border-[#059669]/30"
          : "bg-[#EDF2FF] text-[#2855D9] hover:bg-[#DCE7FE] border border-[#2855D9]/20",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
      title={
        isSessionActive
          ? "Session en cours — Ouvrir le Bosquet Focus"
          : `Lancer Focus (${estimatedMinutes} min) dans le Bosquet`
      }
    >
      <Play className={cn("w-3 h-3 fill-current", isSessionActive && "animate-pulse")} />
      <span>{isSessionActive ? "En cours" : "Focus"}</span>
      <Trees className="w-3.5 h-3.5 opacity-90 text-[#059669]" />
    </button>
  );
}
