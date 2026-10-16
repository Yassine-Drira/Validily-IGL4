"use client";

import React from "react";
import { TreeSpecies, TreeStatus } from "@/types/database";

interface TreeSvgProps {
  species?: TreeSpecies;
  status?: TreeStatus;
  size?: number | string;
  className?: string;
  stage?: number; // 0: sprout, 1: young shoot, 2: sapling, 3: juvenile, 4: mature
  showMound?: boolean;
  highlighted?: boolean;
}

export const SPECIES_METADATA: Record<
  TreeSpecies,
  {
    name: string;
    latinName: string;
    description: string;
    accentColor: string;
    badgeBg: string;
  }
> = {
  cedar: {
    name: "Cèdre de l'Atlas",
    latinName: "Cedrus atlantica",
    description: "Symbole de résilience et d'endurance face aux épreuves académiques.",
    accentColor: "#065F46",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  oak: {
    name: "Chêne Héritage",
    latinName: "Quercus robur",
    description: "Force tranquille et profondeur de réflexion pour les longues sessions.",
    accentColor: "#047857",
    badgeBg: "bg-green-50 text-green-800 border-green-200",
  },
  pine: {
    name: "Pin Parasol",
    latinName: "Pinus pinea",
    description: "Élégance méditerranéenne offrant un dôme protecteur de concentration.",
    accentColor: "#0D9488",
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
  },
  willow: {
    name: "Saule Sage",
    latinName: "Salix babylonica",
    description: "Souplesse d'esprit et apaisement pour l'assimilation des concepts denses.",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  jacaranda: {
    name: "Flamboyant d'Azur",
    latinName: "Jacaranda mimosifolia",
    description: "Éclat d'inspiration et créativité pour les révisions dynamiques.",
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  sakura: {
    name: "Cerisier Zen",
    latinName: "Prunus serrulata",
    description: "Précision éphémère et harmonie mentale pour les examens blancs.",
    accentColor: "#EC4899",
    badgeBg: "bg-pink-50 text-pink-800 border-pink-200",
  },
};

/**
 * Natural Ground Base: Soft isometric cast shadow with wild botanical micro-scatter
 */
function EarthMound({ species = "cedar", isDead = false }: { species?: TreeSpecies; isDead?: boolean }) {
  return (
    <g className="tree-ground-base">
      {/* Soft directional isometric cast shadow */}
      <ellipse cx="64" cy="112" rx="34" ry="9" fill="rgba(8, 28, 18, 0.22)" />
      <ellipse cx="62" cy="110" rx="22" ry="5.5" fill="rgba(8, 28, 18, 0.15)" />

      {!isDead ? (
        <>
          {/* Natural wild grass blades at trunk base */}
          <path d="M46 110 Q43 104 39 102 Q44 107 47 111" fill="#15803D" />
          <path d="M48 111 Q50 102 54 99 Q51 106 49 112" fill="#22C55E" />
          <path d="M72 111 Q76 104 80 102 Q75 107 73 112" fill="#15803D" />
          <path d="M74 112 Q77 106 82 104 Q76 108 75 113" fill="#22C55E" />

          {/* Tiny smooth river pebbles */}
          <ellipse cx="42" cy="112" rx="3.5" ry="2" fill="#94A3B8" opacity="0.8" />
          <ellipse cx="79" cy="113" rx="2.5" ry="1.5" fill="#CBD5E1" opacity="0.9" />

          {/* Species-specific fallen petals / accents */}
          {species === "sakura" && (
            <>
              <ellipse cx="50" cy="112" rx="2" ry="1.2" fill="#F472B6" opacity="0.85" />
              <ellipse cx="70" cy="114" rx="2.2" ry="1.4" fill="#FBCFE8" opacity="0.9" />
              <ellipse cx="61" cy="115" rx="1.8" ry="1.1" fill="#EC4899" opacity="0.8" />
            </>
          )}

          {species === "jacaranda" && (
            <>
              <ellipse cx="52" cy="113" rx="2" ry="1.2" fill="#818CF8" opacity="0.85" />
              <ellipse cx="71" cy="114" rx="2.2" ry="1.4" fill="#A5B4FC" opacity="0.9" />
              <ellipse cx="60" cy="115" rx="1.8" ry="1.1" fill="#6366F1" opacity="0.8" />
            </>
          )}

          {species === "pine" && (
            <>
              <ellipse cx="49" cy="113" rx="3.5" ry="1.2" fill="#78350F" opacity="0.6" />
              <circle cx="73" cy="113" r="1.5" fill="#92400E" opacity="0.7" />
            </>
          )}
        </>
      ) : (
        <>
          {/* Dry fallen twigs and parched ground */}
          <path d="M44 112 L50 110 L54 113" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M68 113 L74 111 L78 114" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
          <ellipse cx="47" cy="113" rx="2.5" ry="1" fill="#64748B" opacity="0.6" />
        </>
      )}
    </g>
  );
}

/**
 * 1. Atlas Cedar (Cedrus atlantica)
 * Tiered horizontal pagoda boughs, rich blue-emerald needles, sturdy rugged bark
 */
function CedarTree({ isMature = true }: { isMature?: boolean }) {
  return (
    <g className="tree-cedar">
      {/* Trunk with Bark Facets */}
      <path
        d="M56 109 L54 74 L57 48 L60 22 L63 48 L66 74 L64 109 Z"
        fill="url(#cedarTrunkGrad)"
      />
      {/* Roots flared into earth */}
      <path d="M56 105 Q50 108 45 110" stroke="#451A03" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M64 105 Q70 108 75 110" stroke="#451A03" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M60 106 L60 111" stroke="#371502" strokeWidth="2.2" strokeLinecap="round" />

      {/* Tier 1 - Bottom Bough Shelf (Deepest) */}
      <path
        d="M24 88 C34 78, 52 82, 60 74 C68 82, 86 78, 96 88 C84 96, 68 94, 60 91 C52 94, 36 96, 24 88 Z"
        fill="#022C22"
      />
      <path
        d="M26 86 C36 78, 52 81, 60 73 C68 81, 84 78, 94 86 C82 92, 68 91, 60 88 C52 91, 38 92, 26 86 Z"
        fill="url(#cedarFoliageGrad1)"
      />
      {/* Tier 1 needle highlights on crest */}
      <path d="M30 83 Q42 79 56 75" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

      {/* Tier 2 - Middle Bough Shelf */}
      <path
        d="M30 68 C40 58, 54 62, 60 54 C66 62, 80 58, 90 68 C80 75, 68 73, 60 71 C52 73, 40 75, 30 68 Z"
        fill="#022C22"
      />
      <path
        d="M32 66 C42 58, 54 61, 60 53 C66 61, 78 58, 88 66 C78 72, 67 71, 60 69 C53 71, 42 72, 32 66 Z"
        fill="url(#cedarFoliageGrad2)"
      />
      <path d="M36 63 Q46 59 58 55" stroke="#6EE7B7" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />

      {/* Tier 3 - Upper Bough Shelf */}
      <path
        d="M38 48 C46 40, 55 42, 60 36 C65 42, 74 40, 82 48 C74 54, 66 52, 60 51 C54 52, 46 54, 38 48 Z"
        fill="#022C22"
      />
      <path
        d="M40 46 C48 40, 55 41, 60 35 C65 41, 72 40, 80 46 C72 51, 65 50, 60 49 C55 50, 48 51, 40 46 Z"
        fill="url(#cedarFoliageGrad1)"
      />
      <path d="M44 43 Q51 39 58 37" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

      {/* Tier 4 - Topmost Pagoda Crown */}
      <path
        d="M47 30 C53 22, 58 18, 60 14 C62 18, 67 22, 73 30 C66 35, 63 34, 60 33 C57 34, 54 35, 47 30 Z"
        fill="url(#cedarFoliageGrad3)"
      />
      <circle cx="60" cy="16" r="2.8" fill="#6EE7B7" opacity="0.8" />
    </g>
  );
}

/**
 * 2. Heritage Oak (Quercus robur)
 * Volumetric cloud-lobed crown with warm emerald sunlight dappling and gnarled ancient trunk
 */
function OakTree({ isMature = true }: { isMature?: boolean }) {
  return (
    <g className="tree-oak">
      {/* Massive Ancient Gnarled Trunk */}
      <path
        d="M54 109 L52 74 Q44 64 38 54 L44 51 Q50 60 56 68 Q60 58 64 49 L70 52 Q65 62 62 72 L66 109 Z"
        fill="url(#oakTrunkGrad)"
      />
      {/* Gnarled surface roots */}
      <path d="M54 105 Q46 108 40 110" stroke="#3B1A0A" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M66 105 Q74 108 80 110" stroke="#3B1A0A" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="58" cy="85" rx="2.5" ry="4" fill="#241005" />

      {/* Deep Shadow Underlayer */}
      <circle cx="40" cy="62" r="19" fill="#052E16" opacity="0.95" />
      <circle cx="80" cy="62" r="19" fill="#052E16" opacity="0.95" />
      <circle cx="60" cy="46" r="26" fill="#022C22" opacity="0.95" />

      {/* Midlayer Volumetric Foliage Clouds */}
      <circle cx="34" cy="56" r="18" fill="url(#oakLeafGrad1)" />
      <circle cx="86" cy="56" r="18" fill="url(#oakLeafGrad2)" />
      <circle cx="46" cy="38" r="22" fill="url(#oakLeafGrad1)" />
      <circle cx="74" cy="38" r="22" fill="url(#oakLeafGrad2)" />
      <circle cx="60" cy="30" r="23" fill="url(#oakLeafGrad3)" />

      {/* Front Accent Puffs & Sunlight Dappling */}
      <circle cx="50" cy="54" r="16" fill="url(#oakLeafGrad3)" opacity="0.9" />
      <circle cx="70" cy="54" r="16" fill="url(#oakLeafGrad2)" opacity="0.9" />

      {/* Sunlit Crest Highlights (Top-Left Light Source) */}
      <ellipse cx="42" cy="24" rx="10" ry="7" fill="#86EFAC" opacity="0.5" />
      <ellipse cx="60" cy="18" rx="12" ry="7" fill="#BBF7D0" opacity="0.55" />
      <ellipse cx="32" cy="44" rx="8" ry="5.5" fill="#86EFAC" opacity="0.4" />
      <ellipse cx="72" cy="28" rx="9" ry="6" fill="#86EFAC" opacity="0.45" />
    </g>
  );
}

/**
 * 3. Stone Pine (Pinus pinea)
 * Majestic umbrella dome canopy perched on a sweeping Mediterranean terracotta trunk
 */
function PineTree({ isMature = true }: { isMature?: boolean }) {
  return (
    <g className="tree-pine">
      {/* Slender Curved Trunk with Warm Umber/Terracotta tones */}
      <path
        d="M57 109 Q55 80 57 52 Q58 38 60 28 Q62 38 63 52 Q65 80 63 109 Z"
        fill="url(#pineTrunkGrad)"
      />
      <path d="M57 106 Q50 108 44 110" stroke="#431407" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M63 106 Q70 108 76 110" stroke="#431407" strokeWidth="2.8" strokeLinecap="round" />

      {/* Architectural Under-Canopy Spokes */}
      <path d="M58 42 Q42 36 28 32" stroke="#5E2A12" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M62 42 Q78 36 92 32" stroke="#5E2A12" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M59 36 Q48 28 42 22" stroke="#5E2A12" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M61 36 Q72 28 78 22" stroke="#5E2A12" strokeWidth="2.2" strokeLinecap="round" />

      {/* Deep Shadow Underbelly */}
      <path
        d="M18 36 C22 52, 98 52, 102 36 C98 18, 22 18, 18 36 Z"
        fill="#042F2E"
        opacity="0.95"
      />

      {/* Parasol Dome Tufts */}
      <ellipse cx="32" cy="30" rx="18" ry="14" fill="url(#pineNeedleGrad1)" />
      <ellipse cx="88" cy="30" rx="18" ry="14" fill="url(#pineNeedleGrad2)" />
      <ellipse cx="60" cy="22" rx="32" ry="18" fill="url(#pineNeedleGrad3)" />

      {/* Sunlit Highlights */}
      <ellipse cx="58" cy="14" rx="18" ry="8" fill="#5EEAD4" opacity="0.45" />
      <ellipse cx="36" cy="22" rx="10" ry="6" fill="#99F6E4" opacity="0.4" />
      <ellipse cx="78" cy="20" rx="11" ry="6.5" fill="#5EEAD4" opacity="0.35" />
    </g>
  );
}

/**
 * 4. Sage Willow (Salix babylonica)
 * Graceful weeping tendrils draping down like silk curtains in pastel mint and sage tones
 */
function WillowTree({ isMature = true }: { isMature?: boolean }) {
  return (
    <g className="tree-willow">
      {/* Graceful Curved Willow Trunk */}
      <path
        d="M55 109 Q50 76 57 48 Q60 38 60 34 Q63 40 63 50 Q60 76 65 109 Z"
        fill="url(#willowTrunkGrad)"
      />
      <path d="M55 105 Q48 108 43 110" stroke="#3D261A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M65 105 Q72 108 77 110" stroke="#3D261A" strokeWidth="2.6" strokeLinecap="round" />

      {/* Arching boughs */}
      <path d="M57 44 Q38 36 26 48" stroke="#4A3223" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M63 44 Q82 36 94 48" stroke="#4A3223" strokeWidth="2.4" strokeLinecap="round" />

      {/* Crown Volume Base */}
      <ellipse cx="60" cy="36" rx="26" ry="16" fill="#064E3B" />

      {/* Cascading Weeping Tendrils (Front to Back Layered) */}
      <path d="M22 46 Q16 70 20 90" stroke="#047857" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
      <path d="M30 42 Q24 68 28 88" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M38 38 Q32 66 36 94" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M46 34 Q42 64 44 96" stroke="#34D399" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M54 32 Q52 66 54 98" stroke="#6EE7B7" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M62 32 Q62 66 62 98" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M70 34 Q74 64 72 96" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M78 38 Q84 66 80 94" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M86 42 Q92 68 88 88" stroke="#34D399" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M94 46 Q100 70 96 90" stroke="#047857" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />

      {/* Soft Crown Highlights */}
      <ellipse cx="60" cy="28" rx="18" ry="11" fill="#A7F3D0" opacity="0.55" />
    </g>
  );
}

/**
 * 5. Flamboyant Jacaranda (Jacaranda mimosifolia)
 * Luminous purple-indigo floral clouds with vivid blossoms and violet highlights
 */
function JacarandaTree({ isMature = true }: { isMature?: boolean }) {
  return (
    <g className="tree-jacaranda">
      {/* Graceful Sculpted Trunk */}
      <path
        d="M55 109 L53 74 Q46 62 40 52 L45 49 Q51 58 57 66 Q61 56 65 48 L71 50 Q66 60 63 71 L65 109 Z"
        fill="url(#jacarandaTrunkGrad)"
      />
      <path d="M55 105 Q48 108 43 110" stroke="#312E81" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M65 105 Q72 108 77 110" stroke="#312E81" strokeWidth="2.8" strokeLinecap="round" />

      {/* Deep Indigo Shadow Base */}
      <circle cx="38" cy="60" r="18" fill="#1E1B4B" opacity="0.95" />
      <circle cx="82" cy="60" r="18" fill="#1E1B4B" opacity="0.95" />
      <circle cx="60" cy="44" r="25" fill="#312E81" opacity="0.95" />

      {/* Vivid Lilac / Violet Blossom Clouds */}
      <circle cx="34" cy="54" r="17" fill="url(#jacarandaGrad1)" />
      <circle cx="86" cy="54" r="17" fill="url(#jacarandaGrad2)" />
      <circle cx="46" cy="36" r="21" fill="url(#jacarandaGrad1)" />
      <circle cx="74" cy="36" r="21" fill="url(#jacarandaGrad2)" />
      <circle cx="60" cy="28" r="22" fill="url(#jacarandaGrad3)" />

      {/* Front Blossom Accents */}
      <circle cx="50" cy="50" r="15" fill="url(#jacarandaGrad3)" opacity="0.9" />
      <circle cx="70" cy="50" r="15" fill="url(#jacarandaGrad2)" opacity="0.9" />

      {/* Delicate Sunlit Highlights */}
      <ellipse cx="44" cy="22" rx="10" ry="7" fill="#E0E7FF" opacity="0.6" />
      <ellipse cx="60" cy="16" rx="12" ry="7" fill="#EEF2FF" opacity="0.65" />
      <ellipse cx="74" cy="26" rx="8" ry="6" fill="#C7D2FE" opacity="0.5" />
    </g>
  );
}

/**
 * 6. Zen Sakura (Prunus serrulata)
 * Japanese cherry blossom clouds in soft blush rose with exposed branches and white tips
 */
function SakuraTree({ isMature = true }: { isMature?: boolean }) {
  return (
    <g className="tree-sakura">
      {/* Dark Cherry-Wood Sculptural Trunk */}
      <path
        d="M55 109 Q51 76 57 52 Q60 42 62 38 Q64 44 63 54 Q60 78 65 109 Z"
        fill="url(#sakuraTrunkGrad)"
      />
      <path d="M55 105 Q48 108 43 110" stroke="#2A0808" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M65 105 Q72 108 77 110" stroke="#2A0808" strokeWidth="2.8" strokeLinecap="round" />

      {/* Delicate Dark Cherry Branches poking through blossoms */}
      <path d="M57 52 Q42 42 32 46" stroke="#3B0712" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M63 50 Q78 40 88 44" stroke="#3B0712" strokeWidth="2.4" strokeLinecap="round" />

      {/* Deep Rose Shadow Base */}
      <circle cx="36" cy="58" r="17" fill="#831843" opacity="0.9" />
      <circle cx="84" cy="58" r="17" fill="#831843" opacity="0.9" />
      <circle cx="60" cy="42" r="24" fill="#9D174D" opacity="0.95" />

      {/* Soft Rose Blossom Tiers */}
      <circle cx="32" cy="52" r="17" fill="url(#sakuraGrad1)" />
      <circle cx="88" cy="52" r="17" fill="url(#sakuraGrad2)" />
      <circle cx="46" cy="34" r="20" fill="url(#sakuraGrad1)" />
      <circle cx="74" cy="34" r="20" fill="url(#sakuraGrad2)" />
      <circle cx="60" cy="26" r="21" fill="url(#sakuraGrad3)" />

      {/* White / Pastel Blossom Highlights */}
      <ellipse cx="42" cy="20" rx="9" ry="6" fill="#FDF2F8" opacity="0.75" />
      <ellipse cx="60" cy="14" rx="11" ry="6" fill="#FFFFFF" opacity="0.8" />
      <ellipse cx="76" cy="22" rx="9" ry="6" fill="#FCE7F3" opacity="0.65" />
    </g>
  );
}

/**
 * 7. Leafless Tree (Interrupted session > 120s)
 * Dramatic bare winter silhouette, gnarled charcoal bark, broken branch, dignified and melancholic
 */
function LeaflessTree() {
  return (
    <g className="tree-leafless">
      {/* Weathered Bare Trunk with Cold Rim Lighting */}
      <path
        d="M56 109 L54 78 L57 52 L60 34 L63 52 L66 78 L64 109 Z"
        fill="url(#leaflessTrunkGrad)"
      />
      {/* Bare roots */}
      <path d="M56 105 Q49 108 44 110" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M64 105 Q71 108 76 110" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />

      {/* Primary Gnarled Branches */}
      <path d="M57 74 Q38 62 30 50" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      <path d="M63 70 Q78 56 86 44" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <path d="M58 52 Q46 40 38 28" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M62 48 Q74 36 80 24" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 34 L60 18" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" />

      {/* Snapped / Broken Branch Limb */}
      <path d="M58 64 L50 60" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />

      {/* Expressive Twigs */}
      <path d="M30 50 Q24 42 20 38" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 54 Q32 44 28 40" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M86 44 Q94 36 98 32" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M80 50 Q84 42 88 38" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M38 28 Q32 22 28 20" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M80 24 Q86 18 90 14" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M60 18 Q54 12 50 10" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M60 18 Q66 12 70 10" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

/**
 * Seedling stages for live Pomodoro growth preview
 */
function SeedlingStages({ stage, species }: { stage: number; species: TreeSpecies }) {
  if (stage <= 0) {
    return (
      <g className="tree-stage-0">
        <path d="M60 108 Q60 98 60 94" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60 95 Q51 91 48 95 Q54 100 60 96" fill="#34D399" />
        <path d="M60 95 Q69 91 72 95 Q66 100 60 96" fill="#10B981" />
      </g>
    );
  }

  if (stage === 1) {
    return (
      <g className="tree-stage-1">
        <path d="M60 108 Q59 90 60 80" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
        <path d="M59 92 Q46 87 44 93 Q53 98 59 93" fill="#10B981" />
        <path d="M61 90 Q74 85 76 91 Q67 96 61 91" fill="#34D399" />
        <path d="M59 82 Q48 75 46 80 Q54 85 59 83" fill="#34D399" />
        <path d="M61 80 Q72 74 74 79 Q66 84 61 81" fill="#6EE7B7" />
      </g>
    );
  }

  if (stage === 2) {
    return (
      <g className="tree-stage-2">
        <path d="M59 108 L58 70 L62 70 L61 108 Z" fill="#6B3A1C" />
        <path d="M59 86 Q44 75 40 78" stroke="#6B3A1C" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M61 82 Q76 73 80 76" stroke="#6B3A1C" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="38" cy="76" r="9" fill="#10B981" />
        <circle cx="82" cy="74" r="9" fill="#34D399" />
        <circle cx="60" cy="64" r="14" fill="#059669" />
        <circle cx="60" cy="60" r="8" fill="#6EE7B7" opacity="0.7" />
      </g>
    );
  }

  // Stage 3 (75-99%): Juvenile silhouette
  return (
    <g className="tree-stage-3" transform="scale(0.82) translate(13, 22)">
      {species === "oak" ? (
        <OakTree isMature={false} />
      ) : species === "pine" ? (
        <PineTree isMature={false} />
      ) : species === "willow" ? (
        <WillowTree isMature={false} />
      ) : species === "jacaranda" ? (
        <JacarandaTree isMature={false} />
      ) : species === "sakura" ? (
        <SakuraTree isMature={false} />
      ) : (
        <CedarTree isMature={false} />
      )}
    </g>
  );
}

/**
 * Master Tree Renderer — Pure Scalable Vector Graphics with Isometric Perspective
 */
export function TreeSvg({
  species = "cedar",
  status = "healthy",
  size = 120,
  className = "",
  stage = 4,
  showMound = true,
  highlighted = false,
}: TreeSvgProps) {
  const isDead = status === "leafless";
  const isFullyGrown = stage >= 4;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`select-none transition-transform duration-300 ${
        highlighted ? "scale-110 drop-shadow-xl" : ""
      } ${className}`}
      aria-label={`Arbre: ${isDead ? "Arbre défeuillé (interrompu)" : SPECIES_METADATA[species]?.name || species}`}
      role="img"
    >
      <defs>
        {/* Cedar gradients */}
        <linearGradient id="cedarTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#371502" />
          <stop offset="45%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#2E1002" />
        </linearGradient>
        <linearGradient id="cedarFoliageGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022C22" />
        </linearGradient>
        <linearGradient id="cedarFoliageGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="cedarFoliageGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Oak gradients */}
        <linearGradient id="oakTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E1408" />
          <stop offset="50%" stopColor="#693B1E" />
          <stop offset="100%" stopColor="#241005" />
        </linearGradient>
        <radialGradient id="oakLeafGrad1" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022C22" />
        </radialGradient>
        <radialGradient id="oakLeafGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="55%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#052E16" />
        </radialGradient>
        <radialGradient id="oakLeafGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#BBF7D0" />
          <stop offset="45%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#044E3B" />
        </radialGradient>

        {/* Pine gradients */}
        <linearGradient id="pineTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#431407" />
          <stop offset="50%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#2E0D03" />
        </linearGradient>
        <radialGradient id="pineNeedleGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="65%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#042F2E" />
        </radialGradient>
        <radialGradient id="pineNeedleGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="65%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </radialGradient>
        <radialGradient id="pineNeedleGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#99F6E4" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </radialGradient>

        {/* Willow gradients */}
        <linearGradient id="willowTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E1B10" />
          <stop offset="50%" stopColor="#5E432D" />
          <stop offset="100%" stopColor="#1F120A" />
        </linearGradient>

        {/* Jacaranda gradients */}
        <linearGradient id="jacarandaTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E1A1A" />
          <stop offset="50%" stopColor="#5A3A35" />
          <stop offset="100%" stopColor="#201010" />
        </linearGradient>
        <radialGradient id="jacarandaGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="60%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
        <radialGradient id="jacarandaGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="60%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#312E81" />
        </radialGradient>
        <radialGradient id="jacarandaGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="50%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>

        {/* Sakura gradients */}
        <linearGradient id="sakuraTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2A0808" />
          <stop offset="50%" stopColor="#4A1815" />
          <stop offset="100%" stopColor="#1F0505" />
        </linearGradient>
        <radialGradient id="sakuraGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FBCFE8" />
          <stop offset="60%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#831843" />
        </radialGradient>
        <radialGradient id="sakuraGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FCE7F3" />
          <stop offset="60%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#9D174D" />
        </radialGradient>
        <radialGradient id="sakuraGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#DB2777" />
        </radialGradient>

        {/* Leafless gradients */}
        <linearGradient id="leaflessTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Earth mound & shadow foundation */}
      {showMound && <EarthMound species={species} isDead={isDead} />}

      {/* Tree Content */}
      {isDead ? (
        <LeaflessTree />
      ) : !isFullyGrown ? (
        <SeedlingStages stage={stage} species={species} />
      ) : species === "oak" ? (
        <OakTree />
      ) : species === "pine" ? (
        <PineTree />
      ) : species === "willow" ? (
        <WillowTree />
      ) : species === "jacaranda" ? (
        <JacarandaTree />
      ) : species === "sakura" ? (
        <SakuraTree />
      ) : (
        <CedarTree />
      )}
    </svg>
  );
}
