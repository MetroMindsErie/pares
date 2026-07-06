/**
 * Custom next/image loader (next.config.js images.loaderFile).
 *
 * Remote MLS/Facebook photos are routed through /api/proxy-image, which adds
 * long-lived cache headers and Cloudflare image resizing — so next/image
 * generates a real srcset instead of serving multi-MB originals.
 * Local /public assets and unknown hosts pass through unchanged.
 */

const PROXYABLE_SUFFIXES = [
  '.cotality.com',
  '.corelogic.com',
  '.trestle.io',
  '.fbcdn.net',
  '.fbsbx.com',
];

export default function imageLoader({ src, width }) {
  if (!src || src.startsWith('/') || src.startsWith('data:')) return src;
  try {
    const { protocol, hostname } = new URL(src);
    const proxyable =
      protocol === 'https:' &&
      (hostname === 'graph.facebook.com' ||
        PROXYABLE_SUFFIXES.some((s) => hostname === s.slice(1) || hostname.endsWith(s)));
    if (proxyable) {
      return `/api/proxy-image?url=${encodeURIComponent(src)}${width ? `&w=${width}` : ''}`;
    }
  } catch {
    // fall through — return src untouched
  }
  return src;
}
