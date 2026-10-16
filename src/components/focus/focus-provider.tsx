"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { soundEngine, SoundscapeType } from "@/lib/audio/ambient-soundscapes";
import { TreeSpecies } from "@/types/database";
import {
  startFocusSession,
  completeFocusSession,
  abandonFocusSession,
} from "@/lib/actions/forest-actions";

export type TimerMode = "work" | "shortBreak" | "longBreak";

interface FocusContextType {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  soundscape: SoundscapeType;
  volume: number;
  isSoundMuted: boolean;
  completedPomodoros: number;
  totalFocusSecondsToday: number;
  totalFocusMinutesToday: number;
  isModalOpen: boolean;
  treeSpecies: TreeSpecies;
  activeSessionId: string | null;
  isCelebrating: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
  setWorkDurationMinutes: (minutes: number) => void;
  setSoundscape: (soundscape: SoundscapeType) => void;
  setVolume: (volume: number) => void;
  toggleSoundMute: () => void;
  setIsModalOpen: (open: boolean) => void;
  skipSession: () => void;
  setTreeSpecies: (species: TreeSpecies) => void;
  dismissCelebration: () => void;
  giveUpSession: (reason?: string) => Promise<void>;
}

const FocusContext = createContext<FocusContextType | null>(null);

const DEFAULT_WORK = 25 * 60;
const DEFAULT_SHORT_BREAK = 5 * 60;
const DEFAULT_LONG_BREAK = 15 * 60;

export function FocusProvider({
  children,
  user = null,
}: {
  children: React.ReactNode;
  user?: { id: string; name?: string; email?: string } | null;
}) {
  const [mode, setModeState] = useState<TimerMode>("work");
  const [workDuration, setWorkDuration] = useState<number>(DEFAULT_WORK);
  const [shortBreakDuration] = useState<number>(DEFAULT_SHORT_BREAK);
  const [longBreakDuration] = useState<number>(DEFAULT_LONG_BREAK);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundscape, setSoundscapeState] = useState<SoundscapeType>("none");
  const [volume, setVolumeState] = useState<number>(0.5);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0);
  const [totalFocusSecondsToday, setTotalFocusSecondsToday] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Focus Forest Additions
  const [treeSpecies, setTreeSpeciesState] = useState<TreeSpecies>("cedar");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCelebrating, setIsCelebrating] = useState<boolean>(false);

  const endTimeRef = useRef<number | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  const totalFocusMinutesToday = Math.floor(totalFocusSecondsToday / 60);

  // Load daily stats & tree preferences on mount
  useEffect(() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(`validily_focus_${today}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedPomodoros(parsed.completedPomodoros || 0);
        const sec =
          parsed.totalFocusSeconds ||
          (parsed.totalFocusMinutes ? parsed.totalFocusMinutes * 60 : 0);
        setTotalFocusSecondsToday(sec);
      }
      const savedDuration = localStorage.getItem("validily_work_duration");
      if (savedDuration) {
        const dur = parseInt(savedDuration, 10);
        if (!isNaN(dur) && dur > 0) {
          setWorkDuration(dur);
          setTimeLeft(dur);
        }
      }
      const savedSpecies = localStorage.getItem("validily_tree_species") as TreeSpecies | null;
      if (
        savedSpecies &&
        ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"].includes(savedSpecies)
      ) {
        setTreeSpeciesState(savedSpecies);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  // Save daily stats helper
  const persistDailyStats = useCallback((pomodoros: number, seconds: number) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(
        `validily_focus_${today}`,
        JSON.stringify({
          completedPomodoros: pomodoros,
          totalFocusSeconds: seconds,
          totalFocusMinutes: Math.floor(seconds / 60),
        })
      );
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Dismiss celebration banner
  const dismissCelebration = useCallback(() => {
    setIsCelebrating(false);
  }, []);

  // Set Tree Species
  const setTreeSpecies = useCallback((species: TreeSpecies) => {
    setTreeSpeciesState(species);
    try {
      localStorage.setItem("validily_tree_species", species);
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Timer interval handling with continuous real-time focus accumulation
  useEffect(() => {
    if (!isRunning) {
      endTimeRef.current = null;
      return;
    }

    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
    }

    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Accumulate real-time focus seconds continuously in work mode
      if (mode === "work") {
        setTotalFocusSecondsToday((prevSec) => {
          const nextSec = prevSec + 1;
          if (nextSec % 10 === 0) {
            persistDailyStats(completedPomodoros, nextSec);
          }
          return nextSec;
        });
      }

      if (remaining <= 0) {
        clearInterval(interval);
        setIsRunning(false);
        soundEngine.playChime();

        if (mode === "work") {
          // Complete verified forest session on the server
          if (activeSessionIdRef.current) {
            const sid = activeSessionIdRef.current;
            activeSessionIdRef.current = null;
            setActiveSessionId(null);
            completeFocusSession(sid)
              .then((res) => {
                if (res.success) {
                  setIsCelebrating(true);
                  // Auto-dismiss celebration after 8 seconds
                  setTimeout(() => setIsCelebrating(false), 8000);
                }
              })
              .catch(() => {});
          }

          setCompletedPomodoros((p) => {
            const nextCount = p + 1;
            setTotalFocusSecondsToday((sec) => {
              persistDailyStats(nextCount, sec);
              return sec;
            });
            // Transition to break
            const nextMode = nextCount % 4 === 0 ? "longBreak" : "shortBreak";
            setModeState(nextMode);
            setTimeLeft(nextMode === "longBreak" ? longBreakDuration : shortBreakDuration);
            return nextCount;
          });
        } else {
          // Transition back to work
          setModeState("work");
          setTimeLeft(workDuration);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isRunning,
    mode,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    completedPomodoros,
    persistDailyStats,
    timeLeft,
  ]);

  const toggleTimer = useCallback(() => {
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/forest")}`;
      return;
    }

    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    if (nextRunning) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      if (soundscape !== "none") {
        soundEngine.start(soundscape, volume);
      }

      // Initialize server-side focus session for My Forest if in work mode
      if (mode === "work" && !activeSessionIdRef.current) {
        startFocusSession({
          targetDurationSeconds: timeLeft,
          treeSpecies,
        })
          .then((res) => {
            if (res.success && res.session) {
              activeSessionIdRef.current = res.session.id;
              setActiveSessionId(res.session.id);
            }
          })
          .catch(() => {});
      }
    } else {
      endTimeRef.current = null;
    }
  }, [user, isRunning, timeLeft, soundscape, volume, mode, treeSpecies]);

  // Explicit session abandonment / give up action
  const giveUpSession = useCallback(
    async (reason?: string) => {
      setIsRunning(false);
      endTimeRef.current = null;
      soundEngine.stop();

      const sid = activeSessionIdRef.current;
      if (sid && mode === "work") {
        activeSessionIdRef.current = null;
        setActiveSessionId(null);
        await abandonFocusSession(sid, reason || "Abandon manuel par l'étudiant");
      }

      const dur =
        mode === "work"
          ? workDuration
          : mode === "shortBreak"
          ? shortBreakDuration
          : longBreakDuration;
      setTimeLeft(dur);
    },
    [mode, workDuration, shortBreakDuration, longBreakDuration]
  );

  const resetTimer = useCallback(() => {
    // If currently running in work mode with an active session, delegate to giveUpSession
    if (isRunning && mode === "work" && activeSessionIdRef.current) {
      giveUpSession("Chronomètre réinitialisé");
      return;
    }

    setIsRunning(false);
    endTimeRef.current = null;
    const dur =
      mode === "work"
        ? workDuration
        : mode === "shortBreak"
        ? shortBreakDuration
        : longBreakDuration;
    setTimeLeft(dur);
  }, [isRunning, mode, giveUpSession, workDuration, shortBreakDuration, longBreakDuration]);

  const setMode = useCallback(
    (newMode: TimerMode) => {
      // If switching away while running in work mode, abandon active session gracefully
      if (isRunning && mode === "work" && activeSessionIdRef.current) {
        giveUpSession("Changement de mode de chronomètre");
      }

      setIsRunning(false);
      endTimeRef.current = null;
      setModeState(newMode);
      const dur =
        newMode === "work"
          ? workDuration
          : newMode === "shortBreak"
          ? shortBreakDuration
          : longBreakDuration;
      setTimeLeft(dur);
    },
    [isRunning, mode, giveUpSession, workDuration, shortBreakDuration, longBreakDuration]
  );

  const setWorkDurationMinutes = useCallback(
    (minutes: number) => {
      const seconds = minutes * 60;
      setWorkDuration(seconds);
      try {
        localStorage.setItem("validily_work_duration", seconds.toString());
      } catch {
        // LocalStorage fallback
      }
      if (mode === "work") {
        if (isRunning && activeSessionIdRef.current) {
          giveUpSession("Modification de la durée de travail");
        } else {
          setIsRunning(false);
          endTimeRef.current = null;
          setTimeLeft(seconds);
        }
      }
    },
    [mode, isRunning, giveUpSession]
  );

  const setSoundscape = useCallback(
    (type: SoundscapeType) => {
      setSoundscapeState(type);
      if (type === "none") {
        soundEngine.stop();
      } else {
        soundEngine.start(type, volume);
      }
    },
    [volume]
  );

  const setVolume = useCallback((newVol: number) => {
    setVolumeState(newVol);
    soundEngine.setVolume(newVol);
  }, []);

  const skipSession = useCallback(() => {
    if (isRunning && mode === "work" && activeSessionIdRef.current) {
      giveUpSession("Session sautée");
    }

    setIsRunning(false);
    endTimeRef.current = null;
    if (mode === "work") {
      setModeState("shortBreak");
      setTimeLeft(shortBreakDuration);
    } else {
      setModeState("work");
      setTimeLeft(workDuration);
    }
  }, [isRunning, mode, giveUpSession, shortBreakDuration, workDuration]);

  const toggleSoundMute = useCallback(() => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  return (
    <FocusContext.Provider
      value={{
        mode,
        timeLeft,
        isRunning,
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        soundscape,
        volume,
        isSoundMuted,
        completedPomodoros,
        totalFocusSecondsToday,
        totalFocusMinutesToday,
        isModalOpen,
        treeSpecies,
        activeSessionId,
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
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

const FALLBACK_FOCUS_CONTEXT: FocusContextType = {
  mode: "work",
  timeLeft: DEFAULT_WORK,
  isRunning: false,
  workDuration: DEFAULT_WORK,
  shortBreakDuration: DEFAULT_SHORT_BREAK,
  longBreakDuration: DEFAULT_LONG_BREAK,
  soundscape: "none",
  volume: 0.5,
  isSoundMuted: false,
  completedPomodoros: 0,
  totalFocusSecondsToday: 0,
  totalFocusMinutesToday: 0,
  isModalOpen: false,
  treeSpecies: "cedar",
  activeSessionId: null,
  isCelebrating: false,
  toggleTimer: () => {},
  resetTimer: () => {},
  setMode: () => {},
  setWorkDurationMinutes: () => {},
  setSoundscape: () => {},
  setVolume: () => {},
  toggleSoundMute: () => {},
  setIsModalOpen: () => {},
  skipSession: () => {},
  setTreeSpecies: () => {},
  dismissCelebration: () => {},
  giveUpSession: async () => {},
};

export function useFocusTimer(): FocusContextType {
  const context = useContext(FocusContext);
  return context || FALLBACK_FOCUS_CONTEXT;
}
