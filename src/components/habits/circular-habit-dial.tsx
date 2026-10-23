"use client";

import React, { useState, useMemo } from "react";
import type { HabitWithTodayState, DayCompletionStatus } from "@/types/database";
import { getLocalTodayDateString, addDaysToDateString, getDayCompletionStatus } from "@/lib/habits/habit-engine";
import { Flame, Check, Sparkles, Calendar, Info } from "lucide-react";

interface CircularHabitDialProps {
  habits: HabitWithTodayState[];
  selectedHabitId: string;
  onSelectHabit: (id: string) => void;
  rangeDays: number;
}

const RING_PALETTES = [
  { name: "Cobalt", fill: "#2855D9", bg: "#EDF2FF", light: "#93C5FD" },
  { name: "Émeraude", fill: "#059669", bg: "#ECFDF5", light: "#A7F3D0" },
  { name: "Ambre", fill: "#D97706", bg: "#FEF3C7", light: "#FDE68A" },
  { name: "Violet", fill: "#7C3AED", bg: "#F5F3FF", light: "#DDD6FE" },
  { name: "Rose", fill: "#E11D48", bg: "#FFF1F2", light: "#FECDD3" },
  { name: "Cyan", fill: "#0284C7", bg: "#F0F9FF", light: "#BAE6FD" },
];

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeAnnularSector(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number
) {
  const p1 = polarToCartesian(cx, cy, r1, a0);
  const p2 = polarToCartesian(cx, cy, r1, a1);
  const p3 = polarToCartesian(cx, cy, r0, a1);
  const p4 = polarToCartesian(cx, cy, r0, a0);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${r1} ${r1} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${r0} ${r0} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

export function CircularHabitDial({
  habits,
  selectedHabitId,
  onSelectHabit,
  rangeDays,
}: CircularHabitDialProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    habitName: string;
    dateStr: string;
    dayNum: number;
    status: DayCompletionStatus;
    color: string;
  } | null>(null);

  const todayStr = useMemo(() => getLocalTodayDateString(), []);

  // Filter up to 6 habits for the concentric rings
  const displayHabits = useMemo(() => {
    return habits.slice(0, 6);
  }, [habits]);

  // Determine number of days in the wheel (e.g. 30 days default or rangeDays capped at 31)
  const numDays = useMemo(() => {
    return Math.min(31, Math.max(7, rangeDays));
  }, [rangeDays]);

  // Build the array of dates going from (today - numDays + 1) to today
  const dateList = useMemo(() => {
    const list: string[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      list.push(addDaysToDateString(todayStr, -i));
    }
    return list;
  }, [todayStr, numDays]);

  // SVG Geometry Constants
  const cx = 250;
  const cy = 250;
  const hubRadius = 64;
  const outerRadius = 210;
  const numRings = Math.max(1, displayHabits.length);
  const ringWidth = (outerRadius - hubRadius) / numRings;

  // Month label for the center hub
  const currentMonthLabel = useMemo(() => {
    try {
      const [year, month] = todayStr.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    } catch {
      return "Octobre 2026";
    }
  }, [todayStr]);

  // Calculate overall completion count across the dial
  const dialStats = useMemo(() => {
    let completedCells = 0;
    let totalCells = numDays * displayHabits.length;

    for (const habit of displayHabits) {
      for (const dStr of dateList) {
        const isToday = dStr === todayStr;
        // In-memory estimation based on streak and todayStatus
        if (isToday && habit.todayStatus === "completed") {
          completedCells++;
        } else if (!isToday && dStr >= habit.start_date) {
          // Completed if within streak
          const diffDays = Math.round(
            (new Date(todayStr).getTime() - new Date(dStr).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays <= habit.currentStreak) {
            completedCells++;
          }
        }
      }
    }

    const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;
    return { completedCells, totalCells, pct };
  }, [displayHabits, dateList, todayStr]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs">
      {/* Title & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E4E8F0]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#68748A]">
            <Sparkles className="w-3.5 h-3.5 text-[#2855D9]" />
            <span>Cadran Radial de Constance</span>
          </div>
          <h3 className="text-base font-bold text-[#111A2E] tracking-tight mt-0.5">
            Roue Circulaire des Habitudes
          </h3>
          <p className="text-xs text-[#68748A]">
            Inspiré des carnets de discipline circulaire. Chaque rayon correspond à un jour, chaque anneau à une routine.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#68748A] font-mono bg-[#F4F6FA] px-3 py-1.5 rounded-lg border border-[#E4E8F0]">
          <span className="w-2 h-2 rounded-full bg-[#059669]" />
          <span>{dialStats.completedCells} validés</span>
          <span>•</span>
          <span className="font-bold text-[#182235]">{dialStats.pct}% régularité</span>
        </div>
      </div>

      {/* Main Grid: Left Habit Index Ledger + Right Circular Radial Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
        {/* Left Column: Habit Index Ledger (matches the Etsy template structure) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#68748A] pb-1 border-b border-[#E4E8F0]">
            <span className="uppercase font-mono text-[10px]">Anneau & Habitude</span>
            <span className="uppercase font-mono text-[10px]">Cible</span>
          </div>

          <div className="space-y-2">
            {displayHabits.map((habit, idx) => {
              const palette = RING_PALETTES[idx % RING_PALETTES.length];
              const isSelected = habit.id === selectedHabitId;

              return (
                <div
                  key={habit.id}
                  onClick={() => onSelectHabit(habit.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#2855D9] bg-[#EDF2FF]/40 shadow-xs"
                      : "border-[#E4E8F0] hover:border-[#D8DFEB] bg-white hover:bg-[#FAFAF7]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Ring Color Indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: palette.fill }}
                    >
                      <span className="text-[9px] font-bold text-white font-mono">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-bold truncate tracking-tight ${
                          isSelected ? "text-[#2855D9]" : "text-[#111A2E]"
                        }`}
                      >
                        {habit.name}
                      </h4>
                      <p className="text-[10px] text-[#68748A] font-mono mt-0.5">
                        Anneau {idx + 1} • {habit.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-semibold text-[#182235] bg-[#F4F6FA] px-2 py-0.5 rounded">
                      {habit.target_value} {habit.unit}
                    </span>
                    {habit.currentStreak > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                        <Flame className="w-2.5 h-2.5 fill-current" />
                        <span>{habit.currentStreak}j</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#F4F6FA] rounded-xl border border-[#E4E8F0] text-[11px] text-[#68748A] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#182235]">
              <Info className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Guide de lecture du cadran</span>
            </div>
            <p>
              Survolez les portions du cadran pour afficher le détail journalier. Cliquez sur une habitude à gauche pour mettre en évidence son anneau dédié.
            </p>
          </div>
        </div>

        {/* Right Column: The Circular Polar Habit Dial */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
          <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full drop-shadow-xs transition-transform duration-300"
            >
              {/* Outer Dial Rim Ring */}
              <circle
                cx={cx}
                cy={cy}
                r={outerRadius + 8}
                fill="none"
                stroke="#E4E8F0"
                strokeWidth="1.5"
                strokeDasharray="2 3"
              />

              {/* Day Number Markers along Circumference */}
              {dateList.map((dStr, dayIdx) => {
                const angle = (dayIdx / numDays) * 2 * Math.PI - Math.PI / 2 + Math.PI / numDays;
                const markerPos = polarToCartesian(cx, cy, outerRadius + 22, angle);
                const dayNum = parseInt(dStr.slice(8), 10);
                const isToday = dStr === todayStr;

                return (
                  <text
                    key={`label-${dayIdx}`}
                    x={markerPos.x}
                    y={markerPos.y}
                    fontSize={isToday ? "11" : "9"}
                    fontWeight={isToday ? "bold" : "600"}
                    fill={isToday ? "#2855D9" : "#68748A"}
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {dayNum}
                  </text>
                );
              })}

              {/* Concentric Rings of Annular Sectors */}
              {displayHabits.map((habit, ringIdx) => {
                const palette = RING_PALETTES[ringIdx % RING_PALETTES.length];
                const r0 = hubRadius + ringIdx * ringWidth + 2;
                const r1 = hubRadius + (ringIdx + 1) * ringWidth - 2;
                const isSelectedHabit = habit.id === selectedHabitId;

                return (
                  <g key={`ring-${habit.id}`} opacity={isSelectedHabit ? 1 : 0.85}>
                    {dateList.map((dStr, dayIdx) => {
                      const totalAngle = 2 * Math.PI;
                      const sliceAngle = totalAngle / numDays;
                      const angularGap = 0.015; // Crisp spacing gap between cells

                      const a0 = dayIdx * sliceAngle - Math.PI / 2 + angularGap;
                      const a1 = (dayIdx + 1) * sliceAngle - Math.PI / 2 - angularGap;

                      const isToday = dStr === todayStr;
                      const isFuture = dStr > todayStr;
                      const isBeforeStart = dStr < habit.start_date;

                      // Completion check
                      let isDone = false;
                      if (isToday) {
                        isDone = habit.todayStatus === "completed";
                      } else if (!isBeforeStart && !isFuture) {
                        const diffDays = Math.round(
                          (new Date(todayStr).getTime() - new Date(dStr).getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        isDone = diffDays <= habit.currentStreak;
                      }

                      const pathData = describeAnnularSector(cx, cy, r0, r1, a0, a1);

                      const fillColor = isDone
                        ? palette.fill
                        : isFuture
                        ? "#FAFAF7"
                        : isBeforeStart
                        ? "#F4F6FA"
                        : "#EDF2FF";

                      const strokeColor = isDone
                        ? palette.fill
                        : isToday
                        ? "#2855D9"
                        : "#E4E8F0";

                      return (
                        <path
                          key={`cell-${ringIdx}-${dayIdx}`}
                          d={pathData}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isToday ? "1.5" : "0.75"}
                          className="transition-all duration-200 cursor-pointer hover:brightness-95 hover:stroke-[#111A2E]"
                          onMouseEnter={() =>
                            setHoveredCell({
                              habitName: habit.name,
                              dateStr: dStr,
                              dayNum: parseInt(dStr.slice(8), 10),
                              status: isDone ? "completed" : isFuture ? "future" : "pending",
                              color: palette.fill,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Center Hub Core */}
              <circle
                cx={cx}
                cy={cy}
                r={hubRadius - 2}
                fill="#FFFFFF"
                stroke="#E4E8F0"
                strokeWidth="2"
                className="shadow-sm"
              />

              {/* Center Hub Content */}
              {hoveredCell ? (
                <g className="animate-fade-in pointer-events-none">
                  <text
                    x={cx}
                    y={cy - 16}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#68748A"
                    fontFamily="monospace"
                  >
                    JOUR {hoveredCell.dayNum}
                  </text>
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={hoveredCell.color}
                  >
                    {hoveredCell.status === "completed" ? "✓ Validé" : "En attente"}
                  </text>
                  <text
                    x={cx}
                    y={cy + 16}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="500"
                    fill="#182235"
                    className="truncate"
                  >
                    {hoveredCell.habitName.slice(0, 16)}...
                  </text>
                </g>
              ) : (
                <g className="pointer-events-none">
                  <text
                    x={cx}
                    y={cy - 14}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    letterSpacing="1"
                    fill="#68748A"
                    fontFamily="monospace"
                    className="uppercase"
                  >
                    MOIS
                  </text>
                  <text
                    x={cx}
                    y={cy + 2}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fill="#111A2E"
                    className="capitalize"
                  >
                    {currentMonthLabel.slice(0, 8)}
                  </text>
                  <text
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="#2855D9"
                    fontFamily="monospace"
                  >
                    {dialStats.pct}% régularité
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Date Indicator on Mobile / Bottom caption */}
          <div className="text-center text-xs text-[#68748A] mt-2 font-mono">
            <span>● Anneaux 1 à {displayHabits.length}</span>
            <span className="mx-2">•</span>
            <span>Rayons 1 à {numDays} jours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
