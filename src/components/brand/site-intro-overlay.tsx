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
      const hasSeen = sessionStorage.getItem("validily_intro_seen_v8");

      // Clean the URL immediately so it never repeats on navigation/re-renders
      if (isReplay) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (!hasSeen || isReplay) {
        sessionStorage.setItem("validily_intro_seen_v8", "true");

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
        <div className="relative mb-5" style={{ perspective: "1400px" }}>
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

          {/* Luxury 3D Rigid Card with Harmonic Damped Physics */}
          <div
            className="validily-card-opener relative w-36 h-44 sm:w-44 sm:h-52 rounded-[28px] sm:rounded-[32px] p-4 flex items-center justify-center bg-white border-2 border-[#D4A346] shadow-[0_0_30px_rgba(212,163,70,0.35),0_18px_40px_rgba(17,26,46,0.12)] overflow-hidden transition-transform duration-300 group-hover:scale-105"
          >
            {/* Fine Inset Inner Gold Border */}
            <div className="absolute inset-1.5 rounded-[22px] sm:rounded-[26px] border border-[#D4A346]/25 pointer-events-none" />

            {/* Timed Specular Glass Light Sweep (Aligned with Optical Angle of Incidence) */}
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

        {/* Clean, Confident Brand Wordmark with Soft Emergence */}
        <h1 className="validily-brand-fade text-3xl sm:text-4xl font-black tracking-[0.24em] uppercase text-[#111A2E] font-sans">
          VALIDILY
        </h1>

        {/* Amber-Gold Accent Divider */}
        <div className="validily-brand-fade w-12 h-[3px] bg-[#D4A346] rounded-full my-3 shadow-[0_0_10px_rgba(212,163,70,0.6)]" />

        {/* Simple & Impressive Slogan */}
        <p className="validily-brand-fade text-xs sm:text-sm font-semibold tracking-[0.24em] uppercase text-[#68748A] font-sans">
          Excellence Académique
        </p>

        {/* Top-Premium Glassmorphism "Cliquer pour entrer" Pill Indicator */}
        <div className="validily-cta-fade mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[#182235] bg-white/80 border border-white/95 shadow-[0_8px_24px_rgba(17,26,46,0.08),0_0_12px_rgba(212,163,70,0.2)] backdrop-blur-xl transition-all duration-200 group-hover:scale-105 group-hover:bg-white group-hover:border-[#D4A346]/40 cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A346] animate-spin-slow" />
          <span className="tracking-wide">Cliquer pour entrer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
        </div>
      </div>

      {/* Physics-Based 3D Harmonic Damping & Kinetic Rotation Engine */}
      <style jsx>{`
        .validily-card-opener {
          animation: validilyHarmonicPhysics 2.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: flat;
          will-change: transform, opacity, box-shadow;
          -webkit-box-reflect: below 8px linear-gradient(transparent 65%, rgba(0, 0, 0, 0.08) 100%);
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

        /*
         * Real Physics Dynamics:
         * 1. High initial angular velocity (momentum) on coupled 3D axes (Y principal, subtle X pitch, Z roll).
         * 2. Centrifugal elevation lift (translateZ) while rotating.
         * 3. Damped harmonic overshoot (overshoots by +7.5deg, counter-swings by -2deg, settles at 0deg).
         * 4. Perfectly balanced resting state without artificial jerk.
         */
        @keyframes validilyHarmonicPhysics {
          0% {
            transform: perspective(1400px) rotateY(-180deg) rotateX(10deg) rotateZ(-5deg) translateZ(-60px) scale(0.86);
            opacity: 0;
            box-shadow: 0 8px 16px rgba(17, 26, 46, 0.04), 0 0 10px rgba(212, 163, 70, 0.1);
          }
          18% {
            opacity: 1;
          }
          48% {
            /* Passing 0deg face with peak kinetic velocity and elevation lift */
            transform: perspective(1400px) rotateY(-8deg) rotateX(1.5deg) rotateZ(-1deg) translateZ(28px) scale(1.03);
            box-shadow: 0 24px 50px -10px rgba(17, 26, 46, 0.2), 0 0 35px rgba(212, 163, 70, 0.35);
          }
          62% {
            /* Harmonic overshoot apex */
            transform: perspective(1400px) rotateY(6.5deg) rotateX(-2deg) rotateZ(1deg) translateZ(16px) scale(1.02);
          }
          76% {
            /* Damped counter-swing (aerodynamic decay) */
            transform: perspective(1400px) rotateY(-2deg) rotateX(0.8deg) rotateZ(-0.4deg) translateZ(6px) scale(1.008);
          }
          88% {
            /* Micro-settle */
            transform: perspective(1400px) rotateY(0.6deg) rotateX(-0.2deg) rotateZ(0.1deg) translateZ(1px) scale(1.002);
          }
          100% {
            /* Pure equilibrium */
            transform: perspective(1400px) rotateY(0deg) rotateX(0deg) rotateZ(0deg) translateZ(0px) scale(1);
            opacity: 1;
            box-shadow: 0 18px 40px rgba(17, 26, 46, 0.12), 0 0 30px rgba(212, 163, 70, 0.35);
          }
        }

        /* Specular catchlight flashes across the card exactly as it turns face-on */
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
