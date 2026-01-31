import { SetMetadata } from '@nestjs/common';

export const INVALIDATE_CACHE_KEY = 'invalidate_cache';

export const InvalidateCache = (...prefixes: string[]) =>
  SetMetadata(INVALIDATE_CACHE_KEY, prefixes);
