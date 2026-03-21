import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export interface DataTableSort {
  sortBy: string | undefined;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
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
  /** Optional pagination — when provided, pagination controls are shown below the table */
  pagination?: DataTablePagination;
  /** Optional sorting — when provided, sortable columns become clickable */
  sort?: DataTableSort;
  /** Row ID to highlight briefly after a mutation (e.g., after create/edit) */
  highlightedRowId?: string | null;
  /** Key extractor for row identity — needed for highlightedRowId to work */
  rowId?: (row: T) => string;
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
  pagination,
  sort,
  highlightedRowId,
  rowId,
}: DataTableProps<T>) {
  const data = useMemo(() => Array.isArray(rawData) ? rawData : [], [rawData]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

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
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const isSorted = col.sortable && sort && sort.sortBy === col.key;
                return (
                  <TableHead
                    key={col.key}
                    aria-sort={isSorted ? (sort!.sortOrder === 'asc' ? 'ascending' : 'descending') : col.sortable && sort ? 'none' : undefined}
                  >
                    {col.sortable && sort ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded"
                        onClick={() => sort.onSort(col.key)}
                        aria-label={`Urutkan berdasarkan ${typeof col.header === 'string' ? col.header : col.key}`}
                      >
                        {col.header}
                        <SortIcon columnKey={col.key} sortBy={sort.sortBy} sortOrder={sort.sortOrder} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
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
                    title={searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : emptyTitle}
                    description={searchQuery ? 'Coba kata kunci lain atau hapus filter pencarian' : emptyDescription}
                    action={searchQuery ? undefined : emptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => {
                const id = rowId?.(row);
                return (
                  <TableRow
                    key={id ?? i}
                    className={cn(
                      'transition-colors',
                      highlightedRowId && id === highlightedRowId && 'row-highlight'
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key}>{col.cell(row)}</TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <PaginationControls pagination={pagination} />
      )}

      {/* Live region for screen readers — announces data count changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {!isLoading && (pagination
          ? `Menampilkan ${Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} sampai ${Math.min(pagination.page * pagination.limit, pagination.total)} dari ${pagination.total} data`
          : `${data.length} data ditampilkan`
        )}
      </div>
    </div>
  );
}

function SortIcon({ columnKey, sortBy, sortOrder }: { columnKey: string; sortBy: string | undefined; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== columnKey) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }
  if (sortOrder === 'asc') {
    return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
  }
  return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
}

function PaginationControls({ pagination }: { pagination: DataTablePagination }) {
  const { page, totalPages, total, limit, onPageChange } = pagination;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');

      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Menampilkan {start}–{end} dari {total.toLocaleString('id-ID')}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p)}
              aria-label={`Halaman ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
