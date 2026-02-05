import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { waitingListApi } from '@/api/endpoints/waiting-list.api';
import { useUIStore } from '@/stores/ui.store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-utils';
import { Loader2, Armchair, Search, Check, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/api/client';
import type { WaitingListEntry } from '@/types/waiting-list.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  section?: string;
}

interface SeatCustomerDialogProps {
  open: boolean;
  entry: WaitingListEntry;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// API for tables
const tablesApi = {
  list: (outletId: string) =>
    apiClient.get<Table[]>('/tables', { params: { outletId } }).then((r) => r.data),
};

export function SeatCustomerDialog({ open, entry, onOpenChange, onSuccess }: SeatCustomerDialogProps) {
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [search, setSearch] = useState('');

  // Fetch tables
  const { data: tables = [], isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables', selectedOutletId],
    queryFn: () => tablesApi.list(selectedOutletId!),
    enabled: open && !!selectedOutletId,
  });

  const seatMutation = useMutation({
    mutationFn: (tableId: string) => waitingListApi.seat(entry.id, { tableId }),
    onSuccess: (data) => {
      toast.success({
        title: 'Pelanggan telah duduk',
        description: `${entry.customerName} telah didudukkan di meja ${data.tableName}`,
      });
      setSelectedTableId('');
      setSearch('');
      onSuccess();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal mendudukkan pelanggan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedTableId) {
      toast.error({ title: 'Validasi gagal', description: 'Pilih meja terlebih dahulu' });
      return;
    }

    seatMutation.mutate(selectedTableId);
  };

  // Filter tables
  const availableTables = tables.filter((t) => t.status === 'available');
  const filteredTables = search
    ? availableTables.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.section?.toLowerCase().includes(search.toLowerCase())
      )
    : availableTables;

  // Group by section
  const groupedTables: Record<string, Table[]> = {};
  filteredTables.forEach((table) => {
    const section = table.section || 'Lainnya';
    if (!groupedTables[section]) groupedTables[section] = [];
    groupedTables[section].push(table);
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !seatMutation.isPending) {
      setSelectedTableId('');
      setSearch('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-primary" />
            Dudukkan Pelanggan
          </DialogTitle>
          <DialogDescription>
            Pilih meja untuk {entry.customerName} ({entry.partySize} orang)
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari meja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            disabled={seatMutation.isPending}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Tersedia ({availableTables.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Terisi</span>
          </div>
        </div>

        {/* Table Grid */}
        <ScrollArea className="h-[400px] -mx-6 px-6">
          {isLoadingTables ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedTables).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">Tidak ada meja tersedia</p>
              <p className="text-sm">
                {search ? 'Coba kata kunci lain' : 'Semua meja sedang terisi'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTables).map(([section, sectionTables]) => (
                <div key={section}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    {section}
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {sectionTables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        isSelected={table.id === selectedTableId}
                        onSelect={() => setSelectedTableId(table.id)}
                        isDisabled={seatMutation.isPending}
                        recommendedSize={entry.partySize}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={seatMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedTableId || seatMutation.isPending}
          >
            {seatMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dudukkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TableCardProps {
  table: Table;
  isSelected: boolean;
  onSelect: () => void;
  isDisabled: boolean;
  recommendedSize: number;
}

function TableCard({ table, isSelected, onSelect, isDisabled, recommendedSize }: TableCardProps) {
  const isRecommended = table.capacity >= recommendedSize && table.capacity <= recommendedSize + 2;

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={cn(
        'aspect-square p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 relative',
        'border-green-500 bg-green-500/10 hover:bg-green-500/20',
        isSelected && 'ring-2 ring-primary ring-offset-2 border-primary bg-primary/20',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {isRecommended && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-[9px] px-1 py-0 h-4"
        >
          Cocok
        </Badge>
      )}
      <span className="font-bold text-lg">{table.name}</span>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        {table.capacity}
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary absolute top-1 right-1" />}
    </button>
  );
}
