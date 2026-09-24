/**
 * @fileoverview URL scheme allowlist for user-supplied hyperlinks.
 *
 * Build content (spec-list items, bullet items, video fallbacks) and profile
 * social links let users paste arbitrary URLs that we render as `<a href>`.
 * Without sanitization a `javascript:`/`data:`/`vbscript:` URL is a stored-XSS
 * vector. {@link safeHref} returns the URL only when its scheme is one of a
 * small allowlist (`http:`, `https:`, `mailto:`); otherwise it returns
 * `undefined` so callers can render the text without a clickable anchor.
 */

/** Schemes we are willing to emit into an `href` attribute. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/**
 * Return `url` only if it is safe to use as an anchor `href`, otherwise
 * `undefined`.
 *
 * Safe means: an absolute URL whose scheme is http/https/mailto, a
 * protocol-relative URL (`//host/path`, resolved against https), or a clearly
 * relative path (`/path`, `./path`, `../path`, `#frag`, `?query`) that cannot
 * carry a dangerous scheme. Anything else — `javascript:`, `data:`,
 * `vbscript:`, unknown schemes, or ambiguous input — returns `undefined`.
 *
 * Schemes are matched case-insensitively and after stripping leading/trailing
 * whitespace plus any embedded control/whitespace chars, so variants like
 * ` JavaScript:` or `java\tscript:` (which browsers would still execute) are
 * rejected.
 */
export function safeHref(url: string | undefined | null): string | undefined {
  if (url == null) return undefined;

  const trimmed = url.trim();
  if (trimmed === '') return undefined;

  // Strip control chars and whitespace that browsers ignore inside a scheme
  // (e.g. "java\tscript:alert(1)" or "  javascript:") before scheme detection.
  // \x00-\x20 covers C0 controls + space; \s covers any remaining whitespace.
  // eslint-disable-next-line no-control-regex
  const normalized = trimmed.replace(/[\x00-\x20\s]/g, '');
  if (normalized === '') return undefined;

  // Protocol-relative ("//host/path") — safe; browsers resolve against the
  // page's https origin. Must check before the scheme regex below.
  if (normalized.startsWith('//')) return trimmed;

  // Clearly-relative paths and fragments/queries can't carry a scheme.
  if (
    normalized.startsWith('/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../') ||
    normalized.startsWith('#') ||
    normalized.startsWith('?')
  ) {
    return trimmed;
  }

  // If there's an explicit scheme, it must be on the allowlist.
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase() + ':';
    return ALLOWED_SCHEMES.has(scheme) ? trimmed : undefined;
  }

  // No scheme and not an obvious relative path. Anything containing a colon at
  // this point is ambiguous (could be a malformed/unknown scheme) — reject it.
  // Otherwise treat it as a bare host/path and let the browser resolve it.
  if (normalized.includes(':')) return undefined;
  return trimmed;
}
