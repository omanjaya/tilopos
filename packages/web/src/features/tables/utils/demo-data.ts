import type { LayoutTable, TableStatus } from '../types/layout.types';

// ---------------------------------------------------------------------------
// Helper: generate demo tables when no API data is available.
// ---------------------------------------------------------------------------

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
