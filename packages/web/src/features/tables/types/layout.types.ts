// ---------------------------------------------------------------------------
// Table Layout Types
// ---------------------------------------------------------------------------

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'merged' | 'maintenance';

export interface LayoutTable {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  section: string;
  /** Grid column (0-based, 0..GRID_COLS-1) */
  gridX: number;
  /** Grid row (0-based, 0..GRID_ROWS-1) */
  gridY: number;
  /** Width in grid cells */
  gridW: number;
  /** Height in grid cells */
  gridH: number;
  currentOrderId?: string;
  occupiedAt?: string;
}

export interface TableLayoutEditorProps {
  /** Tables to render. The editor reads positions from the table objects. */
  tables: LayoutTable[];
  /** Called when the user repositions tables via drag-and-drop. */
  onSavePositions?: (positions: Array<{ id: string; gridX: number; gridY: number }>) => void;
  /** Whether the user can drag tables to new positions. Defaults to true. */
  editable?: boolean;
}

export interface TablePosition {
  gridX: number;
  gridY: number;
}
