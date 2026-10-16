"use client";

import React, { useEffect, useRef, useState } from "react";
import { Headphones, AlertCircle, Volume2, VolumeX, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubeFocusPlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  volume: number; // 0 to 1
  isMuted: boolean;
  title?: string;
  className?: string;
  onPlaybackError?: (err: string) => void;
}

export function YouTubeFocusPlayer({
  videoId,
  isPlaying,
  volume,
  isMuted,
  title,
  className = "",
  onPlaybackError,
}: YouTubeFocusPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Reset error when videoId changes
  useEffect(() => {
    setHasError(false);
    setIsReady(false);
  }, [videoId]);

  // Handle postMessage commands to YouTube IFrame API
  const sendCommand = (func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args,
        }),
        "*"
      );
    } catch {
      // Safe postMessage
    }
  };

  // Synchronize playback state (play/pause)
  useEffect(() => {
    if (!videoId || hasError) return;

    if (isPlaying) {
      sendCommand("playVideo");
    } else {
      sendCommand("pauseVideo");
    }
  }, [isPlaying, videoId, hasError, isReady]);

  // Synchronize volume and mute state
  useEffect(() => {
    if (!videoId || hasError) return;

    if (isMuted) {
      sendCommand("mute");
    } else {
      sendCommand("unMute");
      sendCommand("setVolume", [Math.round(volume * 100)]);
    }
  }, [volume, isMuted, videoId, hasError, isReady]);

  if (!videoId) return null;

  // Canonical sandboxed embed URL with looping enabled via playlist parameter
  const embedSrc = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`;

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#1E293B] border border-white/10 p-3 text-white shadow-lg space-y-2 relative overflow-hidden",
        className
      )}
    >
      {/* Visual Ambient Glow */}
      <div
        className={cn(
          "absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-colors duration-700",
          isPlaying && !isMuted ? "bg-[#2855D9] animate-pulse" : "bg-slate-600"
        )}
      />

      {/* Header & Status */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-2 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
              isPlaying && !isMuted
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-white/10 text-white/60 border-white/10"
            )}
          >
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate max-w-[240px]">
              {title || "Piste YouTube"}
            </p>
            <div className="flex items-center space-x-1.5 text-[10px] text-white/60">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>YouTube Audio Stream</span>
              <span>•</span>
              <span className="font-mono text-emerald-400">
                {isPlaying ? (isMuted ? "En sourdine" : "Lecture en cours") : "En pause"}
              </span>
            </div>
          </div>
        </div>

        {/* Live Audio Visualizer Dots */}
        {isPlaying && !isMuted && (
          <div className="flex items-end space-x-0.5 h-4 shrink-0">
            <span className="w-1 h-3 bg-red-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[11px] flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Vidéo indisponible ou intégration externe restreinte par l&apos;auteur.</span>
        </div>
      )}

      {/* Sandboxed YouTube Player IFrame (Hidden visually but playing background audio) */}
      <div className="relative w-full h-[1px] opacity-0 overflow-hidden pointer-events-none">
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title="YouTube Study Audio Stream"
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setIsReady(true);
            if (isPlaying) {
              sendCommand("playVideo");
              if (!isMuted) sendCommand("setVolume", [Math.round(volume * 100)]);
            }
          }}
          onError={() => {
            setHasError(true);
            onPlaybackError?.("Erreur de chargement du lecteur YouTube.");
          }}
        />
      </div>
    </div>
  );
}
