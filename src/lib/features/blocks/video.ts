/**
 * @fileoverview YouTube / Vimeo embed URL parsing for the `video` content block.
 *
 * The block stores whatever URL the user pasted; we parse it on render into a
 * privacy-friendly embed URL (an `<iframe src>`) plus a canonical watch URL used
 * for print/fallback links. Parsing is intentionally permissive about the input
 * shape (watch, short, embed, shorts, /v/) but strict about the resulting ID, so
 * a malformed paste yields `null` rather than a broken iframe.
 */

export type VideoProvider = 'youtube' | 'vimeo';

export interface ParsedVideo {
  provider: VideoProvider;
  /** The provider's video ID. */
  id: string;
  /** Privacy-friendly URL for an `<iframe src>` (youtube-nocookie / player.vimeo). */
  embedUrl: string;
  /** Canonical, human-facing watch URL — used for the print/no-JS fallback link. */
  watchUrl: string;
}

/** All YouTube video IDs are exactly 11 URL-safe base64 characters. */
function isYouTubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

function youtube(id: string): ParsedVideo {
  return {
    provider: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`
  };
}

function vimeo(id: string): ParsedVideo {
  return {
    provider: 'vimeo',
    id,
    embedUrl: `https://player.vimeo.com/video/${id}`,
    watchUrl: `https://vimeo.com/${id}`
  };
}

/**
 * Parse a pasted YouTube or Vimeo URL into embed/watch URLs.
 * Returns `null` for empty, non-URL, unsupported-host, or malformed-ID input.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Only embed over https — never proxy a plaintext-http origin into the page.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  // --- YouTube ---------------------------------------------------------------
  if (host === 'youtu.be') {
    const id = segments[0] ?? '';
    return isYouTubeId(id) ? youtube(id) : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    // /watch?v=ID
    if (segments[0] === 'watch') {
      const id = url.searchParams.get('v') ?? '';
      return isYouTubeId(id) ? youtube(id) : null;
    }
    // /embed/ID, /shorts/ID, /v/ID, /live/ID
    if (['embed', 'shorts', 'v', 'live'].includes(segments[0]) && segments[1]) {
      return isYouTubeId(segments[1]) ? youtube(segments[1]) : null;
    }
    return null;
  }

  // --- Vimeo -----------------------------------------------------------------
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    // The numeric video ID is the last all-digits path segment, which handles
    // vimeo.com/ID, player.vimeo.com/video/ID, and vimeo.com/channels/x/ID.
    const id = [...segments].reverse().find((s) => /^\d+$/.test(s)) ?? '';
    return id ? vimeo(id) : null;
  }

  return null;
}
