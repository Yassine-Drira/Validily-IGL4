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
        if (
          res.error.toLowerCase().includes("authentification") ||
          res.error.toLowerCase().includes("connecté")
        ) {
          const next = typeof window !== "undefined" ? window.location.pathname : "/library";
          window.location.href = `/login?next=${encodeURIComponent(next)}`;
          return;
        }
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
      className={`min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
        isBookmarked
          ? "text-amber-500 hover:text-amber-600 bg-amber-50"
          : "text-[#68748A] hover:text-[#2855D9] hover:bg-[#EDF2FF]"
      }`}
      title={isBookmarked ? "Supprimer des favoris" : "Ajouter aux favoris"}
      aria-label={isBookmarked ? "Supprimer des favoris" : "Ajouter aux favoris"}
    >
      <Bookmark
        className={`w-4 h-4 ${isBookmarked ? "fill-amber-500" : ""}`}
      />
    </button>
  );
}
