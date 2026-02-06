import type { RefObject } from 'react';
import type { LayoutTable } from '../types/layout.types';
import { GRID_COLS, GRID_ROWS } from '../utils/table-layout.utils';
import { TableShape } from './table-shape';

interface TableCanvasProps {
  gridRef: RefObject<HTMLDivElement>;
  zoom: number;
  tables: LayoutTable[];
  draggingId: string | null;
  selectedTableId: string | null;
  editable: boolean;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTableClick: (table: LayoutTable) => void;
  onTableDragStart: (table: LayoutTable, clientX: number, clientY: number) => void;
}

export function TableCanvas({
  gridRef,
  zoom,
  tables,
  draggingId,
  selectedTableId,
  editable,
  onMouseMove,
  onMouseUp,
  onTouchMove,
  onTouchEnd,
  onTableClick,
  onTableDragStart,
}: TableCanvasProps) {
  return (
    <div className="flex-1 overflow-auto rounded-lg border bg-muted/20">
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
        }}
      >
        <div
          ref={gridRef}
          className="relative select-none"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
            backgroundImage:
              'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: `${100 / GRID_COLS}% ${100 / GRID_ROWS}%`,
          }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {tables.map((table) => (
            <TableShape
              key={table.id}
              table={table}
              isDragging={draggingId === table.id}
              isSelected={selectedTableId === table.id}
              editable={editable}
              onClick={onTableClick}
              onDragStart={onTableDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
