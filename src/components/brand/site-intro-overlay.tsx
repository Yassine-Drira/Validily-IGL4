"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";

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
    // Restore body scroll immediately upon exit
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    const endTimer = setTimeout(() => {
      setIsVisible(false);
      setIsFading(false);
      cleanupTimers();
    }, 350); // Buttery 350ms exit fade
    timersRef.current.push(endTimer);
  }, [cleanupTimers]);

  const launchIntro = useCallback(() => {
    cleanupTimers();
    setIsVisible(true);
    setIsFading(false);

    // Lock body scroll on mobile & desktop during opener playback
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }

    // Auto-proceed at 3.0s if untouched
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      }
    }, 2650);

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
      const hasSeen = sessionStorage.getItem("validily_intro_seen_v9");

      // Clean the URL immediately so it never repeats on navigation/re-renders
      if (isReplay) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (!hasSeen || isReplay) {
        sessionStorage.setItem("validily_intro_seen_v9", "true");

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          launchIntro();
        }
      }
    } catch {
      // Safe fallback
    }

    const handleReplayEvent = () => {
      launchIntro();
    };

    window.addEventListener("validily-replay-intro", handleReplayEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        closeIntro();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("validily-replay-intro", handleReplayEvent);
      window.removeEventListener("keydown", handleKeyDown);
      cleanupTimers();
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      }
    };
  }, [launchIntro, closeIntro, cleanupTimers]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introduction validily-IGL4 — Cliquer ou toucher pour entrer"
      onClick={closeIntro}
      onTouchStart={closeIntro}
      className={`fixed inset-0 w-full h-[100dvh] min-h-screen z-[999999] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-opacity duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] touch-none ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: "radial-gradient(circle at 50% 48%, #FFFFFF 0%, #F8FAFD 50%, #EDF2F8 100%)",
      }}
    >
      {/* Soft Ambient Radial Floor Reflection (Scaled for Mobile Viewports) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[650px] sm:h-[650px] rounded-full pointer-events-none blur-[70px] sm:blur-[110px] opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(212, 163, 70, 0.22) 0%, rgba(40, 85, 217, 0.12) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Main Center Stage with Mobile Padding and Spacing */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-sm w-full group">
        {/* Card Stage with Reflection */}
        <div className="relative mb-4 sm:mb-5" style={{ perspective: "1400px" }}>
          {/* Top-Right Diamond Sparkle Star */}
          <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 z-30 pointer-events-none animate-bounce">
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4A346] drop-shadow-[0_0_8px_rgba(212,163,70,0.8)] fill-current">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Bottom-Left Diamond Sparkle Star */}
          <div className="absolute -bottom-2 -left-2.5 sm:-bottom-2 sm:-left-3 z-30 pointer-events-none animate-pulse">
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-[#FBBF24] drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] fill-current">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Frosted Glassmorphism Outer Glow Aura */}
          <div
            className="absolute -inset-2.5 sm:-inset-3 rounded-[30px] sm:rounded-[34px] blur-lg sm:blur-xl opacity-40 pointer-events-none transition-all duration-500 group-hover:opacity-75 group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(212,163,70,0.7), rgba(40,85,217,0.4), rgba(255,255,255,0.9))",
            }}
          />

          {/* Luxury 3D Rigid Card with Proportional Mobile Dimensions */}
          <div
            className="validily-card-opener relative w-32 h-40 sm:w-44 sm:h-52 rounded-[24px] sm:rounded-[32px] p-3 sm:p-4 flex items-center justify-center bg-white border-2 border-[#D4A346] shadow-[0_0_25px_rgba(212,163,70,0.32),0_15px_35px_rgba(17,26,46,0.12)] overflow-hidden transition-transform duration-300 group-hover:scale-105"
          >
            {/* Fine Inset Inner Gold Border */}
            <div className="absolute inset-1 sm:inset-1.5 rounded-[19px] sm:rounded-[26px] border border-[#D4A346]/25 pointer-events-none" />

            {/* Timed Specular Glass Light Sweep */}
            <div className="validily-glass-sheen absolute inset-0 pointer-events-none opacity-50" />

            {/* Exact Real Logo Asset from public/favicon.svg as a Single Unmodified Block */}
            <img
              src="/favicon.svg"
              alt="Validily Logo"
              width={96}
              height={96}
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain relative z-10 drop-shadow-md select-none pointer-events-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Clean, Confident Brand Wordmark (Proportional on Mobile) */}
        <h1 className="validily-brand-fade text-2xl sm:text-4xl font-black tracking-[0.22em] sm:tracking-[0.24em] uppercase text-[#111A2E] font-sans">
          VALIDILY
        </h1>

        {/* Amber-Gold Accent Divider */}
        <div className="validily-brand-fade w-10 sm:w-12 h-[2.5px] sm:h-[3px] bg-[#D4A346] rounded-full my-2.5 sm:my-3 shadow-[0_0_10px_rgba(212,163,70,0.6)]" />

        {/* Simple & Impressive Slogan */}
        <p className="validily-brand-fade text-[11px] sm:text-sm font-semibold tracking-[0.2em] sm:tracking-[0.24em] uppercase text-[#68748A] font-sans">
          Excellence Académique
        </p>

        {/* Top-Premium Glassmorphism Touch/Click Indicator (Context-Aware for Mobile & Desktop) */}
        <div className="validily-cta-fade mt-4 sm:mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 rounded-full text-[11px] sm:text-xs font-semibold text-[#182235] bg-white/80 border border-white/95 shadow-[0_8px_24px_rgba(17,26,46,0.08),0_0_12px_rgba(212,163,70,0.2)] backdrop-blur-xl transition-all duration-200 active:scale-95 group-hover:scale-105 group-hover:bg-white group-hover:border-[#D4A346]/40 cursor-pointer">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4A346] animate-spin-slow" />
          <span className="tracking-wide sm:hidden">Toucher pour entrer</span>
          <span className="tracking-wide max-sm:hidden">Cliquer pour entrer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
        </div>
      </div>

      {/* Hardware-Accelerated 3D Harmonic Damping Physics Engine */}
      <style jsx>{`
        .validily-card-opener {
          animation: validilyHarmonicPhysics 2.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: flat;
          will-change: transform, opacity, box-shadow;
          -webkit-box-reflect: below 6px linear-gradient(transparent 65%, rgba(0, 0, 0, 0.08) 100%);
        }

        .validily-glass-sheen {
          background: linear-gradient(
            115deg,
            transparent 0%,
            transparent 32%,
            rgba(255, 255, 255, 0.85) 50%,
            rgba(254, 240, 138, 0.45) 56%,
            transparent 72%,
            transparent 100%
          );
          transform: translateX(-240%) skewX(-25deg);
          animation: validilyOpticalSheen 2.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .validily-brand-fade {
          animation: validilyBrandReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
          opacity: 0;
          transform: translateY(6px);
        }

        .validily-cta-fade {
          animation: validilyBrandReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards;
          opacity: 0;
          transform: translateY(8px);
        }

        @keyframes validilyHarmonicPhysics {
          0% {
            transform: perspective(1400px) rotateY(-180deg) rotateX(10deg) rotateZ(-5deg) translateZ(-50px) scale(0.88);
            opacity: 0;
            box-shadow: 0 8px 16px rgba(17, 26, 46, 0.04), 0 0 10px rgba(212, 163, 70, 0.1);
          }
          18% {
            opacity: 1;
          }
          48% {
            transform: perspective(1400px) rotateY(-8deg) rotateX(1.5deg) rotateZ(-1deg) translateZ(24px) scale(1.02);
            box-shadow: 0 20px 45px -10px rgba(17, 26, 46, 0.18), 0 0 30px rgba(212, 163, 70, 0.32);
          }
          62% {
            transform: perspective(1400px) rotateY(6.5deg) rotateX(-2deg) rotateZ(1deg) translateZ(14px) scale(1.015);
          }
          76% {
            transform: perspective(1400px) rotateY(-2deg) rotateX(0.8deg) rotateZ(-0.4deg) translateZ(5px) scale(1.006);
          }
          88% {
            transform: perspective(1400px) rotateY(0.6deg) rotateX(-0.2deg) rotateZ(0.1deg) translateZ(1px) scale(1.002);
          }
          100% {
            transform: perspective(1400px) rotateY(0deg) rotateX(0deg) rotateZ(0deg) translateZ(0px) scale(1);
            opacity: 1;
            box-shadow: 0 15px 35px rgba(17, 26, 46, 0.12), 0 0 25px rgba(212, 163, 70, 0.32);
          }
        }

        @keyframes validilyOpticalSheen {
          0%, 35% {
            transform: translateX(-240%) skewX(-25deg);
            opacity: 0;
          }
          52% {
            opacity: 0.9;
          }
          75% {
            transform: translateX(240%) skewX(-25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(240%) skewX(-25deg);
            opacity: 0;
          }
        }

        @keyframes validilyBrandReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :global(.animate-spin-slow) {
          animation: spin 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
