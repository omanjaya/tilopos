import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LayoutTable } from '../types/layout.types';
import { STATUS_COLORS, STATUS_LABELS, getElapsedTime } from '../utils/table-layout.utils';

interface TableDetailPanelProps {
  table: LayoutTable;
  onClose: () => void;
}

export function TableDetailPanel({ table, onClose }: TableDetailPanelProps) {
  return (
    <Card className="w-64 shrink-0 self-start">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Detail Meja</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold">{table.name}</p>
          <Badge className={cn('mt-1', STATUS_COLORS[table.status], 'border')}>
            {STATUS_LABELS[table.status]}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kapasitas</span>
            <span className="font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {table.capacity} orang
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Area</span>
            <span className="font-medium">{table.section || 'Lainnya'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Posisi</span>
            <span className="font-medium text-xs tabular-nums">
              ({table.gridX}, {table.gridY})
            </span>
          </div>
          {table.status === 'occupied' && table.occupiedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durasi</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {getElapsedTime(table.occupiedAt)}
              </span>
            </div>
          )}
          {table.currentOrderId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order</span>
              <span className="font-medium text-xs truncate max-w-[120px]">
                {table.currentOrderId}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
