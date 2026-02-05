import { useState } from 'react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { Calendar, ChevronDown } from 'lucide-react';
import { SalesReport } from './components/sales-report';
import { ProductReport } from './components/product-report';
import { FinancialReport } from './components/financial-report';
import { PaymentReport } from './components/payment-report';
import type { DateRange } from '@/types/report.types';

/**
 * ReportsPage Mobile Version
 *
 * Mobile-optimized reports with:
 * - Compact date range selector (bottom sheet)
 * - Horizontal tabs for report types
 * - Vertical scroll layout
 * - Reuses desktop report components (already responsive)
 */

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'this_week', label: 'Minggu Ini' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'this_year', label: 'Tahun Ini' },
  { value: 'custom', label: 'Custom' },
];

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue | undefined>();
  const [dateRangeSheetOpen, setDateRangeSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  // Get label for current date range
  const currentDateRangeLabel =
    DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)?.label || 'Pilih Periode';

  // Handle date range change
  const handleDateRangeChange = (value: DateRange) => {
    setDateRange(value);
    if (value !== 'custom') {
      setCustomDateRange(undefined);
      setDateRangeSheetOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Laporan</h1>
              <p className="text-sm text-muted-foreground">
                Analisa performa bisnis
              </p>
            </div>
          </div>

          {/* Date Range Selector Button */}
          <Sheet open={dateRangeSheetOpen} onOpenChange={setDateRangeSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-10 mb-3"
                aria-label="Pilih periode laporan"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{currentDateRangeLabel}</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Pilih Periode</SheetTitle>
                <SheetDescription>
                  Pilih rentang waktu untuk laporan
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-2">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={dateRange === option.value ? 'default' : 'outline'}
                    className="w-full h-12 justify-start"
                    onClick={() => handleDateRangeChange(option.value)}
                  >
                    {dateRange === option.value && (
                      <div className="mr-2 h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                    {option.label}
                  </Button>
                ))}

                {/* Custom Date Range Picker */}
                {dateRange === 'custom' && (
                  <div className="pt-4">
                    <DateRangePicker
                      value={customDateRange}
                      onChange={(range) => {
                        setCustomDateRange(range);
                        if (range?.from && range?.to) {
                          setDateRangeSheetOpen(false);
                        }
                      }}
                      placeholder="Pilih rentang tanggal"
                    />
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Report Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto">
              <TabsTrigger value="sales" className="text-xs py-2">
                Penjualan
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs py-2">
                Produk
              </TabsTrigger>
              <TabsTrigger value="financial" className="text-xs py-2">
                Keuangan
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-xs py-2">
                Pembayaran
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Tabs value={activeTab}>
          <TabsContent value="sales" className="mt-0">
            <SalesReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          <TabsContent value="products" className="mt-0">
            <ProductReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-0">
            <FinancialReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>

          <TabsContent value="payment" className="mt-0">
            <PaymentReport
              outletId={outletId}
              dateRange={dateRange}
              customDateRange={customDateRange}
            />
          </TabsContent>
        </Tabs>

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />
    </div>
  );
}
