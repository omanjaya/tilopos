import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { FileText, Receipt, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { DashboardDatePicker } from '@/features/dashboard/components/dashboard-date-picker';
import { InvoiceTab } from './invoice-tab';
import { TransactionsTab } from './transactions-tab';
import { ItemDetailsTab } from './item-details-tab';
import { InvoiceDetailModal } from './invoice-detail-modal';
import type { LucideIcon } from 'lucide-react';

type InvoicePageTab = 'invoice' | 'transactions' | 'item-details';

interface TabDef {
  id: InvoicePageTab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'transactions', label: 'Transaksi', icon: Receipt },
  { id: 'item-details', label: 'Detail Item', icon: Package },
];

export function InvoicePage() {
  const [activeTab, setActiveTab] = useState<InvoicePageTab>('invoice');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Invoice</h1>
        <DashboardDatePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Horizontal Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'invoice' && (
          <InvoiceTab
            outletId={outletId}
            startDate={startDate}
            endDate={endDate}
            onSelectInvoice={setSelectedInvoiceId}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab outletId={outletId} startDate={startDate} endDate={endDate} />
        )}
        {activeTab === 'item-details' && (
          <ItemDetailsTab outletId={outletId} startDate={startDate} endDate={endDate} />
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        open={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
}
