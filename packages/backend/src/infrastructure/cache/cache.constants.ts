export const CACHE_KEYS = {
  PRODUCT: 'product',
  PRODUCTS_LIST: 'products:list',
  CATEGORY: 'category',
  CUSTOMER: 'customer',
  TRANSACTION: 'transaction',
  DASHBOARD: 'dashboard',
  HELD_BILL: 'held-bill',
  SHIFT: 'shift',
  MENU: 'menu',
  REPORT: 'report',
} as const;

export const CACHE_DEFAULTS = {
  DEFAULT_TTL: 300,
  SHORT_TTL: 60,
  MEDIUM_TTL: 300,
  LONG_TTL: 3600,
  DASHBOARD_TTL: 300,
  REPORT_TTL: 600,
  HELD_BILL_TTL: 86400,
  MENU_TTL: 1800,
} as const;

export const buildCacheKey = (prefix: string, ...parts: string[]): string => {
  return [prefix, ...parts].join(':');
};
