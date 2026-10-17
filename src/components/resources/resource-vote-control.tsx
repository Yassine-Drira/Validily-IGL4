"use client";

import React, { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResourceVoteValue } from "@/types/database";
import { voteResourceAction } from "@/lib/actions/vote-actions";

interface ResourceVoteControlProps {
  resourceId: string;
  initialScore?: number;
  initialUserVote?: ResourceVoteValue;
  initialUpvotes?: number;
  initialDownvotes?: number;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md";
  className?: string;
  onVoteChange?: (newScore: number, userVote: ResourceVoteValue) => void;
}

export function ResourceVoteControl({
  resourceId,
  initialScore = 0,
  initialUserVote = 0,
  initialUpvotes = 0,
  initialDownvotes = 0,
  orientation = "horizontal",
  size = "sm",
  className = "",
  onVoteChange,
}: ResourceVoteControlProps) {
  const [score, setScore] = useState<number>(initialScore);
  const [userVote, setUserVote] = useState<ResourceVoteValue>(initialUserVote);
  const [upvotes, setUpvotes] = useState<number>(initialUpvotes);
  const [downvotes, setDownvotes] = useState<number>(initialDownvotes);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleVote = (targetVote: 1 | -1) => {
    if (isPending) return;

    // Determine intended vote (toggle off if clicked active direction)
    const nextVote: ResourceVoteValue = userVote === targetVote ? 0 : targetVote;

    // Snapshot previous state for rollback
    const prevScore = score;
    const prevVote = userVote;
    const prevUp = upvotes;
    const prevDown = downvotes;

    // Optimistic calculation
    let optimisticScore = prevScore;
    let optimisticUp = prevUp;
    let optimisticDown = prevDown;

    // Remove old vote impact
    if (prevVote === 1) {
      optimisticUp = Math.max(0, optimisticUp - 1);
      optimisticScore -= 1;
    } else if (prevVote === -1) {
      optimisticDown = Math.max(0, optimisticDown - 1);
      optimisticScore += 1;
    }

    // Apply new vote impact
    if (nextVote === 1) {
      optimisticUp += 1;
      optimisticScore += 1;
    } else if (nextVote === -1) {
      optimisticDown += 1;
      optimisticScore -= 1;
    }

    setScore(optimisticScore);
    setUserVote(nextVote);
    setUpvotes(optimisticUp);
    setDownvotes(optimisticDown);
    setFeedback(null);
    onVoteChange?.(optimisticScore, nextVote);

    startTransition(async () => {
      try {
        const res = await voteResourceAction({ resourceId, value: nextVote });
        if (res.success) {
          setScore(res.score);
          setUserVote(res.userVote);
          setUpvotes(res.upvotes);
          setDownvotes(res.downvotes);
          onVoteChange?.(res.score, res.userVote);
        } else {
          // Revert on failure
          setScore(prevScore);
          setUserVote(prevVote);
          setUpvotes(prevUp);
          setDownvotes(prevDown);
          setFeedback(res.error || "Erreur lors du vote.");
          onVoteChange?.(prevScore, prevVote);
          setTimeout(() => setFeedback(null), 3000);
        }
      } catch (err: any) {
        setScore(prevScore);
        setUserVote(prevVote);
        setUpvotes(prevUp);
        setDownvotes(prevDown);
        setFeedback("Erreur de connexion.");
        onVoteChange?.(prevScore, prevVote);
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  const scoreFormatted = score > 0 ? `+${score}` : `${score}`;

  return (
    <div
      className={cn(
        "relative inline-flex items-center select-none font-sans group/vote",
        orientation === "vertical"
          ? "flex-col space-y-0.5 bg-[#FAFBFD] p-1 rounded-xl border border-[#E4E8F0]"
          : "flex-row space-x-1 bg-[#FAFBFD] px-2 py-0.5 rounded-full border border-[#E4E8F0]",
        className
      )}
      role="group"
      aria-label="Évaluation de l'utilité du document"
    >
      {/* Upvote Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(1);
        }}
        disabled={isPending}
        className={cn(
          "transition-all cursor-pointer rounded-md flex items-center justify-center focus:outline-hidden focus:ring-1 focus:ring-[#2855D9]",
          size === "sm" ? "p-1 w-6 h-6" : "p-1.5 w-7 h-7",
          isUpvoted
            ? "bg-[#2855D9]/10 text-[#2855D9] font-bold shadow-2xs"
            : "text-[#68748A] hover:text-[#2855D9] hover:bg-white"
        )}
        title="Utile (+1)"
        aria-label="Voter pour la pertinence de cette ressource"
        aria-pressed={isUpvoted}
      >
        <ChevronUp className={cn(size === "sm" ? "w-4 h-4" : "w-5 h-5", isUpvoted && "stroke-[2.5]")} />
      </button>

      {/* Score Badge */}
      <div
        className={cn(
          "font-mono font-bold text-center tracking-tight transition-colors px-1",
          size === "sm" ? "text-xs" : "text-sm",
          score > 0
            ? "text-[#2855D9]"
            : score < 0
            ? "text-rose-600"
            : "text-[#68748A]"
        )}
        title={`Score d'utilité : ${score} (${upvotes} utiles • ${downvotes} non-utiles)`}
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin mx-auto text-[#68748A]" />
        ) : (
          scoreFormatted
        )}
      </div>

      {/* Downvote Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(-1);
        }}
        disabled={isPending}
        className={cn(
          "transition-all cursor-pointer rounded-md flex items-center justify-center focus:outline-hidden focus:ring-1 focus:ring-rose-500",
          size === "sm" ? "p-1 w-6 h-6" : "p-1.5 w-7 h-7",
          isDownvoted
            ? "bg-rose-50 text-rose-600 font-bold shadow-2xs"
            : "text-[#68748A] hover:text-rose-600 hover:bg-white"
        )}
        title="Peu utile (-1)"
        aria-label="Signaler comme peu pertinent"
        aria-pressed={isDownvoted}
      >
        <ChevronDown className={cn(size === "sm" ? "w-4 h-4" : "w-5 h-5", isDownvoted && "stroke-[2.5]")} />
      </button>

      {/* Error Feedback Tooltip Popover */}
      {feedback && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#111A2E] text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95 pointer-events-none">
          {feedback}
        </div>
      )}
    </div>
  );
}
