export type CdnProvider = 'cloudflare' | 'cloudfront' | 'bunny' | 'none';

export interface CdnConfiguration {
  /** CDN origin URL (e.g., "https://cdn.example.com") */
  cdnUrl: string;
  /** CDN provider for provider-specific cache purge logic */
  provider: CdnProvider;
  /** Whether CDN is enabled */
  isEnabled: boolean;
}

/**
 * Cache-Control header presets by content type.
 * - Hashed assets (JS/CSS with content hash): immutable, long-lived
 * - HTML: short-lived to pick up new deployments quickly
 * - Images: medium-lived
 * - Fonts: long-lived
 */
export interface CacheControlConfig {
  /** For hashed static assets (JS, CSS with content hashes) */
  hashedAssets: string;
  /** For HTML documents */
  html: string;
  /** For image files */
  images: string;
  /** For font files */
  fonts: string;
  /** Default fallback */
  defaultCache: string;
}

const DEFAULT_CACHE_CONTROL: CacheControlConfig = {
  hashedAssets: 'public, max-age=31536000, immutable',
  html: 'public, max-age=3600, must-revalidate',
  images: 'public, max-age=86400',
  fonts: 'public, max-age=31536000, immutable',
  defaultCache: 'public, max-age=3600',
};

/**
 * Reads CDN configuration from environment variables with safe defaults.
 */
export function getCdnConfig(): CdnConfiguration {
  const cdnUrl = process.env['CDN_URL'] ?? '';
  const provider = (process.env['CDN_PROVIDER'] ?? 'none') as CdnProvider;

  return {
    cdnUrl,
    provider,
    isEnabled: Boolean(cdnUrl),
  };
}

/**
 * Returns the cache control configuration.
 * Can be customized via environment variables in the future.
 */
export function getCacheControlConfig(): CacheControlConfig {
  return { ...DEFAULT_CACHE_CONTROL };
}

/**
 * Returns the appropriate Cache-Control header value for a given file path.
 *
 * @param filePath - The request path (e.g., "/assets/main-abc123.js")
 * @returns The Cache-Control header value
 */
export function getCacheControlForPath(filePath: string): string {
  const config = getCacheControlConfig();
  const lowerPath = filePath.toLowerCase();

  // Hashed assets (contain hash pattern like -abc123.js or -abc123.css)
  const hashedPattern = /\.[a-f0-9]{8,}\.(js|css|mjs)$/;
  if (hashedPattern.test(lowerPath)) {
    return config.hashedAssets;
  }

  // HTML files
  if (lowerPath.endsWith('.html') || lowerPath === '/') {
    return config.html;
  }

  // Image files
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.ico'];
  if (imageExtensions.some((ext) => lowerPath.endsWith(ext))) {
    return config.images;
  }

  // Font files
  const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
  if (fontExtensions.some((ext) => lowerPath.endsWith(ext))) {
    return config.fonts;
  }

  return config.defaultCache;
}

/**
 * Stub for CDN cache purge integration.
 * In production, this would call the CDN provider's purge API.
 *
 * @param paths - Array of paths to purge from CDN cache
 * @returns Promise that resolves when purge request is sent
 */
export async function purgeCdnCache(paths: string[]): Promise<{ success: boolean; message: string }> {
  const config = getCdnConfig();

  if (!config.isEnabled) {
    return { success: true, message: 'CDN not configured, no purge needed' };
  }

  // Provider-specific purge logic would go here
  switch (config.provider) {
    case 'cloudflare':
      // Cloudflare API: POST /zones/{zone_id}/purge_cache
      return {
        success: true,
        message: `Cloudflare purge stub: ${paths.length} paths queued for purge`,
      };

    case 'cloudfront':
      // AWS CloudFront: CreateInvalidation
      return {
        success: true,
        message: `CloudFront purge stub: ${paths.length} paths queued for invalidation`,
      };

    case 'bunny':
      // BunnyCDN: POST /purge
      return {
        success: true,
        message: `BunnyCDN purge stub: ${paths.length} paths queued for purge`,
      };

    default:
      return { success: false, message: `Unknown CDN provider: ${config.provider}` };
  }
}
