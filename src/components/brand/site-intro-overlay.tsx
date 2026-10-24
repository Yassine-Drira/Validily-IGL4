"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

export function SiteIntroOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const hasCheckedRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const closeIntro = useCallback(() => {
    setIsFading(true);
    const endTimer = setTimeout(() => {
      setIsVisible(false);
      setIsFading(false);
      cleanupTimers();
    }, 400); // 400ms clean exit fade
    timersRef.current.push(endTimer);
  }, [cleanupTimers]);

  const launchIntro = useCallback(() => {
    cleanupTimers();
    setIsVisible(true);
    setIsFading(false);

    // Exact 3-second sequence:
    // 0.0s - 2.6s: majestic rotating 3D logo & slogan presentation
    // 2.6s - 3.0s: smooth fade out (400ms)
    // 3.0s: completely removed from DOM
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 2600);

    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      setIsFading(false);
      cleanupTimers();
    }, 3000);

    timersRef.current.push(fadeTimer, finishTimer);
  }, [cleanupTimers]);

  useEffect(() => {
    if (typeof window === "undefined" || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isReplay = urlParams.get("intro") === "replay" || urlParams.get("intro") === "vip";
      const hasSeen = sessionStorage.getItem("validily_intro_seen_v5");

      // Clean the URL immediately so it never repeats on refresh or navigation
      if (isReplay) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (!hasSeen || isReplay) {
        sessionStorage.setItem("validily_intro_seen_v5", "true");

        // Check if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          launchIntro();
        }
      }
    } catch {
      // Safe fallback
    }

    // Support manual replay button in header dropdown
    const handleReplayEvent = () => {
      launchIntro();
    };

    window.addEventListener("validily-replay-intro", handleReplayEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeIntro();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("validily-replay-intro", handleReplayEvent);
      window.removeEventListener("keydown", handleKeyDown);
      cleanupTimers();
    };
  }, [launchIntro, closeIntro, cleanupTimers]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introduction validily-IGL4"
      onClick={closeIntro}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-opacity duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: "radial-gradient(circle at 50% 48%, #FFFFFF 0%, #F8FAFD 50%, #EDF2F8 100%)",
      }}
    >
      {/* Subtle Warm & Amber Ambient Floor Reflection */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none blur-[100px] opacity-35"
        style={{
          background: "radial-gradient(circle, rgba(212, 163, 70, 0.2) 0%, rgba(40, 85, 217, 0.12) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Main Center Stage: Prestigious 3-Second Opener */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Smooth 3D Rotating Playing Card Logo */}
        <div
          className="relative mb-6"
          style={{
            animation: "validilyCardRotate 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Subtle Outer Card Halo */}
          <div
            className="absolute -inset-3 rounded-[34px] blur-lg opacity-30 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(212,163,70,0.65), rgba(40,85,217,0.45))",
            }}
          />

          {/* Luxury Rounded Navy Card with Gold Bevel Rim */}
          <div
            className="relative w-36 h-48 sm:w-44 sm:h-56 rounded-[28px] p-3 flex items-center justify-center border-2 border-[#D4A346] shadow-[0_20px_45px_-10px_rgba(17,26,46,0.22),0_0_25px_rgba(212,163,70,0.25)] bg-[#111A2E]"
          >
            {/* Interior Inset Gold Filigree Border */}
            <div className="absolute inset-1.5 rounded-[22px] border border-[#D4A346]/30 pointer-events-none" />

            {/* Official Validily Vector Symbol */}
            <svg
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-lg"
            >
              <g transform="rotate(-6 128 128)">
                {/* Bold White Victory Checkmark */}
                <path
                  d="M74 116 L124 166 L178 82 L156 68 L118 130 L92 104 Z"
                  fill="#FFFFFF"
                />
                {/* Golden Apex Accent Sphere */}
                <circle cx="170" cy="70" r="16" fill="url(#apexGoldLightOpener)" />
                <circle cx="170" cy="70" r="8" fill="#FFFBEB" opacity="0.9" />
              </g>
              <defs>
                <radialGradient id="apexGoldLightOpener" cx="35%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="#FFF1B8" />
                  <stop offset="50%" stopColor="#D4A346" />
                  <stop offset="100%" stopColor="#92400E" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Clean, Confident Brand Wordmark */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-[0.24em] uppercase text-[#111A2E] font-sans">
          VALIDILY
        </h1>

        {/* Amber-Gold Accent Divider */}
        <div className="w-12 h-[3px] bg-[#D4A346] rounded-full my-3.5 shadow-[0_0_10px_rgba(212,163,70,0.6)]" />

        {/* Simple & Impressive Slogan */}
        <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[#68748A] font-sans">
          Excellence Académique & IA
        </p>
      </div>

      {/* Embedded Hardware-Accelerated Smooth 3D Rotation Keyframes */}
      <style jsx>{`
        @keyframes validilyCardRotate {
          0% {
            transform: perspective(1000px) rotateY(-180deg) scale(0.85);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            transform: perspective(1000px) rotateY(0deg) scale(1.04);
          }
          80% {
            transform: perspective(1000px) rotateY(-4deg) scale(1);
          }
          100% {
            transform: perspective(1000px) rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
