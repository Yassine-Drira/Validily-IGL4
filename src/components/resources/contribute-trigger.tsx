"use client";

import React, { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Subject, ResourceCategory, SubjectFolder } from "@/types/database";
import { ContributeResourceModal } from "@/components/resources/contribute-resource-modal";

interface ContributeTriggerProps {
  subjects: Subject[];
  categories: ResourceCategory[];
  folders?: SubjectFolder[];
  defaultSubjectId?: string;
  defaultFolderId?: string | null;
  label?: string;
  variant?: "primary" | "outline" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showSparkle?: boolean;
}

export function ContributeTrigger({
  subjects,
  categories,
  folders = [],
  defaultSubjectId,
  defaultFolderId,
  label = "Contribuer une ressource",
  variant = "primary",
  size = "md",
  className,
  showSparkle = false,
}: ContributeTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {showSparkle ? (
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        <span>{label}</span>
      </Button>

      <ContributeResourceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        subjects={subjects}
        categories={categories}
        folders={folders}
        defaultSubjectId={defaultSubjectId}
        defaultFolderId={defaultFolderId}
      />
    </>
  );
}
