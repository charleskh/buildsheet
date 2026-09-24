/**
 * The image shape the ported seethespecs renderers expect.
 *
 * Trimmed to the fields they actually read. In seethespecs these rows came from
 * the database; here they are produced from the local image manifest, so the
 * URLs are relative paths inside the generated site rather than CDN links.
 */
export interface BuildImage {
  id: number;
  /** Full size image: the lightbox and download target. */
  url: string;
  /** Roughly 400px wide tile. Callers fall back to `url` when absent. */
  thumb_url?: string;
  /** Larger tile used as the hi-DPI srcset candidate. Falls back to `thumb_url`. */
  thumb2x_url?: string;
  width?: number;
  height?: number;
  description: string;
}
