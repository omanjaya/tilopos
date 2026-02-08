import type { KDSOrderPriority } from '@/types/kds.types';

export function getElapsedColor(minutes: number): string {
  if (minutes >= 10) return 'border-red-500 bg-red-500/10';
  if (minutes >= 5) return 'border-yellow-500 bg-yellow-500/10';
  return 'border-zinc-700 bg-zinc-800';
}

export function getElapsedBadgeVariant(minutes: number): string {
  if (minutes >= 10) return 'bg-red-600 text-white';
  if (minutes >= 5) return 'bg-yellow-600 text-white';
  return 'bg-zinc-700 text-zinc-300';
}

export function getPriorityBorderClass(priority: KDSOrderPriority): string {
  if (priority === 'vip') return 'border-amber-400 ring-1 ring-amber-400/30';
  if (priority === 'urgent') return 'border-orange-500';
  return '';
}
