"use client";

import React, { useState } from "react";
import { AcademicResource } from "@/types/database";
import {
  ExternalLink,
  HardDrive,
  Globe,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  FileText,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalLinkViewerProps {
  resource: AcademicResource;
}

export function ExternalLinkViewer({ resource }: ExternalLinkViewerProps) {
  const [copied, setCopied] = useState(false);

  const targetUrl = resource.external_url || resource.storage_path;
  const isGoogleDrive =
    resource.mime_type === "application/vnd.google-apps" ||
    resource.tags?.includes("gdrive") ||
    targetUrl.includes("drive.google.com");
  const isGithub =
    resource.tags?.includes("github") || targetUrl.includes("github.com");

  // Format Google Drive embed URL if it is a view link
  let embedUrl: string | null = null;
  if (isGoogleDrive && targetUrl.includes("/file/d/")) {
    const fileIdMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-white border border-[#E4E8F0] rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[600px]">
      {/* Top Bar */}
      <div className="bg-[#FAFBFD] px-6 py-4 border-b border-[#E4E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            {isGoogleDrive ? (
              <HardDrive className="w-5 h-5 text-emerald-600" />
            ) : isGithub ? (
              <Globe className="w-5 h-5 text-indigo-600" />
            ) : (
              <ExternalLink className="w-5 h-5 text-[#2855D9]" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {isGoogleDrive ? "Google Drive" : isGithub ? "GitHub" : "Lien Web"}
              </span>
              <span className="text-[11px] text-[#68748A]">
                Ressource hébergée en externe
              </span>
            </div>
            <h2 className="text-base font-bold text-[#111A2E] mt-0.5">
              {resource.title}
            </h2>
          </div>
        </div>

        {/* Primary Redirect Action */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="text-xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                <span>Lien copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                <span>Copier l'URL</span>
              </>
            )}
          </Button>

          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button
              size="sm"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {isGoogleDrive
                  ? "Rediriger vers Google Drive"
                  : "Rediriger vers le lien"}
              </span>
            </Button>
          </a>
        </div>
      </div>

      {/* Main Body: Embedded Preview or Redirect Card */}
      <div className="p-6 flex-1 flex flex-col justify-center items-center">
        {embedUrl ? (
          <div className="w-full h-[650px] rounded-xl overflow-hidden border border-[#E4E8F0] shadow-2xs">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="autoplay"
              title={resource.title}
            />
          </div>
        ) : (
          <div className="max-w-xl w-full text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              {isGoogleDrive ? (
                <HardDrive className="w-8 h-8" />
              ) : (
                <ExternalLink className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#111A2E]">
                Accéder au document externe
              </h3>
              <p className="text-xs text-[#68748A] max-w-md mx-auto leading-relaxed">
                Ce document est hébergé en externe sur{" "}
                <strong className="text-[#111A2E]">
                  {isGoogleDrive ? "Google Drive" : "le Web"}
                </strong>
                . Aucun fichier n'est téléchargé sur le serveur, garantissant un
                accès direct et permanent aux dernières versions.
              </p>
            </div>

            {/* URL Display Box */}
            <div className="bg-[#FAFBFD] border border-[#E4E8F0] rounded-xl p-3 flex items-center justify-between text-xs font-mono text-[#182235] max-w-lg mx-auto">
              <span className="truncate flex-1 text-left mr-2 text-[#2855D9]">
                {targetUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[#68748A] hover:text-[#111A2E] p-1 rounded-md cursor-pointer shrink-0"
                title="Copier le lien"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Big Action CTA */}
            <div>
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button
                  size="md"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-2.5 cursor-pointer shadow-md"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <span>
                    {isGoogleDrive
                      ? "Ouvrir dans Google Drive"
                      : "Rediriger vers le site web"}
                  </span>
                </Button>
              </a>
            </div>

            {/* Permission Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left text-xs text-amber-800 flex items-start space-x-2.5 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">Autorisations d'accès :</span>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  L'accès à ce document Google Drive dépend des autorisations
                  configurées par son auteur (accès public ou réservé aux
                  comptes universitaires autorisés).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
