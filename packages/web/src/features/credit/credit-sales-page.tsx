import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  DollarSign,
  Users,
  AlertTriangle,
  Search,
  Filter,
  Banknote,
  Eye,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { creditApi } from '@/api/endpoints/credit.api';
import { ErrorState } from '@/components/shared/error-state';
import type { CreditSale } from '@/api/endpoints/credit.api';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { RecordPaymentModal } from './components/record-payment-modal';
import { CreditSaleDetail } from './components/credit-sale-detail';
import { AgingReport } from './components/aging-report';

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  outstanding: {
    label: 'Belum Lunas',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  partially_paid: {
    label: 'Sebagian',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  settled: {
    label: 'Lunas',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  overdue: {
    label: 'Jatuh Tempo',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

type ViewTab = 'list' | 'aging';

export function CreditSalesPage() {
  const user = useAuthStore((s) => s.user);
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('list');
  const [selectedCreditSale, setSelectedCreditSale] = useState<CreditSale | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Fetch all credit sales once (every status). The summary cards and the aging
  // report need the unfiltered list; the status filter is applied locally.
  // Totals are computed from this list (includes overdue) instead of the
  // manager-only /credit-sales/reports/outstanding endpoint.
  const {
    data: allCreditSales = [],
    isLoading: isLoadingSales,
    isError: isSalesError,
    error: salesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['credit-sales', outletId, 'all'],
    queryFn: () => creditApi.list({ outletId: outletId || undefined }),
  });

  // Summary stats (all unsettled credit sales, including overdue)
  const stats = useMemo(() => {
    const unsettled = allCreditSales.filter((cs) => cs.status !== 'settled');
    const totalOutstanding = unsettled.reduce(
      (sum, cs) => sum + Number(cs.outstandingAmount || 0),
      0,
    );
    const customerCount = new Set(unsettled.map((cs) => cs.customerId)).size;
    const overdueCount = allCreditSales.filter((cs) => cs.status === 'overdue').length;

    return { totalOutstanding, customerCount, overdueCount };
  }, [allCreditSales]);

  // Filtered sales (status + search)
  const filteredSales = useMemo(() => {
    const byStatus =
      statusFilter === 'all'
        ? allCreditSales
        : allCreditSales.filter((cs) => cs.status === statusFilter);
    if (!searchQuery) return byStatus;
    const q = searchQuery.toLowerCase();
    return byStatus.filter(
      (cs) =>
        cs.customer?.name?.toLowerCase().includes(q) ||
        cs.transaction?.receiptNumber?.toLowerCase().includes(q),
    );
  }, [allCreditSales, statusFilter, searchQuery]);

  const handlePayClick = (creditSale: CreditSale) => {
    setSelectedCreditSale(creditSale);
    setShowPaymentModal(true);
  };

  const handleDetailClick = (creditSale: CreditSale) => {
    setDetailId(creditSale.id);
    setShowDetailModal(true);
  };

  const isLoading = isLoadingSales;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-amber-600" />
          BON / Piutang
        </h1>
        <p className="text-muted-foreground">
          Kelola transaksi bon dan piutang pelanggan
        </p>
      </div>

      {isSalesError && <ErrorState error={salesError} onRetry={() => refetchSales()} />}

      {/* Summary Cards */}
      {!isSalesError && (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Piutang
            </CardTitle>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? '...' : formatCurrency(stats.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Semua piutang belum lunas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pelanggan Piutang
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.customerCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Pelanggan dengan piutang aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jatuh Tempo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : stats.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi melewati jatuh tempo
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" />
          Daftar Piutang
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'aging'}
          onClick={() => setActiveTab('aging')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'aging'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1.5" />
          Umur Piutang
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pelanggan atau no. bon..."
                aria-label="Cari pelanggan atau no. bon"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter status">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="outstanding">Belum Lunas</SelectItem>
                <SelectItem value="partially_paid">Sebagian</SelectItem>
                <SelectItem value="settled">Lunas</SelectItem>
                <SelectItem value="overdue">Jatuh Tempo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Credit Sales Table */}
          <Card>
            <CardContent className="p-0">
              {isSalesError ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Data piutang gagal dimuat.
                </div>
              ) : isLoadingSales ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">Tidak ada data piutang</p>
                  <p className="text-sm">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Coba ubah filter pencarian'
                      : 'Transaksi BON akan muncul di sini'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                          No. Bon
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                          Pelanggan
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                          Total
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                          Dibayar
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                          Sisa
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                          Tanggal
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((cs) => {
                        const defaultStatus = { label: 'Belum Lunas', className: 'bg-amber-100 text-amber-800 border-amber-200' };
                        const status =
                          statusConfig[cs.status] ?? defaultStatus;
                        return (
                          <tr
                            key={cs.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="text-sm font-mono font-medium">
                                {cs.transaction?.receiptNumber ?? '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium">
                                {cs.customer?.name ?? '-'}
                              </span>
                              {cs.customer?.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {cs.customer.phone}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm font-medium">
                                {formatCurrency(cs.totalAmount)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm text-green-600">
                                {formatCurrency(cs.paidAmount)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm font-bold text-amber-700">
                                {formatCurrency(cs.outstandingAmount)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge
                                className={`text-[10px] ${status.className}`}
                              >
                                {status.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(cs.createdAt)}
                              </span>
                              {cs.dueDate && (
                                <p className="text-xs text-muted-foreground">
                                  Tempo: {formatDate(cs.dueDate)}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {cs.status !== 'settled' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handlePayClick(cs)}
                                  >
                                    <Banknote className="h-3 w-3 mr-1" />
                                    Bayar
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleDetailClick(cs)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Detail
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <AgingReport creditSales={allCreditSales} />
      )}

      {/* Modals */}
      <RecordPaymentModal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCreditSale(null);
        }}
        creditSale={selectedCreditSale}
      />

      <CreditSaleDetail
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailId(null);
        }}
        creditSaleId={detailId}
      />
    </div>
  );
}
