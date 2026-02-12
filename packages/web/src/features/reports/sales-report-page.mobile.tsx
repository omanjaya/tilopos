import { useState, useRef } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import {
  ClipboardList, TrendingUp, CreditCard, Package,
  FolderOpen, Tag, Calculator, Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
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

type DatePreset = 'today' | 'this_week' | 'this_month';

const DATE_PRESETS: { id: DatePreset; label: string; getValue: () => { from: Date; to: Date } }[] = [
  { id: 'today', label: 'Hari Ini', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { id: 'this_week', label: 'Minggu Ini', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { id: 'this_month', label: 'Bulan Ini', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
];

export function SalesReportPage() {
  const [activeTab, setActiveTab] = useState<SalesReportTab>('summary');
  const [activePreset, setActivePreset] = useState<DatePreset>('this_month');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  const sectionProps = { outletId, startDate, endDate };

  return (
    <div className="space-y-3 pb-6">
      {/* Date preset chips */}
      <div className="flex gap-2">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant={activePreset === preset.id ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => {
              setActivePreset(preset.id);
              setDateRange(preset.getValue());
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Horizontal scrollable tab chips */}
      <div ref={scrollRef} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
              activeTab === tab.id
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground',
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
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
  );
}
