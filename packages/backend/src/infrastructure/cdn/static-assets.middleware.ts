import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getCacheControlForPath, getCdnConfig } from './cdn.config';

/**
 * Middleware that sets appropriate cache control and CORS headers
 * for static file responses, optimized for CDN caching.
 *
 * - Hashed assets (JS/CSS with content hash): immutable, 1-year cache
 * - HTML: 1-hour cache with must-revalidate
 * - Images: 24-hour cache
 * - Fonts: immutable, 1-year cache
 *
 * Also sets CORS headers to allow CDN origins to serve assets
 * cross-origin when needed.
 */
@Injectable()
export class StaticAssetsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestPath = req.path;

    // Only apply to static asset paths
    if (!this.isStaticAsset(requestPath)) {
      next();
      return;
    }

    // Set Cache-Control based on file type
    const cacheControl = getCacheControlForPath(requestPath);
    res.setHeader('Cache-Control', cacheControl);

    // Set CORS headers for CDN cross-origin requests
    const cdnConfig = getCdnConfig();
    if (cdnConfig.isEnabled && cdnConfig.cdnUrl) {
      res.setHeader('Access-Control-Allow-Origin', cdnConfig.cdnUrl);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Range');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Timing-Allow-Origin lets the CDN/browser measure resource timing
    res.setHeader('Timing-Allow-Origin', '*');

    // Vary header to ensure CDN respects encoding differences
    res.setHeader('Vary', 'Accept-Encoding');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  }

  private isStaticAsset(requestPath: string): boolean {
    const staticExtensions = [
      '.js', '.css', '.mjs',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.ico',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.map', '.json',
      '.html',
    ];

    const lowerPath = requestPath.toLowerCase();
    return staticExtensions.some((ext) => lowerPath.endsWith(ext));
  }
}
