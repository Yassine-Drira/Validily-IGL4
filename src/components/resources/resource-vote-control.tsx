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
  onVoteChange?: (newScore: number, userVote: ResourceVoteValue, upvotes?: number, downvotes?: number) => void;
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

  // Sync state whenever props update from server actions / revalidations
  React.useEffect(() => {
    setScore(initialScore);
    setUserVote(initialUserVote);
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialScore, initialUserVote, initialUpvotes, initialDownvotes]);

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
    onVoteChange?.(optimisticScore, nextVote, optimisticUp, optimisticDown);

    startTransition(async () => {
      try {
        const res = await voteResourceAction({ resourceId, value: nextVote });
        if (res.success) {
          setScore(res.score);
          setUserVote(res.userVote);
          setUpvotes(res.upvotes);
          setDownvotes(res.downvotes);
          onVoteChange?.(res.score, res.userVote, res.upvotes, res.downvotes);
        } else {
          // Revert on failure
          setScore(prevScore);
          setUserVote(prevVote);
          setUpvotes(prevUp);
          setDownvotes(prevDown);
          setFeedback(res.error || "Erreur lors du vote.");
          onVoteChange?.(prevScore, prevVote, prevUp, prevDown);
          setTimeout(() => setFeedback(null), 3000);
        }
      } catch {
        setScore(prevScore);
        setUserVote(prevVote);
        setUpvotes(prevUp);
        setDownvotes(prevDown);
        setFeedback("Erreur de connexion.");
        onVoteChange?.(prevScore, prevVote, prevUp, prevDown);
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
          ? "flex-col space-y-1 bg-[#FAFBFD] p-1 rounded-xl border border-[#E4E8F0] shadow-2xs"
          : "flex-row items-center bg-[#FAFBFD] p-0.5 rounded-full border border-[#E4E8F0] shadow-2xs gap-0.5",
        className
      )}
      role="group"
      aria-label="Évaluation de l'utilité du document"
    >
      {/* Upvote Button with count */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(1);
        }}
        disabled={isPending}
        className={cn(
          "transition-all cursor-pointer rounded-full flex items-center justify-center space-x-1 focus:outline-hidden",
          size === "sm" ? "px-1.5 py-0.5 h-6 min-w-[28px]" : "px-2 py-1 h-7 min-w-[34px]",
          isUpvoted
            ? "bg-[#2855D9] text-white font-bold shadow-xs hover:bg-[#1f44b3]"
            : "text-[#55647e] hover:text-[#2855D9] hover:bg-white/90"
        )}
        title={`Utile : ${upvotes} vote${upvotes > 1 ? "s" : ""}`}
        aria-label="Voter pour la pertinence de cette ressource"
        aria-pressed={isUpvoted}
      >
        <ChevronUp className={cn(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4", isUpvoted ? "stroke-[2.5]" : "stroke-2")} />
        <span className={cn("font-mono font-bold leading-none", size === "sm" ? "text-[11px]" : "text-xs")}>
          {upvotes}
        </span>
      </button>

      {/* Middle indicator: Score in vertical mode or clean dot/loader in horizontal mode */}
      {orientation === "vertical" ? (
        <div
          className={cn(
            "font-mono font-bold text-center tracking-tight transition-colors px-1",
            size === "sm" ? "text-[11px]" : "text-xs",
            score > 0
              ? "text-[#2855D9]"
              : score < 0
              ? "text-rose-600"
              : "text-[#68748A]"
          )}
          title={`Score net : ${scoreFormatted} (${upvotes} utiles • ${downvotes} non-utiles)`}
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin mx-auto text-[#68748A]" />
          ) : (
            scoreFormatted
          )}
        </div>
      ) : isPending ? (
        <div className="px-0.5 flex items-center justify-center">
          <Loader2 className="w-3 h-3 animate-spin text-[#68748A]" />
        </div>
      ) : (
        <span
          className="text-[#CBD5E1] text-[10px] select-none mx-0.5"
          title={`Score net : ${scoreFormatted}`}
        >
          •
        </span>
      )}

      {/* Downvote Button with count */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(-1);
        }}
        disabled={isPending}
        className={cn(
          "transition-all cursor-pointer rounded-full flex items-center justify-center space-x-1 focus:outline-hidden",
          size === "sm" ? "px-1.5 py-0.5 h-6 min-w-[28px]" : "px-2 py-1 h-7 min-w-[34px]",
          isDownvoted
            ? "bg-rose-600 text-white font-bold shadow-xs hover:bg-rose-700"
            : "text-[#55647e] hover:text-rose-600 hover:bg-white/90"
        )}
        title={`Peu utile : ${downvotes} vote${downvotes > 1 ? "s" : ""}`}
        aria-label="Signaler comme peu pertinent"
        aria-pressed={isDownvoted}
      >
        <ChevronDown className={cn(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4", isDownvoted ? "stroke-[2.5]" : "stroke-2")} />
        <span className={cn("font-mono font-bold leading-none", size === "sm" ? "text-[11px]" : "text-xs")}>
          {downvotes}
        </span>
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
