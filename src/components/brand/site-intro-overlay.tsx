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

    // Auto-proceed at 3.0s if untouched
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
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
      const hasSeen = sessionStorage.getItem("validily_intro_seen_v7");

      // Clean the URL immediately so it never repeats on navigation/re-renders
      if (isReplay) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (!hasSeen || isReplay) {
        sessionStorage.setItem("validily_intro_seen_v7", "true");

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
    };
  }, [launchIntro, closeIntro, cleanupTimers]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introduction validily-IGL4 — Cliquer pour entrer"
      onClick={closeIntro}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-opacity duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: "radial-gradient(circle at 50% 48%, #FFFFFF 0%, #F8FAFD 50%, #EDF2F8 100%)",
      }}
    >
      {/* Soft Ambient Radial Floor Reflection */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full pointer-events-none blur-[110px] opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(212, 163, 70, 0.22) 0%, rgba(40, 85, 217, 0.12) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Main Center Stage */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 group">
        {/* Card Stage with Reflection */}
        <div className="relative mb-5">
          {/* Top-Right Diamond Sparkle Star */}
          <div className="absolute -top-3 -right-3 z-30 pointer-events-none animate-bounce">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#D4A346] drop-shadow-[0_0_8px_rgba(212,163,70,0.8)] fill-current">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Bottom-Left Diamond Sparkle Star */}
          <div className="absolute -bottom-2 -left-3 z-30 pointer-events-none animate-pulse">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FBBF24] drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] fill-current">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Frosted Glassmorphism Outer Glow Aura */}
          <div
            className="absolute -inset-3 rounded-[34px] blur-xl opacity-40 pointer-events-none transition-all duration-500 group-hover:opacity-75 group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(212,163,70,0.7), rgba(40,85,217,0.4), rgba(255,255,255,0.9))",
            }}
          />

          {/* The Luxury Playing Card as in Photo 1: White Card with Gold Border & Reflection */}
          <div
            className="validily-card-opener relative w-36 h-44 sm:w-44 sm:h-52 rounded-[28px] sm:rounded-[32px] p-4 flex items-center justify-center bg-white border-2 border-[#D4A346] shadow-[0_0_30px_rgba(212,163,70,0.35),0_18px_40px_rgba(17,26,46,0.12)] overflow-hidden transition-transform duration-300 group-hover:scale-105"
          >
            {/* Fine Inset Inner Border */}
            <div className="absolute inset-1.5 rounded-[22px] sm:rounded-[26px] border border-[#D4A346]/25 pointer-events-none" />

            {/* Specular Diagonal Glass Light Sweep */}
            <div className="validily-glass-sheen absolute inset-0 pointer-events-none opacity-50" />

            {/* Exact Real Logo Asset from public/favicon.svg as a Single Unmodified Block */}
            <img
              src="/favicon.svg"
              alt="Validily Logo"
              width={112}
              height={112}
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain relative z-10 drop-shadow-md select-none pointer-events-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Clean, Confident Brand Wordmark */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-[0.24em] uppercase text-[#111A2E] font-sans">
          VALIDILY
        </h1>

        {/* Amber-Gold Accent Divider */}
        <div className="w-12 h-[3px] bg-[#D4A346] rounded-full my-3 shadow-[0_0_10px_rgba(212,163,70,0.6)]" />

        {/* Simple & Impressive Slogan: Clean "Excellence Académique" */}
        <p className="text-xs sm:text-sm font-semibold tracking-[0.24em] uppercase text-[#68748A] font-sans">
          Excellence Académique
        </p>

        {/* Top-Premium Glassmorphism "Cliquer pour entrer" Pill Indicator */}
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#182235] bg-white/80 border border-white/95 shadow-[0_8px_24px_rgba(17,26,46,0.08),0_0_12px_rgba(212,163,70,0.2)] backdrop-blur-xl transition-all duration-200 group-hover:scale-105 group-hover:bg-white group-hover:border-[#D4A346]/40 cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A346] animate-spin-slow" />
          <span className="tracking-wide">Cliquer pour entrer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
        </div>
      </div>

      {/* Hardware-Accelerated 3D Rotation without Center Seam Artifacts */}
      <style jsx>{`
        .validily-card-opener {
          animation: validilyCardRotate 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: flat;
          will-change: transform, opacity;
          -webkit-box-reflect: below 8px linear-gradient(transparent 65%, rgba(0, 0, 0, 0.08) 100%);
        }

        .validily-glass-sheen {
          background: linear-gradient(
            115deg,
            transparent 0%,
            transparent 30%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(254, 240, 138, 0.4) 55%,
            transparent 70%,
            transparent 100%
          );
          transform: translateX(-220%) skewX(-25deg);
          animation: validilyGlassSheen 2.2s ease-in-out infinite;
        }

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

        @keyframes validilyGlassSheen {
          0% {
            transform: translateX(-220%) skewX(-25deg);
            opacity: 0;
          }
          30% {
            opacity: 0.85;
          }
          65% {
            transform: translateX(220%) skewX(-25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(220%) skewX(-25deg);
            opacity: 0;
          }
        }

        :global(.animate-spin-slow) {
          animation: spin 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
