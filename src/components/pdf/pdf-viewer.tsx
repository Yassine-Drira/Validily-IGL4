"use client";

import React, { useState } from "react";
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
          : "min-h-[700px] h-[750px]"
      }`}
    >
      {/* Reader Controls Toolbar */}
      <div className="bg-stone-950 text-stone-300 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs border-b border-stone-800 gap-2 select-none shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-mono text-stone-400">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="truncate max-w-[180px] sm:max-w-xs">{filename}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
            PDF Reader
          </span>
        </div>

        {/* Center / Navigation Controls */}
        <div className="flex items-center space-x-1 bg-stone-900 px-2 py-1 rounded-md border border-stone-800">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="p-1 hover:text-white rounded disabled:opacity-40"
            disabled={page <= 1}
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 text-stone-300">
            Page {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="p-1 hover:text-white rounded"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Tools: Zoom, Rotate, Fullscreen, Download */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-white rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="text-[11px] font-mono px-1.5 hover:text-white"
              title="Reset Zoom (100%)"
            >
              {zoom}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-white rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleRotate}
            className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition-colors"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <a
            href={downloadUrl}
            download={filename}
            className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition-colors text-indigo-400"
            title="Download PDF Document"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Viewport Display Area */}
      <div className="flex-1 bg-[#262626] overflow-auto flex items-center justify-center p-4 relative">
        {url && !loadError ? (
          <div
            className="transition-transform duration-150 origin-top flex items-center justify-center w-full h-full"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          >
            <object
              data={`${url}#page=${page}&view=FitH`}
              type="application/pdf"
              className="w-full h-full rounded shadow-xl border border-stone-700 bg-white"
              onError={() => setLoadError(true)}
            >
              {/* Fallback if object preview is unsupported in browser */}
              <div className="flex flex-col items-center justify-center p-8 text-center text-stone-300">
                <FileText className="w-12 h-12 text-stone-400 mb-3" />
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs text-stone-400 max-w-sm mb-4 leading-relaxed">
                  Your browser does not support inline PDF object embedding.
                </p>
                <div className="flex items-center space-x-2">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="secondary">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      <span>Open in Browser Tab</span>
                    </Button>
                  </a>
                  <a href={downloadUrl} download={filename}>
                    <Button size="sm" variant="primary">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Download File</span>
                    </Button>
                  </a>
                </div>
              </div>
            </object>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-stone-300 max-w-md">
            <FileText className="w-16 h-16 text-indigo-400/80 mb-4" />
            <h3 className="text-base font-semibold text-stone-100 mb-1">
              {title}
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-6 font-sans">
              Official module document: <code className="text-stone-300 font-mono">{filename}</code>.
              Securely stored in your Supabase private bucket (<code className="text-indigo-300">academic-resources</code>).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href={downloadUrl} download={filename}>
                <Button size="md" variant="primary">
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Download Document</span>
                </Button>
              </a>

              <button
                type="button"
                onClick={() => {
                  setLoadError(false);
                  window.location.reload();
                }}
                className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-md bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Refresh Document Access</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
