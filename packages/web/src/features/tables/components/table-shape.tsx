import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutTable } from '../types/layout.types';
import { STATUS_COLORS, STATUS_LABELS, GRID_COLS, GRID_ROWS } from '../utils/table-layout.utils';

interface TableShapeProps {
  table: LayoutTable;
  isDragging: boolean;
  isSelected: boolean;
  editable: boolean;
  onClick: (table: LayoutTable) => void;
  onDragStart: (table: LayoutTable, clientX: number, clientY: number) => void;
  /** Arrow-key move by one grid cell (keyboard alternative to dragging). */
  onKeyboardMove?: (table: LayoutTable, dx: number, dy: number) => void;
}

const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export function TableShape({
  table,
  isDragging,
  isSelected,
  editable,
  onClick,
  onDragStart,
  onKeyboardMove,
}: TableShapeProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Meja ${table.name}, ${table.capacity} orang, ${STATUS_LABELS[table.status]}${
        editable ? '. Gunakan tombol panah untuk memindahkan' : ''
      }`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(table);
          return;
        }
        const delta = ARROW_DELTAS[e.key];
        if (delta && editable && onKeyboardMove) {
          e.preventDefault();
          onKeyboardMove(table, delta[0], delta[1]);
        }
      }}
      className={cn(
        'absolute rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col items-center justify-center cursor-pointer transition-shadow',
        STATUS_COLORS[table.status],
        isDragging && 'opacity-80 shadow-xl z-30 ring-2 ring-primary',
        isSelected && !isDragging && 'ring-2 ring-primary shadow-lg z-20',
        editable && 'cursor-grab active:cursor-grabbing',
        !editable && 'cursor-pointer',
      )}
      style={{
        left: `${(table.gridX / GRID_COLS) * 100}%`,
        top: `${(table.gridY / GRID_ROWS) * 100}%`,
        width: `${(table.gridW / GRID_COLS) * 100}%`,
        height: `${(table.gridH / GRID_ROWS) * 100}%`,
        minWidth: 0,
        minHeight: 0,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          onClick(table);
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onDragStart(table, e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if (e.touches[0]) {
          onDragStart(table, e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
    >
      <span className="font-bold text-xs sm:text-sm leading-tight truncate px-1">
        {table.name}
      </span>
      <div className="flex items-center gap-0.5 text-[10px] opacity-70">
        <Users className="h-2.5 w-2.5" />
        {table.capacity}
      </div>
    </div>
  );
}
