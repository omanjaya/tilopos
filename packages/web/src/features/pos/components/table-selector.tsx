import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, LayoutGrid, X, Check, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { apiClient } from '@/api/client';

// Table types
export interface Table {
    id: string;
    name: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'maintenance';
    section?: string;
    currentOrderId?: string;
    occupiedAt?: string;
}

interface TableSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelect: (table: Table | null) => void;
    selectedTableId?: string;
    outletId: string;
}

// API for tables
const tablesApi = {
    list: (outletId: string) =>
        apiClient.get<Table[]>(`/tables`, { params: { outletId } }).then((r) => r.data),
};

export function TableSelector({
    open,
    onClose,
    onSelect,
    selectedTableId,
    outletId,
}: TableSelectorProps) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'available'>('all');

    const { data: tables = [], isLoading } = useQuery({
        queryKey: ['tables', outletId],
        queryFn: () => tablesApi.list(outletId),
        enabled: open && !!outletId,
    });

    const filteredTables = useMemo(() => {
        let result = tables;

        // Filter by availability
        if (filter === 'available') {
            result = result.filter((t) => t.status === 'available');
        }

        // Filter by search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.section?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [tables, search, filter]);

    // Group by section
    const groupedTables = useMemo(() => {
        const groups: Record<string, Table[]> = {};
        filteredTables.forEach((table) => {
            const section = table.section || 'Lainnya';
            if (!groups[section]) groups[section] = [];
            groups[section].push(table);
        });
        return groups;
    }, [filteredTables]);

    const handleSelect = (table: Table) => {
        if (table.status !== 'available' && table.id !== selectedTableId) return;
        onSelect(table);
        onClose();
    };

    const handleClear = () => {
        onSelect(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        Pilih Meja
                    </DialogTitle>
                    <DialogDescription>
                        Pilih meja untuk pesanan dine-in
                    </DialogDescription>
                </DialogHeader>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari meja..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            Semua
                        </Button>
                        <Button
                            variant={filter === 'available' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('available')}
                        >
                            Tersedia
                        </Button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span>Tersedia</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span>Terisi</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span>Reserved</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-gray-400" />
                        <span>Maintenance</span>
                    </div>
                </div>

                {/* Table Grid */}
                <ScrollArea className="h-[400px] -mx-6 px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : Object.keys(groupedTables).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">Tidak ada meja</p>
                            <p className="text-sm">
                                {search ? 'Coba kata kunci lain' : 'Belum ada data meja'}
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
                                                onSelect={() => handleSelect(table)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                    {selectedTableId && (
                        <Button variant="outline" onClick={handleClear} className="gap-2">
                            <X className="h-4 w-4" />
                            Hapus Pilihan
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onClose} className="ml-auto">
                        Tutup
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface TableCardProps {
    table: Table;
    isSelected: boolean;
    onSelect: () => void;
}

function TableCard({ table, isSelected, onSelect }: TableCardProps) {
    const statusColors = {
        available: 'border-green-500 bg-green-500/10 hover:bg-green-500/20',
        occupied: 'border-red-500 bg-red-500/10 opacity-60',
        reserved: 'border-yellow-500 bg-yellow-500/10 opacity-60',
        maintenance: 'border-gray-400 bg-gray-400/10 opacity-40',
    };

    const isDisabled = table.status !== 'available' && !isSelected;

    return (
        <button
            onClick={onSelect}
            disabled={isDisabled}
            className={cn(
                'aspect-square p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1',
                statusColors[table.status],
                isSelected && 'ring-2 ring-primary ring-offset-2 border-primary bg-primary/20',
                isDisabled && 'cursor-not-allowed'
            )}
        >
            <span className="font-bold text-lg">{table.name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {table.capacity}
            </div>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
            {table.status === 'occupied' && table.occupiedAt && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                    <Clock className="h-3 w-3" />
                    {getElapsedTime(table.occupiedAt)}
                </div>
            )}
        </button>
    );
}

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
