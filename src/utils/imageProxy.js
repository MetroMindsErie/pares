/**
 * Helpers for serving MLS/CDN photos through /api/proxy-image, which adds
 * long-lived cache headers and Cloudflare image resizing (?w=).
 *
 * Only remote hosts the proxy allows are rewritten; local paths (/foo.jpg)
 * and unknown hosts pass through untouched.
 */

const PROXYABLE_SUFFIXES = [
  '.cotality.com',
  '.corelogic.com',
  '.trestle.io',
  '.fbcdn.net',
  '.fbsbx.com',
];

function isProxyable(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:') return false;
    return (
      hostname === 'graph.facebook.com' ||
      PROXYABLE_SUFFIXES.some((s) => hostname === s.slice(1) || hostname.endsWith(s))
    );
  } catch {
    return false;
  }
}

export function proxiedImageUrl(url, width) {
  if (!url || typeof url !== 'string' || !isProxyable(url)) return url;
  const w = width ? `&w=${Math.round(width)}` : '';
  return `/api/proxy-image?url=${encodeURIComponent(url)}${w}`;
}

/**
 * srcset across common card/detail widths so the browser picks the smallest
 * adequate file. Returns undefined for non-proxyable URLs so callers can
 * spread it conditionally: {...imageSrcSet(url)}
 */
export function imageSrcSet(url, widths = [320, 640, 960, 1280]) {
  if (!url || !isProxyable(url)) return undefined;
  return widths.map((w) => `${proxiedImageUrl(url, w)} ${w}w`).join(', ');
}
