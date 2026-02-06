// ============================================================================
// Commission Rate Configuration
// ============================================================================

export const COMMISSION_RATES: Record<string, number> = {
  cashier: 0.01,
  supervisor: 0.015,
  manager: 0.02,
  owner: 0.0,
  super_admin: 0.0,
  kitchen: 0.005,
  inventory: 0.005,
};

export const DEFAULT_COMMISSION_RATE = 0.01;

// ============================================================================
// Day Names (for schedule)
// ============================================================================

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
