import type { LayoutTable } from '../types/layout.types';

interface TableSummaryProps {
  tables: LayoutTable[];
}

export function TableSummary({ tables }: TableSummaryProps) {
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === 'available').length;
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const reservedTables = tables.filter((t) => t.status === 'reserved').length;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span>Total: {totalTables} meja</span>
      <span>Tersedia: {availableTables}</span>
      <span>Terisi: {occupiedTables}</span>
      <span>Reserved: {reservedTables}</span>
    </div>
  );
}
