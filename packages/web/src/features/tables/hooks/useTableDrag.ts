import { useState, useCallback, useRef } from 'react';
import type { LayoutTable, TablePosition } from '../types/layout.types';
import { GRID_COLS, GRID_ROWS } from '../utils/table-layout.utils';

interface UseTableDragProps {
  tables: LayoutTable[];
  editable: boolean;
  onPositionChange: (tableId: string, position: TablePosition) => void;
}

interface CellPosition {
  col: number;
  row: number;
}

export function useTableDrag({ tables, editable, onPositionChange }: UseTableDragProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const getCellFromEvent = useCallback(
    (clientX: number, clientY: number): CellPosition | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const cellW = rect.width / GRID_COLS;
      const cellH = rect.height / GRID_ROWS;
      const col = Math.floor((clientX - rect.left) / cellW);
      const row = Math.floor((clientY - rect.top) / cellH);
      return {
        col: Math.max(0, Math.min(GRID_COLS - 1, col)),
        row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
      };
    },
    [],
  );

  const handleDragStart = useCallback(
    (table: LayoutTable, clientX: number, clientY: number) => {
      if (!editable) return;
      const cell = getCellFromEvent(clientX, clientY);
      if (!cell) return;
      setDraggingId(table.id);
      setDragOffset({ x: cell.col - table.gridX, y: cell.row - table.gridY });
    },
    [editable, getCellFromEvent],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingId) return;
      const cell = getCellFromEvent(clientX, clientY);
      if (!cell) return;

      const table = tables.find((t) => t.id === draggingId);
      if (!table) return;

      const newX = Math.max(0, Math.min(GRID_COLS - table.gridW, cell.col - dragOffset.x));
      const newY = Math.max(0, Math.min(GRID_ROWS - table.gridH, cell.row - dragOffset.y));

      onPositionChange(draggingId, { gridX: newX, gridY: newY });
    },
    [draggingId, dragOffset, tables, getCellFromEvent, onPositionChange],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingId) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
      }
    },
    [draggingId, handleDragMove],
  );

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (draggingId && e.touches[0]) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [draggingId, handleDragMove],
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  return {
    draggingId,
    gridRef,
    handleDragStart,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  };
}
