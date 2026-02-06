import { useState, useMemo, useCallback } from 'react';
import type { LayoutTable, TablePosition } from '../types/layout.types';
import { loadPositions, savePositions, STORAGE_KEY } from '../utils/table-layout.utils';

interface UseTablePositionsProps {
  tables: LayoutTable[];
  onSavePositions?: (positions: Array<{ id: string; gridX: number; gridY: number }>) => void;
}

export function useTablePositions({ tables, onSavePositions }: UseTablePositionsProps) {
  const [positionOverrides, setPositionOverrides] = useState<Record<string, TablePosition>>(
    () => loadPositions()
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Merge saved positions into tables
  const mergedTables = useMemo(() => {
    return tables.map((t) => {
      const override = positionOverrides[t.id];
      if (override) {
        return { ...t, gridX: override.gridX, gridY: override.gridY };
      }
      return t;
    });
  }, [tables, positionOverrides]);

  const updatePosition = useCallback((tableId: string, position: TablePosition) => {
    setPositionOverrides((prev) => ({
      ...prev,
      [tableId]: position,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    savePositions(positionOverrides);
    setHasUnsavedChanges(false);

    if (onSavePositions) {
      const positions = Object.entries(positionOverrides).map(([id, pos]) => ({
        id,
        gridX: pos.gridX,
        gridY: pos.gridY,
      }));
      onSavePositions(positions);
    }
  }, [positionOverrides, onSavePositions]);

  const handleReset = useCallback(() => {
    setPositionOverrides({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setHasUnsavedChanges(false);
  }, []);

  return {
    mergedTables,
    hasUnsavedChanges,
    updatePosition,
    handleSave,
    handleReset,
  };
}
