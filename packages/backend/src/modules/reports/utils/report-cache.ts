/**
 * Report responses are cached briefly only. There is no per-sale invalidation,
 * so the TTL bounds how stale a report can be after a sale/void/refund
 * (finding F1007): keep it short.
 */
export const REPORT_CACHE_TTL_SECONDS = 60;
