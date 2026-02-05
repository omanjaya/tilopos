import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Users,
  X,
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
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

interface TableLayoutEditorProps {
  /** Tables to render. The editor reads positions from the table objects. */
  tables: LayoutTable[];
  /** Called when the user repositions tables via drag-and-drop. */
  onSavePositions?: (positions: Array<{ id: string; gridX: number; gridY: number }>) => void;
  /** Whether the user can drag tables to new positions. Defaults to true. */
  editable?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_COLS = 20;
const GRID_ROWS = 20;
const STORAGE_KEY = 'tilopos-table-layout-positions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<TableStatus, string> = {
  available: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300',
  occupied: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300',
  reserved: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300',
  merged: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300',
  maintenance: 'bg-gray-400/20 border-gray-400 text-gray-600 dark:text-gray-400',
};

const STATUS_FILL: Record<TableStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  merged: 'bg-blue-500',
  maintenance: 'bg-gray-400',
};

const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  reserved: 'Reserved',
  merged: 'Merged',
  maintenance: 'Maintenance',
};

function getElapsedTime(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

function loadPositions(): Record<string, { gridX: number; gridY: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt data
  }
  return {};
}

function savePositions(positions: Record<string, { gridX: number; gridY: number }>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // quota
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableLayoutEditor({
  tables: rawTables,
  onSavePositions,
  editable = true,
}: TableLayoutEditorProps) {
  // Sections extracted from tables
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const t of rawTables) {
      set.add(t.section || 'Lainnya');
    }
    return Array.from(set);
  }, [rawTables]);

  const [activeSection, setActiveSection] = useState<string>(sections[0] || 'Semua');
  const [selectedTable, setSelectedTable] = useState<LayoutTable | null>(null);
  const [zoom, setZoom] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [positionOverrides, setPositionOverrides] = useState<
    Record<string, { gridX: number; gridY: number }>
  >(() => loadPositions());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // Update active section when sections change
  useEffect(() => {
    if (sections.length > 0 && !sections.includes(activeSection) && activeSection !== 'Semua') {
      setActiveSection(sections[0] ?? 'Semua');
    }
  }, [sections, activeSection]);

  // Merge saved positions into tables
  const tables = useMemo(() => {
    return rawTables.map((t) => {
      const override = positionOverrides[t.id];
      if (override) {
        return { ...t, gridX: override.gridX, gridY: override.gridY };
      }
      return t;
    });
  }, [rawTables, positionOverrides]);

  // Filter by section
  const filteredTables = useMemo(() => {
    if (activeSection === 'Semua') return tables;
    return tables.filter((t) => (t.section || 'Lainnya') === activeSection);
  }, [tables, activeSection]);

  // ---- Drag handlers ----

  const getCellFromEvent = useCallback(
    (clientX: number, clientY: number): { col: number; row: number } | null => {
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

      setPositionOverrides((prev) => ({
        ...prev,
        [draggingId]: { gridX: newX, gridY: newY },
      }));
      setHasUnsavedChanges(true);
    },
    [draggingId, dragOffset, tables, getCellFromEvent],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Mouse events on the grid container
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

  // Touch events on the grid container
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

  // ---- Save / Reset ----

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
    setSelectedTable(null);
  }, []);

  // ---- Zoom ----

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.2, 0.4));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  // ---- Render ----

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Section tabs */}
        <Tabs
          value={activeSection}
          onValueChange={setActiveSection}
          className="w-auto"
        >
          <TabsList>
            {sections.length > 1 && (
              <TabsTrigger value="Semua">Semua</TabsTrigger>
            )}
            {sections.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium tabular-nums w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomReset} title="Reset Zoom" aria-label="Reset zoom">
            <Maximize2 className="h-4 w-4" />
          </Button>

          {editable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                Simpan
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {(Object.keys(STATUS_FILL) as TableStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded-full', STATUS_FILL[status])} />
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
        {editable && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Seret meja untuk mengatur posisi</span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {/* Grid Area */}
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
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {/* Tables rendered with absolute positioning inside the grid */}
              {filteredTables.map((table) => {
                const isDragging = draggingId === table.id;
                const isSelected = selectedTable?.id === table.id;

                return (
                  <div
                    key={table.id}
                    className={cn(
                      'absolute rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-shadow',
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
                        setSelectedTable(isSelected ? null : table);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleDragStart(table, e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches[0]) {
                        handleDragStart(table, e.touches[0].clientX, e.touches[0].clientY);
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
              })}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedTable && (
          <Card className="w-64 shrink-0 self-start">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Detail Meja</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedTable(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{selectedTable.name}</p>
                <Badge
                  className={cn(
                    'mt-1',
                    STATUS_COLORS[selectedTable.status],
                    'border',
                  )}
                >
                  {STATUS_LABELS[selectedTable.status]}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kapasitas</span>
                  <span className="font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {selectedTable.capacity} orang
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium">{selectedTable.section || 'Lainnya'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posisi</span>
                  <span className="font-medium text-xs tabular-nums">
                    ({selectedTable.gridX}, {selectedTable.gridY})
                  </span>
                </div>
                {selectedTable.status === 'occupied' && selectedTable.occupiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Durasi</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {getElapsedTime(selectedTable.occupiedAt)}
                    </span>
                  </div>
                )}
                {selectedTable.currentOrderId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order</span>
                    <span className="font-medium text-xs truncate max-w-[120px]">
                      {selectedTable.currentOrderId}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary footer */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>Total: {filteredTables.length} meja</span>
        <span>
          Tersedia: {filteredTables.filter((t) => t.status === 'available').length}
        </span>
        <span>
          Terisi: {filteredTables.filter((t) => t.status === 'occupied').length}
        </span>
        <span>
          Reserved: {filteredTables.filter((t) => t.status === 'reserved').length}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: generate demo tables when no API data is available.
// ---------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function generateDemoTables(): LayoutTable[] {
  const sections = ['Indoor', 'Outdoor', 'VIP Room'];
  const statuses: TableStatus[] = ['available', 'occupied', 'reserved', 'available', 'available', 'merged'];
  const tables: LayoutTable[] = [];

  let id = 0;
  for (const section of sections) {
    const count = section === 'VIP Room' ? 4 : 8;
    const cols = section === 'VIP Room' ? 2 : 4;
    const startRow = section === 'Indoor' ? 1 : section === 'Outdoor' ? 10 : 1;
    const startCol = section === 'VIP Room' ? 14 : 1;

    for (let i = 0; i < count; i++) {
      const row = startRow + Math.floor(i / cols) * 3;
      const col = startCol + (i % cols) * 3;
      const status: TableStatus = statuses[id % statuses.length] ?? 'available';

      tables.push({
        id: `table-${id + 1}`,
        name: `${section === 'VIP Room' ? 'VIP ' : section === 'Outdoor' ? 'OD ' : 'T'}${id + 1}`,
        capacity: section === 'VIP Room' ? 8 : Math.random() > 0.5 ? 4 : 2,
        status,
        section,
        gridX: col,
        gridY: row,
        gridW: 2,
        gridH: 2,
        occupiedAt: status === 'occupied' ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
        currentOrderId: status === 'occupied' ? `ORD-${1000 + id}` : undefined,
      });
      id++;
    }
  }

  return tables;
}
