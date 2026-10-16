import type { TableStatus } from '../types/layout.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GRID_COLS = 20;
export const GRID_ROWS = 20;

// ---------------------------------------------------------------------------
// Status Configuration
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300',
  occupied: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300',
  reserved: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300',
  cleaning: 'bg-gray-400/20 border-gray-400 text-gray-600 dark:text-gray-400',
};

export const STATUS_FILL: Record<TableStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  cleaning: 'bg-gray-400',
};

export const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  reserved: 'Dipesan',
  cleaning: 'Dibersihkan',
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getElapsedTime(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} mnt`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours} j ${mins} mnt`;
}

/** Maps any backend status string to a known TableStatus (unknown → available). */
export function toTableStatus(status: string | null | undefined): TableStatus {
  switch (status) {
    case 'occupied':
    case 'reserved':
    case 'cleaning':
      return status;
    default:
      return 'available';
  }
}
