"use client";

import React from "react";
import { TreeSpecies, TreeStatus } from "@/types/database";

export type SeasonTheme = "summer" | "autumn" | "winter" | "spring";

export interface TreeSvgProps {
  species?: TreeSpecies;
  status?: TreeStatus;
  size?: number | string;
  className?: string;
  stage?: number; // 0: sprout, 1: young shoot, 2: sapling, 3: juvenile, 4: mature
  showMound?: boolean;
  highlighted?: boolean;
  season?: SeasonTheme;
}

export const SPECIES_METADATA: Record<
  TreeSpecies,
  {
    name: string;
    latinName: string;
    description: string;
    accentColor: string;
    badgeBg: string;
    seasonalTraits: Record<SeasonTheme, string>;
  }
> = {
  cedar: {
    name: "Cèdre de l'Atlas",
    latinName: "Cedrus atlantica",
    description: "Symbole de résilience et d'endurance face aux épreuves académiques.",
    accentColor: "#065F46",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    seasonalTraits: {
      summer: "Aiguilles émeraude denses et charpente robuste",
      autumn: "Reflets ambrés et cônes de résine dorés",
      winter: "Plateaux sempervirents couronnés de neige d'altitude",
      spring: "Pousses vigoureuses vert tendre",
    },
  },
  oak: {
    name: "Chêne Héritage",
    latinName: "Quercus robur",
    description: "Force tranquille et profondeur de réflexion pour les longues sessions.",
    accentColor: "#047857",
    badgeBg: "bg-green-50 text-green-800 border-green-200",
    seasonalTraits: {
      summer: "Canopée profonde et ombre bienveillante",
      autumn: "Feuillage flamboyant doré, ambré et pourpre",
      winter: "Rameaux dormants parés de cristaux de givre",
      spring: "Bourgeons printaniers vert chartreuse",
    },
  },
  pine: {
    name: "Pin Parasol",
    latinName: "Pinus pinea",
    description: "Élégance méditerranéenne offrant un dôme protecteur de concentration.",
    accentColor: "#0D9488",
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
    seasonalTraits: {
      summer: "Dôme protecteur vert turquoise méditerranéen",
      autumn: "Écorce cuivrée chaleureuse et ramure sculptée",
      winter: "Cime sculpturale coiffée d'un manteau de neige",
      spring: "Aiguilles fraîches d'un vert bleuté étincelant",
    },
  },
  willow: {
    name: "Saule Sage",
    latinName: "Salix babylonica",
    description: "Souplesse d'esprit et apaisement pour l'assimilation des concepts denses.",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    seasonalTraits: {
      summer: "Lianes soyeuses d'un vert céladon apaisant",
      autumn: "Cascade dorée de feuillage mordoré",
      winter: "Osiers argentés en repos végétatif gracieux",
      spring: "Tondeuses printanières vert pâle bourgeonnantes",
    },
  },
  jacaranda: {
    name: "Flamboyant d'Azur",
    latinName: "Jacaranda mimosifolia",
    description: "Éclat d'inspiration et créativité pour les révisions dynamiques.",
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
    seasonalTraits: {
      summer: "Couronne estivale bleu nuit et vert tropical",
      autumn: "Nuances crépusculaires violines et ambre",
      winter: "Silhouette sculptée parée de givre lavande",
      spring: "Explosion spectaculaire de clochettes violettes",
    },
  },
  sakura: {
    name: "Cerisier Zen",
    latinName: "Prunus serrulata",
    description: "Précision éphémère et harmonie mentale pour les examens blancs.",
    accentColor: "#EC4899",
    badgeBg: "bg-pink-50 text-pink-800 border-pink-200",
    seasonalTraits: {
      summer: "Frondaison vert jade ponctuée de cerises rubis",
      autumn: "Feuilles corail, orange brûlé et bronze",
      winter: "Bonsaï d'hiver aux branches poudrées de neige",
      spring: "Nuages vaporeux de fleurs roses et pétales flottants",
    },
  },
};

/**
 * Natural Ground Base: Soft isometric cast shadow with seasonal botanical micro-scatter
 */
function EarthMound({
  species = "cedar",
  isDead = false,
  season = "summer",
}: {
  species?: TreeSpecies;
  isDead?: boolean;
  season?: SeasonTheme;
}) {
  return (
    <g className="tree-ground-base">
      {/* Soft directional isometric cast shadow */}
      <ellipse cx="64" cy="112" rx="34" ry="9" fill="rgba(8, 28, 18, 0.24)" />
      <ellipse cx="62" cy="110" rx="22" ry="5.5" fill="rgba(8, 28, 18, 0.16)" />

      {!isDead ? (
        <>
          {/* Seasonal Ground Scatter */}
          {season === "winter" ? (
            <>
              {/* Fresh snow crest at base of trunk */}
              <ellipse cx="64" cy="111" rx="18" ry="4.5" fill="#F8FAFC" opacity="0.9" />
              <ellipse cx="60" cy="110" rx="10" ry="2.8" fill="#FFFFFF" />
              <ellipse cx="44" cy="112" rx="4" ry="1.8" fill="#E2E8F0" opacity="0.8" />
              <ellipse cx="80" cy="112" rx="3.5" ry="1.6" fill="#E2E8F0" opacity="0.8" />
            </>
          ) : season === "autumn" ? (
            <>
              {/* Scattered fallen autumn leaves */}
              <ellipse cx="48" cy="111" rx="3.5" ry="1.5" fill="#D97706" opacity="0.9" />
              <ellipse cx="78" cy="112" rx="3.8" ry="1.6" fill="#EA580C" opacity="0.85" />
              <ellipse cx="58" cy="113" rx="2.8" ry="1.2" fill="#B45309" opacity="0.9" />
              <ellipse cx="70" cy="114" rx="2.2" ry="1.1" fill="#78350F" opacity="0.8" />
            </>
          ) : season === "spring" ? (
            <>
              {/* Spring grass shoots & scattered flower petals */}
              <path d="M46 110 Q43 104 39 102 Q44 107 47 111" fill="#10B981" />
              <path d="M48 111 Q50 102 54 99 Q51 106 49 112" fill="#34D399" />
              <path d="M72 111 Q76 104 80 102 Q75 107 73 112" fill="#10B981" />
              {species === "sakura" && (
                <>
                  <ellipse cx="50" cy="112" rx="2.5" ry="1.3" fill="#F472B6" opacity="0.9" />
                  <ellipse cx="72" cy="114" rx="2.8" ry="1.4" fill="#FBCFE8" opacity="0.95" />
                  <ellipse cx="62" cy="115" rx="2" ry="1.1" fill="#EC4899" opacity="0.85" />
                </>
              )}
              {species === "jacaranda" && (
                <>
                  <ellipse cx="52" cy="113" rx="2.5" ry="1.3" fill="#818CF8" opacity="0.9" />
                  <ellipse cx="71" cy="114" rx="2.8" ry="1.4" fill="#C7D2FE" opacity="0.95" />
                </>
              )}
            </>
          ) : (
            <>
              {/* Summer wild grass blades and smooth river pebbles */}
              <path d="M46 110 Q43 104 39 102 Q44 107 47 111" fill="#15803D" />
              <path d="M48 111 Q50 102 54 99 Q51 106 49 112" fill="#22C55E" />
              <path d="M72 111 Q76 104 80 102 Q75 107 73 112" fill="#15803D" />
              <path d="M74 112 Q77 106 82 104 Q76 108 75 113" fill="#22C55E" />
              <ellipse cx="42" cy="112" rx="3.5" ry="2" fill="#94A3B8" opacity="0.8" />
              <ellipse cx="79" cy="113" rx="2.5" ry="1.5" fill="#CBD5E1" opacity="0.9" />
            </>
          )}
        </>
      ) : (
        <>
          {/* Unsuccessful Session: Dry broken twigs and cracked soil in ALL seasons */}
          <path d="M44 112 L50 110 L54 113" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M68 113 L74 111 L78 114" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M57 114 L62 112 L65 115" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
          <ellipse cx="47" cy="113" rx="2.5" ry="1" fill="#64748B" opacity="0.6" />
        </>
      )}
    </g>
  );
}

/**
 * 1. Atlas Cedar (Cedrus atlantica) - Evergreen conifer with seasonal adaptation
 */
function CedarTree({ season = "summer" }: { season?: SeasonTheme }) {
  const isWinter = season === "winter";
  const isAutumn = season === "autumn";
  const isSpring = season === "spring";

  // Tier 1 (bottom bough)
  const tier1Fill = isWinter ? "#064E3B" : isAutumn ? "#14532D" : isSpring ? "#047857" : "#022C22";
  const tier1High = isWinter ? "#0D9488" : isAutumn ? "#166534" : isSpring ? "#059669" : "#065F46";

  // Tier 2 (middle bough)
  const tier2Fill = isWinter ? "#0F766E" : isAutumn ? "#166534" : isSpring ? "#059669" : "#047857";
  const tier2High = isWinter ? "#14B8A6" : isAutumn ? "#15803D" : isSpring ? "#10B981" : "#059669";

  // Tier 3 (top bough)
  const tier3Fill = isWinter ? "#115E59" : isAutumn ? "#15803D" : isSpring ? "#10B981" : "#065F46";
  const tier3High = isWinter ? "#2DD4BF" : isAutumn ? "#854D0E" : isSpring ? "#34D399" : "#10B981";

  return (
    <g className="tree-cedar">
      {/* Sturdy Cedar Trunk */}
      <path d="M56 109 L54 74 L57 48 L60 22 L63 48 L66 74 L64 109 Z" fill="url(#cedarTrunkGrad)" />
      <path d="M56 105 Q50 108 45 110" stroke="#451A03" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M64 105 Q70 108 75 110" stroke="#451A03" strokeWidth="2.8" strokeLinecap="round" />

      {/* Tier 1 - Bottom Shelf */}
      <path d="M24 88 C34 78, 52 82, 60 74 C68 82, 86 78, 96 88 C84 96, 68 94, 60 91 C52 94, 36 96, 24 88 Z" fill={tier1Fill} />
      <path d="M28 86 C36 78, 52 81, 60 75 C68 81, 84 78, 92 86 C82 92, 66 89, 60 88 C54 89, 38 92, 28 86 Z" fill={tier1High} />
      {isWinter && (
        /* Snow Pillow on Tier 1 */
        <path d="M26 86 C36 78, 52 80, 60 75 C68 80, 84 78, 94 86 C88 84, 76 81, 60 81 C44 81, 32 84, 26 86 Z" fill="#F8FAFC" />
      )}

      {/* Tier 2 - Middle Shelf */}
      <path d="M30 64 C38 56, 52 60, 60 52 C68 60, 82 56, 90 64 C80 71, 68 69, 60 67 C52 69, 40 71, 30 64 Z" fill={tier2Fill} />
      <path d="M34 62 C40 56, 52 59, 60 53 C68 59, 80 56, 86 62 C78 67, 66 65, 60 64 C54 65, 42 67, 34 62 Z" fill={tier2High} />
      {isWinter && (
        /* Snow Pillow on Tier 2 */
        <path d="M32 62 C40 56, 52 58, 60 53 C68 58, 80 56, 88 62 C82 60, 72 58, 60 58 C48 58, 38 60, 32 62 Z" fill="#F8FAFC" />
      )}

      {/* Tier 3 - Top Crown Shelf */}
      <path d="M38 42 C44 34, 54 38, 60 30 C66 38, 76 34, 82 42 C74 48, 66 47, 60 45 C54 47, 46 48, 38 42 Z" fill={tier3Fill} />
      <path d="M42 40 C46 34, 54 37, 60 31 C66 37, 74 34, 78 40 C72 44, 65 43, 60 42 C55 43, 48 44, 42 40 Z" fill={tier3High} />
      {isWinter && (
        /* Snow Crest on Crown */
        <path d="M40 40 C46 34, 54 36, 60 31 C66 36, 74 34, 80 40 C74 38, 67 36, 60 36 C53 36, 46 38, 40 40 Z" fill="#FFFFFF" />
      )}

      {/* Apex Leader */}
      <path d="M52 28 C55 20, 60 14, 60 14 C60 14, 65 20, 68 28 C64 30, 60 29, 60 29 C60 29, 56 30, 52 28 Z" fill={tier3Fill} />
      {isWinter && (
        <path d="M54 26 C57 18, 60 14, 60 14 C60 14, 63 18, 66 26 C63 24, 60 23, 60 23 C60 23, 57 24, 54 26 Z" fill="#FFFFFF" />
      )}

      {/* Autumn golden pinecones */}
      {isAutumn && (
        <>
          <ellipse cx="44" cy="88" rx="2" ry="3.5" fill="#854D0E" />
          <ellipse cx="76" cy="87" rx="2.2" ry="3.8" fill="#A16207" />
          <ellipse cx="50" cy="65" rx="1.8" ry="3" fill="#854D0E" />
        </>
      )}
    </g>
  );
}

/**
 * 2. Heritage Oak (Quercus robur) - Majestic broadleaf with full seasonal foliage cycle
 */
function OakTree({ season = "summer" }: { season?: SeasonTheme }) {
  const isWinter = season === "winter";
  const isAutumn = season === "autumn";
  const isSpring = season === "spring";

  // Dynamic seasonal canopy gradients
  const leafGrad1 = isWinter
    ? "url(#oakWinterGrad1)"
    : isAutumn
    ? "url(#oakAutumnGrad1)"
    : isSpring
    ? "url(#oakSpringGrad1)"
    : "url(#oakLeafGrad1)";

  const leafGrad2 = isWinter
    ? "url(#oakWinterGrad2)"
    : isAutumn
    ? "url(#oakAutumnGrad2)"
    : isSpring
    ? "url(#oakSpringGrad2)"
    : "url(#oakLeafGrad2)";

  const leafGrad3 = isWinter
    ? "url(#oakWinterGrad3)"
    : isAutumn
    ? "url(#oakAutumnGrad3)"
    : isSpring
    ? "url(#oakSpringGrad3)"
    : "url(#oakLeafGrad3)";

  return (
    <g className="tree-oak">
      {/* Mighty Oak Trunk & Massive Exposed Burls */}
      <path
        d="M54 109 C52 86, 50 68, 48 56 C53 54, 60 52, 60 52 C60 52, 67 54, 72 56 C70 68, 68 86, 66 109 Z"
        fill="url(#oakTrunkGrad)"
      />
      <path d="M54 106 Q46 109 40 111" stroke="#3D2415" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M66 106 Q74 109 80 111" stroke="#3D2415" strokeWidth="3.4" strokeLinecap="round" />

      {/* Main Massive Boughs branching into foliage */}
      <path d="M52 64 Q38 52 30 46" stroke="#4A2E1B" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M68 64 Q82 52 90 46" stroke="#3A2214" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M58 54 Q60 40 60 30" stroke="#4A2E1B" strokeWidth="3.8" strokeLinecap="round" />

      {/* Voluminous Foliage Lobes */}
      {/* Background Understory Clump */}
      <circle cx="34" cy="52" r="21" fill={leafGrad1} />
      <circle cx="86" cy="52" r="21" fill={leafGrad1} />

      {/* Midstory Flank Clumps */}
      <circle cx="42" cy="40" r="24" fill={leafGrad2} />
      <circle cx="78" cy="40" r="24" fill={leafGrad2} />

      {/* Central Heart Clump */}
      <circle cx="60" cy="44" r="26" fill={leafGrad2} />

      {/* Foreground Highlight Top Crown Clumps */}
      <circle cx="48" cy="27" r="19" fill={leafGrad3} />
      <circle cx="72" cy="27" r="19" fill={leafGrad3} />
      <circle cx="60" cy="21" r="18" fill={leafGrad3} />

      {/* Winter Snow Crests atop the dormant canopy */}
      {isWinter && (
        <g className="winter-snow-ridges" opacity="0.95">
          <path d="M42 16 C50 12, 70 12, 78 16 C72 18, 48 18, 42 16 Z" fill="#FFFFFF" />
          <path d="M26 38 C34 32, 48 34, 52 38 C46 40, 32 40, 26 38 Z" fill="#F8FAFC" />
          <path d="M68 38 C72 34, 86 32, 94 38 C88 40, 74 40, 68 38 Z" fill="#F8FAFC" />
        </g>
      )}

      {/* Spring Blossoms and Young Catkins */}
      {isSpring && (
        <g className="spring-buds" opacity="0.85">
          <circle cx="36" cy="34" r="2.2" fill="#FEF08A" />
          <circle cx="58" cy="24" r="2" fill="#FEF08A" />
          <circle cx="76" cy="32" r="2.2" fill="#FEF08A" />
          <circle cx="48" cy="48" r="1.8" fill="#BBF7D0" />
          <circle cx="72" cy="48" r="1.8" fill="#BBF7D0" />
        </g>
      )}
    </g>
  );
}

/**
 * 3. Stone Pine (Pinus pinea) - Mediterranean parasol canopy with seasonal adaptation
 */
function PineTree({ season = "summer" }: { season?: SeasonTheme }) {
  const isWinter = season === "winter";
  const isAutumn = season === "autumn";
  const isSpring = season === "spring";

  const needleGrad1 = isWinter
    ? "url(#pineWinterGrad1)"
    : isAutumn
    ? "url(#pineAutumnGrad1)"
    : isSpring
    ? "url(#pineSpringGrad1)"
    : "url(#pineNeedleGrad1)";

  const needleGrad2 = isWinter
    ? "url(#pineWinterGrad2)"
    : isAutumn
    ? "url(#pineAutumnGrad2)"
    : isSpring
    ? "url(#pineSpringGrad2)"
    : "url(#pineNeedleGrad2)";

  const needleGrad3 = isWinter
    ? "url(#pineWinterGrad3)"
    : isAutumn
    ? "url(#pineAutumnGrad3)"
    : isSpring
    ? "url(#pineSpringGrad3)"
    : "url(#pineNeedleGrad3)";

  return (
    <g className="tree-pine">
      {/* Tall Sculptural Reddish Bark Trunk */}
      <path
        d="M57 109 L56 70 Q56 46 54 36 L66 36 Q64 46 63 70 L63 109 Z"
        fill="url(#pineTrunkGrad)"
      />
      <path d="M57 106 Q49 109 43 111" stroke="#5A2209" strokeWidth="3" strokeLinecap="round" />
      <path d="M63 106 Q71 109 77 111" stroke="#5A2209" strokeWidth="3" strokeLinecap="round" />

      {/* Upward Arching Umbrella Branches */}
      <path d="M56 46 Q40 38 28 32" stroke="#5A2209" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M64 46 Q80 38 92 32" stroke="#3E1505" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M60 40 Q60 26 60 18" stroke="#5A2209" strokeWidth="3.2" strokeLinecap="round" />

      {/* Distinct Flat Umbrella Dome Crown */}
      {/* Lower Shadow Rim */}
      <ellipse cx="60" cy="32" rx="46" ry="17" fill={needleGrad1} />

      {/* Main Wide Foliage Dome */}
      <ellipse cx="60" cy="28" rx="42" ry="16" fill={needleGrad2} />

      {/* Sub-pads for tactile needle depth */}
      <ellipse cx="36" cy="30" rx="18" ry="10" fill={needleGrad2} />
      <ellipse cx="84" cy="30" rx="18" ry="10" fill={needleGrad2} />

      {/* Sunlit Top Crown Cap */}
      <ellipse cx="60" cy="22" rx="34" ry="12" fill={needleGrad3} />
      <ellipse cx="50" cy="19" rx="18" ry="8" fill={needleGrad3} />
      <ellipse cx="70" cy="19" rx="18" ry="8" fill={needleGrad3} />

      {/* Winter Snow Mound on the umbrella dome */}
      {isWinter && (
        <path
          d="M26 26 C36 14, 84 14, 94 26 C86 23, 74 21, 60 21 C46 21, 34 23, 26 26 Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
      )}
    </g>
  );
}

/**
 * 4. Sage Willow (Salix babylonica) - Cascading weeping tendrils across 4 seasons
 */
function WillowTree({ season = "summer" }: { season?: SeasonTheme }) {
  const isWinter = season === "winter";
  const isAutumn = season === "autumn";
  const isSpring = season === "spring";

  const frondColor1 = isWinter ? "#64748B" : isAutumn ? "#B45309" : isSpring ? "#10B981" : "#065F46";
  const frondColor2 = isWinter ? "#94A3B8" : isAutumn ? "#D97706" : isSpring ? "#34D399" : "#10B981";
  const frondColor3 = isWinter ? "#CBD5E1" : isAutumn ? "#F59E0B" : isSpring ? "#86EFAC" : "#34D399";
  const crownFill = isWinter ? "#475569" : isAutumn ? "#92400E" : isSpring ? "#059669" : "#044E3B";

  return (
    <g className="tree-willow">
      {/* Gnarled Bent Willow Trunk */}
      <path
        d="M55 109 Q52 82 58 64 Q62 48 57 38 L65 38 Q70 48 66 64 Q62 82 65 109 Z"
        fill="url(#willowTrunkGrad)"
      />
      <path d="M55 106 Q46 109 41 111" stroke="#3E2723" strokeWidth="3" strokeLinecap="round" />
      <path d="M65 106 Q74 109 79 111" stroke="#3E2723" strokeWidth="3" strokeLinecap="round" />

      {/* Central Mound Crown */}
      <circle cx="60" cy="38" r="22" fill={crownFill} />

      {/* Cascading Weeping Fronds flowing downwards */}
      {/* Background fronds (darker) */}
      <path d="M38 42 C32 58, 28 78, 26 94" stroke={frondColor1} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M46 38 C42 56, 38 78, 36 98" stroke={frondColor1} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M74 38 C78 56, 82 78, 84 98" stroke={frondColor1} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M82 42 C88 58, 92 78, 94 94" stroke={frondColor1} strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Midground fronds */}
      <path d="M42 36 C36 52, 34 74, 32 90" stroke={frondColor2} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M52 34 C48 52, 46 72, 44 88" stroke={frondColor2} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M68 34 C72 52, 74 72, 76 88" stroke={frondColor2} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M78 36 C84 52, 86 74, 88 90" stroke={frondColor2} strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Foreground highlights */}
      <path d="M48 32 C44 48, 42 66, 40 82" stroke={frondColor3} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60 30 C58 48, 56 68, 56 84" stroke={frondColor3} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M72 32 C76 48, 78 66, 80 82" stroke={frondColor3} strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Winter Frost Glaze on fronds */}
      {isWinter && (
        <path d="M46 22 C54 18, 66 18, 74 22 C68 25, 52 25, 46 22 Z" fill="#FFFFFF" opacity="0.9" />
      )}
    </g>
  );
}

/**
 * 5. Flamboyant Jacaranda (Jacaranda mimosifolia) - Purple-violet blooms across seasons
 */
function JacarandaTree({ season = "summer" }: { season?: SeasonTheme }) {
  const isWinter = season === "winter";
  const isAutumn = season === "autumn";
  const isSpring = season === "spring";

  const grad1 = isWinter ? "url(#jacarandaWinterGrad1)" : isAutumn ? "url(#jacarandaAutumnGrad1)" : "url(#jacarandaGrad1)";
  const grad2 = isWinter ? "url(#jacarandaWinterGrad2)" : isAutumn ? "url(#jacarandaAutumnGrad2)" : "url(#jacarandaGrad2)";
  const grad3 = isWinter ? "url(#jacarandaWinterGrad3)" : isAutumn ? "url(#jacarandaAutumnGrad3)" : "url(#jacarandaGrad3)";

  return (
    <g className="tree-jacaranda">
      {/* Slender Dark Bronze Trunk */}
      <path
        d="M56 109 L54 68 Q52 48 48 38 L62 38 Q66 48 64 68 L64 109 Z"
        fill="url(#jacarandaTrunkGrad)"
      />
      <path d="M56 106 Q48 109 42 111" stroke="#331A15" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 106 Q72 109 78 111" stroke="#331A15" strokeWidth="3" strokeLinecap="round" />

      {/* Spreading Fine Boughs */}
      <path d="M52 48 Q36 40 28 34" stroke="#3D201A" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 48 Q80 40 92 34" stroke="#3D201A" strokeWidth="3" strokeLinecap="round" />

      {/* Billowing Floral Cloud Canopies */}
      <circle cx="34" cy="40" r="18" fill={grad1} />
      <circle cx="86" cy="40" r="18" fill={grad1} />
      <circle cx="44" cy="30" r="21" fill={grad2} />
      <circle cx="76" cy="30" r="21" fill={grad2} />
      <circle cx="60" cy="34" r="23" fill={grad2} />
      <circle cx="60" cy="22" r="18" fill={grad3} />

      {/* Winter Snow Tufts */}
      {isWinter && (
        <path d="M48 14 C54 10, 66 10, 72 14 C66 16, 54 16, 48 14 Z" fill="#FFFFFF" opacity="0.9" />
      )}

      {/* Spring Extra Blooming Petals */}
      {isSpring && (
        <g className="spring-petals" opacity="0.95">
          <circle cx="32" cy="36" r="2.5" fill="#E0E7FF" />
          <circle cx="48" cy="22" r="2.2" fill="#FFFFFF" />
          <circle cx="72" cy="22" r="2.2" fill="#FFFFFF" />
          <circle cx="88" cy="36" r="2.5" fill="#E0E7FF" />
        </g>
      )}
    </g>
  );
}

/**
 * 6. Zen Sakura (Prunus serrulata) - Cherry blossoms with seasonal foliage progression
 */
function SakuraTree({ season = "summer" }: { season?: SeasonTheme }) {
  const isWinter = season === "winter";
  const isAutumn = season === "autumn";
  const isSummer = season === "summer";

  const grad1 = isWinter
    ? "url(#sakuraWinterGrad1)"
    : isAutumn
    ? "url(#sakuraAutumnGrad1)"
    : isSummer
    ? "url(#sakuraSummerGrad1)"
    : "url(#sakuraGrad1)";

  const grad2 = isWinter
    ? "url(#sakuraWinterGrad2)"
    : isAutumn
    ? "url(#sakuraAutumnGrad2)"
    : isSummer
    ? "url(#sakuraSummerGrad2)"
    : "url(#sakuraGrad2)";

  const grad3 = isWinter
    ? "url(#sakuraWinterGrad3)"
    : isAutumn
    ? "url(#sakuraAutumnGrad3)"
    : isSummer
    ? "url(#sakuraSummerGrad3)"
    : "url(#sakuraGrad3)";

  return (
    <g className="tree-sakura">
      {/* Elegant Twisted Dark Bark Trunk */}
      <path
        d="M57 109 Q53 78 50 56 Q47 38 42 28 L50 28 Q56 38 60 56 Q63 78 63 109 Z"
        fill="url(#sakuraTrunkGrad)"
      />
      <path d="M57 106 Q48 109 43 111" stroke="#2B0E09" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M63 106 Q72 109 77 111" stroke="#2B0E09" strokeWidth="2.8" strokeLinecap="round" />

      {/* Sculpted Asymmetric Branches */}
      <path d="M48 52 Q32 44 24 38" stroke="#381510" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M58 48 Q76 42 86 36" stroke="#381510" strokeWidth="2.6" strokeLinecap="round" />

      {/* Delicate Cloud Foliage Clumps */}
      <circle cx="30" cy="38" r="17" fill={grad1} />
      <circle cx="82" cy="36" r="17" fill={grad1} />
      <circle cx="42" cy="28" r="19" fill={grad2} />
      <circle cx="72" cy="26" r="19" fill={grad2} />
      <circle cx="56" cy="28" r="21" fill={grad2} />
      <circle cx="52" cy="18" r="16" fill={grad3} />

      {/* Summer Ruby Cherries */}
      {isSummer && (
        <g className="summer-cherries">
          <circle cx="34" cy="44" r="2.2" fill="#DC2626" />
          <circle cx="68" cy="32" r="2" fill="#DC2626" />
          <circle cx="82" cy="40" r="2.2" fill="#DC2626" />
        </g>
      )}

      {/* Winter Serene Snow Cover */}
      {isWinter && (
        <path d="M42 12 C48 8, 60 8, 66 12 C60 14, 48 14, 42 12 Z" fill="#FFFFFF" opacity="0.95" />
      )}
    </g>
  );
}

/**
 * 7. Deadwood Leafless Snag (Session Interrompue / Échouée)
 * Unmistakable across all 4 seasons: jagged sharp broken branches, cracked deadwood, zero healthy foliage
 */
function LeaflessTree() {
  return (
    <g className="tree-leafless">
      {/* Broken Split Charcoal Trunk */}
      <path
        d="M56 109 L53 72 L49 48 L46 36 L52 36 L57 48 L61 72 L64 109 Z"
        fill="url(#leaflessTrunkGrad)"
      />
      {/* Parched Dead Roots */}
      <path d="M56 105 L44 110" stroke="#334155" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M64 105 L76 110" stroke="#334155" strokeWidth="2.6" strokeLinecap="round" />

      {/* Sharp Snapped Broken Limbs (Zero Foliage, Stark Silhouette) */}
      <path d="M51 68 L36 56 L30 58 L24 48" stroke="#334155" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M36 56 L34 46" stroke="#475569" strokeWidth="2" strokeLinecap="round" fill="none" />

      <path d="M60 62 L74 52 L84 56 L94 44" stroke="#334155" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M74 52 L78 40" stroke="#475569" strokeWidth="2" strokeLinecap="round" fill="none" />

      <path d="M52 46 L58 32 L54 22" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Snapped main trunk apex */}
      <polygon points="46,36 49,30 52,36" fill="#0F172A" />
    </g>
  );
}

/**
 * 8. Live Growth Seedling Stages (0: Sprout, 1: Shoot, 2: Sapling, 3: Juvenile)
 */
function SeedlingStages({ stage = 0, species = "cedar" }: { stage: number; species: TreeSpecies }) {
  if (stage <= 0) {
    // Stage 0: Sprout / Cotyledon emerging from earth
    return (
      <g className="seedling-stage-0">
        <path d="M60 109 Q60 100 60 94" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="56" cy="93" rx="3.5" ry="2" fill="#22C55E" transform="rotate(-25 56 93)" />
        <ellipse cx="64" cy="93" rx="3.5" ry="2" fill="#4ADE80" transform="rotate(25 64 93)" />
      </g>
    );
  }

  if (stage === 1) {
    // Stage 1: Young Shoot with tender stem and first leaves
    return (
      <g className="seedling-stage-1">
        <path d="M60 109 Q59 95 60 84" stroke="#166534" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M60 92 Q52 88 48 84" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M60 88 Q68 84 72 80" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="46" cy="83" r="3.5" fill="#22C55E" />
        <circle cx="74" cy="79" r="3.5" fill="#4ADE80" />
        <circle cx="60" cy="80" r="4" fill="#86EFAC" />
      </g>
    );
  }

  if (stage === 2) {
    // Stage 2: Sapling with woody stem and small crown
    return (
      <g className="seedling-stage-2">
        <path d="M59 109 L59 74 L61 74 L61 109 Z" fill="#5A2E17" />
        <circle cx="60" cy="68" r="14" fill="#15803D" />
        <circle cx="56" cy="64" r="11" fill="#22C55E" />
        <circle cx="64" cy="64" r="10" fill="#4ADE80" />
      </g>
    );
  }

  // Stage 3: Juvenile Tree nearing maturity
  return (
    <g className="seedling-stage-3">
      <path d="M58 109 L57 60 L63 60 L62 109 Z" fill="#451A03" />
      <circle cx="60" cy="54" r="20" fill="#15803D" />
      <circle cx="52" cy="48" r="15" fill="#16A34A" />
      <circle cx="68" cy="48" r="15" fill="#22C55E" />
      <circle cx="60" cy="40" r="14" fill="#4ADE80" />
    </g>
  );
}

export function TreeSvg({
  species = "cedar",
  status = "healthy",
  size = 84,
  className = "",
  stage = 4,
  showMound = true,
  highlighted = false,
  season = "summer",
}: TreeSvgProps) {
  const isDead = status === "leafless";
  const isFullyGrown = stage >= 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        {/* Subtle highlight aura if selected or hovered */}
        {highlighted && (
          <filter id="treeGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FBBF24" floodOpacity="0.75" />
          </filter>
        )}

        {/* Global Trunk Gradients */}
        <linearGradient id="cedarTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#371502" />
          <stop offset="50%" stopColor="#6E2C0C" />
          <stop offset="100%" stopColor="#2A1002" />
        </linearGradient>

        <linearGradient id="oakTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E1B10" />
          <stop offset="50%" stopColor="#5E3B24" />
          <stop offset="100%" stopColor="#22130A" />
        </linearGradient>

        <linearGradient id="pineTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#431407" />
          <stop offset="50%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#2E0D03" />
        </linearGradient>

        <linearGradient id="willowTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E1B10" />
          <stop offset="50%" stopColor="#5E432D" />
          <stop offset="100%" stopColor="#1F120A" />
        </linearGradient>

        <linearGradient id="jacarandaTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E1A1A" />
          <stop offset="50%" stopColor="#5A3A35" />
          <stop offset="100%" stopColor="#201010" />
        </linearGradient>

        <linearGradient id="sakuraTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2A0808" />
          <stop offset="50%" stopColor="#4A1815" />
          <stop offset="100%" stopColor="#1F0505" />
        </linearGradient>

        <linearGradient id="leaflessTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Oak Seasonal Foliage Gradients */}
        {/* Summer */}
        <radialGradient id="oakLeafGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4ADE80" /><stop offset="60%" stopColor="#15803D" /><stop offset="100%" stopColor="#052E16" />
        </radialGradient>
        <radialGradient id="oakLeafGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#86EFAC" /><stop offset="60%" stopColor="#16A34A" /><stop offset="100%" stopColor="#14532D" />
        </radialGradient>
        <radialGradient id="oakLeafGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#BBF7D0" /><stop offset="45%" stopColor="#22C55E" /><stop offset="100%" stopColor="#047857" />
        </radialGradient>

        {/* Autumn */}
        <radialGradient id="oakAutumnGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F59E0B" /><stop offset="60%" stopColor="#B45309" /><stop offset="100%" stopColor="#451A03" />
        </radialGradient>
        <radialGradient id="oakAutumnGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F97316" /><stop offset="60%" stopColor="#C2410C" /><stop offset="100%" stopColor="#7C2D12" />
        </radialGradient>
        <radialGradient id="oakAutumnGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FDE68A" /><stop offset="45%" stopColor="#EA580C" /><stop offset="100%" stopColor="#9A3412" />
        </radialGradient>

        {/* Winter */}
        <radialGradient id="oakWinterGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#94A3B8" /><stop offset="60%" stopColor="#475569" /><stop offset="100%" stopColor="#1E293B" />
        </radialGradient>
        <radialGradient id="oakWinterGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#CBD5E1" /><stop offset="60%" stopColor="#64748B" /><stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <radialGradient id="oakWinterGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#F8FAFC" /><stop offset="45%" stopColor="#94A3B8" /><stop offset="100%" stopColor="#475569" />
        </radialGradient>

        {/* Spring */}
        <radialGradient id="oakSpringGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A7F3D0" /><stop offset="60%" stopColor="#10B981" /><stop offset="100%" stopColor="#064E3B" />
        </radialGradient>
        <radialGradient id="oakSpringGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#6EE7B7" /><stop offset="60%" stopColor="#059669" /><stop offset="100%" stopColor="#047857" />
        </radialGradient>
        <radialGradient id="oakSpringGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#D1FAE5" /><stop offset="45%" stopColor="#34D399" /><stop offset="100%" stopColor="#059669" />
        </radialGradient>

        {/* Pine Seasonal Gradients */}
        <radialGradient id="pineNeedleGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2DD4BF" /><stop offset="65%" stopColor="#0F766E" /><stop offset="100%" stopColor="#042F2E" />
        </radialGradient>
        <radialGradient id="pineNeedleGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5EEAD4" /><stop offset="65%" stopColor="#0D9488" /><stop offset="100%" stopColor="#0F766E" />
        </radialGradient>
        <radialGradient id="pineNeedleGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#99F6E4" /><stop offset="50%" stopColor="#14B8A6" /><stop offset="100%" stopColor="#0D9488" />
        </radialGradient>

        <radialGradient id="pineAutumnGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#34D399" /><stop offset="65%" stopColor="#065F46" /><stop offset="100%" stopColor="#022C22" />
        </radialGradient>
        <radialGradient id="pineAutumnGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F59E0B" /><stop offset="65%" stopColor="#047857" /><stop offset="100%" stopColor="#064E3B" />
        </radialGradient>
        <radialGradient id="pineAutumnGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FDE68A" /><stop offset="50%" stopColor="#10B981" /><stop offset="100%" stopColor="#047857" />
        </radialGradient>

        <radialGradient id="pineWinterGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#38BDF8" /><stop offset="65%" stopColor="#0F766E" /><stop offset="100%" stopColor="#042F2E" />
        </radialGradient>
        <radialGradient id="pineWinterGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#7DD3FC" /><stop offset="65%" stopColor="#0E7490" /><stop offset="100%" stopColor="#155E75" />
        </radialGradient>
        <radialGradient id="pineWinterGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#E0F2FE" /><stop offset="50%" stopColor="#38BDF8" /><stop offset="100%" stopColor="#0369A1" />
        </radialGradient>

        <radialGradient id="pineSpringGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5EEAD4" /><stop offset="65%" stopColor="#0D9488" /><stop offset="100%" stopColor="#115E59" />
        </radialGradient>
        <radialGradient id="pineSpringGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#99F6E4" /><stop offset="65%" stopColor="#14B8A6" /><stop offset="100%" stopColor="#0F766E" />
        </radialGradient>
        <radialGradient id="pineSpringGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#CCFBF1" /><stop offset="50%" stopColor="#2DD4BF" /><stop offset="100%" stopColor="#0D9488" />
        </radialGradient>

        {/* Jacaranda Gradients */}
        <radialGradient id="jacarandaGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A5B4FC" /><stop offset="60%" stopColor="#6366F1" /><stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
        <radialGradient id="jacarandaGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#C7D2FE" /><stop offset="60%" stopColor="#818CF8" /><stop offset="100%" stopColor="#312E81" />
        </radialGradient>
        <radialGradient id="jacarandaGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#EEF2FF" /><stop offset="50%" stopColor="#A5B4FC" /><stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>

        <radialGradient id="jacarandaAutumnGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#C084FC" /><stop offset="60%" stopColor="#7E22CE" /><stop offset="100%" stopColor="#3B0764" />
        </radialGradient>
        <radialGradient id="jacarandaAutumnGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#E9D5FF" /><stop offset="60%" stopColor="#9333EA" /><stop offset="100%" stopColor="#581C87" />
        </radialGradient>
        <radialGradient id="jacarandaAutumnGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FAF5FF" /><stop offset="50%" stopColor="#C084FC" /><stop offset="100%" stopColor="#7E22CE" />
        </radialGradient>

        <radialGradient id="jacarandaWinterGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#CBD5E1" /><stop offset="60%" stopColor="#64748B" /><stop offset="100%" stopColor="#1E293B" />
        </radialGradient>
        <radialGradient id="jacarandaWinterGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#E2E8F0" /><stop offset="60%" stopColor="#94A3B8" /><stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <radialGradient id="jacarandaWinterGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#F8FAFC" /><stop offset="50%" stopColor="#C7D2FE" /><stop offset="100%" stopColor="#475569" />
        </radialGradient>

        {/* Sakura Gradients */}
        <radialGradient id="sakuraGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FBCFE8" /><stop offset="60%" stopColor="#EC4899" /><stop offset="100%" stopColor="#831843" />
        </radialGradient>
        <radialGradient id="sakuraGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FCE7F3" /><stop offset="60%" stopColor="#F472B6" /><stop offset="100%" stopColor="#9D174D" />
        </radialGradient>
        <radialGradient id="sakuraGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="45%" stopColor="#FBCFE8" /><stop offset="100%" stopColor="#DB2777" />
        </radialGradient>

        <radialGradient id="sakuraSummerGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4ADE80" /><stop offset="60%" stopColor="#15803D" /><stop offset="100%" stopColor="#052E16" />
        </radialGradient>
        <radialGradient id="sakuraSummerGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#86EFAC" /><stop offset="60%" stopColor="#16A34A" /><stop offset="100%" stopColor="#14532D" />
        </radialGradient>
        <radialGradient id="sakuraSummerGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#BBF7D0" /><stop offset="45%" stopColor="#22C55E" /><stop offset="100%" stopColor="#047857" />
        </radialGradient>

        <radialGradient id="sakuraAutumnGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDA4AF" /><stop offset="60%" stopColor="#E11D48" /><stop offset="100%" stopColor="#4C0519" />
        </radialGradient>
        <radialGradient id="sakuraAutumnGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FB7185" /><stop offset="60%" stopColor="#BE123C" /><stop offset="100%" stopColor="#881337" />
        </radialGradient>
        <radialGradient id="sakuraAutumnGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FFE4E6" /><stop offset="50%" stopColor="#F43F5E" /><stop offset="100%" stopColor="#9F1239" />
        </radialGradient>

        <radialGradient id="sakuraWinterGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#CBD5E1" /><stop offset="60%" stopColor="#64748B" /><stop offset="100%" stopColor="#1E293B" />
        </radialGradient>
        <radialGradient id="sakuraWinterGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#E2E8F0" /><stop offset="60%" stopColor="#94A3B8" /><stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <radialGradient id="sakuraWinterGrad3" cx="45%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="50%" stopColor="#E0E7FF" /><stop offset="100%" stopColor="#475569" />
        </radialGradient>
      </defs>

      {/* Earth mound & shadow foundation */}
      {showMound && <EarthMound species={species} isDead={isDead} season={season} />}

      {/* Tree Content with active seasonal rendering */}
      <g filter={highlighted ? "url(#treeGlowFilter)" : undefined}>
        {isDead ? (
          <LeaflessTree />
        ) : !isFullyGrown ? (
          <SeedlingStages stage={stage} species={species} />
        ) : species === "oak" ? (
          <OakTree season={season} />
        ) : species === "pine" ? (
          <PineTree season={season} />
        ) : species === "willow" ? (
          <WillowTree season={season} />
        ) : species === "jacaranda" ? (
          <JacarandaTree season={season} />
        ) : species === "sakura" ? (
          <SakuraTree season={season} />
        ) : (
          <CedarTree season={season} />
        )}
      </g>
    </svg>
  );
}
