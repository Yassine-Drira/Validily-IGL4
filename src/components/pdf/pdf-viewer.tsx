"use client";

import React, { useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Download,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  url?: string;
  filename: string;
  title: string;
  downloadUrl: string;
}

export function PdfViewer({
  url,
  filename,
  title,
  downloadUrl,
}: PdfViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detect mobile viewport or touch device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(isMobileUA || isSmallScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-md flex flex-col transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
          : "min-h-[550px] sm:min-h-[700px] h-[80vh] max-h-[850px]"
      }`}
    >
      {/* Reader Controls Toolbar */}
      <div className="bg-stone-950 text-stone-300 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between text-xs border-b border-stone-800 gap-2 select-none shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 font-mono text-stone-400 min-w-0">
            <FileText className="w-4 h-4 text-[#4776F2] shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-xs text-xs">{filename}</span>
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 shrink-0">
            PDF Reader
          </span>
        </div>

        {/* Center / Navigation Controls (hidden on very small mobile for cleaner bar) */}
        {!isMobile && (
          <div className="hidden sm:flex items-center space-x-1 bg-stone-900 px-2 py-1 rounded-md border border-stone-800">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="p-1 hover:text-white rounded disabled:opacity-40 cursor-pointer"
              disabled={page <= 1}
              title="Page précédente"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-tabular text-[11px] px-1 text-stone-300">
              Page {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="p-1 hover:text-white rounded cursor-pointer"
              title="Page suivante"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right Tools: Fullscreen Consultation, Zoom, Rotate, Download */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 ml-auto sm:ml-0">
          {/* Direct Fullscreen / Native View Link (Crucial for phones & fast reading) */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2855D9] hover:bg-[#1E42AC] text-white text-[11px] font-semibold transition-colors shadow-xs shrink-0"
              title="Ouvrir dans le lecteur natif (Plein écran sans téléchargement)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Plein Écran</span>
            </a>
          )}

          {!isMobile && (
            <>
              <div className="flex items-center space-x-1 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:text-white rounded transition-colors cursor-pointer"
                  title="Zoom Arrière"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="text-[11px] font-mono font-tabular px-1.5 hover:text-white cursor-pointer"
                  title="Réinitialiser Zoom (100%)"
                >
                  {zoom}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:text-white rounded transition-colors cursor-pointer"
                  title="Zoom Avant"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleRotate}
                className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition-colors cursor-pointer"
                title="Pivoter (90°)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition-colors cursor-pointer"
                title={isFullscreen ? "Quitter Plein Écran" : "Plein Écran"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}

          <a
            href={downloadUrl}
            download={filename}
            className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition-colors text-[#4776F2]"
            title="Télécharger le fichier PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Viewport Display Area */}
      <div className="flex-1 bg-[#182235] overflow-auto flex items-center justify-center p-2 sm:p-4 relative">
        {url && !loadError ? (
          <div
            className="transition-transform duration-150 origin-top flex flex-col items-center justify-center w-full h-full relative"
            style={{
              transform: isMobile ? "none" : `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          >
            {/* Mobile Native Reading Prompt Bar: Gives effortless 1-tap reading on phones */}
            {isMobile && (
              <div className="w-full bg-blue-950/80 backdrop-blur-md border border-blue-500/30 rounded-xl px-3 py-2 mb-2 flex items-center justify-between gap-2 shadow-lg shrink-0">
                <div className="flex items-center gap-1.5 min-w-0 text-white">
                  <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    Consultation mobile fluide
                  </span>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2855D9] hover:bg-[#1E42AC] text-white text-[11px] font-bold shadow-md shrink-0 active:scale-95"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lire en Plein Écran</span>
                </a>
              </div>
            )}

            {/* High-Compatibility Responsive Iframe for PDF rendering */}
            <iframe
              src={`${url}#toolbar=1&navpanes=0&scrollbar=1&page=${page}&view=FitH`}
              title={title}
              className="w-full h-full rounded-lg shadow-xl border border-stone-700 bg-white"
              onError={() => setLoadError(true)}
            />
          </div>
        ) : (
          /* Mobile-optimized & desktop fallback if direct embed is blocked */
          <div className="flex flex-col items-center justify-center p-6 text-center text-stone-300 max-w-md bg-stone-900/60 backdrop-blur-md rounded-2xl border border-stone-800 shadow-xl m-2">
            <BookOpen className="w-14 h-14 text-[#4776F2] mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-stone-100 mb-1">
              {title}
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-5 font-sans">
              Consultez ce document instantanément dans le lecteur natif de votre appareil, ou téléchargez-le pour vos révisions hors-ligne.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button size="md" variant="primary" className="w-full flex items-center justify-center gap-2 shadow-md">
                    <ExternalLink className="w-4 h-4" />
                    <span>Consulter le Document</span>
                  </Button>
                </a>
              )}

              <a href={downloadUrl} download={filename} className="w-full sm:w-auto">
                <Button size="md" variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Télécharger ({filename})</span>
                </Button>
              </a>

              <button
                type="button"
                onClick={() => {
                  setLoadError(false);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer w-full mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer l'affichage intégré</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
