"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { ForestEntry } from "@/types/database";
import { TreeSvg, SPECIES_METADATA, SeasonTheme } from "./tree-models";
import { TreeDetailModal } from "./tree-detail-modal";
import { useFocusTimer } from "@/components/focus/focus-provider";
import { cn } from "@/lib/utils";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sprout,
  Play,
  Sun,
  Flame,
  Snowflake,
  Flower2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

interface ForestCanvasProps {
  entries: ForestEntry[];
  readOnly?: boolean;
  className?: string;
  initialSeason?: SeasonTheme;
}

const GRID_SIZE = 6;
const TILE_WIDTH = 96;
const TILE_HEIGHT = 48;
const GROVE_CAPACITY = 36;

// Deterministic natural outward spiral for isometric plots (36 unique, non-overlapping coordinates)
const ISOMETRIC_PLOTS: Array<{ col: number; row: number }> = [
  // 1. Center Ring (Balanced focal foundation)
  { col: 2, row: 2 }, // 0: True Center
  { col: 1, row: 1 }, // 1: Northwest inner
  { col: 3, row: 2 }, // 2: East inner
  { col: 1, row: 3 }, // 3: Southwest inner
  { col: 3, row: 3 }, // 4: Southeast inner
  // 2. Mid Ring
  { col: 2, row: 1 }, // 5: North mid
  { col: 1, row: 2 }, // 6: West mid
  { col: 2, row: 3 }, // 7: South mid
  { col: 3, row: 1 }, // 8: Northeast mid
  { col: 0, row: 2 }, // 9: Far West mid
  { col: 2, row: 0 }, // 10: Far North mid
  { col: 4, row: 2 }, // 11: Far East mid
  { col: 2, row: 4 }, // 12: Far South mid
  // 3. Outer Ring
  { col: 0, row: 1 }, // 13
  { col: 1, row: 0 }, // 14
  { col: 3, row: 0 }, // 15
  { col: 4, row: 1 }, // 16
  { col: 4, row: 3 }, // 17
  { col: 3, row: 4 }, // 18
  { col: 1, row: 4 }, // 19
  { col: 0, row: 3 }, // 20
  // 4. Diagonal Corners
  { col: 0, row: 0 }, // 21: Top tip
  { col: 4, row: 0 }, // 22: East corner
  { col: 4, row: 4 }, // 23: Bottom corner
  { col: 0, row: 4 }, // 24: West corner
  // 5. Perimeter Flanks (Edge plots for dense forests)
  { col: 5, row: 2 }, // 25
  { col: 2, row: 5 }, // 26
  { col: 5, row: 3 }, // 27
  { col: 3, row: 5 }, // 28
  { col: 5, row: 1 }, // 29
  { col: 1, row: 5 }, // 30
  { col: 5, row: 0 }, // 31
  { col: 0, row: 5 }, // 32
  { col: 5, row: 4 }, // 33
  { col: 4, row: 5 }, // 34
  { col: 5, row: 5 }, // 35: Right flank tip
];

// Camera boundary constraints
const MIN_ZOOM = 0.85;
const MAX_ZOOM = 1.6;
const MAX_PAN_X = 140;
const MAX_PAN_Y = 90;

export function ForestCanvas({
  entries = [],
  readOnly = false,
  className = "",
  initialSeason = "summer",
}: ForestCanvasProps) {
  const { setIsModalOpen } = useFocusTimer();

  // Authoritative presentation season state
  const [season, setSeason] = useState<SeasonTheme>(initialSeason);
  const [selectedEntry, setSelectedEntry] = useState<ForestEntry | null>(null);
  const [hoveredEntry, setHoveredEntry] = useState<ForestEntry | null>(null);

  // Multi-Grove Pagination (36 trees per grove island)
  const [currentGrovePage, setCurrentGrovePage] = useState<number>(0);
  const totalGroves = Math.max(1, Math.ceil(entries.length / GROVE_CAPACITY));

  // Ensure current grove page is valid when entries change
  useEffect(() => {
    if (currentGrovePage >= totalGroves) {
      setCurrentGrovePage(Math.max(0, totalGroves - 1));
    }
  }, [totalGroves, currentGrovePage]);

  // Entries allocated to the active grove island
  const activeGroveEntries = useMemo(() => {
    const start = currentGrovePage * GROVE_CAPACITY;
    return entries.slice(start, start + GROVE_CAPACITY);
  }, [entries, currentGrovePage]);

  // Constrained Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number }>({
    clientX: 0,
    clientY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }

    // Clamp pan movement to strict scene bounds
    const newX = Math.min(MAX_PAN_X, Math.max(-MAX_PAN_X, dragStartRef.current.startPanX + dx));
    const newY = Math.min(MAX_PAN_Y, Math.max(-MAX_PAN_Y, dragStartRef.current.startPanY + dy));
    setPan({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor)));
  };

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev * 1.15).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, Number((prev / 1.15).toFixed(2))));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Biome Themes with High Contrast and Rich Seasonal Palettes
  const biomeTheme = useMemo(() => {
    switch (season) {
      case "autumn":
        return {
          bgGradient: "from-[#1F140D] via-[#2F1B0F] to-[#170E08]",
          ambientGlow: "rgba(245, 158, 11, 0.16)",
          tileTopA: "#D97706",
          tileTopB: "#B45309",
          cliffLeft: "#451A03",
          cliffRight: "#78350F",
          cliffBottom: "#270E02",
          grassOverhang: "#92400E",
          particleColor: "#F59E0B",
          name: "Verger d'Automne",
        };
      case "winter":
        return {
          bgGradient: "from-[#0F172A] via-[#1E293B] to-[#0A0F1D]",
          ambientGlow: "rgba(56, 189, 248, 0.14)",
          tileTopA: "#F8FAFC",
          tileTopB: "#E2E8F0",
          cliffLeft: "#334155",
          cliffRight: "#475569",
          cliffBottom: "#1E293B",
          grassOverhang: "#CBD5E1",
          particleColor: "#BAE6FD",
          name: "Givre Céleste",
        };
      case "spring":
        return {
          bgGradient: "from-[#0E241B] via-[#143B2C] to-[#091B13]",
          ambientGlow: "rgba(244, 114, 182, 0.16)",
          tileTopA: "#34D399",
          tileTopB: "#10B981",
          cliffLeft: "#27272A",
          cliffRight: "#3F3F46",
          cliffBottom: "#18181B",
          grassOverhang: "#059669",
          particleColor: "#F472B6",
          name: "Cerisiers en Fleur",
        };
      case "summer":
      default:
        return {
          bgGradient: "from-[#072418] via-[#0B3927] to-[#051A11]",
          ambientGlow: "rgba(34, 197, 94, 0.15)",
          tileTopA: "#22C55E",
          tileTopB: "#16A34A",
          cliffLeft: "#3D2415",
          cliffRight: "#5C3822",
          cliffBottom: "#24150B",
          grassOverhang: "#15803D",
          particleColor: "#86EFAC",
          name: "Clairière d'Émeraude",
        };
    }
  }, [season]);

  // Center coordinate of diorama in base canvas units (1000 x 700)
  const originX = 500;
  const originY = 220;

  // Map each active grove entry to a unique deterministic isometric plot
  const plottedEntries = useMemo(() => {
    return activeGroveEntries.map((entry, index) => {
      const plot = ISOMETRIC_PLOTS[index];
      const isoX = originX + (plot.col - plot.row) * (TILE_WIDTH / 2);
      const isoY = originY + (plot.col + plot.row) * (TILE_HEIGHT / 2);
      // Mathematical isometric depth: back rows rendered before front rows
      const depth = (plot.col + plot.row) * 100 + (plot.col - plot.row);

      return {
        entry,
        plot,
        isoX,
        isoY,
        depth,
      };
    });
  }, [activeGroveEntries, originX, originY]);

  // Occupied plots set for decorating unused tiles
  const occupiedKeys = useMemo(() => {
    return new Set(plottedEntries.map((p) => `${p.plot.col},${p.plot.row}`));
  }, [plottedEntries]);

  // All 36 tiles sorted for isometric depth
  const allTiles = useMemo(() => {
    const tiles = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = originX + (col - row) * (TILE_WIDTH / 2);
        const y = originY + (col + row) * (TILE_HEIGHT / 2);
        const isOccupied = occupiedKeys.has(`${col},${row}`);
        const depth = (col + row) * 100;
        tiles.push({ col, row, x, y, isOccupied, depth });
      }
    }
    return tiles.sort((a, b) => a.depth - b.depth);
  }, [originX, originY, occupiedKeys]);

  // Combined scene elements sorted for true depth rendering
  const sortedSceneTrees = useMemo(() => {
    return [...plottedEntries].sort((a, b) => a.depth - b.depth);
  }, [plottedEntries]);

  const healthyCount = entries.filter((e) => e.tree_status === "healthy").length;
  const activeHealthyCount = activeGroveEntries.filter((e) => e.tree_status === "healthy").length;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[580px] sm:h-[660px] rounded-3xl overflow-hidden border border-[#16382B]/60 select-none shadow-2xl transition-colors duration-500",
        `bg-gradient-to-b ${biomeTheme.bgGradient}`,
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      role="region"
      aria-label="Diorama Isométrique du Bosquet Focus"
    >
      {/* 1. Atmospheric Ethereal Background & God-Rays */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 1000 700"
      >
        <defs>
          <linearGradient id="godRay1" x1="0%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#FEF9C3" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="godRay2" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.14" />
            <stop offset="70%" stopColor="#A5F3FC" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#A5F3FC" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="centerAtmosphere" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={biomeTheme.particleColor} stopOpacity="0.16" />
            <stop offset="65%" stopColor={biomeTheme.particleColor} stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="700" fill="url(#centerAtmosphere)" />

        <polygon points="80,0 240,0 520,700 360,700" fill="url(#godRay1)" />
        <polygon points="280,0 420,0 780,700 640,700" fill="url(#godRay2)" />
        <polygon points="460,0 560,0 940,700 840,700" fill="url(#godRay1)" opacity="0.6" />

        {/* Ambient floating spores */}
        <circle cx="220" cy="180" r="2" fill={biomeTheme.particleColor} opacity="0.6" />
        <circle cx="340" cy="280" r="1.5" fill="#FFFFFF" opacity="0.7" />
        <circle cx="720" cy="210" r="2.2" fill={biomeTheme.particleColor} opacity="0.5" />
        <circle cx="810" cy="340" r="1.8" fill="#FFFFFF" opacity="0.6" />
        <circle cx="480" cy="140" r="2.5" fill={biomeTheme.particleColor} opacity="0.7" />
      </svg>

      {/* 2. Top Navigation Bar: Season Selector & Tree Counters */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Tree Count Status Badge */}
        <div className="px-3.5 py-1.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {healthyCount} {healthyCount > 1 ? "arbres sains" : "arbre sain"}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-emerald-300 font-mono text-[11px]">
            {entries.length > GROVE_CAPACITY
              ? `Bosquet ${currentGrovePage + 1}/${totalGroves} (${activeGroveEntries.length} arbres)`
              : `${activeGroveEntries.length}/36 parcelles`}
          </span>
        </div>

        {/* Season Selector Bar */}
        <div
          className="flex items-center space-x-1 p-1 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 text-xs shadow-lg"
          role="radiogroup"
          aria-label="Sélection de la saison de présentation"
        >
          <button
            type="button"
            role="radio"
            aria-checked={season === "summer"}
            onClick={() => setSeason("summer")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              season === "summer"
                ? "bg-emerald-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Saison Estivale (Clairière Émeraude)"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Été</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={season === "autumn"}
            onClick={() => setSeason("autumn")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              season === "autumn"
                ? "bg-amber-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Saison Automnale (Verger Flamboyant)"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Automne</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={season === "winter"}
            onClick={() => setSeason("winter")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              season === "winter"
                ? "bg-sky-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Saison Hivernale (Givre et Neige)"
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hiver</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={season === "spring"}
            onClick={() => setSeason("spring")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              season === "spring"
                ? "bg-pink-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Saison Printanière (Cerisiers & Fleurs)"
          >
            <Flower2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Printemps</span>
          </button>
        </div>
      </div>

      {/* 3. Top-Right Constrained Camera Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 p-1 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 text-white shadow-lg">
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className={cn(
            "p-2 rounded-xl transition-colors cursor-pointer",
            zoom >= MAX_ZOOM
              ? "opacity-40 cursor-not-allowed text-white/50"
              : "text-white/80 hover:text-white hover:bg-white/15"
          )}
          title="Zoom avant (+)"
          aria-label="Zoom avant"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className={cn(
            "p-2 rounded-xl transition-colors cursor-pointer",
            zoom <= MIN_ZOOM
              ? "opacity-40 cursor-not-allowed text-white/50"
              : "text-white/80 hover:text-white hover:bg-white/15"
          )}
          title="Zoom arrière (-)"
          aria-label="Zoom arrière"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          title="Recentrer l'île (100%)"
          aria-label="Recentrer la vue"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Bottom Multi-Grove Pagination (When trees exceed single island capacity of 36) */}
      {totalGroves > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            disabled={currentGrovePage === 0}
            onClick={() => setCurrentGrovePage((prev) => Math.max(0, prev - 1))}
            className={cn(
              "p-1.5 rounded-xl transition-colors",
              currentGrovePage === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-white/15 cursor-pointer text-white"
            )}
            title="Bosquet précédent"
            aria-label="Bosquet précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 px-2 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Bosquet {currentGrovePage + 1} / {totalGroves}
            </span>
            <span className="text-white/50 text-[11px]">
              ({activeGroveEntries.length} arbres)
            </span>
          </div>

          <button
            type="button"
            disabled={currentGrovePage >= totalGroves - 1}
            onClick={() => setCurrentGrovePage((prev) => Math.min(totalGroves - 1, prev + 1))}
            className={cn(
              "p-1.5 rounded-xl transition-colors",
              currentGrovePage >= totalGroves - 1
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-white/15 cursor-pointer text-white"
            )}
            title="Bosquet suivant"
            aria-label="Bosquet suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Interactive Diorama Stage with Clamped Pan & Zoom Transform */}
      <div
        className="absolute inset-0 transition-transform duration-75 origin-center flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <div className="relative w-[1000px] h-[700px] shrink-0 pointer-events-none">
          {/* A. Sub-Island Floating Drop Shadow */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 700"
          >
            <defs>
              <filter id="shadowBlur" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="26" />
              </filter>
            </defs>
            <ellipse
              cx={originX}
              cy={originY + GRID_SIZE * TILE_HEIGHT + 130}
              rx="350"
              ry="82"
              fill="#000000"
              opacity="0.55"
              filter="url(#shadowBlur)"
            />
          </svg>

          {/* B. Subterranean 3D Cliff Faces (Geological Strata & Roots) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 700"
          >
            <defs>
              <linearGradient id="cliffLeftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={biomeTheme.cliffLeft} />
                <stop offset="65%" stopColor={biomeTheme.cliffBottom} />
                <stop offset="100%" stopColor="#140C07" />
              </linearGradient>

              <linearGradient id="cliffRightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={biomeTheme.cliffRight} />
                <stop offset="60%" stopColor={biomeTheme.cliffLeft} />
                <stop offset="100%" stopColor="#180E08" />
              </linearGradient>

              <linearGradient id="grassLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={biomeTheme.tileTopA} />
                <stop offset="100%" stopColor={biomeTheme.grassOverhang} />
              </linearGradient>
            </defs>

            {(() => {
              const leftTipX = originX - GRID_SIZE * (TILE_WIDTH / 2);
              const leftTipY = originY + (GRID_SIZE * TILE_HEIGHT) / 2;
              const bottomCornerX = originX;
              const bottomCornerY = originY + GRID_SIZE * TILE_HEIGHT;
              const rightTipX = originX + GRID_SIZE * (TILE_WIDTH / 2);
              const rightTipY = originY + (GRID_SIZE * TILE_HEIGHT) / 2;
              const cliffDepth = 80;

              return (
                <g className="island-cliffs">
                  {/* Left Cliff Face */}
                  <polygon
                    points={`
                      ${leftTipX},${leftTipY}
                      ${bottomCornerX},${bottomCornerY}
                      ${bottomCornerX},${bottomCornerY + cliffDepth}
                      ${leftTipX},${leftTipY + cliffDepth - 10}
                    `}
                    fill="url(#cliffLeftGrad)"
                  />

                  {/* Right Cliff Face */}
                  <polygon
                    points={`
                      ${bottomCornerX},${bottomCornerY}
                      ${rightTipX},${rightTipY}
                      ${rightTipX},${rightTipY + cliffDepth - 10}
                      ${bottomCornerX},${bottomCornerY + cliffDepth}
                    `}
                    fill="url(#cliffRightGrad)"
                  />

                  {/* Geological Strata Bands on Cliff */}
                  <path
                    d={`M ${leftTipX + 20} ${leftTipY + 22} Q ${bottomCornerX} ${bottomCornerY + 16} ${rightTipX - 20} ${leftTipY + 22}`}
                    stroke="#1E130B"
                    strokeWidth="3.5"
                    strokeDasharray="18,6,30,8"
                    opacity="0.6"
                    fill="none"
                  />
                  <path
                    d={`M ${leftTipX + 40} ${leftTipY + 45} Q ${bottomCornerX} ${bottomCornerY + 40} ${rightTipX - 40} ${leftTipY + 45}`}
                    stroke="#140C07"
                    strokeWidth="4"
                    strokeDasharray="24,10,40,6"
                    opacity="0.75"
                    fill="none"
                  />

                  {/* Overhanging scalloped rim */}
                  <path
                    d={`
                      M ${leftTipX} ${leftTipY}
                      L ${bottomCornerX} ${bottomCornerY}
                      L ${rightTipX} ${rightTipY}
                      L ${rightTipX} ${rightTipY + 6}
                      L ${bottomCornerX} ${bottomCornerY + 6}
                      L ${leftTipX} ${leftTipY + 6}
                      Z
                    `}
                    fill="url(#grassLipGrad)"
                  />
                </g>
              );
            })()}
          </svg>

          {/* C. Top Surface — Isometric Diamond Tile Grid */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 700"
          >
            <g className="island-top-tiles">
              {allTiles.map((tile) => {
                const halfW = TILE_WIDTH / 2;
                const halfH = TILE_HEIGHT / 2;
                const isEven = (tile.col + tile.row) % 2 === 0;
                const tileFill = isEven ? biomeTheme.tileTopA : biomeTheme.tileTopB;

                return (
                  <g key={`tile-${tile.col}-${tile.row}`}>
                    <polygon
                      points={`
                        ${tile.x},${tile.y - halfH}
                        ${tile.x + halfW},${tile.y}
                        ${tile.x},${tile.y + halfH}
                        ${tile.x - halfW},${tile.y}
                      `}
                      fill={tileFill}
                      stroke="rgba(0, 0, 0, 0.08)"
                      strokeWidth="0.8"
                    />

                    {/* Unoccupied Tile Seasonal Micro-Decorations */}
                    {!tile.isOccupied && (
                      <g className="tile-nature-decor" opacity="0.85">
                        {season === "summer" && isEven && (
                          <>
                            <circle cx={tile.x - 6} cy={tile.y - 2} r="1.8" fill="#FEF08A" />
                            <circle cx={tile.x - 6} cy={tile.y - 2} r="0.9" fill="#CA8A04" />
                            <circle cx={tile.x + 8} cy={tile.y + 3} r="1.5" fill="#FFFFFF" />
                          </>
                        )}

                        {season === "autumn" && (
                          <>
                            <ellipse cx={tile.x - 4} cy={tile.y} rx="2.8" ry="1.4" fill="#EF4444" opacity="0.85" />
                            <ellipse cx={tile.x + 6} cy={tile.y - 2} rx="2.4" ry="1.2" fill="#F97316" opacity="0.9" />
                          </>
                        )}

                        {season === "winter" && (
                          <>
                            <circle cx={tile.x} cy={tile.y} r="1.6" fill="#38BDF8" opacity="0.6" />
                            <line x1={tile.x - 4} y1={tile.y} x2={tile.x + 4} y2={tile.y} stroke="#BAE6FD" strokeWidth="0.8" opacity="0.5" />
                          </>
                        )}

                        {season === "spring" && (
                          <>
                            <ellipse cx={tile.x - 5} cy={tile.y - 1} rx="2.5" ry="1.3" fill="#F472B6" opacity="0.8" />
                            <ellipse cx={tile.x + 4} cy={tile.y + 2} rx="2.2" ry="1.2" fill="#FBCFE8" opacity="0.9" />
                          </>
                        )}

                        {/* Polished stones on select edge tiles */}
                        {(tile.col === 0 && tile.row === 3) || (tile.col === 4 && tile.row === 1) ? (
                          <>
                            <ellipse cx={tile.x + 2} cy={tile.y + 1} rx="3.5" ry="2" fill="#64748B" opacity="0.75" />
                            <ellipse cx={tile.x - 4} cy={tile.y + 2} rx="2.2" ry="1.4" fill="#94A3B8" opacity="0.85" />
                          </>
                        ) : null}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* D. Interactive Planted Trees Layer (Strict Depth-Sorted Rendering) */}
          <div className="absolute inset-0 pointer-events-auto">
            {sortedSceneTrees.map(({ entry, isoX, isoY, depth }) => {
              const isSelected = selectedEntry?.id === entry.id;
              const isHovered = hoveredEntry?.id === entry.id;
              const meta = SPECIES_METADATA[entry.tree_species] || SPECIES_METADATA.cedar;

              const durationMin = entry.session?.actual_duration_seconds
                ? Math.round(entry.session.actual_duration_seconds / 60)
                : entry.session?.target_duration_seconds
                ? Math.round(entry.session.target_duration_seconds / 60)
                : 25;

              return (
                <div
                  key={entry.id}
                  className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200 cursor-pointer focus:outline-hidden"
                  style={{
                    left: `${isoX}px`,
                    top: `${isoY + 14}px`, // Tree base perfectly aligned on tile surface
                    zIndex: depth,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasMovedRef.current) {
                      setSelectedEntry(entry);
                    }
                  }}
                  onMouseEnter={() => setHoveredEntry(entry)}
                  onMouseLeave={() => setHoveredEntry(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Arbre ${entry.tree_species} (${meta.name}), session de ${durationMin} minutes`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedEntry(entry);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "relative group transition-all duration-300",
                      (isSelected || isHovered) && "-translate-y-2 scale-108"
                    )}
                  >
                    {/* Glowing Golden Isometric Plot Ring on Hover/Select */}
                    {(isSelected || isHovered) && (
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-7 rounded-full border-2 border-amber-300 bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.6)] animate-pulse pointer-events-none" />
                    )}

                    {/* Master Botanical Tree Sprite with Synchronized Seasonal Hues */}
                    <TreeSvg
                      species={entry.tree_species}
                      status={entry.tree_status}
                      size={88}
                      stage={entry.growth_stage ?? 4}
                      showMound={true}
                      highlighted={isSelected || isHovered}
                      season={season}
                    />

                    {/* Floating Hover Information Card */}
                    {isHovered && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A]/95 text-white border border-white/20 px-3 py-1.5 rounded-2xl shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none flex items-center space-x-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            entry.tree_status === "healthy" ? "bg-emerald-400" : "bg-rose-400"
                          )}
                        />
                        <div className="text-left">
                          <div className="text-[11px] font-bold text-white flex items-center space-x-1">
                            <span>{entry.tree_status === "healthy" ? meta.name : "Arbre Défeuillé"}</span>
                            <span className="text-amber-300 font-mono text-[10px]">
                              • {durationMin} min
                            </span>
                          </div>
                          {entry.session?.session_label && (
                            <div className="text-[9px] text-white/70 max-w-[160px] truncate">
                              {entry.session.session_label}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* E. Empty State — Welcoming Focal Island with Seedling Altar */}
          {entries.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-auto z-40">
              <div className="p-8 max-w-md bg-black/60 backdrop-blur-xl rounded-3xl border border-white/15 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-300 shadow-lg">
                  <Sprout className="w-8 h-8 text-emerald-400 animate-bounce" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    Votre Île Isométrique Attend Sa Première Pousse
                  </h3>
                  <p className="text-xs text-white/75 mt-1.5 leading-relaxed">
                    Chaque session Pomodoro accomplie sans distraction plantera un arbre illustré
                    sur cette île flottante. Lancez votre première session pour enrichir votre diorama.
                  </p>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Lancer Ma Première Session Focus</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Selected Tree Detail Modal with Season Pass-through */}
      <TreeDetailModal
        entry={selectedEntry}
        season={season}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
