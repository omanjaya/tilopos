import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { DashboardItemSummary } from '@/types/report.types';

interface ItemSummarySectionProps {
  data?: DashboardItemSummary;
  isLoading: boolean;
  className?: string;
}

type ItemTab = 'top_items' | 'cat_volume' | 'cat_sales' | 'cat_items';

export function ItemSummarySection({ data, isLoading, className }: ItemSummarySectionProps) {
  const [tab, setTab] = useState<ItemTab>('top_items');

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5 ${className}`}>
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-10 w-full mb-4 rounded-lg" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-sm font-semibold">Ringkasan Item</h3>
        <Tabs value={tab} onValueChange={(v) => setTab(v as ItemTab)}>
          <TabsList className="h-8">
            <TabsTrigger value="top_items" className="text-xs px-2.5">Top Items</TabsTrigger>
            <TabsTrigger value="cat_volume" className="text-xs px-2.5">Kategori (Volume)</TabsTrigger>
            <TabsTrigger value="cat_sales" className="text-xs px-2.5">Kategori (Sales)</TabsTrigger>
            <TabsTrigger value="cat_items" className="text-xs px-2.5">Per Kategori</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === 'top_items' && <TopItemsTab items={data?.topItems ?? []} />}
      {tab === 'cat_volume' && <CategoryTab items={data?.categoryByVolume ?? []} mode="volume" />}
      {tab === 'cat_sales' && <CategoryTab items={data?.categoryBySales ?? []} mode="sales" />}
      {tab === 'cat_items' && <CategoryItemsTab data={data?.topItemsByCategory ?? []} />}
    </div>
  );
}

function TopItemsTab({ items }: { items: DashboardItemSummary['topItems'] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Belum ada data</p>;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_5rem_6rem] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2">
        <span>#</span>
        <span>Produk</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Penjualan</span>
      </div>
      {items.slice(0, 15).map((item, i) => (
        <div
          key={item.productId}
          className="grid grid-cols-[2rem_1fr_5rem_6rem] gap-2 items-center rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{item.category}</p>
          </div>
          <span className="text-right text-sm tabular-nums">{formatNumber(item.quantitySold)}</span>
          <span className="text-right text-sm font-medium tabular-nums">{formatCurrency(item.grossSales)}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryTab({ items, mode }: { items: { category: string; totalQuantity?: number; totalSales?: number; percentage: number }[]; mode: 'volume' | 'sales' }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Belum ada data</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((cat) => {
        const value = mode === 'volume'
          ? formatNumber(cat.totalQuantity ?? 0)
          : formatCurrency(cat.totalSales ?? 0);
        return (
          <div key={cat.category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{cat.category}</span>
              <span className="text-muted-foreground tabular-nums">
                {value} ({cat.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryItemsTab({ data }: { data: DashboardItemSummary['topItemsByCategory'] }) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Belum ada data</p>;
  }

  return (
    <div className="space-y-4">
      {data.slice(0, 8).map((cat) => (
        <div key={cat.category}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {cat.category}
          </h4>
          <div className="space-y-1">
            {cat.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/40 transition-colors">
                <span className="truncate flex-1">{item.name}</span>
                <span className="text-muted-foreground tabular-nums ml-2">{formatNumber(item.quantitySold)} pcs</span>
                <span className="font-medium tabular-nums ml-3">{formatCurrency(item.grossSales)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
