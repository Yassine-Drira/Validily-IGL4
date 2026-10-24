"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles, X } from "lucide-react";

export function SiteIntroOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initialisation de l'espace...");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startIntro = useCallback(() => {
    setIsOpen(true);
    setIsClosing(false);
    setProgress(0);
    setStatusText("Initialisation du système académique...");

    // Stage 1: Progress fill
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 90);

    // Stage 2: Status text update
    const textTimer1 = setTimeout(() => {
      setStatusText("Chargement des ressources IGL4...");
    }, 500);

    const textTimer2 = setTimeout(() => {
      setStatusText("Prêt • Bienvenue sur Validily");
    }, 1050);

    // Stage 3: Smooth exit curtain
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 550); // Matches smooth fade/scale exit
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(closeTimer);
    };
  }, []);

  const handleSkip = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  }, []);

  useEffect(() => {
    // Check if replayed via searchParams or session
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const forceReplay = urlParams.get("intro") === "replay" || urlParams.get("intro") === "vip";
    const hasSeen = sessionStorage.getItem("validily_intro_v2_seen");

    if (!hasSeen || forceReplay) {
      sessionStorage.setItem("validily_intro_v2_seen", "true");
      // Check prefers-reduced-motion
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        startIntro();
      }
    }

    // Support custom trigger event: window.dispatchEvent(new CustomEvent("validily-replay-intro"))
    const handleReplayEvent = () => {
      startIntro();
    };

    window.addEventListener("validily-replay-intro", handleReplayEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("validily-replay-intro", handleReplayEvent);
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startIntro, isOpen, handleSkip]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introduction validily-IGL4"
      onClick={handleSkip}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isClosing
          ? "opacity-0 scale-[1.04] pointer-events-none blur-sm"
          : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse 90% 85% at 50% 40%, #0F172A 0%, #070B14 55%, #030509 100%)",
      }}
    >
      {/* Background Ambient Lighting & Studio Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full pointer-events-none blur-[90px] opacity-40 transition-opacity"
        style={{
          background:
            "radial-gradient(circle, rgba(212, 163, 70, 0.35) 0%, rgba(40, 85, 217, 0.25) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[420px] h-[80px] pointer-events-none blur-[50px] opacity-25"
        style={{
          background:
            "radial-gradient(ellipse, rgba(212, 163, 70, 0.4) 0%, transparent 70%)",
        }}
      />

      {/* Top Controls: Discrete Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSkip();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-400/40 hover:text-white backdrop-blur-md transition-all shadow-sm cursor-pointer"
        >
          <span>Passer</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-slate-400">
            Échap
          </kbd>
        </button>
      </div>

      {/* Main VIP Stage */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
        {/* VIP Edition Eyebrow Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] font-semibold text-[#FDE68A] bg-[#D4A346]/10 border border-[#D4A346]/30 shadow-inner mb-6 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-[#D4A346] animate-pulse" />
          <span>VIP ACADEMIC EDITION • 2026</span>
        </div>

        {/* 3D Gold Rimmed Playing Card Logo Emblem */}
        <div className="relative group mb-6">
          {/* Card Outer Halo */}
          <div
            className="absolute -inset-2 rounded-[32px] blur-xl opacity-60 transition duration-700"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,163,70,0.5), rgba(40,85,217,0.4))",
            }}
          />

          {/* The Luxury Card */}
          <div
            className="relative w-36 h-44 sm:w-40 sm:h-48 rounded-[28px] p-2 flex flex-col items-center justify-center border border-[#D4A346]/50 shadow-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #111A2E 0%, #0A101D 50%, #060A13 100%)",
              boxShadow:
                "0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 163, 70, 0.25), inset 0 0 20px rgba(212, 163, 70, 0.08)",
            }}
          >
            {/* Interior Fine Filigree Border */}
            <div className="absolute inset-1.5 rounded-[22px] border border-[#D4A346]/20 pointer-events-none" />

            {/* Specular Diagonal Light Sweep */}
            <div
              className="absolute -inset-full pointer-events-none opacity-40 animate-[spin_6s_linear_infinite]"
              style={{
                background:
                  "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(212, 163, 70, 0.15) 60deg, transparent 120deg)",
              }}
            />

            {/* Official Validily Vector Symbol */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <svg
                viewBox="0 0 256 256"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-md"
              >
                <g transform="rotate(-6 128 128)">
                  {/* Deep Navy Rounded Card Base */}
                  <rect
                    x="48"
                    y="28"
                    width="160"
                    height="200"
                    rx="30"
                    fill="#0F172A"
                    stroke="#D4A346"
                    strokeWidth="3.5"
                  />
                  {/* White Victory Checkmark */}
                  <path
                    d="M74 116 L124 166 L178 82 L156 68 L118 130 L92 104 Z"
                    fill="#FFFFFF"
                  />
                  {/* Golden Apex Accent Sphere */}
                  <circle cx="170" cy="70" r="16" fill="url(#apexGoldGradIntro)" />
                  <circle cx="170" cy="70" r="8" fill="#FFF7ED" opacity="0.8" />
                </g>
                <defs>
                  <radialGradient id="apexGoldGradIntro" cx="35%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#FFF1B8" />
                    <stop offset="50%" stopColor="#EAB308" />
                    <stop offset="100%" stopColor="#92400E" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Brand Master Wordmark with Gold Shimmer */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.22em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FDE68A] to-[#D4A346] drop-shadow-sm font-sans">
          VALIDILY
        </h1>

        {/* Subtitle Badge */}
        <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-slate-400 mt-1 font-sans">
          Academic Excellence & AI System
        </p>

        {/* Hairline Chronograph Loading Bar */}
        <div className="mt-8 w-44 sm:w-52 space-y-2">
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden p-[1px] border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #2855D9 0%, #D4A346 60%, #FDE68A 100%)",
                boxShadow: "0 0 10px rgba(212, 163, 70, 0.8)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="truncate pr-2">{statusText}</span>
            <span className="text-[#FDE68A] font-semibold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
