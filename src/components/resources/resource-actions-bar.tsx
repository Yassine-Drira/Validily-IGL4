"use client";

import React, { useState } from "react";
import { Bookmark, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmark, updateRevisionStatus } from "@/lib/actions/resource-actions";
import { RevisionStatus } from "@/types/database";

interface ResourceActionsBarProps {
  resourceId: string;
  initialBookmarked?: boolean;
  initialStatus?: RevisionStatus;
  downloadUrl: string;
  filename: string;
}

export function ResourceActionsBar({
  resourceId,
  initialBookmarked = false,
  initialStatus = "not_started",
  downloadUrl,
  filename,
}: ResourceActionsBarProps) {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialBookmarked);
  const [status, setStatus] = useState<RevisionStatus>(initialStatus);
  const [loadingBookmark, setLoadingBookmark] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  const handleBookmarkToggle = async () => {
    setLoadingBookmark(true);
    // Optimistic update
    const previous = isBookmarked;
    setIsBookmarked(!previous);

    try {
      const res = await toggleBookmark(resourceId);
      if (res.error) {
        setIsBookmarked(previous);
      } else if (res.bookmarked !== undefined) {
        setIsBookmarked(res.bookmarked);
      }
    } catch {
      setIsBookmarked(previous);
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleStatusChange = async (newStatus: RevisionStatus) => {
    setLoadingStatus(true);
    const previous = status;
    setStatus(newStatus);

    try {
      const res = await updateRevisionStatus(resourceId, newStatus);
      if (res.error) {
        setStatus(previous);
      }
    } catch {
      setStatus(previous);
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      {/* Bookmark Button */}
      <button
        type="button"
        onClick={handleBookmarkToggle}
        disabled={loadingBookmark}
        className={`p-2 border rounded-md transition-colors flex items-center space-x-1.5 text-xs font-medium cursor-pointer ${
          isBookmarked
            ? "bg-amber-50 border-amber-300 text-amber-800"
            : "bg-white border-[#E4E8F0] text-[#68748A] hover:bg-[#F4F6FA] hover:text-[#182235]"
        }`}
        title={isBookmarked ? "Remove Bookmark" : "Save to Revision Bookmarks"}
      >
        <Bookmark
          className={`w-4 h-4 ${
            isBookmarked ? "fill-amber-500 text-amber-600" : ""
          }`}
        />
        <span>{isBookmarked ? "Saved" : "Bookmark"}</span>
      </button>

      {/* Revision Status Selector */}
      <div className="relative inline-flex items-center">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as RevisionStatus)}
          disabled={loadingStatus}
          className={`appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-md border transition-colors cursor-pointer focus:outline-none ${
            status === "revised"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : status === "in_progress"
              ? "bg-[#EDF2FF] border-[#2855D9]/20 text-[#2855D9]"
              : "bg-white border-[#E4E8F0] text-[#182235] hover:bg-[#F4F6FA]"
          }`}
        >
          <option value="not_started">⚪ Not Started</option>
          <option value="in_progress">🟡 In Progress</option>
          <option value="revised">🟢 Revised</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-[#68748A]" />
      </div>

      {/* Download Action */}
      <a href={downloadUrl} download={filename}>
        <Button size="sm" variant="primary">
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </Button>
      </a>
    </div>
  );
}
