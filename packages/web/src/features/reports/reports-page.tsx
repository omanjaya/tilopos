import { useState } from 'react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';
import { SalesReport } from './components/sales-report';
import { ProductReport } from './components/product-report';
import { FinancialReport } from './components/financial-report';
import { PaymentReport } from './components/payment-report';
import { InventoryReport } from './components/inventory-report';
import { KitchenReport } from './components/kitchen-report';
import { TableReport } from './components/table-report';
import { StaffReport } from './components/staff-report';
import { AppointmentReport } from './components/appointment-report';
import type { DateRange } from '@/types/report.types';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue | undefined>();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  // Feature checks for dynamic report tabs
  const {
    hasStockManagement,
    hasTableManagement,
    hasKitchenDisplay,
    hasAppointments,
    hasStaffCommission,
    isFnB,
    isService,
    isRetail,
  } = useBusinessFeatures();

  // When switching to custom, show custom date picker
  const handleDateRangeChange = (value: string) => {
    const newRange = value as DateRange;
    setDateRange(newRange);
    if (newRange !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  // Determine which specialized tabs to show based on business type
  const showInventoryTab = hasStockManagement || isRetail;
  const showKitchenTab = hasKitchenDisplay && isFnB;
  const showTableTab = hasTableManagement && isFnB;
  const showStaffTab = hasStaffCommission && isService;
  const showAppointmentTab = hasAppointments && isService;

  return (
    <div>
      <PageHeader title="Laporan" description="Analisa performa bisnis Anda">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={dateRange} onValueChange={handleDateRangeChange}>
            <TabsList>
              <TabsTrigger value="today">Hari Ini</TabsTrigger>
              <TabsTrigger value="this_week">Minggu Ini</TabsTrigger>
              <TabsTrigger value="this_month">Bulan Ini</TabsTrigger>
              <TabsTrigger value="this_year">Tahun Ini</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
          {dateRange === 'custom' && (
            <DateRangePicker
              value={customDateRange}
              onChange={setCustomDateRange}
              placeholder="Pilih rentang tanggal"
            />
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          {/* Core Reports - Always visible */}
          <TabsTrigger value="sales">Penjualan</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
          <TabsTrigger value="financial">Keuangan</TabsTrigger>
          <TabsTrigger value="payment">Pembayaran</TabsTrigger>

          {/* Retail Reports */}
          {showInventoryTab && (
            <TabsTrigger value="inventory">Inventaris</TabsTrigger>
          )}

          {/* F&B Reports */}
          {showKitchenTab && (
            <TabsTrigger value="kitchen">Dapur</TabsTrigger>
          )}
          {showTableTab && (
            <TabsTrigger value="tables">Meja</TabsTrigger>
          )}

          {/* Service Reports */}
          {showStaffTab && (
            <TabsTrigger value="staff">Staff</TabsTrigger>
          )}
          {showAppointmentTab && (
            <TabsTrigger value="appointments">Reservasi</TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          {/* Core Reports */}
          <TabsContent value="sales">
            <SalesReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          <TabsContent value="products">
            <ProductReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          {/* Retail: Inventory Report */}
          {showInventoryTab && (
            <TabsContent value="inventory">
              <InventoryReport
                outletId={outletId}
                dateRange={dateRange}
                customDateRange={customDateRange}
              />
            </TabsContent>
          )}

          {/* F&B: Kitchen Performance Report */}
          {showKitchenTab && (
            <TabsContent value="kitchen">
              <KitchenReport
                outletId={outletId}
                dateRange={dateRange}
                customDateRange={customDateRange}
              />
            </TabsContent>
          )}

          {/* F&B: Table Turnover Report */}
          {showTableTab && (
            <TabsContent value="tables">
              <TableReport
                outletId={outletId}
                dateRange={dateRange}
                customDateRange={customDateRange}
              />
            </TabsContent>
          )}

          {/* Service: Staff Performance Report */}
          {showStaffTab && (
            <TabsContent value="staff">
              <StaffReport
                outletId={outletId}
                dateRange={dateRange}
                customDateRange={customDateRange}
              />
            </TabsContent>
          )}

          {/* Service: Appointment Analytics Report */}
          {showAppointmentTab && (
            <TabsContent value="appointments">
              <AppointmentReport
                outletId={outletId}
                dateRange={dateRange}
                customDateRange={customDateRange}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
