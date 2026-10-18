"use client";

import React from "react";
import { CheckCircle2, Circle, Clock, CheckSquare, Edit2, Trash2, Copy, Sparkles } from "lucide-react";
import type { CalendarTimeblock, AcademicTask, Subject } from "@/types/database";
import { SubjectIcon } from "@/components/academic/subject-icon";
import { FocusTriggerButton } from "./focus-trigger-button";
import { parseNotesAndColor, resolvePlannerTheme } from "@/lib/planner/planner-theme";
import { cn } from "@/lib/utils";

interface TimeblockEventCardProps {
  block: CalendarTimeblock;
  subject?: Subject | null;
  linkedTask?: AcademicTask | null;
  onEdit: (block: CalendarTimeblock) => void;
  onToggleComplete: (block: CalendarTimeblock) => void;
  onDelete?: (blockId: string) => void;
  onDuplicate?: (block: CalendarTimeblock) => void;
  onDragStart?: (e: React.DragEvent, block: CalendarTimeblock) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
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
  onDragStart,
  onDragEnd,
  isDragging = false,
  isCompact = false,
  className = "",
}: TimeblockEventCardProps) {
  const isCompleted = block.is_completed;
  const startStr = block.start_time.slice(0, 5);
  const endStr = block.end_time.slice(0, 5);
  const duration = block.duration_minutes;

  // Extract custom color tag & user notes
  const { colorKey, displayNotes } = parseNotesAndColor(block.notes);
  const theme = resolvePlannerTheme(colorKey, subject, linkedTask?.category);

  // Very short block layout (< 40 min)
  if (isCompact || duration < 40) {
    return (
      <div
        role="button"
        tabIndex={0}
        draggable={true}
        onDragStart={(e) => onDragStart?.(e, block)}
        onDragEnd={onDragEnd}
        onClick={() => onEdit(block)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit(block);
          }
        }}
        className={cn(
          "group relative h-full w-full rounded-xl px-2 py-1 text-xs border transition-all cursor-grab active:cursor-grabbing select-none flex items-center justify-between gap-1.5 overflow-hidden",
          isDragging && "opacity-40 ring-2 ring-[#2855D9] scale-95 shadow-xl",
          isCompleted
            ? "bg-[#FAFAF7]/90 text-[#68748A] border-[#E4E8F0] opacity-75 backdrop-blur-xs"
            : cn(theme.cardBg, theme.cardBorder, theme.cardGlow),
          className
        )}
        title={`${block.title} (${startStr} - ${endStr}) • Glisser-déposer pour déplacer`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: theme.dotColor }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(block);
            }}
            className={cn("text-[#68748A] hover:text-[#059669] shrink-0 transition-colors", theme.checkboxStroke)}
            title={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
          </button>
          <span
            className={cn(
              "font-bold truncate text-[11px] flex-1",
              isCompleted ? "line-through text-[#68748A]" : theme.titleText
            )}
          >
            {block.title || "Séance"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[10px] text-[#68748A] font-tabular">
          <span>{startStr}</span>
          {subject && (
            <SubjectIcon name={subject.name} slug={subject.slug} className="w-3 h-3 text-current opacity-80" />
          )}
        </div>
      </div>
    );
  }

  // Standard multi-hour or normal block layout with Glassmorphism Pro
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={true}
      onDragStart={(e) => onDragStart?.(e, block)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(block)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(block);
        }
      }}
      className={cn(
        "group relative h-full w-full rounded-2xl p-2.5 text-xs border transition-all cursor-grab active:cursor-grabbing select-none flex flex-col justify-between overflow-hidden",
        isDragging && "opacity-40 ring-2 ring-[#2855D9] scale-95 shadow-xl",
        isCompleted
          ? "bg-[#FAFAF7]/90 text-[#68748A] border-[#E4E8F0] opacity-80 backdrop-blur-xs"
          : cn(theme.cardBg, theme.cardBorder, theme.cardGlow),
        className
      )}
      title={`${block.title} (${startStr} - ${endStr}) • Glisser-déposer pour déplacer`}
    >
      {/* Top row: Luminous Accent Bar, Checkbox & Prominent Title */}
      <div className="min-w-0 w-full">
        <div className="flex items-start gap-1.5 w-full min-w-0 pr-1">
          {/* Luminous left accent glow pill */}
          {!isCompleted && (
            <div className={cn("w-1 self-stretch rounded-full shrink-0 my-0.5", theme.accentBar)} />
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(block);
            }}
            className={cn("mt-0.5 text-[#68748A] hover:text-[#059669] shrink-0 transition-colors cursor-pointer", theme.checkboxStroke)}
            title={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-[#059669] fill-[#059669]/10" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>

          <h4
            className={cn(
              "font-bold text-xs leading-snug break-words line-clamp-2 flex-1 min-w-0",
              isCompleted ? "line-through text-[#68748A]" : theme.titleText
            )}
          >
            {block.title || "Séance"}
          </h4>
        </div>

        {/* Dedicated Subject & Linked Task Badges (for blocks >= 55 min) */}
        {duration >= 55 && (subject || linkedTask) && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-2.5 min-w-0">
            {subject && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[10px] border shadow-2xs max-w-full min-w-0",
                  theme.badgeBg,
                  theme.badgeText,
                  theme.badgeBorder
                )}
                title={subject.name}
              >
                <SubjectIcon name={subject.name} slug={subject.slug} className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate max-w-[150px]">{subject.name}</span>
              </span>
            )}

            {linkedTask && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/70 border border-black/5 text-[9px] font-medium max-w-[110px] truncate shadow-2xs"
                title={`Lié à la tâche: ${linkedTask.title}`}
              >
                <CheckSquare className="w-2.5 h-2.5 text-[#2855D9] shrink-0" />
                <span className="truncate">{linkedTask.title}</span>
              </span>
            )}
          </div>
        )}

        {/* Floating Hover Glass Action Overlay */}
        <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5 bg-white/95 backdrop-blur-md p-0.5 rounded-xl border border-white/80 shadow-md z-30 transition-all">
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
              className="p-1 text-[#68748A] hover:text-[#2855D9] rounded-lg hover:bg-[#F4F6FA] transition-colors"
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
              className="p-1 text-[#68748A] hover:text-[#DC2626] rounded-lg hover:bg-[#F4F6FA] transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Notes with Glassmorphic callout border (for blocks >= 75 min) */}
        {displayNotes && duration >= 75 && (
          <p className="text-[11px] text-[#475569] line-clamp-2 mt-1.5 pl-2 italic border-l-2 border-current/30 ml-2.5">
            {displayNotes}
          </p>
        )}
      </div>

      {/* Bottom row: Time badge & Subject indicator if short */}
      {duration < 55 ? (
        <div className="flex items-center justify-between gap-1 text-[10px] text-[#68748A] pt-1 mt-auto border-t border-black/5 font-tabular font-medium whitespace-nowrap min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 opacity-70 shrink-0" />
            <span className="font-semibold">{startStr}</span>
          </div>
          {subject && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-semibold text-[9px] border shadow-2xs truncate max-w-[85px]",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
              title={subject.name}
            >
              <SubjectIcon name={subject.name} slug={subject.slug} className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{subject.name}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1 text-[10px] text-[#68748A] pt-1.5 mt-auto border-t border-black/5 font-tabular font-medium whitespace-nowrap min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 opacity-70 shrink-0" />
            <span className="font-semibold">{startStr} - {endStr}</span>
          </div>
          <span className="opacity-75 shrink-0 font-normal">({duration}m)</span>
        </div>
      )}
    </div>
  );
}

