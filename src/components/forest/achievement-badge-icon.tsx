"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AchievementBadgeIconProps {
  id: string;
  isUnlocked: boolean;
  progressPercent?: number;
  size?: number;
  className?: string;
}

export function AchievementBadgeIcon({
  id,
  isUnlocked,
  progressPercent = 0,
  size = 52,
  className = "",
}: AchievementBadgeIconProps) {
  const circum = 2 * Math.PI * 22;
  const strokeDashoffset = circum - (Math.min(100, progressPercent) / 100) * circum;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 transition-all duration-300 select-none",
        isUnlocked
          ? "filter drop-shadow-md hover:scale-105"
          : "opacity-85 hover:opacity-100",
        className
      )}
      style={{ width: size, height: size }}
      title={isUnlocked ? "Accomplissement débloqué !" : `En cours (${progressPercent}%)`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* 1. Premiere Pousse: Emerald Bud Gradient */}
          <linearGradient id="grad_first_tree" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* 2. Bosquet Naissant: Conifer Teal Gradient */}
          <linearGradient id="grad_grove_5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>

          {/* 3. Canopee Florissante: Sapphire Sparkle */}
          <linearGradient id="grad_grove_15" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#2855D9" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          {/* 4. Ile Luxuriante: Turquoise Island */}
          <linearGradient id="grad_full_island_36" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="60%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>

          {/* 5. Foret Seculaire: Mythic Gold-Emerald Tree */}
          <linearGradient id="grad_grove_master_100" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>

          {/* 6. Endurance de Bronze: Metallic Bronze */}
          <linearGradient id="grad_focus_bronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          {/* 7. Marathonien du Focus: Electric Neon Violet */}
          <linearGradient id="grad_focus_silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#581C87" />
          </linearGradient>

          {/* 8. Maitre de la Concentration: Sovereign Gold Crown */}
          <linearGradient id="grad_focus_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* 9. Flamme d'Assiduite: Torch Amber-Fire */}
          <linearGradient id="grad_streak_3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>

          {/* 10. Semaine Heroique: Crimson Phoenix */}
          <linearGradient id="grad_streak_7" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="50%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* 11. Biodiversite Botanique: Prismatic Naturalist */}
          <linearGradient id="grad_botanist_explorer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          {/* 12. Arboretum Universel: Celestial Armillary */}
          <linearGradient id="grad_master_botanist" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Metallic Gold Trim for Unlocked Badges */}
          <linearGradient id="gold_trim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Locked / Glass Background */}
          <linearGradient id="locked_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* Outer Circular Progress Track (Active on In-Progress) */}
        {!isUnlocked && (
          <>
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="2.5"
            />
            {progressPercent > 0 && (
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke={`url(#grad_${id})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circum}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 26 26)"
                className="transition-all duration-700 ease-out"
              />
            )}
          </>
        )}

        {/* UNLOCKED: Glowing Outer Halo */}
        {isUnlocked && (
          <>
            <circle
              cx="26"
              cy="26"
              r="23"
              fill="none"
              stroke="url(#gold_trim)"
              strokeWidth="1.8"
            />
            <circle
              cx="26"
              cy="26"
              r="24.5"
              fill="none"
              stroke="url(#gold_trim)"
              strokeWidth="0.75"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          </>
        )}

        {/* BADGE SPECIFIC ICON EMBLEMS */}
        {id === "first_tree" && (
          /* 1. Premiere Pousse - Seedling Sprout in Emerald Teardrop */
          <g>
            <path
              d="M26 8 C15 8 10 18 10 27 C10 36 17 44 26 44 C35 44 42 36 42 27 C42 18 37 8 26 8 Z"
              fill={isUnlocked ? "url(#grad_first_tree)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#059669" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Mound */}
            <path
              d="M17 36 Q26 31 35 36"
              stroke={isUnlocked ? "#047857" : "#94A3B8"}
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Stem & Leaves */}
            <path
              d="M26 34 Q26 24 23 20"
              stroke={isUnlocked ? "#FFFFFF" : "#64748B"}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M24 22 C19 20 18 15 23 15 C27 15 27 20 24 22 Z"
              fill={isUnlocked ? "#A7F3D0" : "#94A3B8"}
            />
            <path
              d="M25 24 C30 22 32 17 28 16 C25 16 24 21 25 24 Z"
              fill={isUnlocked ? "#FFFFFF" : "#64748B"}
            />
            {/* Dewdrop sparkle */}
            <circle cx="21" cy="14" r="1.2" fill={isUnlocked ? "#FEF08A" : "#CBD5E1"} />
          </g>
        )}

        {id === "grove_5" && (
          /* 2. Bosquet Naissant - Triple Layer Conifer Pine Shield */
          <g>
            <polygon
              points="26,6 44,17 38,43 14,43 8,17"
              fill={isUnlocked ? "url(#grad_grove_5)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#0F766E" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Pine Layer 1 */}
            <polygon points="26,14 33,23 19,23" fill={isUnlocked ? "#5EEAD4" : "#94A3B8"} />
            {/* Pine Layer 2 */}
            <polygon points="26,19 35,29 17,29" fill={isUnlocked ? "#2DD4BF" : "#64748B"} />
            {/* Pine Layer 3 */}
            <polygon points="26,25 38,36 14,36" fill={isUnlocked ? "#FFFFFF" : "#475569"} />
            {/* Trunk */}
            <rect x="24.5" y="36" width="3" height="4" rx="1" fill={isUnlocked ? "#134E4A" : "#64748B"} />
          </g>
        )}

        {id === "grove_15" && (
          /* 3. Canopee Florissante - Hexagonal Starlight Canopy */
          <g>
            <polygon
              points="26,6 43,16 43,36 26,46 9,36 9,16"
              fill={isUnlocked ? "url(#grad_grove_15)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#1E40AF" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Canopy Dome */}
            <circle cx="26" cy="24" r="10" fill={isUnlocked ? "#93C5FD" : "#94A3B8"} />
            <circle cx="21" cy="27" r="7" fill={isUnlocked ? "#60A5FA" : "#64748B"} />
            <circle cx="31" cy="27" r="7" fill={isUnlocked ? "#3B82F6" : "#64748B"} />
            <rect x="24.5" y="30" width="3" height="8" rx="1" fill={isUnlocked ? "#FFFFFF" : "#475569"} />
            {/* Stars Sparkles */}
            <path
              d="M26 10 L27 13 L30 14 L27 15 L26 18 L25 15 L22 14 L25 13 Z"
              fill={isUnlocked ? "#FEF08A" : "#CBD5E1"}
            />
            <path
              d="M37 20 L37.7 21.5 L39.5 22 L37.7 22.5 L37 24 L36.3 22.5 L34.5 22 L36.3 21.5 Z"
              fill={isUnlocked ? "#FEF08A" : "#CBD5E1"}
            />
          </g>
        )}

        {id === "full_island_36" && (
          /* 4. Ile Luxuriante - Archipelago Island & Horizon */
          <g>
            <circle
              cx="26"
              cy="26"
              r="20"
              fill={isUnlocked ? "url(#grad_full_island_36)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#0284C7" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Island Landmass */}
            <ellipse cx="26" cy="33" rx="14" ry="5.5" fill={isUnlocked ? "#FDE68A" : "#94A3B8"} />
            <ellipse cx="26" cy="31" rx="11" ry="4" fill={isUnlocked ? "#10B981" : "#64748B"} />
            {/* Palms */}
            <path d="M22 30 Q23 20 25 17" stroke={isUnlocked ? "#92400E" : "#475569"} strokeWidth="1.8" />
            <path d="M25 17 Q20 15 17 18" stroke={isUnlocked ? "#34D399" : "#64748B"} strokeWidth="1.5" />
            <path d="M25 17 Q25 12 28 14" stroke={isUnlocked ? "#34D399" : "#64748B"} strokeWidth="1.5" />
            <path d="M25 17 Q30 17 31 20" stroke={isUnlocked ? "#10B981" : "#475569"} strokeWidth="1.5" />
            {/* Water Waves */}
            <path d="M14 38 Q18 36 22 38 T30 38 T38 38" stroke={isUnlocked ? "#BAE6FD" : "#CBD5E1"} strokeWidth="1.2" fill="none" />
          </g>
        )}

        {id === "grove_master_100" && (
          /* 5. Foret Seculaire - Ancient Mythic World Tree */
          <g>
            <circle
              cx="26"
              cy="26"
              r="20"
              fill={isUnlocked ? "url(#grad_grove_master_100)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#047857" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Golden Tree Trunk with Spirals */}
            <path
              d="M23 40 Q25 30 24 24 Q26 22 28 24 Q27 30 29 40"
              fill={isUnlocked ? "#FEF08A" : "#64748B"}
            />
            {/* Root Extensions */}
            <path d="M23 40 Q18 42 16 43 M29 40 Q34 42 36 43" stroke={isUnlocked ? "#FEF08A" : "#64748B"} strokeWidth="1.5" strokeLinecap="round" />
            {/* Dense Ancient Canopy */}
            <circle cx="26" cy="18" r="9" fill={isUnlocked ? "#34D399" : "#94A3B8"} opacity="0.9" />
            <circle cx="19" cy="22" r="6.5" fill={isUnlocked ? "#10B981" : "#64748B"} />
            <circle cx="33" cy="22" r="6.5" fill={isUnlocked ? "#059669" : "#475569"} />
            <circle cx="26" cy="16" r="5" fill={isUnlocked ? "#A7F3D0" : "#CBD5E1"} />
            {/* Sparkles */}
            <circle cx="26" cy="11" r="1.5" fill={isUnlocked ? "#FEF08A" : "#FFFFFF"} />
            <circle cx="15" cy="17" r="1" fill={isUnlocked ? "#FEF08A" : "#FFFFFF"} />
            <circle cx="37" cy="17" r="1" fill={isUnlocked ? "#FEF08A" : "#FFFFFF"} />
          </g>
        )}

        {id === "focus_bronze" && (
          /* 6. Endurance de Bronze - Metallic Gear Chronometer (120 min) */
          <g>
            <circle
              cx="26"
              cy="27"
              r="17"
              fill={isUnlocked ? "url(#grad_focus_bronze)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#78350F" : "#CBD5E1"}
              strokeWidth="2"
            />
            {/* Watch Crown */}
            <rect x="24" y="6" width="4" height="4" rx="1" fill={isUnlocked ? "#B45309" : "#64748B"} />
            <path d="M21 7 Q26 4 31 7" stroke={isUnlocked ? "#F59E0B" : "#94A3B8"} strokeWidth="1.5" fill="none" />
            {/* Watch Face Ring */}
            <circle cx="26" cy="27" r="13" fill={isUnlocked ? "#FFFBEB" : "#F1F5F9"} stroke={isUnlocked ? "#B45309" : "#CBD5E1"} strokeWidth="1" />
            {/* Hour Markers */}
            <circle cx="26" cy="17" r="1.2" fill={isUnlocked ? "#78350F" : "#64748B"} />
            <circle cx="36" cy="27" r="1.2" fill={isUnlocked ? "#78350F" : "#64748B"} />
            <circle cx="26" cy="37" r="1.2" fill={isUnlocked ? "#78350F" : "#64748B"} />
            <circle cx="16" cy="27" r="1.2" fill={isUnlocked ? "#78350F" : "#64748B"} />
            {/* Clock Hands pointing to 2h */}
            <line x1="26" y1="27" x2="31" y2="23" stroke={isUnlocked ? "#B45309" : "#475569"} strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="27" x2="26" y2="18" stroke={isUnlocked ? "#DC2626" : "#64748B"} strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="26" cy="27" r="2" fill={isUnlocked ? "#78350F" : "#334155"} />
          </g>
        )}

        {id === "focus_silver" && (
          /* 7. Marathonien du Focus - Electric Neon Lightning Shield (10h) */
          <g>
            <path
              d="M26 6 L42 14 C42 28 35 39 26 44 C17 39 10 28 10 14 Z"
              fill={isUnlocked ? "url(#grad_focus_silver)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#581C87" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Dynamic Kinetic Bolts */}
            <polygon
              points="28,12 18,26 25,26 23,38 34,23 27,23"
              fill={isUnlocked ? "#FDE047" : "#64748B"}
              stroke={isUnlocked ? "#FFFFFF" : "none"}
              strokeWidth="1"
            />
            <path
              d="M14 20 Q16 28 20 34 M38 20 Q36 28 32 34"
              stroke={isUnlocked ? "#E9D5FF" : "#CBD5E1"}
              strokeWidth="1.2"
              fill="none"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {id === "focus_gold" && (
          /* 8. Maitre de la Concentration - Sovereign Imperial Gold Crown (24h) */
          <g>
            <circle
              cx="26"
              cy="26"
              r="20"
              fill={isUnlocked ? "url(#grad_focus_gold)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#78350F" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Imperial Crown Body */}
            <path
              d="M14 34 L17 19 L22 26 L26 15 L30 26 L35 19 L38 34 Z"
              fill={isUnlocked ? "#FEF08A" : "#94A3B8"}
              stroke={isUnlocked ? "#B45309" : "#64748B"}
              strokeWidth="1.5"
            />
            {/* Crown Base Rim */}
            <rect x="13" y="33" width="26" height="4" rx="1.5" fill={isUnlocked ? "#B45309" : "#64748B"} />
            {/* Ruby Gem in center */}
            <polygon points="26,20 28,23 26,26 24,23" fill={isUnlocked ? "#E11D48" : "#475569"} />
            {/* Crown Jewels on tips */}
            <circle cx="17" cy="19" r="1.5" fill={isUnlocked ? "#E11D48" : "#CBD5E1"} />
            <circle cx="26" cy="15" r="2" fill={isUnlocked ? "#FFFFFF" : "#CBD5E1"} />
            <circle cx="35" cy="19" r="1.5" fill={isUnlocked ? "#E11D48" : "#CBD5E1"} />
          </g>
        )}

        {id === "streak_3" && (
          /* 9. Flamme d'Assiduite - Sacred Tri-tongue Torch Flame (3d) */
          <g>
            <path
              d="M26 6 C16 16 11 25 11 32 C11 40 18 45 26 45 C34 45 41 40 41 32 C41 25 36 16 26 6 Z"
              fill={isUnlocked ? "url(#grad_streak_3)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#DC2626" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Mid Flame Tongue */}
            <path
              d="M26 16 C20 22 17 28 17 33 C17 38 21 41 26 41 C31 41 35 38 35 33 C35 28 32 22 26 16 Z"
              fill={isUnlocked ? "#F97316" : "#94A3B8"}
            />
            {/* Inner Core Flame */}
            <path
              d="M26 24 C23 27 21 31 21 34 C21 37 23 39 26 39 C29 39 31 37 31 34 C31 31 29 27 26 24 Z"
              fill={isUnlocked ? "#FEF08A" : "#CBD5E1"}
            />
            {/* Floating Sparks */}
            <circle cx="16" cy="16" r="1.2" fill={isUnlocked ? "#FEF08A" : "#94A3B8"} />
            <circle cx="35" cy="18" r="1.5" fill={isUnlocked ? "#FDE047" : "#94A3B8"} />
          </g>
        )}

        {id === "streak_7" && (
          /* 10. Semaine Heroique - Phoenix Outstretched Wings of Valor (7d) */
          <g>
            <path
              d="M26 6 L43 14 C43 28 35 40 26 45 C17 40 9 28 9 14 Z"
              fill={isUnlocked ? "url(#grad_streak_7)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#881337" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Phoenix Left Wing */}
            <path d="M13 18 Q20 22 25 29 Q19 28 14 24 Z" fill={isUnlocked ? "#FDA4AF" : "#94A3B8"} />
            <path d="M12 25 Q18 29 23 33 Q17 32 13 29 Z" fill={isUnlocked ? "#FB7185" : "#64748B"} />
            {/* Phoenix Right Wing */}
            <path d="M39 18 Q32 22 27 29 Q33 28 38 24 Z" fill={isUnlocked ? "#FDA4AF" : "#94A3B8"} />
            <path d="M40 25 Q34 29 29 33 Q35 32 39 29 Z" fill={isUnlocked ? "#FB7185" : "#64748B"} />
            {/* Valor Star Center */}
            <polygon
              points="26,18 28,24 34,24 29,28 31,34 26,30 21,34 23,28 18,24 24,24"
              fill={isUnlocked ? "#FEF08A" : "#FFFFFF"}
            />
          </g>
        )}

        {id === "botanist_explorer" && (
          /* 11. Biodiversite Botanique - Naturalist Tri-Leaf Prism (3 species) */
          <g>
            <circle
              cx="26"
              cy="26"
              r="20"
              fill={isUnlocked ? "url(#grad_botanist_explorer)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#7C3AED" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Leaf 1: Emerald Oak */}
            <path
              d="M26 26 Q20 16 26 12 Q32 16 26 26 Z"
              fill={isUnlocked ? "#10B981" : "#94A3B8"}
            />
            {/* Leaf 2: Rose Sakura */}
            <path
              d="M26 26 Q16 32 14 26 Q18 20 26 26 Z"
              fill={isUnlocked ? "#F472B6" : "#64748B"}
            />
            {/* Leaf 3: Violet Jacaranda */}
            <path
              d="M26 26 Q36 32 38 26 Q34 20 26 26 Z"
              fill={isUnlocked ? "#C084FC" : "#475569"}
            />
            {/* Core Lens */}
            <circle cx="26" cy="26" r="3.5" fill={isUnlocked ? "#FEF08A" : "#FFFFFF"} stroke={isUnlocked ? "#7C3AED" : "#94A3B8"} strokeWidth="1" />
          </g>
        )}

        {id === "master_botanist" && (
          /* 12. Arboretum Universel - Celestial Armillary Botanical Sphere (6 species) */
          <g>
            <circle
              cx="26"
              cy="26"
              r="20"
              fill={isUnlocked ? "url(#grad_master_botanist)" : "url(#locked_bg)"}
              stroke={isUnlocked ? "#1D4ED8" : "#CBD5E1"}
              strokeWidth="1.5"
            />
            {/* Orbital Rings */}
            <ellipse cx="26" cy="26" rx="17" ry="6" fill="none" stroke={isUnlocked ? "#93C5FD" : "#CBD5E1"} strokeWidth="1.2" transform="rotate(-30 26 26)" />
            <ellipse cx="26" cy="26" rx="17" ry="6" fill="none" stroke={isUnlocked ? "#6EE7B7" : "#CBD5E1"} strokeWidth="1.2" transform="rotate(30 26 26)" />
            {/* Central Globe Core */}
            <circle cx="26" cy="26" r="7" fill={isUnlocked ? "#10B981" : "#64748B"} />
            <circle cx="26" cy="26" r="5" fill={isUnlocked ? "#6EE7B7" : "#94A3B8"} />
            {/* 6 Planetary Botanical Gems */}
            <circle cx="12" cy="18" r="2.2" fill={isUnlocked ? "#10B981" : "#CBD5E1"} />
            <circle cx="40" cy="18" r="2.2" fill={isUnlocked ? "#F59E0B" : "#CBD5E1"} />
            <circle cx="44" cy="30" r="2.2" fill={isUnlocked ? "#0D9488" : "#CBD5E1"} />
            <circle cx="8" cy="30" r="2.2" fill={isUnlocked ? "#84CC16" : "#CBD5E1"} />
            <circle cx="26" cy="9" r="2.2" fill={isUnlocked ? "#8B5CF6" : "#CBD5E1"} />
            <circle cx="26" cy="43" r="2.2" fill={isUnlocked ? "#EC4899" : "#CBD5E1"} />
          </g>
        )}
      </svg>
    </div>
  );
}
