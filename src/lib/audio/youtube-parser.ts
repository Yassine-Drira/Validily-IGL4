/**
 * youtube-parser.ts
 * Strict server & client safe YouTube URL validator and canonical video ID extractor.
 * Defends against XSS, arbitrary domain embedding, malicious schemes, and malformed inputs.
 */

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export interface YouTubeParseResult {
  valid: boolean;
  videoId?: string;
  canonicalUrl?: string;
  embedUrl?: string;
  error?: string;
}

export function parseAndValidateYouTubeUrl(rawUrl: string): YouTubeParseResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Veuillez fournir une URL YouTube valide." };
  }

  const trimmed = rawUrl.trim();

  // Reject dangerous schemes or raw HTML/iframe attempts
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.includes("<") ||
    trimmed.includes(">") ||
    trimmed.includes('"') ||
    trimmed.includes("'")
  ) {
    return { valid: false, error: "Format d'URL dangereux ou non autorisé." };
  }

  // Accept direct valid 11-char video ID
  if (YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    const videoId = trimmed;
    return {
      valid: true,
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`,
    };
  }

  // Normalize protocol
  let urlToParse = trimmed;
  if (!/^https?:\/\//i.test(urlToParse)) {
    urlToParse = `https://${urlToParse}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlToParse);
  } catch {
    return { valid: false, error: "URL malformée ou syntaxiquement invalide." };
  }

  // Validate hostname against whitelist
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      valid: false,
      error: `Hôte non autorisé (${parsed.hostname}). Seules les sources officielles YouTube sont acceptées.`,
    };
  }

  let videoId: string | null = null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    // Format: https://youtu.be/VIDEO_ID
    const pathPart = parsed.pathname.slice(1).split("/")[0];
    if (pathPart) {
      videoId = pathPart;
    }
  } else {
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    if (parsed.searchParams.has("v")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/")) {
      // Format: https://www.youtube.com/shorts/VIDEO_ID
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[1]) {
        videoId = parts[1];
      }
    } else if (parsed.pathname.startsWith("/embed/")) {
      // Format: https://www.youtube.com/embed/VIDEO_ID
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[1]) {
        videoId = parts[1];
      }
    }
  }

  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return {
      valid: false,
      error: "Identifiant vidéo YouTube introuvable ou invalide (doit comporter 11 caractères).",
    };
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return {
    valid: true,
    videoId,
    canonicalUrl,
    embedUrl,
  };
}
