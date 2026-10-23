"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { HabitWithTodayState, DayCompletionStatus, HabitCategory, HabitCheckin } from "@/types/database";
import { getLocalTodayDateString, addDaysToDateString, getDayCompletionStatus } from "@/lib/habits/habit-engine";
import {
  Flame,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Heart,
  Brain,
  Zap,
  Clock,
  Layers,
  LayoutGrid,
  CircleDot,
  Calendar,
  RotateCcw,
} from "lucide-react";

interface CircularHabitDialProps {
  habits: HabitWithTodayState[];
  selectedHabitId: string;
  onSelectHabit: (id: string) => void;
  rangeDays: number;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onRangeDaysChange?: (days: number) => void;
}

function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthYear(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthStr;
  }
}

function getDaysInMonth(monthStr: string): number {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// 12 curated, high-contrast harmonic colorways for rings
const RING_PALETTES = [
  { name: "Cobalt", fill: "#2855D9", bg: "#EDF2FF", light: "#93C5FD" },
  { name: "Émeraude", fill: "#059669", bg: "#ECFDF5", light: "#A7F3D0" },
  { name: "Ambre", fill: "#D97706", bg: "#FEF3C7", light: "#FDE68A" },
  { name: "Violet", fill: "#7C3AED", bg: "#F5F3FF", light: "#DDD6FE" },
  { name: "Rose", fill: "#E11D48", bg: "#FFF1F2", light: "#FECDD3" },
  { name: "Cyan", fill: "#0284C7", bg: "#F0F9FF", light: "#BAE6FD" },
  { name: "Indigo", fill: "#4F46E5", bg: "#EEF2FF", light: "#C7D2FE" },
  { name: "Sarcelle", fill: "#0D9488", bg: "#F0FDFA", light: "#99F6E4" },
  { name: "Corail", fill: "#EA580C", bg: "#FFF7ED", light: "#FED7AA" },
  { name: "Fuchsia", fill: "#C026D3", bg: "#FDF4FF", light: "#F5D0FE" },
  { name: "Lime", fill: "#65A30D", bg: "#F7FEE7", light: "#D9F99D" },
  { name: "Ardoise", fill: "#475569", bg: "#F8FAFC", light: "#CBD5E1" },
];

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeBg: string; badgeBorder: string }
> = {
  all: {
    label: "Toutes les routines",
    icon: Sparkles,
    color: "#2855D9",
    badgeBg: "bg-blue-50 text-blue-700",
    badgeBorder: "border-blue-200",
  },
  study: {
    label: "Études",
    icon: BookOpen,
    color: "#2855D9",
    badgeBg: "bg-blue-50 text-blue-700",
    badgeBorder: "border-blue-200",
  },
  health: {
    label: "Santé",
    icon: Heart,
    color: "#059669",
    badgeBg: "bg-emerald-50 text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
  mindfulness: {
    label: "Pleine conscience",
    icon: Brain,
    color: "#7C3AED",
    badgeBg: "bg-purple-50 text-purple-700",
    badgeBorder: "border-purple-200",
  },
  productivity: {
    label: "Productivité",
    icon: Zap,
    color: "#D97706",
    badgeBg: "bg-amber-50 text-amber-700",
    badgeBorder: "border-amber-200",
  },
  routine: {
    label: "Routine",
    icon: Clock,
    color: "#0284C7",
    badgeBg: "bg-cyan-50 text-cyan-700",
    badgeBorder: "border-cyan-200",
  },
  other: {
    label: "Autre",
    icon: Layers,
    color: "#475569",
    badgeBg: "bg-slate-50 text-slate-700",
    badgeBorder: "border-slate-200",
  },
};

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

/**
 * Reusable single polar dial wheel + habit ledger component
 */
interface SingleDialRendererProps {
  habits: HabitWithTodayState[];
  startIndex: number;
  totalHabitsCount: number;
  selectedHabitId: string;
  onSelectHabit: (id: string) => void;
  dateList: string[];
  todayStr: string;
  currentMonthLabel: string;
  title?: string;
  categoryKey?: string;
  isCompact?: boolean;
}

function SingleDialRenderer({
  habits,
  startIndex,
  totalHabitsCount,
  selectedHabitId,
  onSelectHabit,
  dateList,
  todayStr,
  currentMonthLabel,
  title,
  categoryKey,
  isCompact = false,
}: SingleDialRendererProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    habitName: string;
    dateStr: string;
    dayNum: number;
    status: DayCompletionStatus;
    color: string;
  } | null>(null);

  const numDays = dateList.length;

  // SVG Geometry Constants: 540x540 viewport with ample margins for crisp numbers
  const cx = 270;
  const cy = 270;
  const outerRadius = 210;
  const numRings = Math.max(1, habits.length);
  // Give extra breathing room to hub when fewer rings; tighten slightly when 6+ rings
  const hubRadius = numRings <= 4 ? 78 : numRings <= 6 ? 66 : 56;
  const ringWidth = (outerRadius - hubRadius) / numRings;

  // Calculate completion stats for this specific wheel using exact check-in data
  const dialStats = useMemo(() => {
    let completedCells = 0;
    const totalCells = numDays * habits.length;

    for (const habit of habits) {
      const checkinMap = new Map<string, HabitCheckin>();
      if (habit.recentCheckins) {
        for (const c of habit.recentCheckins) {
          checkinMap.set(c.date, c);
        }
      }
      if (habit.todayCheckin) {
        checkinMap.set(habit.todayCheckin.date || todayStr, habit.todayCheckin);
      }

      for (const dStr of dateList) {
        const isToday = dStr === todayStr;
        if (isToday && habit.todayStatus === "completed") {
          completedCells++;
        } else {
          const checkin = checkinMap.get(dStr);
          const status = getDayCompletionStatus(habit, checkin, dStr, todayStr);
          if (status === "completed") {
            completedCells++;
          }
        }
      }
    }

    const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;
    return { completedCells, totalCells, pct };
  }, [habits, dateList, todayStr, numDays]);

  const catMeta = categoryKey && CATEGORY_CONFIG[categoryKey] ? CATEGORY_CONFIG[categoryKey] : null;

  return (
    <div
      className={`grid grid-cols-1 ${
        isCompact ? "lg:grid-cols-1" : "lg:grid-cols-12"
      } gap-6 items-center pt-2`}
    >
      {/* Left Column: Habit Index Ledger */}
      <div className={`${isCompact ? "lg:col-span-1" : "lg:col-span-5"} space-y-3`}>
        {title && (
          <div className="flex items-center justify-between pb-1 border-b border-[#E4E8F0]">
            <div className="flex items-center gap-2">
              {catMeta && <catMeta.icon className="w-4 h-4 text-[#2855D9]" />}
              <span className="text-xs font-bold text-[#111A2E]">{title}</span>
            </div>
            <span className="text-[11px] font-mono text-[#059669] font-bold">
              {dialStats.pct}% validé
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-semibold text-[#68748A] pb-1 border-b border-[#E4E8F0]">
          <span className="uppercase font-mono text-[10px]">Anneau &amp; Habitude</span>
          <span className="uppercase font-mono text-[10px]">Cible</span>
        </div>

        <div className="space-y-2">
          {habits.map((habit, idx) => {
            const globalRingIdx = startIndex + idx;
            const palette = RING_PALETTES[globalRingIdx % RING_PALETTES.length];
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
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: palette.fill }}
                  >
                    <span className="text-[10px] font-bold text-white font-mono">
                      {globalRingIdx + 1}
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
                      Anneau {globalRingIdx + 1} • {habit.category}
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

        {!isCompact && (
          <div className="p-3 bg-[#F4F6FA] rounded-xl border border-[#E4E8F0] text-[11px] text-[#68748A] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#182235]">
              <Info className="w-3.5 h-3.5 text-[#2855D9]" />
              <span>Guide de lecture du cadran</span>
            </div>
            <p>
              Survolez les portions du cadran pour afficher le détail journalier. Cliquez sur une habitude à gauche pour mettre en évidence son anneau dédié.
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Circular Polar Habit Dial SVG */}
      <div
        className={`${
          isCompact ? "lg:col-span-1" : "lg:col-span-7"
        } flex flex-col items-center justify-center relative`}
      >
        <div
          className={`relative w-full ${
            isCompact ? "max-w-[340px]" : "max-w-[440px]"
          } aspect-square flex items-center justify-center`}
        >
          <svg
            viewBox="0 0 540 540"
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

            {/* Circumference Tick Marks for Precision Gauge Readability */}
            {dateList.map((dStr, dayIdx) => {
              const sliceAngle = (2 * Math.PI) / numDays;
              const boundaryAngle = dayIdx * sliceAngle - Math.PI / 2;
              const tickInner = polarToCartesian(cx, cy, outerRadius + 4, boundaryAngle);
              const tickOuter = polarToCartesian(cx, cy, outerRadius + 11, boundaryAngle);
              const isToday = dStr === todayStr;

              return (
                <line
                  key={`tick-${dayIdx}`}
                  x1={tickInner.x}
                  y1={tickInner.y}
                  x2={tickOuter.x}
                  y2={tickOuter.y}
                  stroke={isToday ? "#2855D9" : "#CBD5E1"}
                  strokeWidth={isToday ? "2" : "1"}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Day Number Markers along Circumference (High-Contrast & Large) */}
            {dateList.map((dStr, dayIdx) => {
              const angle =
                (dayIdx / numDays) * 2 * Math.PI - Math.PI / 2 + Math.PI / numDays;
              const markerPos = polarToCartesian(cx, cy, outerRadius + 26, angle);
              const dayNum = parseInt(dStr.slice(8), 10);
              const isToday = dStr === todayStr;
              const isFuture = dStr > todayStr;

              // High-visibility dynamic typography based on slice count
              const fontSize =
                numDays <= 7
                  ? "14"
                  : numDays <= 15
                  ? "13"
                  : numDays <= 31
                  ? "11.5"
                  : "10";

              return (
                <g key={`marker-group-${dayIdx}`}>
                  {isToday && (
                    <circle
                      cx={markerPos.x}
                      cy={markerPos.y}
                      r={numDays <= 15 ? 13 : 11}
                      fill="#2855D9"
                      className="shadow-sm"
                    />
                  )}
                  <text
                    x={markerPos.x}
                    y={markerPos.y}
                    fontSize={isToday ? (numDays <= 15 ? "13" : "11") : fontSize}
                    fontWeight={isToday ? "bold" : "700"}
                    fill={isToday ? "#FFFFFF" : isFuture ? "#94A3B8" : "#1E293B"}
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {dayNum}
                  </text>
                </g>
              );
            })}

            {/* Concentric Rings of Annular Sectors */}
            {habits.map((habit, ringIdx) => {
              const globalRingIdx = startIndex + ringIdx;
              const palette = RING_PALETTES[globalRingIdx % RING_PALETTES.length];
              const r0 = hubRadius + ringIdx * ringWidth + 2;
              const r1 = hubRadius + (ringIdx + 1) * ringWidth - 2;
              const isSelectedHabit = habit.id === selectedHabitId;

              const checkinMap = new Map<string, HabitCheckin>();
              if (habit.recentCheckins) {
                for (const c of habit.recentCheckins) {
                  checkinMap.set(c.date, c);
                }
              }
              if (habit.todayCheckin) {
                checkinMap.set(habit.todayCheckin.date || todayStr, habit.todayCheckin);
              }

              return (
                <g key={`ring-${habit.id}`} opacity={isSelectedHabit ? 1 : 0.88}>
                  {dateList.map((dStr, dayIdx) => {
                    const totalAngle = 2 * Math.PI;
                    const sliceAngle = totalAngle / numDays;
                    const angularGap = 0.015; // Crisp spacing gap between cells

                    const a0 = dayIdx * sliceAngle - Math.PI / 2 + angularGap;
                    const a1 = (dayIdx + 1) * sliceAngle - Math.PI / 2 - angularGap;

                    const isToday = dStr === todayStr;
                    let status: DayCompletionStatus;
                    if (isToday) {
                      status = habit.todayStatus;
                    } else {
                      const checkin = checkinMap.get(dStr);
                      status = getDayCompletionStatus(habit, checkin, dStr, todayStr);
                    }

                    const isDone = status === "completed";
                    const isFuture = status === "future";
                    const isBeforeStart = dStr < habit.start_date;

                    const pathData = describeAnnularSector(cx, cy, r0, r1, a0, a1);

                    const fillColor = isDone
                      ? palette.fill
                      : status === "partial"
                      ? palette.light
                      : isFuture
                      ? "#FAFAF7"
                      : isBeforeStart
                      ? "#F4F6FA"
                      : isToday
                      ? "#EDF2FF"
                      : "#F8FAFC";

                    const strokeColor = isDone
                      ? palette.fill
                      : isToday
                      ? "#2855D9"
                      : "#E2E8F0";

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
                            status,
                            color: isDone ? palette.fill : status === "pending" ? "#2855D9" : "#64748B",
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
                  {hoveredCell.status === "completed"
                    ? "✓ Validé"
                    : hoveredCell.status === "partial"
                    ? "⚡ Partiel"
                    : hoveredCell.status === "skipped"
                    ? "⏸ En pause"
                    : hoveredCell.status === "pending"
                    ? "○ À faire"
                    : hoveredCell.status === "future"
                    ? "Planifié"
                    : hoveredCell.status === "not_scheduled"
                    ? "Repos"
                    : "✕ Non validé"}
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
                  y={cy - 18}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  letterSpacing="1.2"
                  fill="#64748B"
                  fontFamily="monospace"
                  className="uppercase"
                >
                  {catMeta ? catMeta.label.slice(0, 12) : "MOIS"}
                </text>
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  fontSize="12.5"
                  fontWeight="bold"
                  fill="#0F172A"
                  className="capitalize"
                >
                  {currentMonthLabel}
                </text>
                <text
                  x={cx}
                  y={cy + 19}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="bold"
                  fill="#059669"
                  fontFamily="monospace"
                >
                  {dialStats.pct}% régularité
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend Caption */}
        <div className="text-center text-xs text-[#334155] mt-2 font-mono font-medium">
          <span>
            ● Anneaux {startIndex + 1} à {startIndex + habits.length}
            {totalHabitsCount > habits.length && ` (sur ${totalHabitsCount})`}
          </span>
          <span className="mx-2">•</span>
          <span>Rayons 1 à {numDays} jours</span>
          <span className="mx-2">•</span>
          <span className="font-bold text-[#111A2E]">{currentMonthLabel}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Dynamic Circular Habit Dial with Category Segmenting & Multi-Dial Layout
 */
export function CircularHabitDial({
  habits,
  selectedHabitId,
  onSelectHabit,
  rangeDays,
  selectedMonth,
  onMonthChange,
  onRangeDaysChange,
}: CircularHabitDialProps) {
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [pageIndex, setPageIndex] = useState<number>(0);

  const todayStr = useMemo(() => getLocalTodayDateString(), []);
  const currentMonthStr = todayStr.slice(0, 7);

  // Month navigation state (controlled or uncontrolled)
  const [internalMonth, setInternalMonth] = useState<string>(currentMonthStr);
  const activeMonth = selectedMonth || internalMonth;
  const setActiveMonth = onMonthChange || setInternalMonth;

  const isCurrentMonth = activeMonth === currentMonthStr;

  // Determine anchor date for date calculations
  const anchorDate = useMemo(() => {
    if (isCurrentMonth) {
      return todayStr;
    }
    const lastDay = getDaysInMonth(activeMonth);
    return `${activeMonth}-${String(lastDay).padStart(2, "0")}`;
  }, [isCurrentMonth, activeMonth, todayStr]);

  // Determine dates to render on the dial
  const dateList = useMemo(() => {
    // If rangeDays is 30, render the full calendar month days 1..daysInMonth
    if (rangeDays === 30) {
      const daysCount = getDaysInMonth(activeMonth);
      const list: string[] = [];
      for (let day = 1; day <= daysCount; day++) {
        list.push(`${activeMonth}-${String(day).padStart(2, "0")}`);
      }
      return list;
    }

    // For 7, 15, or 50 days (or custom ranges):
    const count = rangeDays; // 7, 15, or 50
    const list: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      list.push(addDaysToDateString(anchorDate, -i));
    }
    return list;
  }, [rangeDays, activeMonth, anchorDate]);

  const numDays = dateList.length;

  // Month label for the center hub
  const currentMonthLabel = useMemo(() => {
    return formatMonthYear(activeMonth);
  }, [activeMonth]);

  // Derive unique categories present in the habits list
  const categorySummary = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", habits.length);

    for (const h of habits) {
      const cat = h.category || "other";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    // List of active categories having at least 1 habit
    const activeCats: Array<{ key: HabitCategory | "all"; count: number }> = [
      { key: "all", count: habits.length },
    ];

    const catOrder: HabitCategory[] = ["study", "health", "mindfulness", "productivity", "routine", "other"];
    for (const cat of catOrder) {
      const count = counts.get(cat) || 0;
      if (count > 0) {
        activeCats.push({ key: cat, count });
      }
    }

    return { counts, activeCats };
  }, [habits]);

  // Filter habits according to selected category
  const filteredHabits = useMemo(() => {
    if (selectedCategory === "all") return habits;
    return habits.filter((h) => (h.category || "other") === selectedCategory);
  }, [habits, selectedCategory]);

  // Pagination for single dial view: 6 habits per wheel page maintains optimal radial readability
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredHabits.length / PAGE_SIZE));

  // Reset pageIndex when category changes
  useEffect(() => {
    setPageIndex(0);
  }, [selectedCategory]);

  // Automatically switch page if selected habit is outside current page
  useEffect(() => {
    if (!selectedHabitId) return;
    const idx = filteredHabits.findIndex((h) => h.id === selectedHabitId);
    if (idx !== -1) {
      const targetPage = Math.floor(idx / PAGE_SIZE);
      if (targetPage !== pageIndex) {
        setPageIndex(targetPage);
      }
    }
  }, [selectedHabitId, filteredHabits, pageIndex]);

  // Habits currently visible on the active dial page
  const currentDialHabits = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filteredHabits.slice(start, start + PAGE_SIZE);
  }, [filteredHabits, pageIndex]);

  // Calculate overall completion count across all filtered habits using exact checkins
  const overallStats = useMemo(() => {
    let completedCells = 0;
    const totalCells = numDays * habits.length;

    for (const habit of habits) {
      const checkinMap = new Map<string, HabitCheckin>();
      if (habit.recentCheckins) {
        for (const c of habit.recentCheckins) {
          checkinMap.set(c.date, c);
        }
      }
      if (habit.todayCheckin) {
        checkinMap.set(habit.todayCheckin.date || todayStr, habit.todayCheckin);
      }

      for (const dStr of dateList) {
        const isToday = dStr === todayStr;
        if (isToday && habit.todayStatus === "completed") {
          completedCells++;
        } else {
          const checkin = checkinMap.get(dStr);
          const status = getDayCompletionStatus(habit, checkin, dStr, todayStr);
          if (status === "completed") {
            completedCells++;
          }
        }
      }
    }

    const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;
    return { completedCells, totalCells, pct };
  }, [habits, dateList, todayStr, numDays]);

  // Multi-dial categories: only categories that have habits
  const multiCategories = useMemo(() => {
    const map = new Map<HabitCategory, HabitWithTodayState[]>();
    for (const h of habits) {
      const cat = h.category || "other";
      const list = map.get(cat) || [];
      list.push(h);
      map.set(cat, list);
    }
    return Array.from(map.entries());
  }, [habits]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 shadow-xs space-y-6">
      {/* Title & Section Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E4E8F0]">
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

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Month History Navigator in Dial Header */}
          <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0] text-xs">
            <button
              type="button"
              onClick={() => setActiveMonth(getPreviousMonth(activeMonth))}
              className="p-1.5 text-[#68748A] hover:text-[#111A2E] hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Mois précédent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 px-1.5 font-bold text-[#111A2E] text-xs">
              <Calendar className="w-3 h-3 text-[#2855D9]" />
              <span>{currentMonthLabel}</span>
              {isCurrentMonth ? (
                <span className="text-[9px] font-semibold bg-[#ECFDF5] text-[#059669] px-1 py-0.2 rounded-full border border-[#A7F3D0]">
                  Actuel
                </span>
              ) : (
                <span className="text-[9px] font-semibold bg-[#FEF3C7] text-[#D97706] px-1 py-0.2 rounded-full border border-[#FDE68A]">
                  Archive
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveMonth(getNextMonth(activeMonth))}
              disabled={isCurrentMonth}
              className={`p-1.5 rounded-lg transition-colors ${
                isCurrentMonth
                  ? "text-[#CBD5E1] cursor-not-allowed"
                  : "text-[#68748A] hover:text-[#111A2E] hover:bg-white cursor-pointer"
              }`}
              title="Mois suivant"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setActiveMonth(currentMonthStr)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#2855D9] bg-[#EDF2FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg transition-colors cursor-pointer"
              title="Revenir au mois en cours"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Actuel</span>
            </button>
          )}

          {/* Period Range Filter: 7, 15, 30, 50 (90 removed) */}
          {onRangeDaysChange && (
            <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E4E8F0] text-xs font-semibold">
              {[7, 15, 30, 50].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onRangeDaysChange(days)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    rangeDays === days
                      ? "bg-white text-[#2855D9] shadow-xs font-bold"
                      : "text-[#68748A] hover:text-[#111A2E]"
                  }`}
                >
                  {days} j
                </button>
              ))}
            </div>
          )}

          {/* View Mode Toggle Button: Single Wheel vs Multi-Wheels per Category */}
          {multiCategories.length > 1 && (
            <div className="flex items-center p-1 bg-[#F4F6FA] rounded-xl border border-[#E4E8F0] text-xs">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === "single"
                    ? "bg-white text-[#2855D9] shadow-2xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" />
                <span>Cadran Unique</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("multi")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === "multi"
                    ? "bg-white text-[#2855D9] shadow-2xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Multi-Cadrans ({multiCategories.length})</span>
              </button>
            </div>
          )}

          {/* Regularity Badge */}
          <div className="flex items-center gap-2 text-xs text-[#68748A] font-mono bg-[#F4F6FA] px-3 py-1.5 rounded-lg border border-[#E4E8F0]">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>{overallStats.completedCells} validés</span>
            <span>•</span>
            <span className="font-bold text-[#182235]">{overallStats.pct}% régularité</span>
          </div>
        </div>
      </div>

      {/* MODE 1: SINGLE DIAL VIEW (WITH CATEGORY FILTER TABS & PAGINATION) */}
      {viewMode === "single" && (
        <div className="space-y-5">
          {/* Category Filter Pills & Dial Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E4E8F0]">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {categorySummary.activeCats.map((catItem) => {
                const conf = CATEGORY_CONFIG[catItem.key] || CATEGORY_CONFIG.other;
                const Icon = conf.icon;
                const isSelected = selectedCategory === catItem.key;

                return (
                  <button
                    key={catItem.key}
                    type="button"
                    onClick={() => setSelectedCategory(catItem.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#2855D9] text-white shadow-xs"
                        : "bg-white text-[#68748A] hover:text-[#111A2E] border border-[#E4E8F0] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{conf.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {catItem.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dial Pager (if filtered habits > 6) */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-xs">
                <span className="text-[#68748A] text-[11px]">
                  Cadran {pageIndex + 1}/{totalPages} ({pageIndex * PAGE_SIZE + 1}–
                  {Math.min((pageIndex + 1) * PAGE_SIZE, filteredHabits.length)} sur{" "}
                  {filteredHabits.length})
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={pageIndex === 0}
                    className="p-1.5 rounded-lg border border-[#E4E8F0] bg-white text-[#68748A] hover:text-[#111A2E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Cadran précédent"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={pageIndex >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-[#E4E8F0] bg-white text-[#68748A] hover:text-[#111A2E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Cadran suivant"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Dial Rendering */}
          {currentDialHabits.length > 0 ? (
            <SingleDialRenderer
              habits={currentDialHabits}
              startIndex={pageIndex * PAGE_SIZE}
              totalHabitsCount={filteredHabits.length}
              selectedHabitId={selectedHabitId}
              onSelectHabit={onSelectHabit}
              dateList={dateList}
              todayStr={todayStr}
              currentMonthLabel={currentMonthLabel}
              categoryKey={selectedCategory === "all" ? undefined : selectedCategory}
            />
          ) : (
            <div className="text-center py-12 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E4E8F0] space-y-2">
              <Sparkles className="w-6 h-6 text-[#94A3B8] mx-auto" />
              <p className="text-xs font-semibold text-[#64748B]">
                Aucune habitude active dans cette catégorie.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-xs text-[#2855D9] hover:underline font-semibold cursor-pointer"
              >
                Afficher toutes les routines
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: MULTI-CADRANS (A WHEEL PER CATEGORY GRID) */}
      {viewMode === "multi" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {multiCategories.map(([catKey, catHabits]) => {
            const conf = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;

            return (
              <div
                key={catKey}
                className="p-5 rounded-2xl border border-[#E4E8F0] bg-[#FAFCFF] shadow-2xs space-y-4"
              >
                <SingleDialRenderer
                  habits={catHabits}
                  startIndex={0}
                  totalHabitsCount={catHabits.length}
                  selectedHabitId={selectedHabitId}
                  onSelectHabit={onSelectHabit}
                  dateList={dateList}
                  todayStr={todayStr}
                  currentMonthLabel={currentMonthLabel}
                  title={`${conf.label} (${catHabits.length})`}
                  categoryKey={catKey}
                  isCompact={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
