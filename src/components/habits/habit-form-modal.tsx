"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Target,
  Clock,
  Calendar,
  Check,
  ChevronRight,
} from "lucide-react";
import type {
  Habit,
  HabitType,
  HabitCategory,
  HabitFrequencyType,
  HabitPreferredTime,
  AcademicGoal,
} from "@/types/database";
import { HabitIcon, AVAILABLE_HABIT_ICONS } from "./habit-icon";
import { HABIT_PRESETS, HabitPreset } from "./habit-presets";
import { createHabitAction, updateHabitAction } from "@/lib/actions/habit-actions";

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialHabit?: Habit | null;
  goals: AcademicGoal[];
}

const CATEGORIES: Array<{ id: HabitCategory; label: string }> = [
  { id: "study", label: "Études & Révision" },
  { id: "health", label: "Santé & Énergie" },
  { id: "mindfulness", label: "Pleine conscience & Sommeil" },
  { id: "productivity", label: "Productivité & Organisation" },
  { id: "routine", label: "Routine quotidienne" },
];

const WEEKDAYS = [
  { day: 1, label: "L" },
  { day: 2, label: "M" },
  { day: 3, label: "M" },
  { day: 4, label: "J" },
  { day: 5, label: "V" },
  { day: 6, label: "S" },
  { day: 0, label: "D" },
];

export function HabitFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialHabit,
  goals,
}: HabitFormModalProps) {
  const isEditing = Boolean(initialHabit);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">(
    isEditing ? "custom" : "presets"
  );

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Brain");
  const [category, setCategory] = useState<HabitCategory>("study");
  const [habitType, setHabitType] = useState<HabitType>("binary");
  const [targetValue, setTargetValue] = useState<number>(1);
  const [unit, setUnit] = useState("fois");
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>("daily");
  const [scheduledDays, setScheduledDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState<number>(3);
  const [preferredTime, setPreferredTime] = useState<HabitPreferredTime>("morning");
  const [reminderTime, setReminderTime] = useState("");
  const [goalId, setGoalId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name);
      setDescription(initialHabit.description || "");
      setIcon(initialHabit.icon);
      setCategory(initialHabit.category);
      setHabitType(initialHabit.habit_type);
      setTargetValue(initialHabit.target_value);
      setUnit(initialHabit.unit);
      setFrequencyType(initialHabit.frequency_type);
      setScheduledDays(initialHabit.scheduled_days || [1, 2, 3, 4, 5, 6, 0]);
      setTargetDaysPerWeek(initialHabit.target_days_per_week || 3);
      setPreferredTime(initialHabit.preferred_time);
      setReminderTime(initialHabit.reminder_time || "");
      setGoalId(initialHabit.goal_id || "");
      setActiveTab("custom");
    } else {
      // Defaults
      setName("");
      setDescription("");
      setIcon("Brain");
      setCategory("study");
      setHabitType("binary");
      setTargetValue(1);
      setUnit("fois");
      setFrequencyType("daily");
      setScheduledDays([1, 2, 3, 4, 5, 6, 0]);
      setTargetDaysPerWeek(3);
      setPreferredTime("morning");
      setReminderTime("");
      setGoalId("");
      setActiveTab("presets");
    }
    setErrorMessage("");
  }, [initialHabit, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: HabitPreset) => {
    setName(preset.name);
    setDescription(preset.description);
    setIcon(preset.icon);
    setCategory(preset.category);
    setHabitType(preset.habit_type);
    setTargetValue(preset.target_value);
    setUnit(preset.unit);
    setFrequencyType(preset.frequency_type);
    setScheduledDays(preset.scheduled_days);
    if (preset.target_days_per_week) {
      setTargetDaysPerWeek(preset.target_days_per_week);
    }
    setPreferredTime(preset.preferred_time);
    setReminderTime(preset.reminder_time || "");
    setActiveTab("custom");
  };

  const toggleDay = (d: number) => {
    if (scheduledDays.includes(d)) {
      if (scheduledDays.length > 1) {
        setScheduledDays(scheduledDays.filter((day) => day !== d));
      }
    } else {
      setScheduledDays([...scheduledDays, d].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Le nom de l'habitude est requis.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (isEditing && initialHabit) {
        const res = await updateHabitAction(initialHabit.id, {
          name: name.trim(),
          description: description.trim() || null,
          icon,
          category,
          habit_type: habitType,
          target_value: habitType === "quantitative" ? Number(targetValue) : 1,
          unit: habitType === "quantitative" ? unit.trim() : "fois",
          frequency_type: frequencyType,
          scheduled_days: scheduledDays,
          target_days_per_week: targetDaysPerWeek,
          preferred_time: preferredTime,
          reminder_time: reminderTime || null,
          goal_id: goalId || null,
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || "Erreur lors de la mise à jour.");
        }
      } else {
        const res = await createHabitAction({
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          category,
          habit_type: habitType,
          target_value: habitType === "quantitative" ? Number(targetValue) : 1,
          unit: habitType === "quantitative" ? unit.trim() : "fois",
          frequency_type: frequencyType,
          scheduled_days: scheduledDays,
          target_days_per_week: targetDaysPerWeek,
          preferred_time: preferredTime,
          reminder_time: reminderTime || undefined,
          goal_id: goalId || undefined,
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || "Erreur lors de la création.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111A2E] tracking-tight">
              {isEditing ? "Modifier l'habitude" : "Créer une nouvelle habitude"}
            </h3>
            <p className="text-xs text-[#68748A] mt-0.5">
              Définissez une micro-routine réaliste pour soutenir vos objectifs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#68748A] hover:text-[#182235] rounded-lg hover:bg-[#F4F6FA] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (only for new habit) */}
        {!isEditing && (
          <div className="px-6 pt-3 border-b border-[#E4E8F0] flex items-center gap-4 bg-[#FAFAF7]">
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "presets"
                  ? "border-[#2855D9] text-[#2855D9]"
                  : "border-transparent text-[#68748A] hover:text-[#182235]"
              }`}
            >
              Modèles recommandés
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "custom"
                  ? "border-[#2855D9] text-[#2855D9]"
                  : "border-transparent text-[#68748A] hover:text-[#182235]"
              }`}
            >
              Personnalisée
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#DC2626]">
              {errorMessage}
            </div>
          )}

          {activeTab === "presets" && !isEditing ? (
            <div className="space-y-3">
              <p className="text-xs text-[#68748A]">
                Sélectionnez un modèle validé pour démarrer immédiatement :
              </p>
              <div className="space-y-2">
                {HABIT_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className="group border border-[#E4E8F0] hover:border-[#2855D9] rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:bg-[#F4F6FA]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#EDF2FF] text-[#2855D9] flex items-center justify-center shrink-0">
                        <HabitIcon name={p.icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#111A2E] truncate">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-[#68748A] truncate mt-0.5">
                          {p.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68748A] group-hover:text-[#2855D9] shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1">
                  Nom de l'habitude *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Session Révision Active"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1">
                  Description / Déclencheur (optionnel)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Juste après mon premier café du matin"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1.5">
                  Icône
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVAILABLE_HABIT_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                        icon === ic
                          ? "bg-[#2855D9] text-white"
                          : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#EDF2FF] hover:text-[#2855D9]"
                      }`}
                    >
                      <HabitIcon name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Habit Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as HabitCategory)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Format d'accomplissement
                  </label>
                  <select
                    value={habitType}
                    onChange={(e) => setHabitType(e.target.value as HabitType)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  >
                    <option value="binary">Binaire (Fait / Non fait)</option>
                    <option value="quantitative">Quantitatif (Objectif chiffré)</option>
                  </select>
                </div>
              </div>

              {/* Target & Unit for Quantitative */}
              {habitType === "quantitative" && (
                <div className="p-3 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Cible chiffrée
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetValue}
                      onChange={(e) => setTargetValue(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] font-tabular focus:outline-none focus:border-[#2855D9]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#182235] mb-1">
                      Unité de mesure
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="ex: minutes, pages, ml"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Frequency Type */}
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1">
                  Fréquence programmée
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFrequencyType("daily")}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer ${
                      frequencyType === "daily"
                        ? "bg-[#EDF2FF] border-[#2855D9] text-[#2855D9]"
                        : "border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA]"
                    }`}
                  >
                    Quotidien
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequencyType("specific_days")}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer ${
                      frequencyType === "specific_days"
                        ? "bg-[#EDF2FF] border-[#2855D9] text-[#2855D9]"
                        : "border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA]"
                    }`}
                  >
                    Jours fixes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequencyType("weekly_count")}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer ${
                      frequencyType === "weekly_count"
                        ? "bg-[#EDF2FF] border-[#2855D9] text-[#2855D9]"
                        : "border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA]"
                    }`}
                  >
                    Hebdomadaire
                  </button>
                </div>
              </div>

              {/* Specific days pills */}
              {frequencyType === "specific_days" && (
                <div>
                  <label className="block text-xs text-[#68748A] mb-1.5">
                    Sélectionnez les jours d'exécution :
                  </label>
                  <div className="flex items-center gap-1.5">
                    {WEEKDAYS.map(({ day, label }) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                          scheduledDays.includes(day)
                            ? "bg-[#2855D9] text-white"
                            : "bg-[#F4F6FA] text-[#68748A] hover:bg-[#E4E8F0]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly count stepper */}
              {frequencyType === "weekly_count" && (
                <div className="p-3 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg">
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Cible : {targetDaysPerWeek} fois par semaine
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={targetDaysPerWeek}
                    onChange={(e) => setTargetDaysPerWeek(Number(e.target.value))}
                    className="w-full accent-[#2855D9]"
                  />
                  <p className="text-[11px] text-[#68748A] mt-1">
                    Un mardi manqué n'invalide pas l'objectif si la cible globale de {targetDaysPerWeek} sessions est atteinte d'ici dimanche.
                  </p>
                </div>
              )}

              {/* Preferred Time of Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Créneau privilégié
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value as HabitPreferredTime)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  >
                    <option value="morning">Matin (avant 12h)</option>
                    <option value="afternoon">Après-midi (12h - 18h)</option>
                    <option value="evening">Soirée (après 18h)</option>
                    <option value="anytime">Toute la journée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182235] mb-1">
                    Rappel (optionnel)
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                  />
                </div>
              </div>

              {/* Linked Goal */}
              <div>
                <label className="block text-xs font-semibold text-[#182235] mb-1">
                  Connecter à un objectif académique (optionnel)
                </label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E8F0] rounded-lg text-[#182235] focus:outline-none focus:border-[#2855D9]"
                >
                  <option value="">Aucun objectif lié</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.period_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-[#E4E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#68748A] hover:text-[#182235] rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Enregistrement...</span>
                  ) : (
                    <span>{isEditing ? "Mettre à jour" : "Créer l'habitude"}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
