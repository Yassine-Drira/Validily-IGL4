"use client";

import React from "react";
import {
  Brain,
  BookOpen,
  Sparkles,
  Dumbbell,
  Coffee,
  Clock,
  Target,
  Heart,
  Smile,
  Code,
  Flame,
  Zap,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  ListTodo,
  Trees,
} from "lucide-react";

interface HabitIconProps {
  name: string;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  BookOpen,
  Sparkles,
  Dumbbell,
  Coffee,
  Clock,
  Target,
  Heart,
  Smile,
  Code,
  Flame,
  Zap,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  ListTodo,
  Trees,
};

export function HabitIcon({ name, className = "w-5 h-5" }: HabitIconProps) {
  const IconComponent = ICON_MAP[name] || Sparkles;
  return <IconComponent className={className} />;
}

export const AVAILABLE_HABIT_ICONS = [
  "Brain",
  "BookOpen",
  "Code",
  "Sparkles",
  "Flame",
  "Target",
  "Dumbbell",
  "Moon",
  "Sun",
  "Coffee",
  "Heart",
  "Zap",
  "Clock",
  "Trees",
  "Laptop",
];
