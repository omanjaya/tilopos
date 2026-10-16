import { useState, useMemo, useCallback } from 'react';
import type { LayoutTable, TablePosition } from '../types/layout.types';

interface UseTablePositionsProps {
  tables: LayoutTable[];
  /** Persists moved tables (PUT /tables/:id). Throw to keep the changes unsaved. */
  onSavePositions?: (positions: Array<{ id: string; gridX: number; gridY: number }>) => void | Promise<void>;
}

/**
 * Tracks unsaved drag moves on top of the server positions carried by
 * `tables`. Nothing is stored locally: positions live on the backend.
 */
export function useTablePositions({ tables, onSavePositions }: UseTablePositionsProps) {
  const [positionOverrides, setPositionOverrides] = useState<Record<string, TablePosition>>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasUnsavedChanges = Object.keys(positionOverrides).length > 0;

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
  }, []);

  const handleSave = useCallback(async () => {
    if (!onSavePositions) return;
    const positions = Object.entries(positionOverrides).map(([id, pos]) => ({
      id,
      gridX: pos.gridX,
      gridY: pos.gridY,
    }));
    if (positions.length === 0) return;
    setIsSaving(true);
    try {
      await onSavePositions(positions);
      setPositionOverrides({});
    } catch (error) {
      // keep overrides so the user can retry; the caller already reported the error
      console.warn('[tables] saving positions failed', error);
    } finally {
      setIsSaving(false);
    }
  }, [positionOverrides, onSavePositions]);

  const handleReset = useCallback(() => {
    setPositionOverrides({});
  }, []);

  return {
    mergedTables,
    hasUnsavedChanges,
    isSaving,
    updatePosition,
    handleSave,
    handleReset,
  };
}
