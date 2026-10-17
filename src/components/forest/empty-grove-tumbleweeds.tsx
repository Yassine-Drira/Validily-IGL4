"use client";

import React, { useState } from "react";
import { Sparkles, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyGroveTumbleweedsProps {
  ownerName?: string;
  className?: string;
}

export function EmptyGroveTumbleweeds({
  ownerName,
  className = "",
}: EmptyGroveTumbleweedsProps) {
  const [clickedRolls, setClickedRolls] = useState<number>(0);
  const displayName = ownerName || "Ce camarade";

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden select-none z-25", className)}>
      <style>{`
        @keyframes tumbleweed-main {
          0% {
            transform: translate3d(-100px, 240px, 0) rotate(0deg);
          }
          20% {
            transform: translate3d(80px, 195px, 0) rotate(240deg);
          }
          40% {
            transform: translate3d(250px, 250px, 0) rotate(480deg);
          }
          60% {
            transform: translate3d(420px, 185px, 0) rotate(760deg);
          }
          80% {
            transform: translate3d(590px, 245px, 0) rotate(1040deg);
          }
          100% {
            transform: translate3d(850px, 210px, 0) rotate(1360deg);
          }
        }

        @keyframes tumbleweed-mini {
          0% {
            transform: translate3d(-140px, 260px, 0) rotate(0deg);
          }
          25% {
            transform: translate3d(50px, 180px, 0) rotate(320deg);
          }
          50% {
            transform: translate3d(280px, 270px, 0) rotate(680deg);
          }
          75% {
            transform: translate3d(500px, 190px, 0) rotate(1020deg);
          }
          100% {
            transform: translate3d(850px, 250px, 0) rotate(1400deg);
          }
        }

        @keyframes breeze-flow {
          0% {
            transform: translateX(-120px);
            opacity: 0;
          }
          25% {
            opacity: 0.75;
          }
          75% {
            opacity: 0.75;
          }
          100% {
            transform: translateX(860px);
            opacity: 0;
          }
        }

        @keyframes dust-burst {
          0% {
            opacity: 0;
            transform: scale(0.4) translateY(0);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1) translateY(-6px);
          }
          100% {
            opacity: 0;
            transform: scale(1.4) translateY(-12px);
          }
        }

        @keyframes sign-sway {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(2deg);
          }
        }
      `}</style>

      {/* 1. Contextual Notification Floating Badge — Safely positioned beneath the Season Selector bar */}
      <div className="absolute top-16 sm:top-[70px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[92vw] sm:max-w-xl">
        <div className="px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-amber-400/35 text-amber-100 shadow-2xl shadow-black/60 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <span className="text-base select-none animate-bounce">🏜️</span>
          </div>
          <div className="min-w-0 pr-1">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="font-bold text-white tracking-tight">{displayName}</span>
              <span className="text-amber-200/90 font-medium">n&apos;a pas encore validé de session.</span>
            </div>
            <p className="text-amber-300/80 text-[11px] font-mono mt-0.5">
              (Même les virevoltants s&apos;ennuient ici... 💨)
            </p>
          </div>
        </div>
      </div>

      {/* 2. Flowing Wind Breeze Streaks */}
      <div
        className="absolute top-[200px] left-0 pointer-events-none"
        style={{ animation: "breeze-flow 6.5s linear infinite" }}
      >
        <svg width="140" height="28" viewBox="0 0 140 28" fill="none">
          <path
            d="M0 14 C30 8, 60 20, 100 12 C120 8, 130 18, 140 14"
            stroke="#94A3B8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="16 8"
            opacity="0.5"
          />
        </svg>
      </div>

      <div
        className="absolute top-[250px] left-0 pointer-events-none"
        style={{ animation: "breeze-flow 8s linear infinite 2s" }}
      >
        <svg width="180" height="24" viewBox="0 0 180 24" fill="none">
          <path
            d="M0 12 C40 18, 80 6, 130 14 C155 18, 168 8, 180 12"
            stroke="#CBD5E1"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="12 6"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* 3. Isometric Wooden Placard Signpost on Island Center */}
      <div
        className="absolute left-1/2 top-[195px] sm:top-[205px] pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
        style={{ animation: "sign-sway 4s ease-in-out infinite" }}
        title="Un coin de terre paisible prêt pour les futures révisions !"
      >
        <svg width="124" height="76" viewBox="0 0 124 76" fill="none" className="filter drop-shadow-lg">
          <defs>
            <linearGradient id="signWoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="35%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id="signPostGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350F" />
              <stop offset="50%" stopColor="#92400E" />
              <stop offset="100%" stopColor="#451A03" />
            </linearGradient>
          </defs>

          {/* Post shadow */}
          <ellipse cx="62" cy="71" rx="20" ry="5" fill="#090D16" opacity="0.38" />

          {/* Wooden post */}
          <rect x="58.5" y="26" width="7" height="44" rx="2" fill="url(#signPostGrad)" stroke="#451A03" strokeWidth="1" />
          <line x1="62" y1="28" x2="62" y2="67" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />

          {/* Wooden sign board 3D rear/bottom bevel */}
          <path
            d="M8 8 L116 6 C118 6 120 8 120 10 L118 31 C118 33 116 35 114 35 L10 37 C8 37 6 35 6 33 L6 10 C6 8 8 8 8 8 Z"
            fill="#451A03"
          />

          {/* Wooden sign board front face */}
          <path
            d="M9 7 L115 5 C117 5 118.5 7 118.5 9 L116.5 29 C116.5 31 114.5 33 112.5 33 L10.5 35 C8.5 35 6.5 33 6.5 31 L8.5 9 C8.5 7 9 7 9 7 Z"
            fill="url(#signWoodGrad)"
            stroke="#78350F"
            strokeWidth="1.2"
          />

          {/* Plank grain lines & highlight */}
          <line x1="8" y1="19" x2="116" y2="18" stroke="#78350F" strokeWidth="1" opacity="0.55" />
          <line x1="8" y1="20" x2="116" y2="19" stroke="#FEF3C7" strokeWidth="0.6" opacity="0.3" />

          {/* Nails on corners */}
          <circle cx="13" cy="13" r="1.5" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />
          <circle cx="111" cy="12" r="1.5" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />
          <circle cx="14" cy="27" r="1.5" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />
          <circle cx="110" cy="26" r="1.5" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />

          {/* Center nails on pole */}
          <circle cx="62" cy="12" r="1.2" fill="#1E293B" />
          <circle cx="62" cy="26" r="1.2" fill="#1E293B" />

          {/* Sign Text — With drop shadow for maximum crispness & zero clipping */}
          <text
            x="62"
            y="22.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            letterSpacing="0.8"
            fill="#451A03"
            opacity="0.8"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            TERRAIN VIERGE
          </text>
          <text
            x="62"
            y="21.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            letterSpacing="0.8"
            fill="#FFFBEB"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            TERRAIN VIERGE
          </text>

          {/* Cute sleepy owl resting on top-right of the signboard */}
          <g transform="translate(90, -5)">
            {/* Owl body */}
            <ellipse cx="7" cy="8" rx="6" ry="7" fill="#64748B" stroke="#475569" strokeWidth="1" />
            <ellipse cx="7" cy="9" rx="4" ry="4.5" fill="#E2E8F0" />
            {/* Sleepy closed eyes */}
            <path d="M4 6 Q5.5 8 7 6" stroke="#1E293B" strokeWidth="1" fill="none" />
            <path d="M7 6 Q8.5 8 10 6" stroke="#1E293B" strokeWidth="1" fill="none" />
            {/* Tiny beak */}
            <polygon points="7,7 6,8.5 8,8.5" fill="#F59E0B" />
            {/* Sleeping 'zzz' */}
            <text x="12" y="4" fontSize="7" fontWeight="bold" fill="#F8FAFC" opacity="0.9">
              zZ
            </text>
          </g>
        </svg>
      </div>

      {/* 4. Large Animated Tumbleweed (Rolling across island terrain) */}
      <div
        className="absolute top-0 left-0 pointer-events-auto cursor-pointer"
        style={{
          animation: "tumbleweed-main 7s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
        onClick={() => setClickedRolls((c) => c + 1)}
        title="Clic pour faire tourner le virevoltant !"
      >
        <div className="relative group">
          <svg width="58" height="58" viewBox="0 0 64 64" fill="none" className="filter drop-shadow-md">
            {/* Tumbleweed Twig Swirls */}
            <circle cx="32" cy="32" r="28" stroke="#D97706" strokeWidth="2.5" strokeDasharray="7 5" opacity="0.85" />
            <path
              d="M12 26 C16 10, 48 8, 52 24 C56 40, 20 54, 14 38 C8 22, 50 14, 44 48 C38 60, 16 46, 26 30 C36 14, 52 36, 32 46 C12 56, 18 18, 38 18"
              stroke="#B45309"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M20 44 C8 32, 24 12, 42 16 C60 20, 48 50, 30 52 C12 54, 18 28, 34 24 C50 20, 46 44, 24 38"
              stroke="#92400E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M28 20 C34 16, 44 24, 40 34 C36 44, 22 40, 24 30 C26 20, 38 24, 34 32"
              stroke="#78350F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Funny Googly Eyes that roll inside! */}
            <g transform="translate(23, 24)">
              <circle cx="5" cy="5" r="4.5" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />
              <circle cx="6.5" cy="5" r="2" fill="#1E293B" />
              <circle cx="14" cy="5" r="4.5" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />
              <circle cx="15.5" cy="5" r="2" fill="#1E293B" />
            </g>
          </svg>

          {/* Little dust puff under the roll */}
          <div
            className="absolute -bottom-1 left-2 w-4 h-2 bg-amber-600/30 rounded-full blur-[1px]"
            style={{ animation: "dust-burst 1.4s ease-out infinite" }}
          />
        </div>
      </div>

      {/* 5. Baby Tumbleweed Following Behind */}
      <div
        className="absolute top-0 left-0 pointer-events-auto cursor-pointer"
        style={{
          animation: "tumbleweed-mini 5.6s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.8s",
        }}
        onClick={() => setClickedRolls((c) => c + 1)}
        title="Bébé virevoltant au galop !"
      >
        <div className="relative">
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" className="filter drop-shadow-sm">
            <circle cx="32" cy="32" r="26" stroke="#F59E0B" strokeWidth="3" strokeDasharray="6 4" opacity="0.9" />
            <path
              d="M14 28 C18 14, 46 12, 50 26 C54 40, 22 52, 16 38 C10 24, 48 16, 42 46 C36 56, 18 44, 26 30"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <g transform="translate(25, 25)">
              <circle cx="4" cy="4" r="3.5" fill="#FFFFFF" stroke="#92400E" strokeWidth="0.8" />
              <circle cx="5" cy="4" r="1.5" fill="#1E293B" />
              <circle cx="11" cy="4" r="3.5" fill="#FFFFFF" stroke="#92400E" strokeWidth="0.8" />
              <circle cx="12" cy="4" r="1.5" fill="#1E293B" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
