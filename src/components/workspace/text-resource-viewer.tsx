"use client";

import React, { useState, useEffect } from "react";
import { AcademicResource } from "@/types/database";
import {
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TextResourceViewerProps {
  resource: AcademicResource;
  onClose: () => void;
}

export function TextResourceViewer({ resource, onClose }: TextResourceViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isMarkdown =
    resource.mime_type === "text/markdown" ||
    resource.original_filename?.toLowerCase().endsWith(".md") ||
    resource.original_filename?.toLowerCase().endsWith(".markdown");

  const downloadUrl = `/api/download/${resource.id}`;

  useEffect(() => {
    let active = true;

    async function fetchTextContent() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(downloadUrl);
        if (!res.ok) {
          throw new Error(`Impossible de charger le contenu (${res.statusText})`);
        }

        const text = await res.text();
        if (active) {
          setContent(text);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Erreur lors de la lecture du fichier texte.");
          setLoading(false);
        }
      }
    }

    fetchTextContent();

    return () => {
      active = false;
    };
  }, [downloadUrl]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const lineCount = content ? content.split("\n").length : 0;
  const wordCount = content ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div
        className={`bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? "w-full h-full rounded-none"
            : "w-full max-w-4xl max-h-[90vh] h-[750px]"
        }`}
      >
        {/* Header */}
        <div className="bg-[#FAFBFD] px-5 py-3.5 border-b border-[#E4E8F0] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-[#4F46E5] flex items-center justify-center shrink-0">
              {isMarkdown ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-[#111A2E] truncate leading-tight">
                {resource.title}
              </h3>
              <div className="flex items-center space-x-2 text-[11px] text-[#68748A] font-mono mt-0.5">
                <span>{resource.original_filename}</span>
                <span>•</span>
                <span>{lineCount} lignes</span>
                <span>•</span>
                <span>{wordCount} mots</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !content}
              className="text-xs font-semibold text-[#182235] hover:text-[#2855D9] bg-white border border-[#E4E8F0] px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              title="Copier le contenu"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#68748A]" />
                  <span className="hidden sm:inline">Copier</span>
                </>
              )}
            </button>

            <a
              href={downloadUrl}
              download={resource.original_filename}
              className="text-xs font-semibold text-[#182235] hover:text-[#2855D9] bg-white border border-[#E4E8F0] px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Télécharger le fichier source"
            >
              <Download className="w-3.5 h-3.5 text-[#68748A]" />
              <span className="hidden sm:inline">Télécharger</span>
            </a>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[#68748A] hover:text-[#111A2E] rounded-lg hover:bg-[#F4F6FA] cursor-pointer"
              title={isFullscreen ? "Réduire" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#68748A] hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-5 sm:p-7 bg-[#FAFAF7]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-[#68748A]">
              <Loader2 className="w-7 h-7 animate-spin text-[#2855D9]" />
              <span className="text-xs">Chargement du document texte...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-center max-w-sm mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div className="text-xs text-[#182235] font-semibold">{error}</div>
              <a
                href={downloadUrl}
                className="text-xs text-[#2855D9] hover:underline flex items-center space-x-1 font-medium"
              >
                <span>Télécharger directement pour ouvrir localement</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : isMarkdown ? (
            <div className="max-w-3xl mx-auto bg-white border border-[#E4E8F0] rounded-xl p-6 shadow-2xs prose prose-slate prose-sm max-w-none text-[#182235] leading-relaxed whitespace-pre-wrap font-sans">
              {content}
            </div>
          ) : (
            <pre className="max-w-4xl mx-auto bg-white border border-[#E4E8F0] rounded-xl p-5 shadow-2xs font-mono text-xs text-[#182235] whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
