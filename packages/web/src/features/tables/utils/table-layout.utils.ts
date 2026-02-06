import type { TableStatus } from '../types/layout.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GRID_COLS = 20;
export const GRID_ROWS = 20;
export const STORAGE_KEY = 'tilopos-table-layout-positions';

// ---------------------------------------------------------------------------
// Status Configuration
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300',
  occupied: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300',
  reserved: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300',
  merged: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300',
  maintenance: 'bg-gray-400/20 border-gray-400 text-gray-600 dark:text-gray-400',
};

export const STATUS_FILL: Record<TableStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  merged: 'bg-blue-500',
  maintenance: 'bg-gray-400',
};

export const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  reserved: 'Reserved',
  merged: 'Merged',
  maintenance: 'Maintenance',
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getElapsedTime(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

export function loadPositions(): Record<string, { gridX: number; gridY: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt data
  }
  return {};
}

export function savePositions(positions: Record<string, { gridX: number; gridY: number }>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // quota
  }
}
