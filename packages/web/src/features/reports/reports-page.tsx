import { useState } from 'react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SalesReport } from './components/sales-report';
import { ProductReport } from './components/product-report';
import { FinancialReport } from './components/financial-report';
import { PaymentReport } from './components/payment-report';
import type { DateRange } from '@/types/report.types';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  return (
    <div>
      <PageHeader title="Laporan" description="Analisa performa bisnis Anda">
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <TabsList>
            <TabsTrigger value="today">Hari Ini</TabsTrigger>
            <TabsTrigger value="this_week">Minggu Ini</TabsTrigger>
            <TabsTrigger value="this_month">Bulan Ini</TabsTrigger>
            <TabsTrigger value="this_year">Tahun Ini</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Penjualan</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
          <TabsTrigger value="financial">Keuangan</TabsTrigger>
          <TabsTrigger value="payment">Pembayaran</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="sales">
            <SalesReport outletId={outletId} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="products">
            <ProductReport outletId={outletId} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialReport outletId={outletId} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentReport outletId={outletId} dateRange={dateRange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
