import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditApi, AUDIT_PAGE_SIZE, type AuditLogRecord } from '@/api/endpoints/audit.api';
import { employeesApi } from '@/api/endpoints/employees.api';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  RotateCcw,
  DollarSign,
  Package,
  Tag,
  UserCog,
  Trash2,
} from 'lucide-react';

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  const text = JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

const TRACKED_ACTIVITIES = [
  { icon: RotateCcw, label: 'Void Transaksi', description: 'Pembatalan transaksi yang sudah diproses' },
  { icon: DollarSign, label: 'Refund', description: 'Pengembalian dana ke pelanggan' },
  { icon: Package, label: 'Perubahan Stok', description: 'Adjustment stok manual oleh staff' },
  { icon: Tag, label: 'Perubahan Harga', description: 'Perubahan harga produk atau varian' },
  { icon: UserCog, label: 'Perubahan Role', description: 'Perubahan peran/hak akses karyawan' },
  { icon: Trash2, label: 'Hapus Data', description: 'Penghapusan produk, pelanggan, atau data lainnya' },
];

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data: logs, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditApi.list({ page, limit: AUDIT_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  // The backend returns a plain array per page; a full page means there may be more.
  const hasNextPage = (logs?.length ?? 0) === AUDIT_PAGE_SIZE;
  const { data: employees } = useQuery({
    queryKey: ['employees', 'audit-lookup'],
    queryFn: () => employeesApi.list(),
  });
  const employeeName = (id: string | null) =>
    id ? (employees?.find((e) => e.id === id)?.name ?? 'Karyawan nonaktif') : 'Sistem';

  const auditColumns: Column<AuditLogRecord>[] = [
    { key: 'createdAt', header: 'Waktu', cell: (row) => formatDateTime(row.createdAt) },
    { key: 'employeeId', header: 'Pengguna', cell: (row) => employeeName(row.employeeId) },
    { key: 'action', header: 'Aksi', cell: (row) => row.action },
    {
      key: 'entity',
      header: 'Data',
      cell: (row) => `${row.entityType}${row.entityId ? ` #${row.entityId.slice(0, 8)}` : ''}`,
    },
    { key: 'oldValue', header: 'Nilai Lama', cell: (row) => formatValue(row.oldValue) },
    { key: 'newValue', header: 'Nilai Baru', cell: (row) => formatValue(row.newValue) },
  ];

  return (
    <div>
      <PageHeader title="Audit Trail" description="Log aktivitas sensitif" />

      {/* Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Tentang Audit Trail</CardTitle>
              <p className="text-sm text-muted-foreground">
                Audit trail mencatat semua aktivitas sensitif seperti void transaksi, refund,
                perubahan stok, dan perubahan harga.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h4 className="mb-3 text-sm font-medium">Aktivitas yang dilacak:</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKED_ACTIVITIES.map((activity) => (
              <div key={activity.label} className="flex items-start gap-3 rounded-lg border p-3">
                <activity.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{activity.label}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Audit (30 hari terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<AuditLogRecord>
            columns={auditColumns}
            data={logs ?? []}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            emptyTitle="Belum ada log audit"
            emptyDescription="Belum ada aktivitas sensitif yang tercatat dalam 30 hari terakhir."
          />
          {(page > 1 || hasNextPage) && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">Halaman {page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
