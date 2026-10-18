"use client";

import React, { useState } from "react";
import { Plus, Calendar, Clock, AlertCircle, Tag, Sparkles } from "lucide-react";
import type { Subject, AcademicTaskCategory, AcademicTaskPriority } from "@/types/database";
import { createAcademicTaskAction } from "@/lib/actions/planner-actions";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { getLocalTodayDateString } from "@/lib/utils";

interface TaskQuickAddProps {
  subjects: Subject[];
  defaultDate?: string;
  onTaskCreated: () => void;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function TaskQuickAdd({
  subjects,
  defaultDate,
  onTaskCreated,
}: TaskQuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [category, setCategory] = useState<AcademicTaskCategory>("td_tp");
  const [priority, setPriority] = useState<AcademicTaskPriority>("medium");
  const [dueDate, setDueDate] = useState(defaultDate || getLocalTodayDateString());
  const [dueTime, setDueTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Natural language parser for quick-add syntax
  // Examples:
  // "TD Compilation demain 2h !urgent"
  // "Projet IA 45m !high"
  // "Projet C++ demain 1h"
  const parseNaturalLanguage = (rawText: string) => {
    let clean = rawText;
    let detectedPriority: AcademicTaskPriority | null = null;
    let detectedMinutes: number | null = null;
    let detectedDate: string | null = null;
    let detectedSubjectId: string | null = null;

    // Check priority tags: !urgent, !high, !medium, !low
    if (/!urgent/i.test(clean)) {
      detectedPriority = "urgent";
      clean = clean.replace(/!urgent/i, "");
    } else if (/!high|!important/i.test(clean)) {
      detectedPriority = "high";
      clean = clean.replace(/!high|!important/i, "");
    } else if (/!low|!faible/i.test(clean)) {
      detectedPriority = "low";
      clean = clean.replace(/!low|!faible/i, "");
    }

    // Check duration tags: 30m, 45min, 2h, 1h30
    const durationMatch = clean.match(/(\d+)\s*(h|min|m)\b/i);
    if (durationMatch) {
      const val = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      detectedMinutes = unit === "h" ? val * 60 : val;
      clean = clean.replace(durationMatch[0], "");
    }

    // Check date keywords: demain, today, aujourd'hui using local date helper
    if (/\bdemain\b/i.test(clean)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      detectedDate = getLocalTodayDateString(tomorrow);
      clean = clean.replace(/\bdemain\b/i, "");
    } else if (/\baujourd'hui\b|\btoday\b/i.test(clean)) {
      detectedDate = getLocalTodayDateString();
      clean = clean.replace(/\baujourd'hui\b|\btoday\b/i, "");
    }

    // Match subject keywords safely with escaped regex
    for (const sub of subjects) {
      const candidates = [sub.name, sub.slug].filter(Boolean) as string[];
      let matched = false;
      for (const targetStr of candidates) {
        const escaped = escapeRegex(targetStr);
        const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i");
        if (regex.test(clean)) {
          detectedSubjectId = sub.id;
          clean = clean.replace(regex, " ");
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    return {
      title: clean.trim().replace(/\s+/g, " "),
      priority: detectedPriority,
      estimatedMinutes: detectedMinutes,
      dueDate: detectedDate,
      subjectId: detectedSubjectId,
    };
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    const parsed = parseNaturalLanguage(title);
    const finalTitle = parsed.title || title.trim();
    const finalPriority = parsed.priority || priority;
    const finalEstimated = parsed.estimatedMinutes || estimatedMinutes;
    const finalDueDate = parsed.dueDate || dueDate;
    const finalSubjectId = parsed.subjectId || (subjectId ? subjectId : null);

    const res = await createAcademicTaskAction({
      title: finalTitle,
      subject_id: finalSubjectId,
      category,
      priority: finalPriority,
      due_date: finalDueDate,
      due_time: dueTime || null,
      estimated_minutes: finalEstimated,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || "Erreur lors de la création");
      return;
    }

    // Reset fields
    setTitle("");
    setIsExpanded(false);
    onTaskCreated();
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-[#E4E8F0] hover:border-[#2855D9]/40 focus-within:border-[#2855D9]/60 focus-within:shadow-[0_8px_24px_-4px_rgba(40,85,217,0.12)] rounded-2xl p-3.5 shadow-xs transition-all duration-200">
      <form onSubmit={handleQuickSubmit}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Ajouter une tâche... (ex: 'Rapport Compilation demain 2h !urgent')"
            className="flex-1 text-sm bg-transparent border-0 outline-none placeholder-[#68748A] text-[#111A2E]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#2855D9] text-white hover:bg-[#1E42AC] disabled:opacity-50 transition-colors shadow-xs"
            title="Créer la tâche"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#E4E8F0] space-y-3">
            {/* Quick selectors bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Subject selector */}
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2.5 py-1 text-[#111A2E] outline-none"
              >
                <option value="">Sans matière</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>

              {/* Category selector */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AcademicTaskCategory)}
                className="bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2.5 py-1 text-[#111A2E] outline-none"
              >
                <option value="td_tp">TD / TP</option>
                <option value="project">Projet d'ingénierie</option>
                <option value="exam">Examen / DS</option>
                <option value="revision">Fiche de révision</option>
                <option value="reading">Lecture / Cours</option>
                <option value="other">Autre</option>
              </select>

              {/* Priority selector */}
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AcademicTaskPriority)}
                className="bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2.5 py-1 text-[#111A2E] outline-none font-medium"
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgent ⚡</option>
              </select>

              {/* Due Date */}
              <div className="flex items-center gap-1 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-[#68748A]" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent border-0 outline-none text-[#111A2E] text-xs font-tabular"
                />
              </div>

              {/* Due Time */}
              <div className="flex items-center gap-1 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2.5 py-1">
                <Clock className="w-3.5 h-3.5 text-[#68748A]" />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="bg-transparent border-0 outline-none text-[#111A2E] text-xs font-tabular"
                  placeholder="HH:MM"
                />
              </div>

              {/* Duration presets */}
              <div className="flex items-center gap-1 bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2 py-0.5">
                {[25, 45, 60, 90].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setEstimatedMinutes(min)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-tabular transition-colors ${
                      estimatedMinutes === min
                        ? "bg-[#2855D9] text-white font-semibold"
                        : "text-[#68748A] hover:text-[#111A2E]"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Hint */}
            <div className="flex items-center justify-between text-[11px] text-[#68748A]">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#2855D9]" />
                Astuce: tapez <code className="bg-[#F4F6FA] px-1 rounded">!urgent</code>, <code className="bg-[#F4F6FA] px-1 rounded">demain</code> ou <code className="bg-[#F4F6FA] px-1 rounded">45m</code> directement dans le titre
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-[#68748A] hover:text-[#111A2E]"
              >
                Réduire
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-2 text-xs text-[#DC2626] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}
