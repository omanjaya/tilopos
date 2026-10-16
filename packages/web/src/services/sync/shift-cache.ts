/**
 * Last known active shift of a user, persisted locally so the POS can keep
 * selling (offline checkout) when GET /employees/shifts/current is unreachable.
 * Holds no secrets: shift id, outlet, opening cash and start time.
 */

export interface CachedShift {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  startedAt: string;
  openingCash?: number;
  cachedAt: number;
}

const KEY_PREFIX = 'tilopos-active-shift:';

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function readCachedShift(userId: string | null | undefined): CachedShift | null {
  if (!userId) return null;
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedShift;
    return parsed && typeof parsed.shiftId === 'string' ? parsed : null;
  } catch (error) {
    console.warn('[shift-cache] invalid cached shift removed', error);
    localStorage.removeItem(keyFor(userId));
    return null;
  }
}

export function writeCachedShift(userId: string | null | undefined, shift: Omit<CachedShift, 'cachedAt'>): void {
  if (!userId) return;
  localStorage.setItem(keyFor(userId), JSON.stringify({ ...shift, cachedAt: Date.now() }));
}

export function clearCachedShift(userId: string | null | undefined): void {
  if (!userId) return;
  localStorage.removeItem(keyFor(userId));
}
