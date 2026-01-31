const CDN_URL: string | undefined = import.meta.env['VITE_CDN_URL'] as string | undefined;

/**
 * Returns the CDN URL for a given asset path if CDN is configured,
 * otherwise returns the local path unchanged.
 *
 * @param path - The asset path (e.g., "/images/logo.png" or "assets/style.css")
 * @returns The full CDN URL or the original local path
 */
export function getCdnUrl(path: string): string {
  if (!CDN_URL) {
    return path;
  }

  const baseUrl = CDN_URL.endsWith('/') ? CDN_URL.slice(0, -1) : CDN_URL;
  const assetPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${assetPath}`;
}

/**
 * Returns the CDN URL with a cache-busting version hash appended.
 * Uses the build hash from Vite's import.meta.env if available.
 *
 * @param path - The asset path
 * @param version - Optional explicit version string; falls back to build mode
 * @returns The versioned CDN URL or local path
 */
export function getVersionedCdnUrl(path: string, version?: string): string {
  const url = getCdnUrl(path);

  const versionHash = version ?? (import.meta.env['VITE_BUILD_HASH'] as string | undefined);

  if (!versionHash) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${versionHash}`;
}

/**
 * Checks whether a CDN URL is configured for the current environment.
 */
export function isCdnEnabled(): boolean {
  return Boolean(CDN_URL);
}
