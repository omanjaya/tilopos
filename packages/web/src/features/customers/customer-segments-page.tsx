import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/endpoints/customers.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { Eye, Loader2 } from 'lucide-react';
import type {
  CustomerSegmentSummary,
  SegmentCode,
  SegmentCustomer,
} from '@/types/customer.types';

/**
 * Segments are computed by the backend (GET /customers/segments). The backend
 * sends English labels, so they are translated here by segment code.
 */
const SEGMENT_TEXT: Record<SegmentCode, { name: string; description: string }> = {
  new: { name: 'Pelanggan Baru', description: 'Terdaftar dalam 30 hari terakhir' },
  returning: { name: 'Pelanggan Setia', description: '3 transaksi atau lebih' },
  vip: { name: 'Pelanggan VIP', description: '10% teratas berdasarkan total belanja' },
  'at-risk': { name: 'Berisiko', description: 'Tidak bertransaksi dalam 60-90 hari' },
  inactive: { name: 'Tidak Aktif', description: 'Tidak bertransaksi lebih dari 90 hari' },
};

function segmentName(s: CustomerSegmentSummary): string {
  return SEGMENT_TEXT[s.segment]?.name ?? s.label;
}

function segmentDescription(s: CustomerSegmentSummary): string {
  return SEGMENT_TEXT[s.segment]?.description ?? s.description;
}

export function CustomerSegmentsPage() {
  const [viewTarget, setViewTarget] = useState<CustomerSegmentSummary | null>(null);

  const {
    data: segmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customerSegments'],
    queryFn: () => customersApi.listSegments(),
  });

  const {
    data: segmentCustomers,
    isLoading: isLoadingCustomers,
    isError: isCustomersError,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['segmentCustomers', viewTarget?.segment],
    queryFn: () => customersApi.getSegmentCustomers(viewTarget!.segment),
    enabled: !!viewTarget,
  });

  const columns: Column<CustomerSegmentSummary>[] = [
    {
      key: 'name',
      header: 'Nama Segmen',
      cell: (row) => <span className="font-medium">{segmentName(row)}</span>,
    },
    {
      key: 'description',
      header: 'Kriteria',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{segmentDescription(row)}</span>
      ),
    },
    {
      key: 'count',
      header: 'Jumlah Pelanggan',
      cell: (row) => row.count.toLocaleString('id-ID'),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setViewTarget(row)}>
          <Eye className="mr-2 h-4 w-4" /> Lihat Pelanggan
        </Button>
      ),
    },
  ];

  const customerColumns: Column<SegmentCustomer>[] = [
    { key: 'name', header: 'Nama', cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', header: 'Email', cell: (row) => <span className="text-muted-foreground">{row.email ?? '-'}</span> },
    { key: 'phone', header: 'Telepon', cell: (row) => <span className="text-muted-foreground">{row.phone ?? '-'}</span> },
    { key: 'totalSpent', header: 'Total Belanja', cell: (row) => formatCurrency(Number(row.totalSpent)) },
    { key: 'visitCount', header: 'Kunjungan', cell: (row) => row.visitCount },
  ];

  return (
    <div>
      <PageHeader
        title="Segmen Pelanggan"
        description={
          segmentsData
            ? `Segmentasi otomatis dari ${segmentsData.totalCustomers.toLocaleString('id-ID')} pelanggan aktif`
            : 'Segmentasi pelanggan otomatis berdasarkan riwayat transaksi'
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={segmentsData?.segments ?? []}
          isLoading={isLoading}
          emptyTitle="Belum ada segmen"
          emptyDescription="Segmen akan muncul setelah ada data pelanggan."
        />
      )}

      {/* View Segment Customers Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => { if (!open) setViewTarget(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pelanggan di Segmen "{viewTarget ? segmentName(viewTarget) : ''}"</DialogTitle>
            <DialogDescription>
              {viewTarget && `${segmentDescription(viewTarget)} - ${viewTarget.count} pelanggan`}
            </DialogDescription>
          </DialogHeader>

          {isLoadingCustomers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Memuat" />
            </div>
          ) : isCustomersError ? (
            <ErrorState error={customersError} onRetry={() => refetchCustomers()} />
          ) : segmentCustomers && segmentCustomers.length > 0 ? (
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {customerColumns.map((col) => (
                      <TableHead key={col.key}>{col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      {customerColumns.map((col) => (
                        <TableCell key={col.key}>{col.cell(customer)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada pelanggan yang memenuhi kriteria segmen ini.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
