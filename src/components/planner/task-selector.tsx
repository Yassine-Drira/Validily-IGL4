"use client";

import React, { useState, useMemo } from "react";
import { Search, CheckSquare, X, Check, Calendar, Clock, AlertCircle } from "lucide-react";
import type { AcademicTask, Subject } from "@/types/database";
import { SubjectIcon } from "@/components/academic/subject-icon";

interface TaskSelectorProps {
  tasks: AcademicTask[];
  subjects: Subject[];
  selectedTaskId: string | null;
  onSelectTask: (task: AcademicTask | null) => void;
  className?: string;
}

export function TaskSelector({
  tasks,
  subjects,
  selectedTaskId,
  onSelectTask,
  className = "",
}: TaskSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.is_completed) // Prioritize uncompleted tasks for scheduling
      .filter((t) => {
        if (filterSubjectId !== "all" && t.subject_id !== filterSubjectId) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return t.title.toLowerCase().includes(q);
        }
        return true;
      });
  }, [tasks, filterSubjectId, searchQuery]);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-semibold text-[#111A2E]">
        Lier une tâche To-Do existante (optionnel)
      </label>

      {/* Selected task preview banner */}
      {selectedTask ? (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#2855D9]/30 bg-[#EDF2FF] text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="w-4 h-4 text-[#2855D9] shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-[#111A2E] truncate block">
                {selectedTask.title}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-[#68748A] mt-0.5 font-tabular">
                <span>Échéance: {selectedTask.due_date}</span>
                <span>•</span>
                <span>{selectedTask.estimated_minutes} min estimées</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTask(null)}
            className="p-1 hover:bg-white rounded-lg text-[#68748A] hover:text-[#DC2626] transition-colors shrink-0"
            title="Détacher la tâche"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Search and subject filter row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#68748A] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une tâche à planifier..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg outline-none text-[#111A2E] placeholder-[#68748A]"
              />
            </div>

            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="bg-[#F4F6FA] border border-[#E4E8F0] rounded-lg px-2 py-1.5 text-xs text-[#111A2E] outline-none max-w-[120px]"
            >
              <option value="all">Toutes matières</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task candidate list */}
          <div className="max-h-36 overflow-y-auto space-y-1 border border-[#E4E8F0] rounded-lg p-1 bg-white">
            {filteredTasks.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#68748A]">
                Aucune tâche correspondante trouvée.
              </div>
            ) : (
              filteredTasks.map((t) => {
                const sub = subjects.find((s) => s.id === t.subject_id) || t.subject;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTask(t)}
                    className="w-full text-left p-2 rounded-md hover:bg-[#EDF2FF] flex items-center justify-between gap-2 text-xs transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#111A2E] truncate group-hover:text-[#2855D9]">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#68748A] font-tabular mt-0.5">
                        <span>Échéance: {t.due_date}</span>
                        <span>•</span>
                        <span>{t.estimated_minutes}m</span>
                      </div>
                    </div>

                    {sub && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-[#2855D9] bg-white px-1.5 py-0.5 rounded border border-[#E4E8F0]">
                        <SubjectIcon name={sub.name} slug={sub.slug} className="w-2.5 h-2.5" />
                        <span className="max-w-[70px] truncate">{sub.name}</span>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
