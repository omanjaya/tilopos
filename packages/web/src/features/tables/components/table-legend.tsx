import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableStatus } from '../types/layout.types';
import { STATUS_FILL, STATUS_LABELS } from '../utils/table-layout.utils';

interface TableLegendProps {
  editable: boolean;
}

export function TableLegend({ editable }: TableLegendProps) {
  return (
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
  );
}
