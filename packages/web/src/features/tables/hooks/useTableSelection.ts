import { useState, useCallback } from 'react';
import type { LayoutTable } from '../types/layout.types';

export function useTableSelection() {
  const [selectedTable, setSelectedTable] = useState<LayoutTable | null>(null);

  const selectTable = useCallback((table: LayoutTable | null) => {
    setSelectedTable(table);
  }, []);

  const toggleTable = useCallback((table: LayoutTable) => {
    setSelectedTable((current) => (current?.id === table.id ? null : table));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTable(null);
  }, []);

  return {
    selectedTable,
    selectTable,
    toggleTable,
    clearSelection,
  };
}
