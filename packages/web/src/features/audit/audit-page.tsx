import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  RotateCcw,
  DollarSign,
  Package,
  Tag,
  UserCog,
  Trash2,
  Construction,
} from 'lucide-react';

interface AuditLogRow {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail: string;
  oldValue: string;
  newValue: string;
}

const TRACKED_ACTIVITIES = [
  { icon: RotateCcw, label: 'Void Transaksi', description: 'Pembatalan transaksi yang sudah diproses' },
  { icon: DollarSign, label: 'Refund', description: 'Pengembalian dana ke pelanggan' },
  { icon: Package, label: 'Perubahan Stok', description: 'Adjustment stok manual oleh staff' },
  { icon: Tag, label: 'Perubahan Harga', description: 'Perubahan harga produk atau varian' },
  { icon: UserCog, label: 'Perubahan Role', description: 'Perubahan peran/hak akses karyawan' },
  { icon: Trash2, label: 'Hapus Data', description: 'Penghapusan produk, pelanggan, atau data lainnya' },
];

const auditColumns: Column<AuditLogRow>[] = [
  { key: 'timestamp', header: 'Waktu', cell: (row) => row.timestamp },
  { key: 'user', header: 'Pengguna', cell: (row) => row.user },
  { key: 'action', header: 'Aksi', cell: (row) => row.action },
  { key: 'detail', header: 'Detail', cell: (row) => row.detail },
  { key: 'oldValue', header: 'Nilai Lama', cell: (row) => row.oldValue },
  { key: 'newValue', header: 'Nilai Baru', cell: (row) => row.newValue },
];

export function AuditPage() {
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

      {/* Placeholder Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Log Audit</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Construction className="h-3 w-3" />
              Dalam Pengembangan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<AuditLogRow>
            columns={auditColumns}
            data={[]}
            isLoading={false}
            emptyTitle="Fitur audit trail viewer sedang dalam pengembangan"
            emptyDescription="Log audit dicatat secara otomatis di server. Viewer akan segera tersedia."
          />
        </CardContent>
      </Card>
    </div>
  );
}
