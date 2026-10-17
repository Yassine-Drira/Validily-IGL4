"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Download, ChevronDown, ExternalLink, Trash2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmark, updateRevisionStatus, deleteResource } from "@/lib/actions/resource-actions";
import { RevisionStatus, ResourceVoteSummary } from "@/types/database";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { ResourceVoteControl } from "@/components/resources/resource-vote-control";

interface ResourceActionsBarProps {
  resourceId: string;
  title?: string;
  initialBookmarked?: boolean;
  initialStatus?: RevisionStatus;
  initialVoteSummary?: ResourceVoteSummary;
  downloadUrl: string;
  filename: string;
  isExternal?: boolean;
  isGoogleDrive?: boolean;
  externalUrl?: string;
  subjectSlug?: string;
}

export function ResourceActionsBar({
  resourceId,
  title = "Ressource",
  initialBookmarked = false,
  initialStatus = "not_started",
  initialVoteSummary,
  downloadUrl,
  filename,
  isExternal = false,
  isGoogleDrive = false,
  externalUrl,
  subjectSlug,
}: ResourceActionsBarProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialBookmarked);
  const [status, setStatus] = useState<RevisionStatus>(initialStatus);
  const [loadingBookmark, setLoadingBookmark] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleBookmarkToggle = async () => {
    setLoadingBookmark(true);
    const previous = isBookmarked;
    setIsBookmarked(!previous);

    try {
      const res = await toggleBookmark(resourceId);
      if (res?.error) {
        setIsBookmarked(previous);
        if (
          res.error.toLowerCase().includes("authentification") ||
          res.error.toLowerCase().includes("connecté")
        ) {
          const next = typeof window !== "undefined" ? window.location.pathname : "/library";
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
      } else if (res?.bookmarked !== undefined) {
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
      if (res?.error) {
        setStatus(previous);
        if (
          res.error.toLowerCase().includes("authentification") ||
          res.error.toLowerCase().includes("connecté")
        ) {
          const next = typeof window !== "undefined" ? window.location.pathname : "/library";
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
      }
    } catch {
      setStatus(previous);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDelete = async () => {
    const res = await deleteResource(resourceId);
    if (res?.error) {
      if (
        res.error.toLowerCase().includes("authentification") ||
        res.error.toLowerCase().includes("connecté")
      ) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      throw new Error(res.error);
    }
    // Navigate back to subject hub or library
    if (subjectSlug) {
      router.push(`/subjects/${subjectSlug}`);
    } else {
      router.push("/subjects");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Useful Upvote/Downvote Control */}
        <ResourceVoteControl
          resourceId={resourceId}
          initialScore={initialVoteSummary?.score ?? 0}
          initialUpvotes={initialVoteSummary?.upvotes ?? 0}
          initialDownvotes={initialVoteSummary?.downvotes ?? 0}
          initialUserVote={initialVoteSummary?.userVote ?? 0}
          size="md"
        />

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
            className={`appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-md border transition-colors cursor-pointer focus:outline-hidden ${
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

        {/* External Link Redirect or File Download Action */}
        {isExternal ? (
          <a
            href={externalUrl || downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {isGoogleDrive ? "Ouvrir dans Google Drive" : "Rediriger vers le lien"}
              </span>
            </Button>
          </a>
        ) : (
          <a href={downloadUrl} download={filename}>
            <Button size="sm" variant="primary" className="cursor-pointer">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Download PDF</span>
            </Button>
          </a>
        )}

        {/* Delete Resource Action Button */}
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="p-2 border border-[#E4E8F0] hover:border-rose-300 hover:bg-rose-50 text-[#68748A] hover:text-rose-600 rounded-md transition-colors cursor-pointer"
          title="Supprimer la ressource"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Modern Deletion Confirmation Popup */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemName={title}
        itemType="resource"
        itemFormat={isGoogleDrive ? "Google Drive" : isExternal ? "Lien externe" : "Document PDF"}
      />
    </>
  );
}
