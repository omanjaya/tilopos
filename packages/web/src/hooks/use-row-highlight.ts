import { useState, useCallback, useRef } from 'react';

/**
 * Hook to briefly highlight a row after a successful mutation (create/edit).
 *
 * Usage:
 *   const { highlightedRowId, highlightRow } = useRowHighlight();
 *   // In mutation onSuccess: highlightRow(newItem.id);
 *   // Pass to DataTable: <DataTable highlightedRowId={highlightedRowId} rowId={(r) => r.id} />
 */
export function useRowHighlight(duration = 1500) {
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const highlightRow = useCallback(
    (id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setHighlightedRowId(id);
      timerRef.current = setTimeout(() => setHighlightedRowId(null), duration);
    },
    [duration],
  );

  return { highlightedRowId, highlightRow };
}
