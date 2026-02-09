import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  filters?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data: rawData,
  isLoading,
  searchPlaceholder = 'Cari...',
  onSearch,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Data belum tersedia.',
  emptyAction,
  filters,
}: DataTableProps<T>) {
  const data = useMemo(() => Array.isArray(rawData) ? rawData : [], [rawData]);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if table is in view and has data
      if (isLoading || data.length === 0) return;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedRowIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, data.length - 1);
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedRowIndex((prev) => {
            if (prev === null || prev === 0) return 0;
            return prev - 1;
          });
          break;

        case 'Enter':
          e.preventDefault();
          if (focusedRowIndex !== null) {
            // Find the first focusable element in the focused row
            const row = tableRef.current?.querySelector(
              `tbody tr:nth-child(${focusedRowIndex + 1})`
            );
            const focusable = row?.querySelector<HTMLElement>(
              'button, a, [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
          }
          break;

        case 'Escape':
          e.preventDefault();
          setFocusedRowIndex(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data.length, focusedRowIndex, isLoading]);

  // Reset focus when data changes
  useEffect(() => {
    setFocusedRowIndex(null);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {onSearch && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {filters}
      </div>

      <div className="rounded-md border">
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow
                  key={i}
                  className={cn(
                    'transition-colors',
                    focusedRowIndex === i && 'ring-2 ring-primary ring-inset bg-accent/50'
                  )}
                  tabIndex={focusedRowIndex === i ? 0 : -1}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
