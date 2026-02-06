import { useCallback } from 'react';
import type { TableLayoutEditorProps } from '../types/layout.types';
import { useTablePositions } from '../hooks/useTablePositions';
import { useTableSections } from '../hooks/useTableSections';
import { useTableSelection } from '../hooks/useTableSelection';
import { useTableZoom } from '../hooks/useTableZoom';
import { useTableDrag } from '../hooks/useTableDrag';
import { TableToolbar } from './table-toolbar';
import { TableLegend } from './table-legend';
import { TableCanvas } from './table-canvas';
import { TableDetailPanel } from './table-detail-panel';
import { TableSummary } from './table-summary';

// Re-export types and utilities for backward compatibility
export type { TableStatus, LayoutTable } from '../types/layout.types';
export { generateDemoTables } from '../utils/demo-data';

export function TableLayoutEditor({
  tables: rawTables,
  onSavePositions,
  editable = true,
}: TableLayoutEditorProps) {
  // Manage table positions (local storage + save callback)
  const { mergedTables, hasUnsavedChanges, updatePosition, handleSave, handleReset } =
    useTablePositions({
      tables: rawTables,
      onSavePositions,
    });

  // Manage sections and filtering
  const { sections, activeSection, setActiveSection, filteredTables } = useTableSections({
    tables: mergedTables,
  });

  // Manage table selection
  const { selectedTable, toggleTable, clearSelection } = useTableSelection();

  // Manage zoom
  const { zoom, zoomIn, zoomOut, resetZoom } = useTableZoom();

  // Manage drag and drop
  const {
    draggingId,
    gridRef,
    handleDragStart,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  } = useTableDrag({
    tables: mergedTables,
    editable,
    onPositionChange: updatePosition,
  });

  // Handle reset with clear selection
  const handleResetWithClear = useCallback(() => {
    handleReset();
    clearSelection();
  }, [handleReset, clearSelection]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <TableToolbar
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={resetZoom}
        editable={editable}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onReset={handleResetWithClear}
      />

      {/* Legend */}
      <TableLegend editable={editable} />

      <div className="flex gap-4">
        {/* Grid Area */}
        <TableCanvas
          gridRef={gridRef}
          zoom={zoom}
          tables={filteredTables}
          draggingId={draggingId}
          selectedTableId={selectedTable?.id ?? null}
          editable={editable}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTableClick={toggleTable}
          onTableDragStart={handleDragStart}
        />

        {/* Detail Panel */}
        {selectedTable && <TableDetailPanel table={selectedTable} onClose={clearSelection} />}
      </div>

      {/* Summary footer */}
      <TableSummary tables={filteredTables} />
    </div>
  );
}
