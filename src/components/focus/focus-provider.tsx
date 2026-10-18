"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { soundEngine, SoundscapeType } from "@/lib/audio/ambient-soundscapes";
import { TreeSpecies, CustomAudioEntry, AudioCatalogEntry, ForestEntry } from "@/types/database";
import { YouTubeFocusPlayer } from "@/components/audio/youtube-focus-player";
import {
  startFocusSession,
  completeFocusSession,
  abandonFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  getMyForest,
} from "@/lib/actions/forest-actions";
import { getMyCustomAudio } from "@/lib/actions/custom-audio-actions";
import { getUserTodayFocus, recordUserDailyFocus } from "@/lib/actions/analytics-actions";
import { FocusResultModal, FocusResultData } from "./focus-result-modal";

export type TimerMode = "work" | "shortBreak" | "longBreak";
export type AudioPlaybackType = "none" | "synth" | "custom" | "catalog";
export type SessionState = "idle" | "running" | "paused";

interface FocusContextType {
  userId: string | null;
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionState: SessionState;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  soundscape: SoundscapeType;
  volume: number;
  isSoundMuted: boolean;
  activeAudioType: AudioPlaybackType;
  activeCustomAudio: CustomAudioEntry | null;
  activeCatalogAudio: AudioCatalogEntry | null;
  completedPomodoros: number;
  totalFocusSecondsToday: number;
  totalFocusMinutesToday: number;
  isModalOpen: boolean;
  treeSpecies: TreeSpecies;
  activeSessionId: string | null;
  isCelebrating: boolean;
  resultModalData: FocusResultData | null;
  isResultModalOpen: boolean;
  toggleTimer: () => void;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
  setWorkDurationMinutes: (minutes: number) => void;
  setSoundscape: (soundscape: SoundscapeType) => void;
  setActiveCustomAudio: (entry: CustomAudioEntry | null) => void;
  setActiveCatalogAudio: (entry: AudioCatalogEntry | null) => void;
  setVolume: (volume: number) => void;
  toggleSoundMute: () => void;
  setIsModalOpen: (open: boolean) => void;
  skipSession: () => void;
  setTreeSpecies: (species: TreeSpecies) => void;
  dismissCelebration: () => void;
  giveUpSession: (reason?: string) => Promise<void>;
  closeResultModal: () => void;
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
  const router = useRouter();
  const userId = user?.id;
  const [mode, setModeState] = useState<TimerMode>("work");
  const [workDuration, setWorkDuration] = useState<number>(DEFAULT_WORK);
  const [shortBreakDuration] = useState<number>(DEFAULT_SHORT_BREAK);
  const [longBreakDuration] = useState<number>(DEFAULT_LONG_BREAK);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [soundscape, setSoundscapeState] = useState<SoundscapeType>("none");
  const [volume, setVolumeState] = useState<number>(0.5);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0);
  const [totalFocusSecondsToday, setTotalFocusSecondsToday] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Audio Customization & Catalog Additions
  const [activeAudioType, setActiveAudioType] = useState<AudioPlaybackType>("none");
  const [activeCustomAudio, setActiveCustomAudioState] = useState<CustomAudioEntry | null>(null);
  const [activeCatalogAudio, setActiveCatalogAudioState] = useState<AudioCatalogEntry | null>(null);

  // Focus Forest Additions
  const [treeSpecies, setTreeSpeciesState] = useState<TreeSpecies>("cedar");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCelebrating, setIsCelebrating] = useState<boolean>(false);

  // Result Modal State (Server confirmed)
  const [resultModalData, setResultModalData] = useState<FocusResultData | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);

  const endTimeRef = useRef<number | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const totalFocusSecondsTodayRef = useRef<number>(totalFocusSecondsToday);

  useEffect(() => {
    totalFocusSecondsTodayRef.current = totalFocusSecondsToday;
  }, [totalFocusSecondsToday]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const totalFocusMinutesToday = Math.floor(totalFocusSecondsToday / 60);
  const sessionState: SessionState = isRunning ? "running" : isPaused ? "paused" : "idle";

  const uid = userId || "guest";

  // Persistent Audio Preferences Storage Helper
  const persistAudioPreference = useCallback(
    (key: string, value: string | null) => {
      try {
        if (value === null) {
          localStorage.removeItem(`validily_audio_${key}_${uid}`);
        } else {
          localStorage.setItem(`validily_audio_${key}_${uid}`, value);
        }
      } catch {
        // LocalStorage fallback
      }
    },
    [uid]
  );

  // Persistent Active Timer State Helper (Continuity across reloads/navigation)
  const persistActiveTimerState = useCallback(
    (timerData: {
      mode: TimerMode;
      timeLeft: number;
      endTime: number | null;
      isRunning: boolean;
      isPaused: boolean;
      activeSessionId: string | null;
      treeSpecies: TreeSpecies;
      workDuration: number;
    } | null) => {
      try {
        if (!timerData || (!timerData.isRunning && !timerData.isPaused)) {
          localStorage.removeItem(`validily_active_timer_${uid}`);
        } else {
          localStorage.setItem(`validily_active_timer_${uid}`, JSON.stringify(timerData));
        }
      } catch {
        // LocalStorage fallback
      }
    },
    [uid]
  );
  // Save daily stats helper (strictly scoped to active user & persisted to DB)
  const persistDailyStats = useCallback(
    (pomodoros: number, seconds: number, syncToDb = true) => {
      if (!user?.id) return;
      try {
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem(
          `validily_focus_${user.id}_${today}`,
          JSON.stringify({
            completedPomodoros: pomodoros,
            totalFocusSeconds: seconds,
            totalFocusMinutes: Math.floor(seconds / 60),
          })
        );
        if (syncToDb) {
          recordUserDailyFocus({
            dateStr: today,
            totalSeconds: seconds,
            completedPomodoros: pomodoros,
            userId: user.id,
          }).catch(() => {});
        }
      } catch {
        // LocalStorage fallback
      }
    },
    [user]
  );

  // Load daily stats, tree preferences & persistent audio preferences on mount or when user changes
  useEffect(() => {
    try {
      // 1. Audio Preferences Rehydration
      const savedType = localStorage.getItem(`validily_audio_type_${uid}`) as AudioPlaybackType | null;
      if (savedType && ["none", "synth", "custom", "catalog"].includes(savedType)) {
        setActiveAudioType(savedType);
      }

      const savedSoundscape = localStorage.getItem(`validily_audio_soundscape_${uid}`) as SoundscapeType | null;
      if (
        savedSoundscape &&
        ["none", "rain", "brown", "binaural", "waves"].includes(savedSoundscape)
      ) {
        setSoundscapeState(savedSoundscape);
      }

      const savedCustom = localStorage.getItem(`validily_audio_custom_${uid}`);
      if (savedCustom) {
        try {
          const parsedCustom = JSON.parse(savedCustom);
          if (parsedCustom && parsedCustom.id) {
            setActiveCustomAudioState(parsedCustom);
          }
        } catch {}
      }

      const savedCatalog = localStorage.getItem(`validily_audio_catalog_${uid}`);
      if (savedCatalog) {
        try {
          const parsedCatalog = JSON.parse(savedCatalog);
          if (parsedCatalog && parsedCatalog.id) {
            setActiveCatalogAudioState(parsedCatalog);
          }
        } catch {}
      }

      const savedVol = localStorage.getItem(`validily_audio_volume_${uid}`);
      if (savedVol) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          setVolumeState(v);
          soundEngine.setVolume(v);
        }
      }

      const savedMuted = localStorage.getItem(`validily_audio_muted_${uid}`);
      if (savedMuted !== null) {
        const m = savedMuted === "1";
        setIsSoundMuted(m);
        soundEngine.setMuted(m);
      }

      // Rehydrate in-progress active timer if page was refreshed during session
      const savedTimer = localStorage.getItem(`validily_active_timer_${uid}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          if (parsed && parsed.mode) {
            setModeState(parsed.mode);
            if (parsed.treeSpecies) setTreeSpeciesState(parsed.treeSpecies);
            if (parsed.workDuration) setWorkDuration(parsed.workDuration);
            if (parsed.activeSessionId) {
              setActiveSessionId(parsed.activeSessionId);
              activeSessionIdRef.current = parsed.activeSessionId;
            }
            if (parsed.isRunning && parsed.endTime) {
              const remaining = Math.max(0, Math.round((parsed.endTime - Date.now()) / 1000));
              if (remaining > 0) {
                setTimeLeft(remaining);
                setIsRunning(true);
                setIsPaused(false);
                endTimeRef.current = parsed.endTime;
              } else {
                setTimeLeft(0);
                setIsRunning(false);
                setIsPaused(false);
                localStorage.removeItem(`validily_active_timer_${uid}`);
              }
            } else if (parsed.isPaused) {
              setTimeLeft(parsed.timeLeft || DEFAULT_WORK);
              setIsRunning(false);
              setIsPaused(true);
            }
          }
        } catch {}
      }
    } catch {
      // LocalStorage access fallback
    }

    if (!user?.id) {
      setCompletedPomodoros(0);
      setTotalFocusSecondsToday(0);
      return;
    }

    try {
      // 2. Daily Stats Rehydration
      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(`validily_focus_${user.id}_${today}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedPomodoros(parsed.completedPomodoros || 0);
        const sec =
          parsed.totalFocusSeconds ||
          (parsed.totalFocusMinutes ? parsed.totalFocusMinutes * 60 : 0);
        setTotalFocusSecondsToday(sec);
      } else {
        setCompletedPomodoros(0);
        setTotalFocusSecondsToday(0);
      }

      // Query server DB today focus to guarantee seamless continuity even after logout / session reconnect
      getUserTodayFocus(user.id)
        .then((dbToday) => {
          if (dbToday && (dbToday.totalSeconds > 0 || dbToday.completedPomodoros > 0)) {
            setTotalFocusSecondsToday((prev) => Math.max(prev, dbToday.totalSeconds));
            setCompletedPomodoros((prev) => Math.max(prev, dbToday.completedPomodoros));
            persistDailyStats(dbToday.completedPomodoros, dbToday.totalSeconds, false);
          }
        })
        .catch(() => {});

      // Query server getMyForest to guarantee seamless continuity across sessions and devices
      getMyForest(user.id)
        .then((res) => {
          if (res?.trees) {
            const todayHealthyTrees = res.trees.filter((t) => {
              if (t.tree_status !== "healthy") return false;
              const raw = t.earned_at || t.created_at;
              if (!raw) return false;
              const d = new Date(raw);
              return (
                !isNaN(d.getTime()) &&
                (d.toISOString().split("T")[0] === today || d.toLocaleDateString("en-CA") === today)
              );
            });
            const serverSeconds = todayHealthyTrees.reduce(
              (acc, t) =>
                acc +
                (t.session?.actual_duration_seconds ||
                  t.session?.target_duration_seconds ||
                  1500),
              0
            );
            if (todayHealthyTrees.length > 0 || serverSeconds > 0) {
              setCompletedPomodoros((prev) => Math.max(prev, todayHealthyTrees.length));
              setTotalFocusSecondsToday((prev) => Math.max(prev, serverSeconds));
              persistDailyStats(
                todayHealthyTrees.length,
                serverSeconds,
                true
              );
            }
          }
        })
        .catch(() => {});

      // Query server getMyCustomAudio to ensure custom videos/audio library is maintained across sessions
      getMyCustomAudio()
        .then((res) => {
          if (res.success && res.entries.length > 0) {
            const currentSaved = localStorage.getItem(`validily_audio_custom_${uid}`);
            if (!currentSaved) {
              const savedType = localStorage.getItem(`validily_audio_type_${uid}`);
              if (savedType === "custom") {
                setActiveCustomAudioState(res.entries[0]);
                persistAudioPreference("custom", JSON.stringify(res.entries[0]));
              }
            }
          }
        })
        .catch(() => {});

      // 3. Work Duration Preference
      const savedDuration = localStorage.getItem(`validily_work_duration_${user.id}`);
      if (savedDuration) {
        const dur = parseInt(savedDuration, 10);
        if (!isNaN(dur) && dur > 0) {
          setWorkDuration(dur);
          setTimeLeft(dur);
        }
      }

      // 4. Botanical Species Preference
      const savedSpecies = localStorage.getItem(`validily_tree_species_${user.id}`) as TreeSpecies | null;
      if (
        savedSpecies &&
        ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"].includes(savedSpecies)
      ) {
        setTreeSpeciesState(savedSpecies);
      }
    } catch {
      // LocalStorage fallback
    }
  }, [user, uid, persistActiveTimerState, persistAudioPreference, persistDailyStats]);

  // Dismiss celebration banner
  const dismissCelebration = useCallback(() => {
    setIsCelebrating(false);
  }, []);

  const closeResultModal = useCallback(() => {
    setIsResultModalOpen(false);
  }, []);

  // Set Tree Species
  const setTreeSpecies = useCallback(
    (species: TreeSpecies) => {
      setTreeSpeciesState(species);
      if (!user?.id) return;
      try {
        localStorage.setItem(`validily_tree_species_${user.id}`, species);
      } catch {
        // LocalStorage fallback
      }
    },
    [user]
  );

  // Timer interval handling with continuous real-time focus accumulation
  useEffect(() => {
    if (!isRunning || isPaused) {
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
        const nextSec = totalFocusSecondsTodayRef.current + 1;
        totalFocusSecondsTodayRef.current = nextSec;
        setTotalFocusSecondsToday(nextSec);

        if (nextSec % 15 === 0) {
          persistDailyStats(completedPomodoros, nextSec);
        }

        if (remaining % 5 === 0) {
          persistActiveTimerState({
            mode,
            timeLeft: remaining,
            endTime: endTimeRef.current,
            isRunning: true,
            isPaused: false,
            activeSessionId: activeSessionIdRef.current,
            treeSpecies,
            workDuration,
          });
        }
      }

      if (remaining <= 0) {
        clearInterval(interval);
        persistActiveTimerState(null);
        setIsRunning(false);
        setIsPaused(false);
        soundEngine.playChime();
        soundEngine.stop();

        if (mode === "work") {
          // Complete verified forest session on the server
          const sid = activeSessionIdRef.current || `local-${Date.now()}`;
          activeSessionIdRef.current = null;
          setActiveSessionId(null);
          completeFocusSession(sid)
            .then((res) => {
              const effectiveTree: ForestEntry = (res.success && res.tree) ? res.tree : {
                id: `tree-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                session_id: sid,
                user_id: userId || "guest",
                tree_status: "healthy",
                tree_species: treeSpecies,
                position_x: 0,
                position_y: 0,
                scale_factor: 1,
                earned_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              };

              try {
                const keys = userId ? [`validily_forest_trees_${userId}`] : ["validily_forest_trees_guest"];
                for (const key of keys) {
                  const raw = localStorage.getItem(key);
                  const list: ForestEntry[] = raw ? JSON.parse(raw) : [];
                  if (!list.some((t) => t.id === effectiveTree.id || (t.session_id && t.session_id === effectiveTree.session_id))) {
                    list.unshift(effectiveTree);
                    localStorage.setItem(key, JSON.stringify(list));
                  }
                }
              } catch {}

              setIsCelebrating(true);
              setResultModalData({
                type: "success",
                treeSpecies,
                eligibleSeconds: workDuration,
                targetSeconds: workDuration,
                treeId: effectiveTree.id,
              });
              setIsResultModalOpen(true);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("validily_forest_updated"));
              }
              setTimeout(() => setIsCelebrating(false), 8000);
            })
            .catch(() => {});

          setCompletedPomodoros((p) => {
            const nextCount = p + 1;
            setTotalFocusSecondsToday((prevSec) => {
              const nextSec = prevSec + workDuration;
              persistDailyStats(nextCount, nextSec);
              return nextSec;
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
    isPaused,
    mode,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    completedPomodoros,
    persistDailyStats,
    timeLeft,
    treeSpecies,
  ]);

  // Pause Timer without penalty (suspends focus timer and stops audio)
  const pauseTimer = useCallback(async () => {
    if (!isRunning) return;
    setIsRunning(false);
    setIsPaused(true);
    endTimeRef.current = null;
    soundEngine.stop();

    persistActiveTimerState({
      mode,
      timeLeft,
      endTime: null,
      isRunning: false,
      isPaused: true,
      activeSessionId: activeSessionIdRef.current,
      treeSpecies,
      workDuration,
    });

    if (mode === "work" && activeSessionIdRef.current) {
      try {
        await pauseFocusSession(activeSessionIdRef.current);
      } catch {
        // Safe offline fallback
      }
    }
  }, [isRunning, mode, timeLeft, treeSpecies, workDuration, persistActiveTimerState]);

  // Resume Paused Timer (accumulates paused duration on server and restarts audio)
  const resumeTimer = useCallback(async () => {
    if (!isPaused) return;
    setIsPaused(false);
    setIsRunning(true);
    const targetEnd = Date.now() + timeLeft * 1000;
    endTimeRef.current = targetEnd;

    persistActiveTimerState({
      mode,
      timeLeft,
      endTime: targetEnd,
      isRunning: true,
      isPaused: false,
      activeSessionId: activeSessionIdRef.current,
      treeSpecies,
      workDuration,
    });

    if (activeAudioType === "synth" && soundscape !== "none" && !isSoundMuted) {
      soundEngine.start(soundscape, volume);
    }

    if (mode === "work" && activeSessionIdRef.current) {
      try {
        await resumeFocusSession(activeSessionIdRef.current);
      } catch {
        // Safe offline fallback
      }
    }
  }, [isPaused, timeLeft, activeAudioType, soundscape, isSoundMuted, volume, mode, treeSpecies, workDuration, persistActiveTimerState]);

  // Explicit session abandonment / give up action (creates dead tree penalty & opens result modal)
  const giveUpSession = useCallback(
    async (reason?: string) => {
      setIsRunning(false);
      setIsPaused(false);
      endTimeRef.current = null;
      soundEngine.stop();
      persistActiveTimerState(null);

      const sid = activeSessionIdRef.current || `local-${Date.now()}`;
      activeSessionIdRef.current = null;
      setActiveSessionId(null);

      if (mode === "work") {
        const eligibleSeconds = Math.max(0, workDuration - timeLeft);
        let treeResult: ForestEntry | null = null;
        try {
          const res = await abandonFocusSession(sid, reason || "Abandon manuel par l'étudiant", eligibleSeconds);
          if (res?.tree) {
            treeResult = res.tree;
          }
        } catch {
          // Offline / network fallback
        }

        const effectiveTree: ForestEntry = {
          ...(treeResult || {
            id: `dead-tree-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            session_id: sid,
            user_id: userId || "guest",
            tree_status: "leafless",
            tree_species: treeSpecies,
            position_x: 0,
            position_y: 0,
            scale_factor: 1,
            earned_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }),
          session: treeResult?.session || ({
            id: sid,
            user_id: userId || "guest",
            target_duration_seconds: workDuration,
            actual_duration_seconds: eligibleSeconds,
            status: "interrupted",
            tree_species: treeSpecies,
            session_label: null,
          } as any),
        };

        try {
          const keys = userId ? [`validily_forest_trees_${userId}`] : ["validily_forest_trees_guest"];
          for (const key of keys) {
            const raw = localStorage.getItem(key);
            const list: ForestEntry[] = raw ? JSON.parse(raw) : [];
            if (!list.some((t) => t.id === effectiveTree.id || (t.session_id && t.session_id === effectiveTree.session_id))) {
              list.unshift(effectiveTree);
              localStorage.setItem(key, JSON.stringify(list));
            }
          }
        } catch {}

        setResultModalData({
          type: "failure",
          treeSpecies,
          eligibleSeconds,
          targetSeconds: workDuration,
          reason: reason || "Abandon manuel par l'étudiant",
          treeId: effectiveTree.id,
        });
        setIsResultModalOpen(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("validily_forest_updated"));
        }
      }

      const dur =
        mode === "work"
          ? workDuration
          : mode === "shortBreak"
          ? shortBreakDuration
          : longBreakDuration;
      setTimeLeft(dur);
    },
    [mode, workDuration, shortBreakDuration, longBreakDuration, timeLeft, treeSpecies, userId, persistActiveTimerState]
  );

  // Toggle Timer: start, pause or resume
  const toggleTimer = useCallback(() => {
    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(
          typeof window !== "undefined" ? window.location.pathname : "/forest"
        )}`
      );
      return;
    }

    if (isRunning) {
      pauseTimer();
      return;
    }

    if (isPaused) {
      resumeTimer();
      return;
    }

    // Idle -> Running
    setIsRunning(true);
    setIsPaused(false);
    const targetEnd = Date.now() + timeLeft * 1000;
    endTimeRef.current = targetEnd;

    persistActiveTimerState({
      mode,
      timeLeft,
      endTime: targetEnd,
      isRunning: true,
      isPaused: false,
      activeSessionId: activeSessionIdRef.current,
      treeSpecies,
      workDuration,
    });

    if (activeAudioType === "synth" && soundscape !== "none" && !isSoundMuted) {
      soundEngine.start(soundscape, volume);
    }

    // Initialize server-side focus session for My Forest if in work mode
    if (mode === "work" && !activeSessionIdRef.current) {
      const provisionalId = `local-${Date.now()}`;
      activeSessionIdRef.current = provisionalId;
      setActiveSessionId(provisionalId);

      startFocusSession({
        targetDurationSeconds: timeLeft,
        treeSpecies,
      })
        .then((res) => {
          if (res.success && res.session) {
            activeSessionIdRef.current = res.session.id;
            setActiveSessionId(res.session.id);
            persistActiveTimerState({
              mode,
              timeLeft,
              endTime: targetEnd,
              isRunning: true,
              isPaused: false,
              activeSessionId: res.session.id,
              treeSpecies,
              workDuration,
            });
          }
        })
        .catch(() => {});
    }
  }, [
    user,
    userId,
    router,
    isRunning,
    isPaused,
    pauseTimer,
    resumeTimer,
    timeLeft,
    activeAudioType,
    soundscape,
    isSoundMuted,
    volume,
    mode,
    treeSpecies,
    workDuration,
    persistActiveTimerState,
  ]);

  const resetTimer = useCallback(() => {
    // If currently running in work mode with an active session, delegate to giveUpSession
    if ((isRunning || isPaused) && mode === "work" && activeSessionIdRef.current) {
      giveUpSession("Chronomètre réinitialisé");
      return;
    }

    setIsRunning(false);
    setIsPaused(false);
    endTimeRef.current = null;
    persistActiveTimerState(null);
    soundEngine.stop();
    const dur =
      mode === "work"
        ? workDuration
        : mode === "shortBreak"
        ? shortBreakDuration
        : longBreakDuration;
    setTimeLeft(dur);
  }, [isRunning, isPaused, mode, giveUpSession, workDuration, shortBreakDuration, longBreakDuration, persistActiveTimerState]);

  const setMode = useCallback(
    (newMode: TimerMode) => {
      // If switching away while running in work mode, abandon active session gracefully
      if ((isRunning || isPaused) && mode === "work" && activeSessionIdRef.current) {
        giveUpSession("Changement de mode de chronomètre");
      }

      setIsRunning(false);
      setIsPaused(false);
      endTimeRef.current = null;
      persistActiveTimerState(null);
      setModeState(newMode);
      const dur =
        newMode === "work"
          ? workDuration
          : newMode === "shortBreak"
          ? shortBreakDuration
          : longBreakDuration;
      setTimeLeft(dur);
    },
    [isRunning, isPaused, mode, giveUpSession, workDuration, shortBreakDuration, longBreakDuration, persistActiveTimerState]
  );

  const setWorkDurationMinutes = useCallback(
    (minutes: number) => {
      const seconds = minutes * 60;
      setWorkDuration(seconds);
      if (user?.id) {
        try {
          localStorage.setItem(`validily_work_duration_${user.id}`, seconds.toString());
        } catch {
          // LocalStorage fallback
        }
      }
      if (mode === "work") {
        if ((isRunning || isPaused) && activeSessionIdRef.current) {
          giveUpSession("Modification de la durée de travail");
        } else {
          setIsRunning(false);
          setIsPaused(false);
          endTimeRef.current = null;
          setTimeLeft(seconds);
        }
      }
    },
    [mode, isRunning, isPaused, giveUpSession, user]
  );

  const setSoundscape = useCallback(
    (type: SoundscapeType) => {
      setSoundscapeState(type);
      persistAudioPreference("soundscape", type);

      if (type === "none") {
        soundEngine.stop();
        setActiveAudioType((prev) => {
          const next = prev === "synth" ? "none" : prev;
          persistAudioPreference("type", next);
          return next;
        });
      } else {
        setActiveCustomAudioState(null);
        setActiveCatalogAudioState(null);
        persistAudioPreference("custom", null);
        persistAudioPreference("catalog", null);
        setActiveAudioType("synth");
        persistAudioPreference("type", "synth");
        if (isRunning && !isSoundMuted) {
          soundEngine.start(type, volume);
        }
      }
    },
    [volume, isRunning, isSoundMuted, persistAudioPreference]
  );

  const setActiveCustomAudio = useCallback(
    (entry: CustomAudioEntry | null) => {
      setActiveCustomAudioState(entry);
      if (entry) {
        persistAudioPreference("custom", JSON.stringify(entry));
        setActiveCatalogAudioState(null);
        persistAudioPreference("catalog", null);
        setSoundscapeState("none");
        persistAudioPreference("soundscape", "none");
        soundEngine.stop();
        setActiveAudioType("custom");
        persistAudioPreference("type", "custom");
      } else {
        persistAudioPreference("custom", null);
        setActiveAudioType((prev) => {
          const next = prev === "custom" ? "none" : prev;
          persistAudioPreference("type", next);
          return next;
        });
      }
    },
    [persistAudioPreference]
  );

  const setActiveCatalogAudio = useCallback(
    (entry: AudioCatalogEntry | null) => {
      setActiveCatalogAudioState(entry);
      if (entry) {
        persistAudioPreference("catalog", JSON.stringify(entry));
        setActiveCustomAudioState(null);
        persistAudioPreference("custom", null);
        if (entry.source_type === "synth") {
          const synthKey = entry.source_key as SoundscapeType;
          setSoundscapeState(synthKey);
          persistAudioPreference("soundscape", synthKey);
          setActiveAudioType("synth");
          persistAudioPreference("type", "synth");
          if (isRunning && !isSoundMuted) {
            soundEngine.start(synthKey, volume);
          }
        } else {
          setSoundscapeState("none");
          persistAudioPreference("soundscape", "none");
          soundEngine.stop();
          setActiveAudioType("catalog");
          persistAudioPreference("type", "catalog");
        }
      } else {
        persistAudioPreference("catalog", null);
        setActiveAudioType((prev) => {
          const next = prev === "catalog" ? "none" : prev;
          persistAudioPreference("type", next);
          return next;
        });
      }
    },
    [volume, isRunning, isSoundMuted, persistAudioPreference]
  );

  const setVolume = useCallback(
    (newVol: number) => {
      setVolumeState(newVol);
      soundEngine.setVolume(newVol);
      persistAudioPreference("volume", newVol.toString());
    },
    [persistAudioPreference]
  );

  const skipSession = useCallback(() => {
    if ((isRunning || isPaused) && mode === "work" && activeSessionIdRef.current) {
      giveUpSession("Session sautée");
    }

    setIsRunning(false);
    setIsPaused(false);
    endTimeRef.current = null;
    soundEngine.stop();
    if (mode === "work") {
      setModeState("shortBreak");
      setTimeLeft(shortBreakDuration);
    } else {
      setModeState("work");
      setTimeLeft(workDuration);
    }
  }, [isRunning, isPaused, mode, giveUpSession, shortBreakDuration, workDuration]);

  const toggleSoundMute = useCallback(() => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      persistAudioPreference("muted", next ? "1" : "0");
      return next;
    });
  }, [persistAudioPreference]);

  const youtubeVideoId =
    activeAudioType === "custom"
      ? activeCustomAudio?.youtube_video_id || null
      : activeAudioType === "catalog" && activeCatalogAudio?.source_type === "youtube"
      ? activeCatalogAudio.youtube_video_id || null
      : null;

  const isYouTubePlaying =
    isRunning && !isSoundMuted && (activeAudioType === "custom" || activeAudioType === "catalog");

  return (
    <FocusContext.Provider
      value={{
        userId: userId || null,
        mode,
        timeLeft,
        isRunning,
        isPaused,
        sessionState,
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        soundscape,
        volume,
        isSoundMuted,
        activeAudioType,
        activeCustomAudio,
        activeCatalogAudio,
        completedPomodoros,
        totalFocusSecondsToday,
        totalFocusMinutesToday,
        isModalOpen,
        treeSpecies,
        activeSessionId,
        isCelebrating,
        resultModalData,
        isResultModalOpen,
        toggleTimer,
        pauseTimer,
        resumeTimer,
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
        closeResultModal,
      }}
    >
      {children}

      {/* Persistent Background YouTube Audio Stream */}
      <YouTubeFocusPlayer
        videoId={youtubeVideoId}
        isPlaying={isYouTubePlaying}
        volume={volume}
        isMuted={isSoundMuted}
        title={
          activeAudioType === "custom"
            ? activeCustomAudio?.title
            : activeAudioType === "catalog"
            ? activeCatalogAudio?.title
            : undefined
        }
      />

      {/* Authoritative Focus Result Dialog (Success & Failure) */}
      <FocusResultModal
        data={resultModalData}
        isOpen={isResultModalOpen}
        onClose={closeResultModal}
        onRestartFocus={() => {
          closeResultModal();
          setIsModalOpen(true);
        }}
      />
    </FocusContext.Provider>
  );
}

const FALLBACK_FOCUS_CONTEXT: FocusContextType = {
  userId: null,
  mode: "work",
  timeLeft: DEFAULT_WORK,
  isRunning: false,
  isPaused: false,
  sessionState: "idle",
  workDuration: DEFAULT_WORK,
  shortBreakDuration: DEFAULT_SHORT_BREAK,
  longBreakDuration: DEFAULT_LONG_BREAK,
  soundscape: "none",
  volume: 0.5,
  isSoundMuted: false,
  activeAudioType: "none",
  activeCustomAudio: null,
  activeCatalogAudio: null,
  completedPomodoros: 0,
  totalFocusSecondsToday: 0,
  totalFocusMinutesToday: 0,
  isModalOpen: false,
  treeSpecies: "cedar",
  activeSessionId: null,
  isCelebrating: false,
  resultModalData: null,
  isResultModalOpen: false,
  toggleTimer: () => {},
  pauseTimer: async () => {},
  resumeTimer: async () => {},
  resetTimer: () => {},
  setMode: () => {},
  setWorkDurationMinutes: () => {},
  setSoundscape: () => {},
  setActiveCustomAudio: () => {},
  setActiveCatalogAudio: () => {},
  setVolume: () => {},
  toggleSoundMute: () => {},
  setIsModalOpen: () => {},
  skipSession: () => {},
  setTreeSpecies: () => {},
  dismissCelebration: () => {},
  giveUpSession: async () => {},
  closeResultModal: () => {},
};

export function useFocusTimer(): FocusContextType {
  const context = useContext(FocusContext);
  return context || FALLBACK_FOCUS_CONTEXT;
}

export const useFocus = useFocusTimer;
