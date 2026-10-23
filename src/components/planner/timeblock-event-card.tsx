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
  onResizeStart?: (e: React.PointerEvent, block: CalendarTimeblock, edge: "top" | "bottom") => void;
  isDragging?: boolean;
  isResizing?: boolean;
  isCompact?: boolean;
  isNearTop?: boolean;
  isParallel?: boolean;
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
  onResizeStart,
  isDragging = false,
  isResizing = false,
  isCompact = false,
  isNearTop = false,
  isParallel = false,
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
        draggable={!isResizing}
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
          "group relative h-full w-full rounded-xl px-2 py-1 text-xs border transition-all cursor-grab active:cursor-grabbing select-none flex items-center justify-between gap-1.5 overflow-visible shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
          isDragging && "opacity-40 ring-2 ring-[#2855D9] scale-95 shadow-xl",
          isResizing && "ring-2 ring-[#2855D9] shadow-lg cursor-ns-resize",
          isCompleted
            ? "bg-[#FAFAF7]/90 text-[#68748A] border-[#E4E8F0] opacity-75 backdrop-blur-xs"
            : cn(theme.cardBg, theme.cardBorder, theme.cardGlow),
          className
        )}
        title={`${block.title} (${startStr} - ${endStr}) • Glisser pour déplacer ou étirer`}
      >
        {/* Upper Resize Handle */}
        {onResizeStart && (
          <div
            role="separator"
            aria-label="Ajuster l'heure de début"
            title="Glisser pour ajuster le début (15m)"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, block, "top");
            }}
            className="absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-40 group/top-handle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          >
            <div className="w-6 h-1 rounded-full bg-[#2855D9]/50 group-hover/top-handle:bg-[#2855D9] group-hover/top-handle:h-1.5 transition-all shadow-xs" />
          </div>
        )}

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: theme.dotColor }}
          />
          {/* Isolated Completion Checkbox */}
          <div className="relative z-30 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(block);
              }}
              className={cn("p-0.5 -m-0.5 text-[#68748A] hover:text-[#059669] shrink-0 transition-colors cursor-pointer", theme.checkboxStroke)}
              title={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
              aria-label={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
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

        {/* Lower Resize Handle */}
        {onResizeStart && (
          <div
            role="separator"
            aria-label="Ajuster l'heure de fin"
            title="Glisser pour ajuster la fin (15m)"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, block, "bottom");
            }}
            className="absolute -bottom-1.5 left-2 right-2 h-3 cursor-ns-resize z-40 group/bottom-handle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          >
            <div className="w-6 h-1 rounded-full bg-[#2855D9]/50 group-hover/bottom-handle:bg-[#2855D9] group-hover/bottom-handle:h-1.5 transition-all shadow-xs" />
          </div>
        )}

        {/* Full Description Hover Card */}
        {displayNotes && (
          <div
            className={cn(
              "pointer-events-none absolute left-0 right-0 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-150",
              isNearTop ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
            )}
          >
            <div className="bg-[#0F172A]/95 text-white backdrop-blur-xl border border-white/20 rounded-xl p-2.5 shadow-2xl text-xs space-y-1 max-w-[260px] w-full">
              <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">📝 Note complète</span>
                <span className="text-[10px] text-white/60 font-tabular">{startStr} - {endStr}</span>
              </div>
              <p className="text-[11px] text-slate-100 whitespace-pre-wrap leading-relaxed break-words font-normal max-h-36 overflow-y-auto">
                {displayNotes}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard multi-hour or normal block layout with Glassmorphism Pro
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!isResizing}
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
        "group relative h-full w-full rounded-xl text-xs border transition-all cursor-grab active:cursor-grabbing select-none flex flex-col justify-between overflow-visible",
        isParallel
          ? "p-1.5 ring-1 ring-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-md"
          : "p-2 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]",
        isDragging && "opacity-40 ring-2 ring-[#2855D9] scale-95 shadow-xl",
        isResizing && "ring-2 ring-[#2855D9] shadow-lg cursor-ns-resize",
        isCompleted
          ? "bg-[#FAFAF7]/90 text-[#68748A] border-[#E4E8F0] opacity-80 backdrop-blur-xs"
          : cn(theme.cardBg, theme.cardBorder, theme.cardGlow),
        className
      )}
      title={`${block.title} (${startStr} - ${endStr}) • Glisser pour déplacer ou étirer`}
    >
      {/* Upper Resize Handle (Top Bar) */}
      {onResizeStart && (
        <div
          role="separator"
          aria-label="Ajuster l'heure de début"
          title="Glisser pour ajuster le début (par paliers de 15 min)"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, block, "top");
          }}
          className="absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-40 group/top-handle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <div className="w-8 h-1 rounded-full bg-[#2855D9]/50 group-hover/top-handle:bg-[#2855D9] group-hover/top-handle:h-1.5 transition-all shadow-xs" />
        </div>
      )}

      {/* Top row: Luminous Accent Bar, Checkbox & Prominent Title */}
      <div className="min-w-0 w-full">
        <div className="flex items-start gap-1 w-full min-w-0 pr-0.5">
          {/* Luminous left accent glow pill */}
          {!isCompleted && (
            <div
              className={cn(
                "rounded-full shrink-0 my-0.5",
                isParallel ? "w-0.5 self-stretch" : "w-1 self-stretch",
                theme.accentBar
              )}
            />
          )}

          {/* ISOLATED CLICKABLE CHECKBOX: High z-index (z-30) ensures completion is always immediately clickable */}
          <div className="relative z-30 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(block);
              }}
              className={cn(
                "p-0.5 -m-0.5 text-[#68748A] hover:text-[#059669] shrink-0 transition-all cursor-pointer rounded-full hover:bg-emerald-50 active:scale-90",
                theme.checkboxStroke
              )}
              title={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
              aria-label={isCompleted ? "Marquer non terminé" : "Marquer terminé"}
            >
              {isCompleted ? (
                <CheckCircle2
                  className={cn(
                    "text-[#059669] fill-[#059669]/15",
                    isParallel ? "w-3.5 h-3.5" : "w-4 h-4"
                  )}
                />
              ) : (
                <Circle
                  className={cn(
                    "hover:stroke-[#059669]",
                    isParallel ? "w-3.5 h-3.5" : "w-4 h-4"
                  )}
                />
              )}
            </button>
          </div>

          <h4
            className={cn(
              "font-bold text-xs leading-snug flex-1 min-w-0 pr-0.5",
              isParallel ? "truncate whitespace-nowrap" : "line-clamp-2 break-normal",
              isCompleted ? "line-through text-[#68748A]" : theme.titleText
            )}
          >
            {block.title || "Séance"}
          </h4>
        </div>

        {/* Dedicated Subject & Linked Task Badges (for blocks >= 55 min) */}
        {duration >= 55 && (subject || linkedTask) && (
          <div
            className={cn(
              "items-center gap-1 mt-1 min-w-0",
              isParallel ? "flex pl-1.5 overflow-hidden" : "flex flex-wrap pl-2.5"
            )}
          >
            {subject && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[9.5px] border shadow-2xs max-w-full min-w-0 truncate",
                  theme.badgeBg,
                  theme.badgeText,
                  theme.badgeBorder
                )}
                title={subject.name}
              >
                <SubjectIcon name={subject.name} slug={subject.slug} className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate max-w-[85px]">{subject.name}</span>
              </span>
            )}

            {linkedTask && (
              <span
                className={cn(
                  "items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/70 border border-black/5 text-[9px] font-medium max-w-[110px] truncate shadow-2xs",
                  isParallel ? "hidden group-hover:inline-flex" : "inline-flex"
                )}
                title={`Lié à la tâche: ${linkedTask.title}`}
              >
                <CheckSquare className="w-2.5 h-2.5 text-[#2855D9] shrink-0" />
                <span className="truncate">{linkedTask.title}</span>
              </span>
            )}
          </div>
        )}

        {/* Floating Hover Glass Action Overlay: compact icon-only & constrained so it NEVER covers the left checkbox */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-black/10 shadow-md z-20 transition-all",
            isParallel ? "max-w-[calc(100%-28px)] scale-90 origin-top-right" : "max-w-[calc(100%-38px)]"
          )}
        >
          <FocusTriggerButton
            title={block.title}
            estimatedMinutes={duration}
            taskId={block.task_id || undefined}
            size="sm"
            compact={true}
          />
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(block);
              }}
              className="p-1 text-[#68748A] hover:text-[#2855D9] rounded-md hover:bg-[#F4F6FA] transition-colors"
              title="Dupliquer la séance (+1 j)"
              aria-label="Dupliquer la séance"
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
              className="p-1 text-[#68748A] hover:text-[#DC2626] rounded-md hover:bg-[#F4F6FA] transition-colors"
              title="Supprimer la séance"
              aria-label="Supprimer la séance"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Notes Preview inside card (for blocks >= 65 min) */}
        {displayNotes && duration >= 65 && !isParallel && (
          <p className="text-[11px] text-[#475569] line-clamp-2 mt-1 pl-2 italic border-l-2 border-current/30 ml-2.5">
            {displayNotes}
          </p>
        )}
      </div>

      {/* Full Description Hover Card with Glassmorphism Pro */}
      {displayNotes && (
        <div
          className={cn(
            "pointer-events-none absolute left-0 right-0 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-150",
            isNearTop ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
          )}
        >
          <div className="bg-[#0F172A]/95 text-white backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 max-w-[280px] w-full">
            <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">📝 Note & Description</span>
              <span className="text-[10px] text-white/60 font-tabular">{startStr} - {endStr}</span>
            </div>
            <p className="text-[11px] text-slate-100 whitespace-pre-wrap leading-relaxed break-words font-normal max-h-48 overflow-y-auto [scrollbar-width:thin]">
              {displayNotes}
            </p>
            {linkedTask && (
              <div className="pt-1 border-t border-white/10 text-[10px] text-emerald-300 flex items-center gap-1">
                <CheckSquare className="w-3 h-3 shrink-0" />
                <span className="truncate">Tâche: {linkedTask.title}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom row: Time badge & Subject indicator if short */}
      {duration < 55 ? (
        <div className="flex items-center justify-between gap-1 text-[10px] text-[#68748A] pt-1 mt-auto border-t border-black/5 font-tabular font-medium min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 shrink-0 min-w-0">
            <Clock className="w-2.5 h-2.5 opacity-70 shrink-0" />
            <span className="font-semibold truncate text-[9.5px]">{startStr}</span>
          </div>
          {subject && !isParallel && (
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
        <div className="flex items-center justify-between gap-1 text-[10px] text-[#68748A] pt-1 mt-auto border-t border-black/5 font-tabular font-medium min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 shrink-0 min-w-0">
            <Clock className="w-2.5 h-2.5 opacity-70 shrink-0" />
            <span className="font-semibold truncate text-[9.5px]">
              {startStr} - {endStr}
            </span>
          </div>
          <span
            className={cn(
              "opacity-75 font-normal shrink-0 text-[9px]",
              isParallel ? "hidden group-hover:inline" : ""
            )}
          >
            ({duration}m)
          </span>
        </div>
      )}

      {/* Lower Resize Handle (Bottom Bar) */}
      {onResizeStart && (
        <div
          role="separator"
          aria-label="Ajuster l'heure de fin"
          title="Glisser pour ajuster la fin (par paliers de 15 min)"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, block, "bottom");
          }}
          className="absolute -bottom-1.5 left-3 right-3 h-3 cursor-ns-resize z-40 group/bottom-handle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <div className="w-8 h-1 rounded-full bg-[#2855D9]/50 group-hover/bottom-handle:bg-[#2855D9] group-hover/bottom-handle:h-1.5 transition-all shadow-xs" />
        </div>
      )}
    </div>
  );
}

