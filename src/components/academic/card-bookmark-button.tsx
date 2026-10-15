"use client";

import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { toggleBookmark } from "@/lib/actions/resource-actions";

interface CardBookmarkButtonProps {
  resourceId: string;
  initialBookmarked?: boolean;
}

export function CardBookmarkButton({
  resourceId,
  initialBookmarked = false,
}: CardBookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialBookmarked);
  const [loading, setLoading] = useState<boolean>(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      const res = await toggleBookmark(resourceId);
      if (res?.error) {
        setIsBookmarked(prev);
      } else if (res?.bookmarked !== undefined) {
        setIsBookmarked(res.bookmarked);
      }
    } catch {
      setIsBookmarked(prev);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`p-1.5 rounded transition-colors cursor-pointer ${
        isBookmarked
          ? "text-amber-500 hover:text-amber-600 bg-amber-50"
          : "text-[#68748A] hover:text-[#2855D9] hover:bg-[#EDF2FF]"
      }`}
      title={isBookmarked ? "Remove bookmark" : "Save to bookmarks"}
      aria-label={isBookmarked ? "Remove bookmark" : "Save to bookmarks"}
    >
      <Bookmark
        className={`w-4 h-4 ${isBookmarked ? "fill-amber-500" : ""}`}
      />
    </button>
  );
}
