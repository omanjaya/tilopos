import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface TaxSectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

function Row({ label, value, isBold }: { label: string; value: string; isBold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${isBold ? 'border-t font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm tabular-nums ${isBold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

export function TaxSection({ outletId, startDate, endDate }: TaxSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'sales-summary', outletId, startDate, endDate],
    queryFn: () => reportsApi.salesSummary({ outletId, startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data pajak untuk periode ini</div>;
  }

  const totalTaxAndCharge = data.taxAmount + data.serviceCharge;

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">Pajak & Service Charge</h3>
      <div className="divide-y rounded-lg border bg-card p-4">
        <Row label="Pajak (PPN)" value={formatCurrency(data.taxAmount)} />
        <Row label="Service Charge" value={formatCurrency(data.serviceCharge)} />
        <Row label="Total Pajak & Charge" value={formatCurrency(totalTaxAndCharge)} isBold />
      </div>

      <div className="mt-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          Pajak dan service charge dihitung dari seluruh transaksi penjualan yang selesai pada periode yang dipilih.
          Penjualan bersih (sebelum pajak): {formatCurrency(data.netSales)}
        </p>
      </div>
    </div>
  );
}
