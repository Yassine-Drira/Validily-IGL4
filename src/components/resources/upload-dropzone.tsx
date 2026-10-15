"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { Subject, ResourceCategory } from "@/types/database";

interface UploadDropzoneProps {
  subjects: Subject[];
  categories: ResourceCategory[];
  defaultSubjectId?: string;
  onSuccess?: () => void;
}

export function UploadDropzone({
  subjects,
  categories,
  defaultSubjectId,
  onSuccess,
}: UploadDropzoneProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [instructor, setInstructor] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2024-2025");
  const [examSession, setExamSession] = useState<string>("");
  const [chapter, setChapter] = useState<string>("");
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitShared, setSubmitShared] = useState<boolean>(false);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg("");
    const isPdfMime = selectedFile.type === "application/pdf";
    const isPdfExt = selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdfMime && !isPdfExt) {
      setErrorMsg("Invalid file format. Only PDF (.pdf) files are supported.");
      return;
    }

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > MAX_SIZE) {
      setErrorMsg(
        `File size (${formatBytes(selectedFile.size)}) exceeds the 50MB limit.`
      );
      return;
    }

    setFile(selectedFile);
    if (!title) {
      // Auto-suggest title from filename
      const suggested = selectedFile.name
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ");
      setTitle(suggested);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const cleanTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select a PDF document to upload.");
      return;
    }
    if (!subjectId || !categoryId || !title.trim()) {
      setErrorMsg("Please fill in all mandatory fields marked with *.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subjectId", subjectId);
      formData.append("categoryId", categoryId);
      formData.append("title", title.trim());
      if (instructor.trim()) formData.append("instructor", instructor.trim());
      if (academicYear) formData.append("academicYear", academicYear);
      if (examSession) formData.append("examSession", examSession);
      if (chapter.trim()) formData.append("chapter", chapter.trim());
      if (submitShared) formData.append("submitShared", "on");

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to upload resource.");
      }

      setUploadSuccess(true);
      setTimeout(() => {
        const destination = data.redirectUrl || "/library";
        router.push(destination);
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-xl p-6 shadow-xs">
      {errorMsg && (
        <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="mb-5 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Document uploaded successfully! Updating library...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[#2855D9] bg-[#EDF2FF]"
              : file
              ? "border-emerald-400 bg-emerald-50/20"
              : "border-[#E4E8F0] hover:border-[#2855D9]/40 bg-[#FAFAF7]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FileText className="w-10 h-10 text-emerald-600 mb-2" />
              <div className="font-semibold text-xs text-stone-900 truncate max-w-sm">
                {file.name}
              </div>
              <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                {formatBytes(file.size)} • PDF Ready
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-2 text-xs text-rose-600 hover:underline"
              >
                Change File
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-[#68748A] mb-2" />
              <div className="font-semibold text-xs text-[#182235]">
                Drag and drop your PDF course material here, or{" "}
                <span className="text-[#2855D9] underline">browse</span>
              </div>
              <div className="text-[11px] text-[#68748A] font-mono mt-1">
                Strictly validated for PDF format • Max 50 MB
              </div>
            </div>
          )}
        </div>

        {/* Academic Hierarchy Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Subject Module *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] cursor-pointer"
            >
              <option value="" disabled>Select Module</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (Semester 1)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Resource Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] cursor-pointer"
            >
              <option value="" disabled>Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flutter Architecture & BLoC Pattern"
              required
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Instructor / Professor (Optional)
            </label>
            <input
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="e.g. Dr. Ben Ammar"
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2024-2025"
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Exam Session (Optional)
            </label>
            <select
              value={examSession}
              onChange={(e) => setExamSession(e.target.value)}
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9] cursor-pointer"
            >
              <option value="">None / Not Applicable</option>
              <option value="Principal">Principal Session</option>
              <option value="Rattrapage">Rattrapage (Resit)</option>
              <option value="DS">Continuous Assessment (DS)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#182235] mb-1">
              Chapter / Topic (Optional)
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Chapter 3: State"
              className="w-full bg-[#F4F6FA] border border-[#E4E8F0] rounded-md px-3 py-2 text-xs text-[#182235] focus:outline-none focus:border-[#2855D9]"
            />
          </div>
        </div>

        {/* Tag Input */}
        <div>
          <label className="block text-xs font-medium text-[#182235] mb-1">
            Tags (Press Enter or Comma to add)
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-[#F4F6FA] border border-[#E4E8F0] rounded-md min-h-[38px] items-center">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-white text-[#182235] border border-[#E4E8F0] text-xs px-2 py-0.5 rounded flex items-center space-x-1"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[#68748A] hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={tags.length === 0 ? "e.g. flutter, bloc, exam..." : ""}
              className="bg-transparent text-xs text-[#182235] focus:outline-none flex-1 min-w-[120px]"
            />
          </div>
        </div>

        {/* Visibility / Sharing Policy */}
        <div className="p-4 rounded-lg border border-[#E4E8F0] bg-[#FAFAF7] flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded bg-[#EDF2FF] border border-[#2855D9]/20 text-[#2855D9] shrink-0 mt-0.5">
              {submitShared ? (
                <Globe className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-[#182235]">
                {submitShared
                  ? "Submit for Class Library Review"
                  : "Keep as Personal Private Resource"}
              </div>
              <div className="text-[11px] text-[#68748A] mt-0.5 leading-relaxed">
                {submitShared
                  ? "Resource will be queued for review before publishing to all classmates."
                  : "Private to your account only. It will not be visible to other students."}
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={submitShared}
              onChange={(e) => setSubmitShared(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2855D9]"></div>
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <Button
            type="submit"
            size="md"
            variant="primary"
            disabled={isUploading || uploadSuccess}
          >
            {isUploading ? "Uploading Document..." : "Upload Resource"}
          </Button>
        </div>
      </form>
    </div>
  );
}
