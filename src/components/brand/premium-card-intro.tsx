"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./premium-card-intro.module.css";

interface PremiumCardIntroProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

// Sparse elegant floating stardust particles for subtle depth
const PARTICLES = [
  { id: 1, top: "28%", left: "32%", size: 2.5, color: "#FBBF24" },
  { id: 2, top: "34%", left: "68%", size: 3.0, color: "#D4A346" },
  { id: 3, top: "62%", left: "26%", size: 2.0, color: "#FDE68A" },
  { id: 4, top: "68%", left: "72%", size: 2.5, color: "#FBBF24" },
  { id: 5, top: "22%", left: "54%", size: 1.8, color: "#F8FAFC" },
  { id: 6, top: "45%", left: "20%", size: 2.2, color: "#D4A346" },
  { id: 7, top: "52%", left: "80%", size: 2.0, color: "#FDE68A" },
  { id: 8, top: "75%", left: "42%", size: 2.8, color: "#FBBF24" },
];

function PremiumCardIntroContent({ user }: PremiumCardIntroProps) {
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);

  const introParam = searchParams.get("intro");
  const isForceReplay = introParam === "replay" || introParam === "true";
  const isHoldMode = introParam === "hold";

  // Clean holding state and cookie immediately
  const clearHoldingState = useCallback(() => {
    try {
      document.documentElement.classList.remove("validily-intro-holding");
      document.cookie = "validily_intro_pending=; path=/; max-age=0; SameSite=Lax";
    } catch {
      // Safe fallback
    }
  }, []);

  const finishIntro = useCallback(() => {
    setIsExiting(true);
    clearHoldingState();

    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
    }, 400);
  }, [clearHoldingState]);

  const handleSkip = useCallback(() => {
    finishIntro();
  }, [finishIntro]);

  // Keyboard navigation: Escape key skips immediately
  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, handleSkip]);

  // Session-scoped playback verification
  useEffect(() => {
    try {
      // If user is unauthenticated and this is not an explicit preview override (?intro=replay, hold, etc.), bail out immediately
      if (!user?.id && !isForceReplay && !isHoldMode) {
        clearHoldingState();
        setIsMounted(false);
        return;
      }

      if (hasTriggeredRef.current && !isForceReplay && !isHoldMode) {
        return;
      }
      hasTriggeredRef.current = true;

      const introKey = user?.id ? `validily_intro_played_${user.id}` : "validily_intro_preview";
      const hasPlayedInSession = sessionStorage.getItem(introKey) === "true";
      const isFreshLogin = sessionStorage.getItem("validily_login_event") === "true";

      const shouldPlay =
        isForceReplay ||
        isHoldMode ||
        (isFreshLogin && !hasPlayedInSession) ||
        (!hasPlayedInSession && !sessionStorage.getItem("validily_session_initialized"));

      if (!shouldPlay) {
        clearHoldingState();
        setIsMounted(false);
        return;
      }

      // Mark session as played immediately to prevent replays on refresh / navigation
      if (!isForceReplay && !isHoldMode) {
        sessionStorage.setItem(introKey, "true");
        sessionStorage.setItem("validily_session_initialized", "true");
        sessionStorage.removeItem("validily_login_event");
      }

      // Check user accessibility preference
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setIsMounted(true);

      // If hold mode is active, do not schedule auto-exit so design can be inspected indefinitely
      if (isHoldMode) {
        return;
      }

      const totalDuration = prefersReducedMotion ? 900 : 2750;
      const exitLeadTime = prefersReducedMotion ? 250 : 400;

      exitTimeoutRef.current = setTimeout(() => {
        setIsExiting(true);
        clearHoldingState();
      }, totalDuration - exitLeadTime);

      endTimeoutRef.current = setTimeout(() => {
        setIsMounted(false);
      }, totalDuration);
    } catch {
      clearHoldingState();
      setIsMounted(false);
    }

    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    };
  }, [user?.id, isForceReplay, isHoldMode, clearHoldingState]);

  if (!isMounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introduction animée de la marque validily-IGL4"
      className={`${styles.overlay} ${isExiting ? styles.overlayExiting : ""}`}
    >
      {/* Skip Button */}
      <button
        type="button"
        onClick={handleSkip}
        className={styles.skipButton}
        title="Passer l'introduction (Échap)"
        aria-label="Passer l'intro"
      >
        <span>Passer l&apos;intro</span>
        <kbd className={styles.kbdBadge}>Échap</kbd>
      </button>

      {/* Ambient Lighting & Stage Glow */}
      <div className={styles.ambientHalo} aria-hidden="true" />
      <div className={styles.studioFloor} aria-hidden="true" />

      {/* Floating Stardust Particles */}
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
          }}
          aria-hidden="true"
        />
      ))}

      {/* 3D Perspective Stage */}
      <div className={styles.stage}>
        {/* 360-Degree Card Flipper */}
        <div className={styles.cardFlipper}>
          {/* Specular Light Sweep */}
          <div className={styles.lightSweep} aria-hidden="true" />

          {/* Dark Navy Playing Card with Victory Checkmark & Gold Apex */}
          <div className={styles.navyCard}>
            <svg
              viewBox="0 0 256 256"
              className="w-16 h-16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Victory Checkmark */}
              <path
                d="M74 116 L124 166 L178 82"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Gold Apex Accent Sphere */}
              <circle cx="178" cy="82" r="16" fill="#D4A346" />
              <circle cx="178" cy="82" r="8" fill="#FDE68A" />
            </svg>
          </div>
        </div>

        {/* Amber-Gold Divider Accent */}
        <div className={styles.goldDivider} aria-hidden="true" />

        {/* Clean Bold Brand Wordmark */}
        <h1 className={styles.brandWordmark}>
          validily-igl4
        </h1>
      </div>
    </div>
  );
}

export function PremiumCardIntro({ user }: PremiumCardIntroProps) {
  return (
    <Suspense fallback={null}>
      <PremiumCardIntroContent user={user} />
    </Suspense>
  );
}
