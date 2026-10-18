"use client";

import React from "react";
import { CheckCircle2, Circle, Clock, CheckSquare, Edit2, Trash2, Copy, MoreVertical } from "lucide-react";
import type { CalendarTimeblock, AcademicTask, Subject } from "@/types/database";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { FocusTriggerButton } from "./focus-trigger-button";

interface TimeblockEventCardProps {
  block: CalendarTimeblock;
  subject?: Subject | null;
  linkedTask?: AcademicTask | null;
  onEdit: (block: CalendarTimeblock) => void;
  onToggleComplete: (block: CalendarTimeblock) => void;
  onDelete?: (blockId: string) => void;
  onDuplicate?: (block: CalendarTimeblock) => void;
  isCompact?: boolean;
  className?: string;
}

export function TimeblockEventCard({
  block,
  subject,
  linkedTask,
  onEdit,
  onToggleComplete,
  onDelete,
  onDuplicate,
  isCompact = false,
  className = "",
}: TimeblockEventCardProps) {
  const isCompleted = block.is_completed;
  const startStr = block.start_time.slice(0, 5);
  const endStr = block.end_time.slice(0, 5);
  const duration = block.duration_minutes;

  // Very short block layout (< 40 min)
  if (isCompact || duration < 40) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(block)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit(block);
          }
        }}
        className={`group relative h-full w-full rounded-lg px-2 py-1 text-xs border transition-all cursor-pointer select-none flex items-center justify-between gap-1 overflow-hidden ${
          isCompleted
            ? "bg-[#FAFAF7] text-[#68748A] border-[#E4E8F0] opacity-75"
            : "bg-[#EDF2FF] text-[#111A2E] border-[#2855D9]/30 hover:border-[#2855D9] hover:shadow-2xs"
        } ${className}`}
        title={`${block.title} (${startStr} - ${endStr})`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(block);
            }}
            className="text-[#68748A] hover:text-[#059669] shrink-0"
            title={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            ) : (
              <Circle className="w-3.5 h-3.5 hover:stroke-[#2855D9]" />
            )}
          </button>
          <span className={`font-semibold truncate text-[11px] ${isCompleted ? "line-through text-[#68748A]" : "text-[#111A2E]"}`}>
            {block.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[10px] text-[#68748A] font-tabular">
          <span>{startStr}</span>
          {subject && (
            <SubjectIcon name={subject.name} slug={subject.slug} className="w-3 h-3 text-[#2855D9]" />
          )}
        </div>
      </div>
    );
  }

  // Standard multi-hour or normal block layout
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(block)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(block);
        }
      }}
      className={`group relative h-full w-full rounded-xl p-2.5 text-xs border transition-all cursor-pointer select-none flex flex-col justify-between overflow-hidden shadow-2xs ${
        isCompleted
          ? "bg-[#FAFAF7] text-[#68748A] border-[#E4E8F0] opacity-80"
          : "bg-white text-[#111A2E] border-[#2855D9]/25 hover:border-[#2855D9] hover:shadow-xs"
      } ${className}`}
    >
      {/* Top row: Checkbox, Title, Quick Actions */}
      <div>
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-start gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(block);
              }}
              className="mt-0.5 text-[#68748A] hover:text-[#059669] shrink-0 transition-colors"
              title={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-[#059669] fill-[#059669]/10" />
              ) : (
                <Circle className="w-4 h-4 hover:stroke-[#2855D9]" />
              )}
            </button>
            <h4
              className={`font-semibold text-xs leading-snug break-words line-clamp-2 ${
                isCompleted ? "line-through text-[#68748A]" : "text-[#111A2E]"
              }`}
            >
              {block.title}
            </h4>
          </div>

          {/* Quick Action buttons visible on hover / focus */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            <FocusTriggerButton
              title={block.title}
              estimatedMinutes={duration}
              taskId={block.task_id || undefined}
              size="sm"
            />
            {onDuplicate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(block);
                }}
                className="p-1 text-[#68748A] hover:text-[#2855D9] rounded hover:bg-[#F4F6FA] transition-colors"
                title="Dupliquer la séance vers demain (+1 j)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(block.id);
                }}
                className="p-1 text-[#68748A] hover:text-[#DC2626] rounded hover:bg-[#F4F6FA] transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notes if available */}
        {block.notes && duration >= 60 && (
          <p className="text-[11px] text-[#68748A] line-clamp-1 mt-1 pl-5 italic">
            {block.notes}
          </p>
        )}
      </div>

      {/* Bottom row: Time badge, Duration, Subject & Linked task */}
      <div className="flex items-center justify-between gap-1 text-[10px] text-[#68748A] pt-1.5 mt-auto border-t border-[#E4E8F0]/60">
        <div className="flex items-center gap-1 font-tabular font-medium">
          <Clock className="w-3 h-3 text-[#2855D9]" />
          <span>{startStr} - {endStr}</span>
          <span className="text-[#68748A]">({duration}m)</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {linkedTask && (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#F4F6FA] text-[9px] text-[#2855D9] font-medium"
              title={`Lié à la tâche: ${linkedTask.title}`}
            >
              <CheckSquare className="w-2.5 h-2.5" />
              <span className="max-w-[70px] truncate">{linkedTask.title}</span>
            </span>
          )}

          {subject && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EDF2FF] text-[#2855D9] font-medium text-[10px]">
              <SubjectIcon name={subject.name} slug={subject.slug} className="w-2.5 h-2.5" />
              <span className="max-w-[65px] truncate">{subject.name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
