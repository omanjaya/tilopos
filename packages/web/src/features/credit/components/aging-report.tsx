import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CreditSale } from '@/api/endpoints/credit.api';
import { formatCurrency } from '@/lib/format';

interface AgingReportProps {
  creditSales: CreditSale[];
}

interface AgingRow {
  customerId: string;
  customerName: string;
  current: number; // 0-30 days
  days30to60: number;
  days60to90: number;
  days90plus: number;
  total: number;
}

export function AgingReport({ creditSales }: AgingReportProps) {
  const agingData = useMemo(() => {
    const now = new Date();
    const customerMap = new Map<string, AgingRow>();

    const activeSales = creditSales.filter(
      (cs) => cs.status === 'outstanding' || cs.status === 'partially_paid' || cs.status === 'overdue',
    );

    for (const cs of activeSales) {
      const created = new Date(cs.createdAt);
      const diffDays = Math.floor(
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );
      const outstanding = cs.outstandingAmount;

      let row = customerMap.get(cs.customerId);
      if (!row) {
        row = {
          customerId: cs.customerId,
          customerName: cs.customer?.name ?? 'Unknown',
          current: 0,
          days30to60: 0,
          days60to90: 0,
          days90plus: 0,
          total: 0,
        };
        customerMap.set(cs.customerId, row);
      }

      if (diffDays <= 30) {
        row.current += outstanding;
      } else if (diffDays <= 60) {
        row.days30to60 += outstanding;
      } else if (diffDays <= 90) {
        row.days60to90 += outstanding;
      } else {
        row.days90plus += outstanding;
      }
      row.total += outstanding;
    }

    return Array.from(customerMap.values()).sort(
      (a, b) => b.total - a.total,
    );
  }, [creditSales]);

  const totals = useMemo(() => {
    return agingData.reduce(
      (acc, row) => ({
        current: acc.current + row.current,
        days30to60: acc.days30to60 + row.days30to60,
        days60to90: acc.days60to90 + row.days60to90,
        days90plus: acc.days90plus + row.days90plus,
        total: acc.total + row.total,
      }),
      { current: 0, days30to60: 0, days60to90: 0, days90plus: 0, total: 0 },
    );
  }, [agingData]);

  if (agingData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aging Piutang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Tidak ada piutang aktif
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Aging Piutang
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                  Pelanggan
                </th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                  0-30 hari
                </th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                  31-60 hari
                </th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                  61-90 hari
                </th>
                <th className="text-right py-2 px-2 font-medium text-red-600">
                  &gt;90 hari
                </th>
                <th className="text-right py-2 pl-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {agingData.map((row) => (
                <tr key={row.customerId} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{row.customerName}</td>
                  <td className="py-2 px-2 text-right">
                    {row.current > 0 ? formatCurrency(row.current) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {row.days30to60 > 0
                      ? formatCurrency(row.days30to60)
                      : '-'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {row.days60to90 > 0
                      ? formatCurrency(row.days60to90)
                      : '-'}
                  </td>
                  <td className="py-2 px-2 text-right text-red-600 font-medium">
                    {row.days90plus > 0
                      ? formatCurrency(row.days90plus)
                      : '-'}
                  </td>
                  <td className="py-2 pl-2 text-right font-bold">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 px-2 text-right">
                  {formatCurrency(totals.current)}
                </td>
                <td className="py-2 px-2 text-right">
                  {formatCurrency(totals.days30to60)}
                </td>
                <td className="py-2 px-2 text-right">
                  {formatCurrency(totals.days60to90)}
                </td>
                <td className="py-2 px-2 text-right text-red-600">
                  {formatCurrency(totals.days90plus)}
                </td>
                <td className="py-2 pl-2 text-right">
                  {formatCurrency(totals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
