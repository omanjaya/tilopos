import { getCdnUrl } from './cdn';

interface ImageSrcSetEntry {
  width: number;
  url: string;
}

interface ResponsiveImageOptions {
  /** The base image path (e.g., "/images/hero.jpg") */
  src: string;
  /** Widths for responsive srcset (default: [320, 640, 768, 1024, 1280, 1536]) */
  widths?: number[];
  /** Image format suffix override (e.g., "webp") */
  format?: string;
}

interface ImageAttributes {
  src: string;
  srcSet: string;
  sizes: string;
  loading: 'lazy' | 'eager';
}

const DEFAULT_WIDTHS = [320, 640, 768, 1024, 1280, 1536];

/**
 * Builds the CDN URL for an image with optional width parameter.
 * Assumes CDN supports width-based image transformation via query params.
 */
function buildImageUrl(src: string, width?: number, format?: string): string {
  let url = getCdnUrl(src);

  const params: string[] = [];
  if (width) {
    params.push(`w=${width}`);
  }
  if (format) {
    params.push(`f=${format}`);
  }

  if (params.length > 0) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}${params.join('&')}`;
  }

  return url;
}

/**
 * Generates srcset entries for responsive images using the CDN.
 */
function buildSrcSetEntries(
  src: string,
  widths: number[],
  format?: string,
): ImageSrcSetEntry[] {
  return widths.map((width) => ({
    width,
    url: buildImageUrl(src, width, format),
  }));
}

/**
 * Generates a complete srcset string from entries.
 */
function formatSrcSet(entries: ImageSrcSetEntry[]): string {
  return entries.map((entry) => `${entry.url} ${entry.width}w`).join(', ');
}

/**
 * Returns HTML-ready image attributes with CDN URLs, responsive srcset,
 * and lazy loading support.
 *
 * @param options - Image source and responsive configuration
 * @param isLazy - Whether to use lazy loading (default: true)
 * @returns Object with src, srcSet, sizes, and loading attributes
 */
export function getResponsiveImageAttrs(
  options: ResponsiveImageOptions,
  isLazy = true,
): ImageAttributes {
  const { src, widths = DEFAULT_WIDTHS, format } = options;

  const entries = buildSrcSetEntries(src, widths, format);
  const srcSet = formatSrcSet(entries);

  const sizes = [
    '(max-width: 640px) 100vw',
    '(max-width: 1024px) 50vw',
    '33vw',
  ].join(', ');

  return {
    src: buildImageUrl(src, undefined, format),
    srcSet,
    sizes,
    loading: isLazy ? 'lazy' : 'eager',
  };
}

/**
 * Returns a placeholder data URI for blur-up pattern.
 * Uses a tiny inline SVG as a placeholder while the real image loads.
 *
 * @param width - Placeholder width
 * @param height - Placeholder height
 * @param bgColor - Background color (default: light gray)
 * @returns Base64-encoded SVG data URI
 */
export function getPlaceholderDataUri(
  width: number,
  height: number,
  bgColor = '#e5e7eb',
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect fill="${bgColor}" width="100%" height="100%"/></svg>`;
  const encoded = typeof btoa === 'function'
    ? btoa(svg)
    : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Returns the CDN image URL for a specific image path.
 * Convenience wrapper around getCdnUrl for image assets.
 */
export function getImageUrl(src: string): string {
  return getCdnUrl(src);
}
