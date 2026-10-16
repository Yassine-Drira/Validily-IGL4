"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { ForestEntry, TreeSpecies } from "@/types/database";
import { TreeSvg, SPECIES_METADATA } from "./tree-models";
import { TreeDetailModal } from "./tree-detail-modal";
import { useFocusTimer } from "@/components/focus/focus-provider";
import { cn } from "@/lib/utils";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sprout,
  Play,
  Sparkles,
  Sun,
  Flame,
  Snowflake,
  Flower2,
  Compass,
} from "lucide-react";

type BiomeTheme = "summer" | "autumn" | "winter" | "spring";

interface ForestCanvasProps {
  entries: ForestEntry[];
  readOnly?: boolean;
  className?: string;
}

const GRID_SIZE = 6;
const TILE_WIDTH = 92;
const TILE_HEIGHT = 46;

// Deterministic natural outward spiral for isometric plots
const ISOMETRIC_PLOTS: Array<{ col: number; row: number }> = [
  // Center Ring
  { col: 2, row: 2 }, // 0
  { col: 1, row: 1 }, // 1
  { col: 3, row: 2 }, // 2
  { col: 1, row: 3 }, // 3
  { col: 3, row: 3 }, // 4
  // Mid Ring
  { col: 2, row: 1 }, // 5
  { col: 1, row: 2 }, // 6
  { col: 2, row: 3 }, // 7
  { col: 3, row: 1 }, // 8
  { col: 0, row: 2 }, // 9
  { col: 2, row: 0 }, // 10
  { col: 4, row: 2 }, // 11
  { col: 2, row: 4 }, // 12
  // Outer Ring
  { col: 0, row: 1 }, // 13
  { col: 1, row: 0 }, // 14
  { col: 3, row: 0 }, // 15
  { col: 4, row: 1 }, // 16
  { col: 4, row: 3 }, // 17
  { col: 3, row: 4 }, // 18
  { col: 1, row: 4 }, // 19
  { col: 0, row: 3 }, // 20
  // Corners
  { col: 0, row: 0 }, // 21
  { col: 4, row: 0 }, // 22
  { col: 4, row: 4 }, // 23
  { col: 0, row: 4 }, // 24
  // Perimeter Edge Plots
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
  { col: 5, row: 5 }, // 35
];

export function ForestCanvas({
  entries = [],
  readOnly = false,
  className = "",
}: ForestCanvasProps) {
  const { setIsModalOpen } = useFocusTimer();

  const [biome, setBiome] = useState<BiomeTheme>("summer");
  const [selectedEntry, setSelectedEntry] = useState<ForestEntry | null>(null);
  const [hoveredEntry, setHoveredEntry] = useState<ForestEntry | null>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.4, Math.max(0.65, prev * factor)));
  };

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(2.4, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.65, prev / 1.2));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Biome Colors and Visual Profiles
  const biomeTheme = useMemo(() => {
    switch (biome) {
      case "autumn":
        return {
          bgGradient: "from-[#1C120C] via-[#2A180E] to-[#140C07]",
          ambientGlow: "rgba(245, 158, 11, 0.12)",
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
          bgGradient: "from-[#0F172A] via-[#1E293B] to-[#0B0F19]",
          ambientGlow: "rgba(56, 189, 248, 0.12)",
          tileTopA: "#F1F5F9",
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
          bgGradient: "from-[#11241C] via-[#16382B] to-[#0A1A14]",
          ambientGlow: "rgba(244, 114, 182, 0.14)",
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
          bgGradient: "from-[#082218] via-[#0D3828] to-[#061811]",
          ambientGlow: "rgba(34, 197, 94, 0.14)",
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
  }, [biome]);

  // Center coordinate of diorama in base canvas units (1000 x 700)
  const originX = 500;
  const originY = 220;

  // Map each entry to an isometric plot
  const plottedEntries = useMemo(() => {
    return entries.map((entry, index) => {
      const plot = ISOMETRIC_PLOTS[index % ISOMETRIC_PLOTS.length];
      const isoX = originX + (plot.col - plot.row) * (TILE_WIDTH / 2);
      const isoY = originY + (plot.col + plot.row) * (TILE_HEIGHT / 2);
      const depth = (plot.col + plot.row) * 100 + (plot.col - plot.row);

      return {
        entry,
        plot,
        isoX,
        isoY,
        depth,
      };
    });
  }, [entries, originX, originY]);

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

  // Combined scene elements (tiles and trees) sorted for true depth rendering
  const sortedSceneTrees = useMemo(() => {
    return [...plottedEntries].sort((a, b) => a.depth - b.depth);
  }, [plottedEntries]);

  const healthyCount = entries.filter((e) => e.tree_status === "healthy").length;

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
          {/* Volumetric Sunbeams */}
          <linearGradient id="godRay1" x1="0%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#FEF9C3" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="godRay2" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#A5F3FC" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#A5F3FC" stopOpacity="0" />
          </linearGradient>

          {/* Central Atmospheric Glow */}
          <radialGradient id="centerAtmosphere" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={biomeTheme.particleColor} stopOpacity="0.15" />
            <stop offset="65%" stopColor={biomeTheme.particleColor} stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="700" fill="url(#centerAtmosphere)" />

        {/* Ethereal light beam shafts */}
        <polygon points="80,0 240,0 520,700 360,700" fill="url(#godRay1)" />
        <polygon points="280,0 420,0 780,700 640,700" fill="url(#godRay2)" />
        <polygon points="460,0 560,0 940,700 840,700" fill="url(#godRay1)" opacity="0.6" />

        {/* Subtle Ambient Floating Spores / Pollen */}
        <circle cx="220" cy="180" r="2" fill={biomeTheme.particleColor} opacity="0.6" />
        <circle cx="340" cy="280" r="1.5" fill="#FFFFFF" opacity="0.7" />
        <circle cx="720" cy="210" r="2.2" fill={biomeTheme.particleColor} opacity="0.5" />
        <circle cx="810" cy="340" r="1.8" fill="#FFFFFF" opacity="0.6" />
        <circle cx="480" cy="140" r="2.5" fill={biomeTheme.particleColor} opacity="0.7" />
        <circle cx="620" cy="420" r="1.5" fill="#FFFFFF" opacity="0.5" />
      </svg>

      {/* 2. Top Navigation Bar: Biome Selector & Grove Counter */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Healthy Tree Pill */}
        <div className="px-3.5 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {healthyCount} {healthyCount > 1 ? "arbres sains" : "arbre sain"}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-emerald-300 font-mono text-[11px]">
            Île Isométrique
          </span>
        </div>

        {/* Biome Theme Switcher */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setBiome("summer")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              biome === "summer"
                ? "bg-emerald-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Biome Estival Émeraude"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Été</span>
          </button>

          <button
            type="button"
            onClick={() => setBiome("autumn")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              biome === "autumn"
                ? "bg-amber-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Biome Verger Doré d'Automne"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Automne</span>
          </button>

          <button
            type="button"
            onClick={() => setBiome("winter")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              biome === "winter"
                ? "bg-sky-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Biome Givre Hivernal"
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hiver</span>
          </button>

          <button
            type="button"
            onClick={() => setBiome("spring")}
            className={cn(
              "px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1",
              biome === "spring"
                ? "bg-pink-500 text-white font-bold shadow-xs"
                : "text-white/70 hover:text-white"
            )}
            title="Biome Cerisiers en Fleur"
          >
            <Flower2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Printemps</span>
          </button>
        </div>
      </div>

      {/* 3. Top-Right Zoom & Pan Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 p-1 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-lg">
        <button
          type="button"
          onClick={zoomIn}
          className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          title="Zoom avant (+)"
          aria-label="Zoom avant"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          title="Zoom arrière (-)"
          aria-label="Zoom arrière"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          title="Recentrer la vue"
          aria-label="Recentrer la vue"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Interactive Diorama Stage with Pan & Zoom Transform */}
      <div
        className="absolute inset-0 transition-transform duration-75 origin-center flex items-center justify-center"
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
                <feGaussianBlur stdDeviation="24" />
              </filter>
            </defs>
            <ellipse
              cx={originX}
              cy={originY + GRID_SIZE * TILE_HEIGHT + 130}
              rx="340"
              ry="80"
              fill="#000000"
              opacity="0.55"
              filter="url(#shadowBlur)"
            />
          </svg>

          {/* B. Subterranean Island Cliff Faces (3D Carved Earth Foundation) */}
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

            {/* Left Subterranean Cliff Polygon */}
            {(() => {
              const leftTipX = originX - GRID_SIZE * (TILE_WIDTH / 2);
              const leftTipY = originY + (GRID_SIZE * TILE_HEIGHT) / 2;
              const bottomCornerX = originX;
              const bottomCornerY = originY + GRID_SIZE * TILE_HEIGHT;
              const cliffDepth = 78;

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
                  {(() => {
                    const rightTipX = originX + GRID_SIZE * (TILE_WIDTH / 2);
                    const rightTipY = originY + (GRID_SIZE * TILE_HEIGHT) / 2;
                    return (
                      <polygon
                        points={`
                          ${bottomCornerX},${bottomCornerY}
                          ${rightTipX},${rightTipY}
                          ${rightTipX},${rightTipY + cliffDepth - 10}
                          ${bottomCornerX},${bottomCornerY + cliffDepth}
                        `}
                        fill="url(#cliffRightGrad)"
                      />
                    );
                  })()}

                  {/* Geological Strata Bands on Cliff */}
                  <path
                    d={`M ${leftTipX + 20} ${leftTipY + 22} Q ${bottomCornerX} ${bottomCornerY + 16} ${originX + GRID_SIZE * (TILE_WIDTH / 2) - 20} ${leftTipY + 22}`}
                    stroke="#1E130B"
                    strokeWidth="3.5"
                    strokeDasharray="18,6,30,8"
                    opacity="0.6"
                    fill="none"
                  />
                  <path
                    d={`M ${leftTipX + 40} ${leftTipY + 45} Q ${bottomCornerX} ${bottomCornerY + 40} ${originX + GRID_SIZE * (TILE_WIDTH / 2) - 40} ${leftTipY + 45}`}
                    stroke="#140C07"
                    strokeWidth="4"
                    strokeDasharray="24,10,40,6"
                    opacity="0.75"
                    fill="none"
                  />

                  {/* Overhanging scalloped grass rim */}
                  <path
                    d={`
                      M ${leftTipX} ${leftTipY}
                      L ${bottomCornerX} ${bottomCornerY}
                      L ${originX + GRID_SIZE * (TILE_WIDTH / 2)} ${leftTipY}
                      L ${originX + GRID_SIZE * (TILE_WIDTH / 2)} ${leftTipY + 6}
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
                    {/* Isometric Rhombus */}
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

                    {/* Unoccupied Tile Decorations (Flowers, wild grass, stones) */}
                    {!tile.isOccupied && (
                      <g className="tile-nature-decor" opacity="0.85">
                        {/* Biome-specific ground micro-details */}
                        {biome === "summer" && isEven && (
                          <>
                            {/* Tiny chamomile / daisy dots */}
                            <circle cx={tile.x - 6} cy={tile.y - 2} r="1.8" fill="#FEF08A" />
                            <circle cx={tile.x - 6} cy={tile.y - 2} r="0.9" fill="#CA8A04" />
                            <circle cx={tile.x + 8} cy={tile.y + 3} r="1.5" fill="#FFFFFF" />
                          </>
                        )}

                        {biome === "autumn" && (
                          <>
                            {/* Fallen maple leaf */}
                            <ellipse cx={tile.x - 4} cy={tile.y} rx="2.5" ry="1.2" fill="#EF4444" opacity="0.85" />
                            <ellipse cx={tile.x + 6} cy={tile.y - 2} rx="2" ry="1.2" fill="#F97316" opacity="0.9" />
                          </>
                        )}

                        {biome === "winter" && (
                          <>
                            {/* Frost sparkle */}
                            <circle cx={tile.x} cy={tile.y} r="1.5" fill="#38BDF8" opacity="0.6" />
                            <line x1={tile.x - 4} y1={tile.y} x2={tile.x + 4} y2={tile.y} stroke="#BAE6FD" strokeWidth="0.8" opacity="0.5" />
                          </>
                        )}

                        {biome === "spring" && (
                          <>
                            {/* Pink sakura petals scattered */}
                            <ellipse cx={tile.x - 5} cy={tile.y - 1} rx="2.2" ry="1.3" fill="#F472B6" opacity="0.8" />
                            <ellipse cx={tile.x + 4} cy={tile.y + 2} rx="2" ry="1.1" fill="#FBCFE8" opacity="0.9" />
                          </>
                        )}

                        {/* Smooth river stones on select tiles */}
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

          {/* D. Interactive Planted Trees Layer (Rendered with Isometric Depth) */}
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
                    top: `${isoY + 12}px`, // Place tree base directly on tile surface
                    zIndex: depth,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntry(entry);
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
                      (isSelected || isHovered) && "-translate-y-3 scale-110"
                    )}
                  >
                    {/* Glowing Golden Isometric Plot Ring on Hover/Select */}
                    {(isSelected || isHovered) && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-9 rounded-full border-2 border-amber-300/90 bg-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse pointer-events-none" />
                    )}

                    {/* Master Botanical Tree Sprite */}
                    <TreeSvg
                      species={entry.tree_species}
                      status={entry.tree_status}
                      size={120}
                      stage={4}
                      showMound={true}
                      highlighted={isSelected || isHovered}
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
                            <span>{meta.name}</span>
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

      {/* 5. Selected Tree Detail Modal */}
      <TreeDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
