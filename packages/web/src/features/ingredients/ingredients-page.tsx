import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/shared/metric-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Egg,
  BookOpen,
  AlertTriangle,
  Beaker,
  CookingPot,
  Construction,
} from 'lucide-react';

export function IngredientsPage() {
  return (
    <div>
      <PageHeader title="Bahan & Resep" description="Kelola bahan baku dan resep produk" />

      {/* Metric Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Bahan" value="0" icon={Egg} description="Bahan baku terdaftar" />
        <MetricCard title="Total Resep" value="0" icon={BookOpen} description="Resep produk aktif" />
        <MetricCard
          title="Bahan Stok Rendah"
          value="0"
          icon={AlertTriangle}
          description="Perlu restok"
        />
      </div>

      {/* Bahan Baku Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Beaker className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Bahan Baku</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Kelola bahan baku mentah dan pantau stok secara otomatis saat produk terjual
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Construction className="h-3 w-3" />
              Segera Hadir
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-4">
            <div className="mb-4 space-y-2 text-sm text-muted-foreground">
              <p>Fitur manajemen bahan baku memungkinkan Anda untuk:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Mendaftarkan bahan baku mentah (tepung, gula, susu, dll.)</li>
                <li>Melacak stok bahan baku per outlet</li>
                <li>Auto-deduct bahan baku saat produk terjual berdasarkan resep</li>
                <li>Notifikasi otomatis saat stok bahan rendah</li>
              </ul>
            </div>
            <EmptyState
              icon={Beaker}
              title="Fitur manajemen bahan baku sedang dalam pengembangan"
              description="Anda akan segera dapat mengelola bahan baku dan melacak stok secara otomatis."
            />
          </div>
        </CardContent>
      </Card>

      {/* Resep Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CookingPot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Resep</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Buat resep produk dengan komposisi bahan baku yang tepat
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Construction className="h-3 w-3" />
              Segera Hadir
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-4">
            <div className="mb-4 space-y-2 text-sm text-muted-foreground">
              <p>Fitur resep builder memungkinkan Anda untuk:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Membuat resep dengan komposisi bahan baku dan takaran</li>
                <li>Menghubungkan resep ke produk untuk auto-deduct</li>
                <li>Menghitung HPP (Harga Pokok Penjualan) otomatis</li>
                <li>Menduplikasi dan memodifikasi resep dengan mudah</li>
              </ul>
            </div>
            <EmptyState
              icon={CookingPot}
              title="Fitur resep builder sedang dalam pengembangan"
              description="Anda akan segera dapat membuat resep dan menghubungkannya ke produk."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
