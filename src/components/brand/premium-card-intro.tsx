"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface PremiumCardIntroProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

// 14 Sparse Elegant Floating Stardust Particles (6 Emerald, 4 Gold, 4 Diamond White)
const PARTICLES = [
  { id: 1, top: "28%", left: "32%", size: 2.5, color: "#34D399", delay: "0.1s", dur: "2.5s" },
  { id: 2, top: "34%", left: "68%", size: 3.0, color: "#FBBF24", delay: "0.3s", dur: "2.4s" },
  { id: 3, top: "62%", left: "26%", size: 2.0, color: "#34D399", delay: "0.2s", dur: "2.6s" },
  { id: 4, top: "68%", left: "72%", size: 2.5, color: "#FDE68A", delay: "0.4s", dur: "2.3s" },
  { id: 5, top: "22%", left: "54%", size: 1.8, color: "#F8FAFC", delay: "0.0s", dur: "2.7s" },
  { id: 6, top: "45%", left: "20%", size: 2.2, color: "#34D399", delay: "0.5s", dur: "2.2s" },
  { id: 7, top: "52%", left: "80%", size: 2.0, color: "#FBBF24", delay: "0.2s", dur: "2.5s" },
  { id: 8, top: "75%", left: "42%", size: 3.2, color: "#34D399", delay: "0.3s", dur: "2.4s" },
  { id: 9, top: "78%", left: "60%", size: 1.8, color: "#F8FAFC", delay: "0.6s", dur: "2.1s" },
  { id: 10, top: "18%", left: "38%", size: 2.4, color: "#FBBF24", delay: "0.1s", dur: "2.6s" },
  { id: 11, top: "40%", left: "75%", size: 2.0, color: "#34D399", delay: "0.4s", dur: "2.3s" },
  { id: 12, top: "60%", left: "35%", size: 1.5, color: "#F8FAFC", delay: "0.5s", dur: "2.2s" },
  { id: 13, top: "30%", left: "62%", size: 2.8, color: "#34D399", delay: "0.2s", dur: "2.5s" },
  { id: 14, top: "70%", left: "50%", size: 2.2, color: "#FDE68A", delay: "0.3s", dur: "2.4s" },
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

  const finishIntro = useCallback(() => {
    setIsExiting(true);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
    }, 450);
  }, []);

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

      // Replay conditions:
      // 1. Explicit preview override ?intro=replay or ?intro=hold
      // 2. Fresh login event from /login (sessionStorage.validily_login_event)
      // 3. New authenticated session that has not yet played in this browser session
      const shouldPlay =
        isForceReplay ||
        isHoldMode ||
        (isFreshLogin && !hasPlayedInSession) ||
        (!hasPlayedInSession && !sessionStorage.getItem("validily_session_initialized"));

      if (!shouldPlay) {
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
      const exitLeadTime = prefersReducedMotion ? 250 : 450;

      exitTimeoutRef.current = setTimeout(() => {
        setIsExiting(true);
      }, totalDuration - exitLeadTime);

      endTimeoutRef.current = setTimeout(() => {
        setIsMounted(false);
      }, totalDuration);
    } catch {
      // Safe fallback: never block user if sessionStorage is restricted
      setIsMounted(false);
    }

    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    };
  }, [user?.id, isForceReplay, isHoldMode]);

  if (!isMounted) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes validilyHaloPulse {
              0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
              30% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
              65% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.15); }
              85% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.05); }
              100% { opacity: ${isHoldMode ? "0.85" : "0"}; transform: translate(-50%, -50%) scale(1.15); }
            }

            @keyframes validilyCardEmergence {
              0% { opacity: 0; transform: translateY(35px) scale(0.72) rotateY(-180deg) rotateZ(-4deg); }
              15% { opacity: 0.2; transform: translateY(30px) scale(0.75) rotateY(-160deg) rotateZ(-3deg); }
              35% { opacity: 0.9; transform: translateY(-8px) scale(1.04) rotateY(-50deg) rotateZ(1deg); }
              48% { opacity: 1; transform: translateY(0) scale(1.02) rotateY(5deg) rotateZ(0deg); }
              58% { opacity: 1; transform: translateY(0) scale(1) rotateY(0deg) rotateZ(0deg); }
              75% { opacity: 1; transform: translateY(-2px) scale(1) rotateY(0deg) rotateZ(0deg); }
              88% { opacity: 1; transform: translateY(0) scale(0.98) rotateY(0deg) rotateZ(0deg); }
              100% { opacity: 1; transform: translateY(0) scale(1) rotateY(0deg) rotateZ(0deg); }
            }

            @keyframes validilySweep {
              0%, 46% { transform: translateX(-150%) rotate(12deg); opacity: 0; }
              48% { opacity: 1; }
              68% { transform: translateX(150%) rotate(12deg); opacity: 1; }
              75%, 100% { transform: translateX(150%) rotate(12deg); opacity: ${isHoldMode ? "0.2" : "0"}; }
            }

            @keyframes validilyEdgeGlow {
              0%, 48% { opacity: 0; }
              56% { opacity: 1; }
              75% { opacity: 0.4; }
              100% { opacity: ${isHoldMode ? "0.3" : "0"}; }
            }

            @keyframes validilyParticleFloat {
              0% { opacity: 0; transform: translateY(15px) scale(0.6); }
              25% { opacity: 0.85; }
              70% { opacity: 0.75; transform: translateY(-20px) scale(1); }
              100% { opacity: ${isHoldMode ? "0.7" : "0"}; transform: translateY(-35px) scale(0.4); }
            }

            @media (prefers-reduced-motion: reduce) {
              .validily-intro-flipper {
                animation: validilySimpleFade 0.9s ease forwards !important;
                transform: none !important;
              }
              .validily-intro-halo,
              .validily-intro-sweep,
              .validily-intro-edge,
              .validily-intro-particle {
                animation: none !important;
                display: none !important;
              }
            }

            @keyframes validilySimpleFade {
              0% { opacity: 0; }
              40% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 1; }
            }
          `,
        }}
      />

      <aside
        className={`fixed inset-0 z-[9999] flex items-center justify-center select-none overflow-hidden transition-opacity duration-500 ${
          isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background: "radial-gradient(ellipse 85% 75% at 50% 45%, #05261c 0%, #021710 45%, #010a07 80%, #000402 100%)",
        }}
        aria-label="Introduction animée validily-IGL4"
        role="dialog"
        aria-modal="true"
      >
        {/* Volumetric Overhead Emerald & Amber Light Cone */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[900px] h-[65vh] pointer-events-none blur-[20px]"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16, 185, 129, 0.16) 0%, rgba(212, 163, 70, 0.08) 35%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Atmospheric Radial Halo behind Card */}
        <div
          className="validily-intro-halo absolute top-1/2 left-1/2 w-[480px] h-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none blur-[35px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(212, 163, 70, 0.12) 40%, transparent 70%)",
            animation: "validilyHaloPulse 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
          aria-hidden="true"
        />

        {/* Sparse Floating Stardust Particles */}
        <div aria-hidden="true">
          {PARTICLES.map((p) => (
            <span
              key={p.id}
              className="validily-intro-particle absolute rounded-full pointer-events-none opacity-0"
              style={{
                top: p.top,
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                animation: "validilyParticleFloat 2.6s ease-in-out forwards",
                animationDelay: p.delay,
                animationDuration: p.dur,
              }}
            />
          ))}
        </div>

        {/* Discreet & Accessible Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-6 right-6 z-50 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#04120e]/70 border border-emerald-500/30 hover:border-[#D4A346]/60 text-emerald-200/90 hover:text-white text-xs font-medium tracking-wide backdrop-blur-md transition-all cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D4A346]"
          title="Passer l'introduction et accéder directement à l'application"
          aria-label="Passer l'introduction (Touche Échap)"
        >
          <span>Passer l&apos;intro</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-300">
            Échap
          </span>
        </button>

        {/* 3D Card Stage */}
        <div className="relative flex items-center justify-center z-10" style={{ perspective: "1200px" }}>
          <div
            className="validily-intro-flipper relative w-[240px] h-[300px] sm:w-[250px] sm:h-[312px]"
            style={{
              transformStyle: "preserve-3d",
              animation: "validilyCardEmergence 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Back Face (Authentic Geometric Emerald & Gold Lattice) */}
            <div
              className="absolute inset-0 rounded-[26px] overflow-hidden flex flex-col items-center justify-center p-4 border border-[#D4A346]/40"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, #041f17 0%, #062b1e 50%, #02120d 100%)",
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 45px rgba(16, 185, 129, 0.2), 0 0 20px rgba(212, 163, 70, 0.15)",
              }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-2 rounded-[18px] border border-[#D4A346]/25 flex items-center justify-center"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(212, 163, 70, 0.05) 0, rgba(212, 163, 70, 0.05) 1px, transparent 0, transparent 12px), repeating-linear-gradient(-45deg, rgba(212, 163, 70, 0.05) 0, rgba(212, 163, 70, 0.05) 1px, transparent 0, transparent 12px)",
                }}
              >
                <div className="w-16 h-20 rounded-xl border border-[#D4A346]/40 flex items-center justify-center bg-[#03150F]/80 shadow-inner">
                  {/* Stylized Validily "V" Monogram on Back Face */}
                  <svg viewBox="0 0 100 100" className="w-10 h-10 text-[#D4A346]" fill="currentColor">
                    <path d="M25 35 L48 70 L75 25 L62 25 L48 52 L36 35 Z" fill="#D4A346" />
                    <circle cx="75" cy="25" r="7" fill="#D4A346" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Front Face (The Authentic VALIDILY Winning Card Logo) */}
            <div
              className="absolute inset-0 rounded-[26px] overflow-hidden flex flex-col items-center justify-between p-4 border-[1.5px] border-[#D4A346]/45"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
                background: "linear-gradient(155deg, #16243d 0%, #111A2E 50%, #0a1120 100%)",
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 45px rgba(16, 185, 129, 0.2), 0 0 20px rgba(212, 163, 70, 0.15)",
              }}
            >
              {/* Fine Inset Gold Border */}
              <div className="absolute inset-[7px] rounded-[20px] border border-[#D4A346]/25 pointer-events-none" aria-hidden="true" />

              {/* Top-Left Card Corner Pip (Ace of Validity) */}
              <div className="absolute top-3 left-3 flex flex-col items-center leading-none" aria-hidden="true">
                <span className="font-sans text-[13px] font-black text-[#D4A346] tracking-tighter">V</span>
                <span className="text-[8px] text-[#D4A346] mt-0.5">♦</span>
              </div>

              {/* Bottom-Right Card Corner Pip (Mirrored) */}
              <div className="absolute bottom-3 right-3 flex flex-col items-center leading-none rotate-180" aria-hidden="true">
                <span className="font-sans text-[13px] font-black text-[#D4A346] tracking-tighter">V</span>
                <span className="text-[8px] text-[#D4A346] mt-0.5">♦</span>
              </div>

              {/* Centerpiece: The Official VALIDILY-IGL4 Playing Card Logo Asset */}
              <div className="relative flex flex-col items-center justify-center my-auto">
                <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32">
                  <svg
                    viewBox="0 0 256 256"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full drop-shadow-md"
                    role="img"
                    aria-label="Logo validily-IGL4"
                  >
                    <g transform="rotate(-6 128 128)">
                      {/* Deep Navy Rounded Card Body */}
                      <rect
                        x="48"
                        y="28"
                        width="160"
                        height="200"
                        rx="30"
                        fill="#0C1424"
                        stroke="#D4A346"
                        strokeWidth="3"
                      />
                      {/* Interior Card Filigree Accent */}
                      <rect
                        x="56"
                        y="36"
                        width="144"
                        height="184"
                        rx="24"
                        fill="none"
                        stroke="rgba(212, 163, 70, 0.3)"
                        strokeWidth="1.5"
                      />
                      {/* White Bold Geometric Checkmark (The Victory Mark) */}
                      <path
                        d="M74 116 L124 166 L178 82 L156 68 L118 130 L92 104 Z"
                        fill="#FFFFFF"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
                      />
                      {/* Golden Apex Sphere with Radial Lustre */}
                      <circle cx="170" cy="70" r="16" fill="url(#apexGoldGrad)" />
                    </g>
                    <defs>
                      <radialGradient id="apexGoldGrad" cx="35%" cy="35%" r="70%">
                        <stop offset="0%" stopColor="#FFF1B8" />
                        <stop offset="45%" stopColor="#EAB308" />
                        <stop offset="100%" stopColor="#92400E" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>

                {/* Refined Brand Wordmark */}
                <div className="font-sans text-[11px] font-bold tracking-[0.22em] text-[#D4A346] uppercase mt-2.5 drop-shadow-xs">
                  validily-igl4
                </div>
                <div className="font-sans text-[8px] font-semibold tracking-[0.18em] text-[#8C9BB3] uppercase mt-0.5">
                  Excellence Académique
                </div>
              </div>

              {/* Edge Catchlight Flare */}
              <div
                className="validily-intro-edge absolute inset-0 rounded-[26px] pointer-events-none opacity-0 shadow-[inset_0_0_15px_rgba(251,191,36,0.35)]"
                style={{
                  animation: "validilyEdgeGlow 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
                aria-hidden="true"
              />

              {/* Shimmering Golden-White Light Sweep in Phase C */}
              <div
                className="validily-intro-sweep absolute -inset-y-full -inset-x-1/2 pointer-events-none opacity-0"
                style={{
                  background:
                    "linear-gradient(108deg, transparent 35%, rgba(255, 255, 255, 0.02) 42%, rgba(251, 191, 36, 0.35) 48%, rgba(255, 255, 255, 0.85) 51%, rgba(251, 191, 36, 0.35) 54%, transparent 62%)",
                  animation: "validilySweep 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function PremiumCardIntro(props: PremiumCardIntroProps) {
  return (
    <Suspense fallback={null}>
      <PremiumCardIntroContent {...props} />
    </Suspense>
  );
}
