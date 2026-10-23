/**
 * VALIDILY-IGL4 — Habit & Personal Productivity Intelligence Engine
 * Pure mathematical calculations for streaks, completion rates, weekly progress,
 * quantitative volume, and data-grounded consistency diagnostics.
 */

import type {
  Habit,
  HabitCheckin,
  HabitAnalyticsSummary,
  HabitDiagnostic,
  DayCompletionStatus,
  HabitPreferredTime,
  HabitWeeklyTargetAttainment,
  HabitQuantitativeProgress,
} from "@/types/database";

export function getLocalTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateString(d);
}

/**
 * Check if a habit is scheduled / eligible on a given calendar date
 */
export function isHabitEligibleOnDate(
  habit: Habit,
  dateStr: string,
  todayStr: string = getLocalTodayDateString()
): boolean {
  // Before start date: not eligible
  if (dateStr < habit.start_date) {
    return false;
  }

  // After archive date: not eligible
  if (habit.status === "archived" && habit.archived_at) {
    const archiveDateStr = habit.archived_at.slice(0, 10);
    if (dateStr > archiveDateStr) {
      return false;
    }
  }

  // During active pause: not eligible (paused dates do not count as missed failures)
  if (habit.status === "paused") {
    const pauseStart = habit.paused_at ? habit.paused_at.slice(0, 10) : habit.updated_at.slice(0, 10);
    const pauseEnd = habit.paused_until ? habit.paused_until.slice(0, 10) : todayStr;
    if (dateStr >= pauseStart && dateStr <= pauseEnd) {
      return false;
    }
  }

  // Frequency check: specific days of week
  if (habit.frequency_type === "specific_days") {
    const d = parseDateString(dateStr);
    const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday ... 6=Saturday
    return habit.scheduled_days.includes(dayOfWeek);
  }

  // Daily or weekly_count: eligible
  return true;
}

/**
 * Determine completion status of a habit for a specific date
 */
export function getDayCompletionStatus(
  habit: Habit,
  checkin: HabitCheckin | undefined,
  dateStr: string,
  todayStr: string = getLocalTodayDateString()
): DayCompletionStatus {
  if (checkin) {
    if (checkin.status === "skipped") {
      return "skipped";
    }
    if (habit.habit_type === "quantitative") {
      if (checkin.value >= habit.target_value || checkin.status === "completed") {
        return "completed";
      }
      if (checkin.value > 0) {
        return "partial";
      }
    } else {
      if (checkin.status === "completed" || checkin.value >= 1) {
        return "completed";
      }
      if (checkin.status === "partial") {
        return "partial";
      }
    }
  }

  // No check-in recorded
  if (dateStr > todayStr) {
    return "future";
  }

  if (!isHabitEligibleOnDate(habit, dateStr, todayStr)) {
    return "not_scheduled";
  }

  if (dateStr === todayStr) {
    return "pending";
  }

  return "missed";
}

/**
 * Calculate current and longest streaks for a habit
 * Accurately handles daily habits, specific-day habits, and weekly target counts.
 */
export function calculateHabitStreaks(
  habit: Habit,
  checkins: HabitCheckin[],
  todayStr: string = getLocalTodayDateString()
): { currentStreak: number; longestStreak: number } {
  const checkinMap = new Map<string, HabitCheckin>();
  for (const c of checkins) {
    if (c.habit_id === habit.id) {
      checkinMap.set(c.date, c);
    }
  }

  if (habit.frequency_type === "weekly_count") {
    return calculateWeeklyTargetStreaks(habit, checkinMap, todayStr);
  }

  // Daily or specific_days streak calculation
  if (todayStr < habit.start_date) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const eligibleDates: string[] = [];
  let curr = habit.start_date;
  while (curr <= todayStr) {
    if (isHabitEligibleOnDate(habit, curr, todayStr)) {
      eligibleDates.push(curr);
    }
    curr = addDaysToDateString(curr, 1);
  }

  if (eligibleDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < eligibleDates.length; i++) {
    const dStr = eligibleDates[i];
    const checkin = checkinMap.get(dStr);
    const status = getDayCompletionStatus(habit, checkin, dStr, todayStr);

    if (status === "completed") {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else if (status === "skipped") {
      // Neutral grace: maintains streak without incrementing or resetting
      continue;
    } else if (status === "pending" && dStr === todayStr) {
      // Today is still pending: do not break prior streak
      continue;
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current streak backward from today
  let currentStreak = 0;
  for (let i = eligibleDates.length - 1; i >= 0; i--) {
    const dStr = eligibleDates[i];
    const checkin = checkinMap.get(dStr);
    const status = getDayCompletionStatus(habit, checkin, dStr, todayStr);

    if (status === "completed") {
      currentStreak++;
    } else if (status === "skipped") {
      // neutral grace
      continue;
    } else if (status === "pending" && dStr === todayStr) {
      // Today is pending, inspect previous eligible day
      continue;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}

/**
 * Weekly count streak (e.g. 3x per week): Evaluates by ISO weeks
 */
function calculateWeeklyTargetStreaks(
  habit: Habit,
  checkinMap: Map<string, HabitCheckin>,
  todayStr: string
): { currentStreak: number; longestStreak: number } {
  const targetDays = habit.target_days_per_week || 3;
  const completionsPerWeek = new Map<string, number>();

  for (const [dateStr, checkin] of checkinMap.entries()) {
    if (dateStr >= habit.start_date && dateStr <= todayStr) {
      if (checkin.status === "completed" || (habit.habit_type === "quantitative" && checkin.value >= habit.target_value)) {
        const weekKey = getWeekKey(dateStr);
        completionsPerWeek.set(weekKey, (completionsPerWeek.get(weekKey) || 0) + 1);
      }
    }
  }

  const weeks: string[] = [];
  let curr = habit.start_date;
  const currentWeek = getWeekKey(todayStr);

  while (curr <= todayStr) {
    const wKey = getWeekKey(curr);
    if (!weeks.includes(wKey)) {
      weeks.push(wKey);
    }
    curr = addDaysToDateString(curr, 7);
  }
  if (!weeks.includes(currentWeek)) {
    weeks.push(currentWeek);
  }

  let longest = 0;
  let temp = 0;
  for (const w of weeks) {
    const count = completionsPerWeek.get(w) || 0;
    if (count >= targetDays) {
      temp++;
      if (temp > longest) longest = temp;
    } else if (w === currentWeek) {
      // Current week is still in progress, do not break streak
      continue;
    } else {
      temp = 0;
    }
  }

  // Current streak
  let current = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i];
    const count = completionsPerWeek.get(w) || 0;
    if (count >= targetDays) {
      current++;
    } else if (w === currentWeek) {
      continue;
    } else {
      break;
    }
  }

  return { currentStreak: current, longestStreak: Math.max(longest, current) };
}

export function getWeekKey(dateStr: string): string {
  const d = parseDateString(dateStr);
  const day = d.getDay();
  // Set to Monday of this week (ISO 8601 standard)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return formatDateString(monday);
}

/**
 * Generate comprehensive, mathematically rigorous habit analytics & diagnostics
 */
export function calculateHabitAnalytics(
  habit: Habit,
  checkins: HabitCheckin[],
  rangeDays: number = 30,
  todayStr: string = getLocalTodayDateString()
): HabitAnalyticsSummary {
  const checkinMap = new Map<string, HabitCheckin>();
  for (const c of checkins) {
    if (c.habit_id === habit.id) {
      checkinMap.set(c.date, c);
    }
  }

  const startDate = addDaysToDateString(todayStr, -(rangeDays - 1));
  const effectiveStart = startDate > habit.start_date ? startDate : habit.start_date;

  const dStart = parseDateString(effectiveStart);
  const dToday = parseDateString(todayStr);
  const observationDays = Math.max(1, Math.round((dToday.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const isNewHabit = observationDays < 3;

  let totalEligibleDays = 0;
  let completedDays = 0;
  let partiallyCompletedDays = 0;
  let skippedDays = 0;
  let missedDays = 0;
  let pendingDays = 0;
  let totalLoggedValue = 0;

  const weekdayCompleted: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const weekdayEligible: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  const pastEligibleDates: string[] = [];

  let curr = effectiveStart;
  while (curr <= todayStr) {
    if (isHabitEligibleOnDate(habit, curr, todayStr)) {
      totalEligibleDays++;
      pastEligibleDates.push(curr);
      const d = parseDateString(curr);
      const dayOfWeek = d.getDay();
      weekdayEligible[dayOfWeek] = (weekdayEligible[dayOfWeek] || 0) + 1;

      const checkin = checkinMap.get(curr);
      const status = getDayCompletionStatus(habit, checkin, curr, todayStr);

      if (checkin && checkin.value > 0) {
        totalLoggedValue += checkin.value;
      }

      if (status === "completed") {
        completedDays++;
        weekdayCompleted[dayOfWeek] = (weekdayCompleted[dayOfWeek] || 0) + 1;
      } else if (status === "partial") {
        partiallyCompletedDays++;
      } else if (status === "skipped") {
        skippedDays++;
      } else if (status === "pending") {
        pendingDays++;
      } else if (status === "missed") {
        missedDays++;
      }
    }
    curr = addDaysToDateString(curr, 1);
  }

  // Evaluated days: settled opportunities (completed, partial, skipped, missed)
  // If today is pending, it does NOT penalize evaluated completion rate as a missed day!
  const evaluatedDays = completedDays + partiallyCompletedDays + skippedDays + missedDays;
  const activeOpportunities = Math.max(0, evaluatedDays - skippedDays);

  // Scheduled Completion Rate
  let completionRate = 0;
  if (activeOpportunities > 0) {
    completionRate = Math.round((completedDays / activeOpportunities) * 100);
  } else if (evaluatedDays > 0 && completedDays > 0) {
    completionRate = 100;
  } else {
    completionRate = 0;
  }

  // Transparent Consistency Score (gives 50% credit for partial progress)
  const consistencyScore =
    activeOpportunities > 0
      ? Math.min(
          100,
          Math.round(
            ((completedDays + (partiallyCompletedDays * 0.5)) / activeOpportunities) * 100
          )
        )
      : 0;

  // Quantitative target progress (for quantitative habits)
  let quantitativeProgress: HabitQuantitativeProgress | null = null;
  if (habit.habit_type === "quantitative") {
    const totalTarget = habit.target_value * Math.max(1, activeOpportunities);
    const remaining = Math.max(0, totalTarget - totalLoggedValue);
    const progressPercentage =
      totalTarget > 0 ? Math.min(100, Math.round((totalLoggedValue / totalTarget) * 100)) : 0;
    const isComplete = totalLoggedValue >= totalTarget;

    quantitativeProgress = {
      totalLogged: totalLoggedValue,
      totalTarget,
      remaining,
      unit: habit.unit,
      progressPercentage,
      isComplete,
    };
  }

  // Weekly target attainment (for weekly_count habits)
  let weeklyTargetAttainment: HabitWeeklyTargetAttainment | null = null;
  if (habit.frequency_type === "weekly_count") {
    const targetPerWeek = habit.target_days_per_week || 3;
    const currentWeekKey = getWeekKey(todayStr);

    const weekMap = new Map<string, number>();
    for (const [dStr, c] of checkinMap.entries()) {
      if (dStr >= effectiveStart && dStr <= todayStr) {
        if (c.status === "completed" || (habit.habit_type === "quantitative" && c.value >= habit.target_value)) {
          const wKey = getWeekKey(dStr);
          weekMap.set(wKey, (weekMap.get(wKey) || 0) + 1);
        }
      }
    }

    const weeks: string[] = [];
    let wCurr = effectiveStart;
    while (wCurr <= todayStr) {
      const wk = getWeekKey(wCurr);
      if (!weeks.includes(wk)) weeks.push(wk);
      wCurr = addDaysToDateString(wCurr, 7);
    }

    let weeksObserved = 0;
    let weeksMet = 0;
    const completedThisWeek = weekMap.get(currentWeekKey) || 0;
    const isCurrentWeekMet = completedThisWeek >= targetPerWeek;

    for (const wk of weeks) {
      const cnt = weekMap.get(wk) || 0;
      if (wk === currentWeekKey) {
        if (isCurrentWeekMet) {
          weeksObserved++;
          weeksMet++;
        }
      } else {
        weeksObserved++;
        if (cnt >= targetPerWeek) {
          weeksMet++;
        }
      }
    }

    const attainmentRate =
      weeksObserved > 0
        ? Math.min(100, Math.round((weeksMet / weeksObserved) * 100))
        : isCurrentWeekMet
        ? 100
        : 0;

    weeklyTargetAttainment = {
      targetDaysPerWeek: targetPerWeek,
      completedThisWeek,
      isCurrentWeekMet,
      weeksObserved,
      weeksMet,
      attainmentRate,
    };
  }

  // Weekday breakdown percentages
  const weekdayRates: Record<number, number> = {};
  for (let d = 0; d < 7; d++) {
    const elig = weekdayEligible[d] || 0;
    const comp = weekdayCompleted[d] || 0;
    weekdayRates[d] = elig > 0 ? Math.round((comp / elig) * 100) : 0;
  }

  // Recovery Rate: when user missed an eligible day, did they complete the next eligible day?
  let missedEligibleOccurrences = 0;
  let recoveredOccurrences = 0;

  for (let i = 0; i < pastEligibleDates.length - 1; i++) {
    const dStr = pastEligibleDates[i];
    const status = getDayCompletionStatus(habit, checkinMap.get(dStr), dStr, todayStr);
    if (status === "missed") {
      missedEligibleOccurrences++;
      const nextDateStr = pastEligibleDates[i + 1];
      const nextStatus = getDayCompletionStatus(
        habit,
        checkinMap.get(nextDateStr),
        nextDateStr,
        todayStr
      );
      if (nextStatus === "completed") {
        recoveredOccurrences++;
      }
    }
  }

  const hasRecoveryData = missedEligibleOccurrences > 0;
  const recoveryRate = hasRecoveryData
    ? Math.round((recoveredOccurrences / missedEligibleOccurrences) * 100)
    : null;

  // Previous period comparison for sustainable progress trend
  const prevPeriodStart = addDaysToDateString(effectiveStart, -rangeDays);
  const prevPeriodEnd = addDaysToDateString(effectiveStart, -1);
  let prevEligible = 0;
  let prevCompleted = 0;

  let pCurr = prevPeriodStart;
  while (pCurr <= prevPeriodEnd) {
    if (isHabitEligibleOnDate(habit, pCurr, todayStr)) {
      prevEligible++;
      const checkin = checkinMap.get(pCurr);
      const status = getDayCompletionStatus(habit, checkin, pCurr, todayStr);
      if (status === "completed") prevCompleted++;
    }
    pCurr = addDaysToDateString(pCurr, 1);
  }

  const hasPreviousPeriodBaseline = prevEligible > 0;
  const previousPeriodRate = hasPreviousPeriodBaseline
    ? Math.round((prevCompleted / prevEligible) * 100)
    : null;
  const trendComparedToPreviousPeriod =
    hasPreviousPeriodBaseline && previousPeriodRate !== null
      ? completionRate - previousPeriodRate
      : null;

  // Streaks
  const { currentStreak, longestStreak } = calculateHabitStreaks(habit, checkins, todayStr);

  // Consistency Diagnostics (Data-Grounded facts, explanations, and adjustments)
  const diagnostics = generateDiagnostics({
    habit,
    totalEligibleDays,
    evaluatedDays,
    completedDays,
    missedDays,
    completionRate,
    trendComparedToPreviousPeriod,
    hasPreviousPeriodBaseline,
    weekdayRates,
    weekdayEligible,
    weekdayCompleted,
    recoveryRate,
    hasRecoveryData,
    recoveredOccurrences,
    missedEligibleOccurrences,
    currentStreak,
    isNewHabit,
    observationDays,
    weeklyTargetAttainment,
    quantitativeProgress,
  });

  return {
    habitId: habit.id,
    totalEligibleDays,
    completedDays,
    partiallyCompletedDays,
    skippedDays,
    missedDays,
    pendingDays,
    evaluatedDays,
    completionRate,
    currentStreak,
    longestStreak,
    recoveryRate,
    hasRecoveryData,
    recoveryNumerator: recoveredOccurrences,
    recoveryDenominator: missedEligibleOccurrences,
    consistencyScore,
    weekdayRates,
    trendComparedToPreviousPeriod,
    hasPreviousPeriodBaseline,
    previousPeriodRate,
    observationDays,
    isNewHabit,
    weeklyTargetAttainment,
    quantitativeProgress,
    diagnostics,
  };
}

const WEEKDAY_NAMES_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface DiagnosticContext {
  habit: Habit;
  totalEligibleDays: number;
  evaluatedDays: number;
  completedDays: number;
  missedDays: number;
  completionRate: number;
  trendComparedToPreviousPeriod: number | null;
  hasPreviousPeriodBaseline: boolean;
  weekdayRates: Record<number, number>;
  weekdayEligible: Record<number, number>;
  weekdayCompleted: Record<number, number>;
  recoveryRate: number | null;
  hasRecoveryData: boolean;
  recoveredOccurrences: number;
  missedEligibleOccurrences: number;
  currentStreak: number;
  isNewHabit: boolean;
  observationDays: number;
  weeklyTargetAttainment: HabitWeeklyTargetAttainment | null;
  quantitativeProgress: HabitQuantitativeProgress | null;
}

/**
 * Strict separation:
 * 1. OBSERVED: directly grounded in mathematical records.
 * 2. POSSIBLE EXPLANATION: behavioral hypothesis.
 * 3. SUGGESTED ADJUSTMENT: concrete actionable micro-experiment.
 */
function generateDiagnostics(ctx: DiagnosticContext): HabitDiagnostic[] {
  const {
    habit,
    totalEligibleDays,
    evaluatedDays,
    completedDays,
    missedDays,
    completionRate,
    trendComparedToPreviousPeriod,
    hasPreviousPeriodBaseline,
    weekdayRates,
    weekdayEligible,
    weekdayCompleted,
    recoveryRate,
    hasRecoveryData,
    recoveredOccurrences,
    missedEligibleOccurrences,
    isNewHabit,
    observationDays,
    weeklyTargetAttainment,
    quantitativeProgress,
  } = ctx;

  const results: HabitDiagnostic[] = [];

  // Minimum threshold: need at least 3 evaluated days for observations
  if (isNewHabit || evaluatedDays < 3) {
    results.push({
      id: `diag-fresh-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "observed",
      title: "Historique en cours de constitution",
      description: `Seulement ${observationDays} jour(s) d'observation jusqu'ici. Les observations comportementales approfondies s'activeront après 3 sessions.`,
      metricLabel: "Progression",
      metricValue: `${completedDays}/${totalEligibleDays}`,
      actionable: false,
    });
    return results;
  }

  // 1. Trend Analysis
  if (hasPreviousPeriodBaseline && trendComparedToPreviousPeriod !== null && trendComparedToPreviousPeriod !== 0) {
    if (trendComparedToPreviousPeriod > 0) {
      results.push({
        id: `diag-trend-up-${habit.id}`,
        habitId: habit.id,
        habitName: habit.name,
        type: "observed",
        title: "Tendance positive confirmée",
        description: `Taux d'accomplissement en hausse de +${trendComparedToPreviousPeriod} points par rapport à la période précédente (${completionRate}% actuel).`,
        metricLabel: "Progression",
        metricValue: `+${trendComparedToPreviousPeriod} pts`,
        actionable: false,
      });
    } else if (trendComparedToPreviousPeriod <= -15) {
      results.push({
        id: `diag-trend-down-${habit.id}`,
        habitId: habit.id,
        habitName: habit.name,
        type: "observed",
        title: "Baisse de régularité observée",
        description: `Le taux a fléchi de ${trendComparedToPreviousPeriod} points par rapport à la période de référence (${completionRate}% actuel).`,
        metricLabel: "Écart",
        metricValue: `${trendComparedToPreviousPeriod} pts`,
        actionable: false,
      });

      results.push({
        id: `diag-exp-down-${habit.id}`,
        habitId: habit.id,
        habitName: habit.name,
        type: "explanation",
        title: "Hypothèse de friction d'engagement",
        description: `Une friction temporelle ou une surcharge académique peut rendre le seuil actuel (${habit.target_value} ${habit.unit}) difficile à tenir chaque jour.`,
        actionable: false,
      });

      if (habit.habit_type === "quantitative" && habit.target_value > 1) {
        const reduced = Math.max(1, Math.floor(habit.target_value * 0.7));
        results.push({
          id: `diag-adj-target-${habit.id}`,
          habitId: habit.id,
          habitName: habit.name,
          type: "adjustment",
          title: "Ajuster temporairement la cible",
          description: `Réduire la cible à ${reduced} ${habit.unit} pendant 7 jours pour reconstituer une dynamique de réussite sans culpabilité.`,
          actionable: true,
          actionType: "reduce_target",
          actionPayload: { targetValue: reduced },
        });
      }
    }
  }

  // 2. Weekly Target Insights
  if (weeklyTargetAttainment) {
    results.push({
      id: `diag-weekly-target-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "observed",
      title: "Atteinte des objectifs hebdomadaires",
      description: `Objectif de ${weeklyTargetAttainment.targetDaysPerWeek} sessions/semaine atteint sur ${weeklyTargetAttainment.weeksMet} des ${weeklyTargetAttainment.weeksObserved} semaines observées (${weeklyTargetAttainment.attainmentRate}%).`,
      metricLabel: "Semaines réussies",
      metricValue: `${weeklyTargetAttainment.weeksMet}/${weeklyTargetAttainment.weeksObserved}`,
      actionable: false,
    });
  }

  // 3. Quantitative Progress Insights
  if (quantitativeProgress && quantitativeProgress.totalTarget > 0) {
    results.push({
      id: `diag-quant-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "observed",
      title: `Volume total de travail réalisé`,
      description: `Vous avez validé ${quantitativeProgress.totalLogged} ${quantitativeProgress.unit} sur une cible cumulée de ${quantitativeProgress.totalTarget} ${quantitativeProgress.unit} (${quantitativeProgress.progressPercentage}%).`,
      metricLabel: "Volume",
      metricValue: `${quantitativeProgress.progressPercentage}%`,
      actionable: false,
    });
  }

  // 4. Day-of-Week Discrepancy Analysis
  let bestDay = -1;
  let worstDay = -1;
  let maxRate = -1;
  let minRate = 101;

  for (let d = 0; d < 7; d++) {
    const elig = weekdayEligible[d] || 0;
    if (elig >= 2) {
      const rate = weekdayRates[d];
      if (rate > maxRate) {
        maxRate = rate;
        bestDay = d;
      }
      if (rate < minRate) {
        minRate = rate;
        worstDay = d;
      }
    }
  }

  if (bestDay !== -1 && maxRate >= 75) {
    results.push({
      id: `diag-bestday-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "observed",
      title: `Excellente constance le ${WEEKDAY_NAMES_FR[bestDay]}`,
      description: `Vous avez complété cette habitude ${weekdayCompleted[bestDay]} fois sur ${weekdayEligible[bestDay]} ${WEEKDAY_NAMES_FR[bestDay]}s programmés (${maxRate}%).`,
      metricLabel: `${WEEKDAY_NAMES_FR[bestDay]}`,
      metricValue: `${maxRate}%`,
      actionable: false,
    });
  }

  if (worstDay !== -1 && minRate <= 40 && maxRate - minRate >= 35) {
    results.push({
      id: `diag-worstday-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "observed",
      title: `Point de friction récurrent le ${WEEKDAY_NAMES_FR[worstDay]}`,
      description: `Seulement ${weekdayCompleted[worstDay]} sur ${weekdayEligible[worstDay]} ${WEEKDAY_NAMES_FR[worstDay]}s complétés (${minRate}%).`,
      metricLabel: `${WEEKDAY_NAMES_FR[worstDay]}`,
      metricValue: `${minRate}%`,
      actionable: false,
    });

    results.push({
      id: `diag-exp-worstday-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "explanation",
      title: "Conflit d'emploi du temps probable",
      description: `Le créneau habituel du ${WEEKDAY_NAMES_FR[worstDay]} (${habit.preferred_time === "morning" ? "Matin" : habit.preferred_time === "afternoon" ? "Après-midi" : "Soirée"}) coïncide potentiellement avec des cours ou des déplacements.`,
      actionable: false,
    });

    const alternateTime: HabitPreferredTime =
      habit.preferred_time === "evening"
        ? "morning"
        : habit.preferred_time === "morning"
        ? "afternoon"
        : "morning";

    results.push({
      id: `diag-adj-shift-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "adjustment",
      title: "Tester un décalage de créneau",
      description: `Programmer un rappel anticipé ou basculer cette routine sur le créneau '${alternateTime === "morning" ? "Matin" : "Après-midi"}' pour contourner ce goulot.`,
      actionable: true,
      actionType: "shift_time",
      actionPayload: { preferredTime: alternateTime },
    });
  }

  // 5. Recovery Resilience
  if (hasRecoveryData && recoveryRate !== null) {
    if (recoveryRate >= 66) {
      results.push({
        id: `diag-recovery-${habit.id}`,
        habitId: habit.id,
        habitName: habit.name,
        type: "observed",
        title: "Forte capacité de rebond après interruption",
        description: `Après une session manquée, vous avez repris le rythme dès l'opportunité suivante dans ${recoveredOccurrences} cas sur ${missedEligibleOccurrences} (${recoveryRate}%).`,
        metricLabel: "Rebond",
        metricValue: `${recoveryRate}%`,
        actionable: false,
      });
    }
  }

  // 6. Goal Alignment Check
  if (!habit.goal_id) {
    results.push({
      id: `diag-goal-${habit.id}`,
      habitId: habit.id,
      habitName: habit.name,
      type: "adjustment",
      title: "Lier à un objectif académique",
      description: `Cette habitude n'est rattachée à aucun objectif majeur. La connecter à un but mesurable (ex: Réussir S1) renforce son ancrage motivationnel.`,
      actionable: true,
      actionType: "link_goal",
    });
  }

  return results;
}
