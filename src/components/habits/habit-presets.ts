/**
 * Curated academic and wellness habit presets for students (IGL4 / University).
 * Templates only - no fabricated historical data.
 */

import type { HabitCategory, HabitType, HabitFrequencyType, HabitPreferredTime } from "@/types/database";

export interface HabitPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: HabitCategory;
  habit_type: HabitType;
  target_value: number;
  unit: string;
  frequency_type: HabitFrequencyType;
  scheduled_days: number[];
  target_days_per_week?: number;
  preferred_time: HabitPreferredTime;
  reminder_time?: string;
}

export const HABIT_PRESETS: HabitPreset[] = [
  {
    id: "preset-pomodoro",
    name: "Session Révision Active (Pomodoro)",
    description: "45 minutes de travail intense sans distractions sur vos matières clés.",
    icon: "Brain",
    category: "study",
    habit_type: "quantitative",
    target_value: 45,
    unit: "minutes",
    frequency_type: "daily",
    scheduled_days: [1, 2, 3, 4, 5, 6, 0],
    preferred_time: "morning",
    reminder_time: "09:00",
  },
  {
    id: "preset-reading",
    name: "Lecture Poly & Documents de Cours",
    description: "Lire 15 pages de polycopiés académiques ou fiches de synthèse.",
    icon: "BookOpen",
    category: "study",
    habit_type: "quantitative",
    target_value: 15,
    unit: "pages",
    frequency_type: "specific_days",
    scheduled_days: [1, 2, 3, 4, 5],
    preferred_time: "afternoon",
    reminder_time: "14:30",
  },
  {
    id: "preset-code",
    name: "Pratique de Code & Exercices TD",
    description: "Résoudre 1 exercice d'algorithmique ou consolider un TP d'architecture.",
    icon: "Code",
    category: "study",
    habit_type: "quantitative",
    target_value: 1,
    unit: "exercice",
    frequency_type: "specific_days",
    scheduled_days: [1, 3, 5],
    preferred_time: "morning",
  },
  {
    id: "preset-sleep",
    name: "Coucher Régulier (Avant 23h30)",
    description: "Préserver une fenêtre de sommeil stable pour la consolidation de la mémoire.",
    icon: "Moon",
    category: "health",
    habit_type: "binary",
    target_value: 1,
    unit: "fois",
    frequency_type: "daily",
    scheduled_days: [1, 2, 3, 4, 5, 6, 0],
    preferred_time: "evening",
    reminder_time: "23:00",
  },
  {
    id: "preset-sport",
    name: "Séance d'Exercice Physique",
    description: "Course, musculation ou marche dynamique pour l'oxygénation cérébrale.",
    icon: "Dumbbell",
    category: "health",
    habit_type: "binary",
    target_value: 1,
    unit: "fois",
    frequency_type: "weekly_count",
    target_days_per_week: 3,
    scheduled_days: [1, 2, 3, 4, 5, 6, 0],
    preferred_time: "afternoon",
  },
  {
    id: "preset-water",
    name: "Hydratation Optimale (2L d'eau)",
    description: "Boire 2000 ml d'eau tout au long de la journée.",
    icon: "Coffee",
    category: "health",
    habit_type: "quantitative",
    target_value: 2000,
    unit: "ml",
    frequency_type: "daily",
    scheduled_days: [1, 2, 3, 4, 5, 6, 0],
    preferred_time: "anytime",
  },
  {
    id: "preset-meditation",
    name: "Méditation & Respiration Focus",
    description: "10 minutes de calme mental pour réduire le stress des examens.",
    icon: "Sparkles",
    category: "mindfulness",
    habit_type: "quantitative",
    target_value: 10,
    unit: "minutes",
    frequency_type: "daily",
    scheduled_days: [1, 2, 3, 4, 5, 6, 0],
    preferred_time: "morning",
    reminder_time: "08:30",
  },
];
