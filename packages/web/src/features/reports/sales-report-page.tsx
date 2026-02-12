import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import {
  ClipboardList, TrendingUp, CreditCard, Package,
  FolderOpen, Tag, Calculator, Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { DashboardDatePicker } from '@/features/dashboard/components/dashboard-date-picker';
import type { SalesReportTab } from '@/types/report.types';

import { SummarySection } from './components/sales-detail/summary-section';
import { GrossProfitSection } from './components/sales-detail/gross-profit-section';
import { PaymentMethodsSection } from './components/sales-detail/payment-methods-section';
import { ItemSalesSection } from './components/sales-detail/item-sales-section';
import { CategorySalesSection } from './components/sales-detail/category-sales-section';
import { DiscountSection } from './components/sales-detail/discount-section';
import { TaxSection } from './components/sales-detail/tax-section';
import { CollectedBySection } from './components/sales-detail/collected-by-section';

interface TabDef {
  id: SalesReportTab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: 'summary', label: 'Ringkasan', icon: ClipboardList },
  { id: 'gross-profit', label: 'Laba Kotor', icon: TrendingUp },
  { id: 'payment-methods', label: 'Pembayaran', icon: CreditCard },
  { id: 'item-sales', label: 'Item', icon: Package },
  { id: 'category-sales', label: 'Kategori', icon: FolderOpen },
  { id: 'discounts', label: 'Diskon', icon: Tag },
  { id: 'taxes', label: 'Pajak', icon: Calculator },
  { id: 'collected-by', label: 'Kasir', icon: Users },
];

export function SalesReportPage() {
  const [activeTab, setActiveTab] = useState<SalesReportTab>('summary');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  const sectionProps = { outletId, startDate, endDate };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Laporan Penjualan</h1>
        <DashboardDatePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Content with sidebar */}
      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="hidden w-48 shrink-0 lg:block">
          <div className="space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {activeTab === 'summary' && <SummarySection {...sectionProps} />}
          {activeTab === 'gross-profit' && <GrossProfitSection {...sectionProps} />}
          {activeTab === 'payment-methods' && <PaymentMethodsSection {...sectionProps} />}
          {activeTab === 'item-sales' && <ItemSalesSection {...sectionProps} />}
          {activeTab === 'category-sales' && <CategorySalesSection {...sectionProps} />}
          {activeTab === 'discounts' && <DiscountSection {...sectionProps} />}
          {activeTab === 'taxes' && <TaxSection {...sectionProps} />}
          {activeTab === 'collected-by' && <CollectedBySection {...sectionProps} />}
        </div>
      </div>
    </div>
  );
}
