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
    }, 350); // Fast, buttery 350ms exit fade
    timersRef.current.push(endTimer);
  }, [cleanupTimers]);

  const launchIntro = useCallback(() => {
    cleanupTimers();
    setIsVisible(true);
    setIsFading(false);

    // Auto-proceed at 3.0s if user does not click earlier
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
      const hasSeen = sessionStorage.getItem("validily_intro_seen_v6");

      // Clean the URL immediately so it never repeats on refresh or navigation
      if (isReplay) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (!hasSeen || isReplay) {
        sessionStorage.setItem("validily_intro_seen_v6", "true");

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
          background: "radial-gradient(circle, rgba(212, 163, 70, 0.22) 0%, rgba(40, 85, 217, 0.14) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Main Center Stage */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 group">
        {/* Floating Sparkle Stars around Card */}
        <div className="relative mb-5" style={{ transformStyle: "preserve-3d" }}>
          {/* Top-Right Diamond Sparkle */}
          <div className="absolute -top-3 -right-3 z-30 pointer-events-none animate-bounce">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#D4A346] drop-shadow-[0_0_8px_rgba(212,163,70,0.8)] fill-current">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Bottom-Left Diamond Sparkle */}
          <div className="absolute -bottom-2 -left-3 z-30 pointer-events-none animate-pulse">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FBBF24] drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] fill-current">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>

          {/* Frosted Glassmorphism Outer Aura */}
          <div
            className="absolute -inset-4 rounded-[36px] blur-xl opacity-40 pointer-events-none transition-all duration-500 group-hover:opacity-75 group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(212,163,70,0.7), rgba(40,85,217,0.5), rgba(255,255,255,0.8))",
            }}
          />

          {/* The Luxury Playing Card with Glassmorphism Border & Shimmer */}
          <div
            className="relative w-36 h-48 sm:w-44 sm:h-56 rounded-[28px] p-3 flex items-center justify-center border-2 border-[#D4A346] shadow-[0_20px_50px_-10px_rgba(17,26,46,0.25),0_0_30px_rgba(212,163,70,0.3)] bg-[#111A2E] overflow-hidden transition-transform duration-300 group-hover:scale-105"
            style={{
              animation: "validilyCardRotate 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            }}
          >
            {/* Fine Inset Filigree Border */}
            <div className="absolute inset-1.5 rounded-[22px] border border-[#D4A346]/35 pointer-events-none" />

            {/* Specular Diagonal Glass Light Sweep */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                background: "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.75) 50%, rgba(254,240,138,0.4) 55%, transparent 70%)",
                animation: "validilyGlassSheen 2s ease-in-out infinite",
              }}
            />

            {/* Official Validily Vector Symbol */}
            <svg
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-xl relative z-10"
            >
              <g transform="rotate(-6 128 128)">
                {/* Bold White Victory Checkmark */}
                <path
                  d="M74 116 L124 166 L178 82 L156 68 L118 130 L92 104 Z"
                  fill="#FFFFFF"
                />
                {/* Golden Apex Accent Sphere */}
                <circle cx="170" cy="70" r="16" fill="url(#apexGoldLightSparkle)" />
                <circle cx="170" cy="70" r="8" fill="#FFFBEB" opacity="0.95" />
              </g>
              <defs>
                <radialGradient id="apexGoldLightSparkle" cx="35%" cy="35%" r="70%">
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
        <div className="w-12 h-[3px] bg-[#D4A346] rounded-full my-3 shadow-[0_0_10px_rgba(212,163,70,0.6)]" />

        {/* Simple & Impressive Slogan */}
        <p className="text-xs sm:text-sm font-semibold tracking-[0.24em] uppercase text-[#68748A] font-sans">
          Excellence Académique
        </p>

        {/* Top-Premium Glassmorphism "Cliquer pour entrer" Pill Indicator */}
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#182235] bg-white/75 border border-white/90 shadow-[0_8px_24px_rgba(17,26,46,0.08),0_0_12px_rgba(212,163,70,0.2)] backdrop-blur-xl transition-all duration-200 group-hover:scale-105 group-hover:bg-white group-hover:border-[#D4A346]/40 cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A346] animate-spin-slow" />
          <span className="tracking-wide">Cliquer pour entrer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
        </div>
      </div>

      {/* Embedded Hardware-Accelerated Smooth 3D & Sheen Keyframes */}
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

        @keyframes validilyGlassSheen {
          0% {
            transform: translateX(-160%) skewX(-25deg);
            opacity: 0;
          }
          25% {
            opacity: 0.75;
          }
          60% {
            transform: translateX(160%) skewX(-25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(160%) skewX(-25deg);
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
