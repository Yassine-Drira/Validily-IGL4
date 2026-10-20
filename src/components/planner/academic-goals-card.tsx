"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Target,
  Clock,
  CheckCircle2,
  Plus,
  Edit2,
  TrendingUp,
  Sparkles,
  X,
  BookOpen,
  CheckSquare,
  Flame,
  Minus,
  Trash2,
  Calendar,
  Layers,
} from "lucide-react";
import type {
  AcademicGoalWithProgress,
  AcademicGoalPeriod,
  AcademicGoalMetric,
  AcademicGoalStatus,
  Subject,
} from "@/types/database";
import {
  getAcademicGoalsAction,
  setAcademicGoalAction,
  deleteAcademicGoalAction,
  updateAcademicGoalProgressAction,
} from "@/lib/actions/planner-actions";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { getLocalTodayDateString } from "@/lib/utils";

interface AcademicGoalsCardProps {
  subjects: Subject[];
  currentDate?: string;
  className?: string;
}

interface GoalTemplate {
  label: string;
  icon: string;
  defaultTitle: string;
  metricType: AcademicGoalMetric;
  defaultTarget: number;
  unit: string;
  period: AcademicGoalPeriod;
  description: string;
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    label: "Temps d'étude hebdo",
    icon: "⏱️",
    defaultTitle: "Étudier 5 heures cette semaine",
    metricType: "study_minutes",
    defaultTarget: 300,
    unit: "min",
    period: "weekly",
    description: "Cible de temps de concentration effectif sur 7 jours",
  },
  {
    label: "Rendus & Devoirs",
    icon: "✅",
    defaultTitle: "Terminer 3 devoirs avant vendredi",
    metricType: "tasks_completed",
    defaultTarget: 3,
    unit: "tâches",
    period: "weekly",
    description: "Nombre de tâches académiques à cocher",
  },
  {
    label: "Série d'exercices",
    icon: "📝",
    defaultTitle: "Résoudre 20 exercices d'entraînement",
    metricType: "exercises",
    defaultTarget: 20,
    unit: "exercices",
    period: "monthly",
    description: "Progression manuelle sur fiches de TD ou annales",
  },
  {
    label: "Révision de chapitres",
    icon: "📖",
    defaultTitle: "Réviser 3 chapitres de cours",
    metricType: "chapters",
    defaultTarget: 3,
    unit: "chapitres",
    period: "weekly",
    description: "Validation de chapitres ou parties de cours",
  },
  {
    label: "Habitude quotidienne",
    icon: "🔥",
    defaultTitle: "Maintenir 2h de révision par jour",
    metricType: "study_minutes",
    defaultTarget: 120,
    unit: "min",
    period: "daily",
    description: "Routine quotidienne de travail personnel",
  },
];

export function AcademicGoalsCard({
  subjects,
  currentDate,
  className = "",
}: AcademicGoalsCardProps) {
  const [period, setPeriod] = useState<AcademicGoalPeriod>("daily");
  const [goals, setGoals] = useState<AcademicGoalWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Client-side cache to guarantee instant 0ms tab switching
  const goalsCacheRef = useRef<Record<string, AcademicGoalWithProgress[]>>({});

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricType, setMetricType] = useState<AcademicGoalMetric>("study_minutes");
  const [targetValue, setTargetValue] = useState<number>(120);
  const [unit, setUnit] = useState("min");
  const [subjectId, setSubjectId] = useState<string>("");
  const [periodType, setPeriodType] = useState<AcademicGoalPeriod>("daily");
  const [deadline, setDeadline] = useState<string>("");
  const [manualProgress, setManualProgress] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const activeDate = currentDate || getLocalTodayDateString();

  function computePeriodKey(type: AcademicGoalPeriod, dateStr: string): string {
    if (type === "daily") return dateStr;
    const parts = dateStr.split("-");
    const y = parts[0];
    const m = parts[1];
    if (type === "monthly") return `${y}-${m}`;
    if (type === "custom") return "custom";
    // weekly
    const d = new Date(dateStr + "T12:00:00");
    const weekNum = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
    return `${y}-W${weekNum.toString().padStart(2, "0")}`;
  }

  // Compute period key for active tab
  const periodKey = useMemo(() => computePeriodKey(period, activeDate), [period, activeDate]);

  // Instant tab switch handler using SWR in-memory cache
  const handlePeriodChange = (newPeriod: AcademicGoalPeriod) => {
    setPeriod(newPeriod);
    const newKey = computePeriodKey(newPeriod, activeDate);
    if (goalsCacheRef.current[newKey]) {
      setGoals(goalsCacheRef.current[newKey]);
      setLoading(false);
    }
  };

  const loadGoals = useCallback(async () => {
    const hasCached = !!goalsCacheRef.current[periodKey];
    if (!hasCached) {
      setLoading(true);
    }
    try {
      const res = await getAcademicGoalsAction({
        period_type: period,
        period_key: periodKey,
      });
      if (res.success) {
        setGoals(res.data);
        goalsCacheRef.current[periodKey] = res.data;
      }
    } finally {
      setLoading(false);
    }
  }, [period, periodKey]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Background prefetch for sibling periods so switching between Jour/Semaine/Mois is instant
  useEffect(() => {
    const timer = setTimeout(async () => {
      const siblingPeriods: AcademicGoalPeriod[] = (["daily", "weekly", "monthly"] as AcademicGoalPeriod[]).filter(
        (p) => p !== period
      );
      for (const p of siblingPeriods) {
        const pKey = computePeriodKey(p, activeDate);
        if (!goalsCacheRef.current[pKey]) {
          const res = await getAcademicGoalsAction({ period_type: p, period_key: pKey });
          if (res.success) {
            goalsCacheRef.current[pKey] = res.data;
          }
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeDate, period]);

  // Open modal for creation
  const handleOpenCreateModal = () => {
    setEditingGoalId(null);
    setTitle("");
    setDescription("");
    setMetricType("study_minutes");
    setTargetValue(120);
    setUnit("min");
    setSubjectId("");
    setPeriodType(period);
    setDeadline("");
    setManualProgress(0);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (goal: AcademicGoalWithProgress) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setDescription(goal.description || "");
    setMetricType(goal.metric_type);
    setTargetValue(goal.target_value);
    setUnit(goal.unit || "unités");
    setSubjectId(goal.subject_id || "");
    setPeriodType(goal.period_type);
    setDeadline(goal.deadline || "");
    setManualProgress(goal.manual_progress || 0);
    setIsModalOpen(true);
  };

  // Apply template
  const handleApplyTemplate = (tpl: GoalTemplate) => {
    setTitle(tpl.defaultTitle);
    setDescription(tpl.description);
    setMetricType(tpl.metricType);
    setTargetValue(tpl.defaultTarget);
    setUnit(tpl.unit);
    setPeriodType(tpl.period);
  };

  // Save Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !metricType) return;

    setSaving(true);
    const targetPeriodKey = computePeriodKey(periodType, activeDate);

    const res = await setAcademicGoalAction({
      id: editingGoalId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      period_type: periodType,
      period_key: targetPeriodKey,
      metric_type: metricType,
      target_value: targetValue,
      unit: unit.trim(),
      subject_id: subjectId || null,
      manual_progress: manualProgress,
      deadline: deadline || undefined,
    });

    setSaving(false);

    if (!res.success) {
      alert(res.error || "Erreur lors de l'enregistrement de l'objectif");
      return;
    }

    setIsModalOpen(false);
    if (period !== periodType) {
      setPeriod(periodType);
    } else {
      loadGoals();
    }
  };

  // Delete Goal with instant optimistic removal
  const handleDeleteGoal = async (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await deleteAcademicGoalAction(goalId);
  };

  // Quick Manual Progress Increment / Decrement (Instant 0ms UI feedback)
  const handleAdjustManualProgress = async (goal: AcademicGoalWithProgress, delta: number) => {
    const current = goal.current_progress || 0;
    const nextVal = Math.max(0, Math.min(goal.target_value * 2, current + delta));
    
    // Instant optimistic update
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              current_progress: nextVal,
              manual_progress: nextVal,
              percentage: Math.min(100, Math.round((nextVal / g.target_value) * 100)),
              is_completed: nextVal >= g.target_value,
            }
          : g
      )
    );

    // Background sync without re-triggering heavy loadGoals
    const res = await updateAcademicGoalProgressAction(goal.id, nextVal);
    if (!res.success) {
      // Rollback on failure
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? {
                ...g,
                current_progress: current,
                manual_progress: current,
                percentage: Math.min(100, Math.round((current / g.target_value) * 100)),
                is_completed: current >= g.target_value,
              }
            : g
        )
      );
    }
  };

  const periodLabels: Record<AcademicGoalPeriod, string> = {
    daily: "Aujourd'hui",
    weekly: "Cette semaine",
    monthly: "Ce mois",
    custom: "Personnalisés",
  };

  return (
    <div className={`bg-white border border-[#E4E8F0] rounded-2xl p-4 shadow-xs space-y-4 ${className}`}>
      {/* 1. Header with Period Switcher & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E8F0] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EDF2FF] flex items-center justify-center text-[#2855D9] shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#111A2E] flex items-center gap-2">
              <span>Objectifs Académiques</span>
              <span className="text-[10px] text-[#2855D9] bg-[#EDF2FF] px-1.5 py-0.2 rounded font-medium">
                {periodLabels[period]}
              </span>
            </h3>
            <p className="text-[11px] text-[#68748A]">
              Fixez vos cibles d'étude, suivez vos progrès et restez régulier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period selector */}
          <div className="flex items-center bg-[#F4F6FA] p-0.5 rounded-lg text-[10px]">
            {(["daily", "weekly", "monthly", "custom"] as AcademicGoalPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`px-2 py-1 rounded transition-colors capitalize ${
                  period === p
                    ? "bg-white text-[#2855D9] font-bold shadow-2xs"
                    : "text-[#68748A] hover:text-[#111A2E]"
                }`}
              >
                {p === "daily" ? "Jour" : p === "weekly" ? "Semaine" : p === "monthly" ? "Mois" : "Coutume"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E42AC] rounded-lg transition-colors shadow-2xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Objectif</span>
          </button>
        </div>
      </div>

      {/* 2. Goals List */}
      {loading && goals.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
          <div className="h-28 rounded-2xl bg-[#F4F6FA] border border-[#E4E8F0]" />
          <div className="h-28 rounded-2xl bg-[#F4F6FA] border border-[#E4E8F0]" />
        </div>
      ) : goals.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#68748A] border border-dashed border-[#E4E8F0] rounded-xl space-y-2">
          <Target className="w-6 h-6 mx-auto opacity-35 text-[#2855D9]" />
          <p className="font-semibold text-[#111A2E]">Aucun objectif défini pour {periodLabels[period].toLowerCase()}</p>
          <p className="text-[11px] max-w-sm mx-auto">
            Définissez une cible de concentration, un nombre de devoirs ou une série d'exercices pour booster votre motivation.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2855D9] bg-[#EDF2FF] hover:bg-[#DCE7FE] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Choisir un objectif recommandé</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goals.map((goal) => {
            const subject = subjects.find((s) => s.id === goal.subject_id) || goal.subject;
            return (
              <div
                key={goal.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  goal.is_completed
                    ? "bg-gradient-to-br from-emerald-50/90 via-white/95 to-emerald-50/30 border-emerald-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(5,150,105,0.08)]"
                    : "bg-gradient-to-br from-white/95 via-white/90 to-blue-50/20 backdrop-blur-md border-[#E4E8F0] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_10px_rgba(0,0,0,0.03)] hover:border-[#2855D9]/40 hover:shadow-md"
                }`}
              >
                {/* Header row of card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-[#111A2E] truncate">
                        {goal.title}
                      </h4>
                      {subject && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200/50 text-[#2855D9] text-[9px] font-semibold shrink-0">
                          <SubjectIcon name={subject.name} slug={subject.slug} className="w-2.5 h-2.5" />
                          <span className="max-w-[70px] truncate">{subject.name}</span>
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-[11px] text-[#68748A] line-clamp-1 italic">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(goal)}
                      className="p-1.5 text-[#68748A] hover:text-[#2855D9] hover:bg-[#F4F6FA] rounded-lg transition-colors"
                      title="Modifier l'objectif"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-[#68748A] hover:text-[#DC2626] hover:bg-[#F4F6FA] rounded-lg transition-colors"
                      title="Supprimer l'objectif"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar and values */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium font-tabular">
                    <div className="flex items-center gap-1.5 text-[#68748A]">
                      {goal.is_automated ? (
                        <span className="inline-flex items-center gap-1 text-[#2855D9] bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-200/40 text-[10px] font-semibold" title="Calculé automatiquement depuis vos sessions réelles">
                          <Sparkles className="w-3 h-3 text-[#2855D9]" />
                          <span>Vérifié</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#D97706] bg-amber-50/80 px-1.5 py-0.2 rounded border border-amber-200/40 text-[10px] font-semibold" title="Progression manuelle">
                          <Edit2 className="w-3 h-3 text-[#D97706]" />
                          <span>Manuel</span>
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-semibold text-[#111A2E]">
                        {goal.current_progress} / {goal.target_value} {goal.unit || "unités"}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold font-tabular ${
                        goal.is_completed ? "text-[#059669]" : "text-[#2855D9]"
                      }`}
                    >
                      {goal.percentage}%
                    </span>
                  </div>

                  {/* Visual Glowing Glass Bar */}
                  <div className="h-2 w-full bg-[#E4E8F0]/70 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        goal.is_completed
                          ? "bg-gradient-to-r from-[#059669] to-[#10B981] shadow-[0_0_8px_rgba(5,150,105,0.4)]"
                          : "bg-gradient-to-r from-[#2855D9] via-[#4F46E5] to-[#7C3AED] shadow-[0_0_8px_rgba(40,85,217,0.35)]"
                      }`}
                      style={{ width: `${goal.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Footer Controls: Quick Manual progress buttons if not automated */}
                {!goal.is_automated && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#E4E8F0]/60">
                    <span className="text-[10px] text-[#68748A]">Ajuster la progression :</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustManualProgress(goal, -1)}
                        className="p-1 rounded bg-[#F4F6FA] hover:bg-[#E4E8F0] text-[#111A2E] text-xs transition-colors"
                        title="Diminuer de 1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustManualProgress(goal, 1)}
                        className="px-2 py-0.5 rounded bg-[#EDF2FF] hover:bg-[#DCE7FE] text-[#2855D9] text-[11px] font-bold transition-colors"
                        title="Augmenter de 1"
                      >
                        +1 {goal.unit || ""}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Flexible Goal Creation & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#E4E8F0] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E8F0] pb-3">
              <h3 className="text-base font-bold text-[#111A2E] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2855D9]" />
                <span>{editingGoalId ? "Modifier l'objectif" : "Définir un nouvel objectif"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-[#F4F6FA] rounded-lg text-[#68748A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recommended Templates (Only on Create) */}
            {!editingGoalId && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#68748A]">
                  Modèles recommandés (cliquer pour pré-remplir) :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GOAL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="p-2 text-left bg-[#FAFAF7] hover:bg-[#EDF2FF] border border-[#E4E8F0] hover:border-[#2855D9]/40 rounded-xl transition-all space-y-0.5 group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{tpl.icon}</span>
                        <span className="text-xs font-semibold text-[#111A2E] group-hover:text-[#2855D9]">
                          {tpl.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#68748A] line-clamp-1">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="space-y-3.5">
              {/* Natural Language Title */}
              <div>
                <label className="block text-xs font-semibold text-[#111A2E] mb-1">
                  Intitulé de votre objectif *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Étudier l'IA 5h cette semaine ou Finir 20 exercices"
                  className="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl outline-none focus:border-[#2855D9] text-[#111A2E]"
                />
              </div>

              {/* Goal Type & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Type d'évaluation
                  </label>
                  <select
                    value={metricType}
                    onChange={(e) => {
                      const m = e.target.value as AcademicGoalMetric;
                      setMetricType(m);
                      if (m === "study_minutes") setUnit("min");
                      else if (m === "tasks_completed") setUnit("tâches");
                      else if (m === "study_sessions") setUnit("séances");
                      else if (m === "exercises") setUnit("exercices");
                      else if (m === "chapters") setUnit("chapitres");
                      else setUnit("unités");
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none text-[#111A2E]"
                  >
                    <option value="study_minutes">⏱️ Temps de concentration (Automatisé)</option>
                    <option value="tasks_completed">✅ Tâches terminées (Automatisé)</option>
                    <option value="study_sessions">📅 Séances d'agenda (Automatisé)</option>
                    <option value="exercises">📝 Série d'exercices (Manuel)</option>
                    <option value="chapters">📖 Révision de chapitres (Manuel)</option>
                    <option value="custom">🎯 Objectif personnalisé (Manuel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Matière associée
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none text-[#111A2E]"
                  >
                    <option value="">Toutes les matières (Général)</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Value, Unit & Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Valeur cible
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Unité affichée
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ex: min, tâches, TD"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none text-[#111A2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Période
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as AcademicGoalPeriod)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none text-[#111A2E]"
                  >
                    <option value="daily">Quotidien (Jour)</option>
                    <option value="weekly">Hebdomadaire (Semaine)</option>
                    <option value="monthly">Mensuel (Mois)</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>
              </div>

              {/* Deadline if custom */}
              {periodType === "custom" && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Date limite (échéance)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                  />
                </div>
              )}

              {/* Progression actuelle (accessible pour tous les objectifs manuels) */}
              {metricType !== "study_minutes" && metricType !== "study_sessions" && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                    Progression manuelle actuelle ({manualProgress} / {targetValue} {unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={targetValue * 2}
                    value={manualProgress}
                    onChange={(e) => setManualProgress(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none font-tabular text-[#111A2E]"
                    placeholder="ex: 2"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-[#68748A] mb-1">
                  Description ou motivation (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Objectif fixé pour préparer le DS de mi-semestre"
                  className="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-xl outline-none focus:border-[#2855D9] text-[#111A2E]"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#68748A] hover:bg-[#F4F6FA] rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2855D9] hover:bg-[#1E42AC] rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                >
                  {saving ? "Enregistrement..." : editingGoalId ? "Mettre à jour" : "Créer l'objectif"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
