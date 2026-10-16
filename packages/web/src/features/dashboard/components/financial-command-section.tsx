import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialCommandApi } from '@/api/endpoints/financial-command.api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/format';
import type { DateRange } from '@/types/report.types';
import { ErrorState } from '@/components/shared/error-state';
import { paymentMethodLabel } from '@/lib/payment-method-labels';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShoppingBag,
  Receipt,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FinancialCommandSectionProps {
  dateRange: DateRange;
}

const CONTRA_REVENUE_LABELS: Record<string, string> = {
  Refunds: 'Refund',
  Discounts: 'Diskon',
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function FinancialCommandSection({ dateRange }: FinancialCommandSectionProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'outlets' | 'cash-flow'>('overview');

  // Revenue & Expense
  const { data: revenueExpense, isLoading: revenueLoading, error: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ['financial-command', 'revenue-expense', dateRange],
    queryFn: () => financialCommandApi.getRevenueExpense({ dateRange }),
  });

  // Profit by Outlet
  const { data: profitByOutlet, isLoading: outletLoading, error: outletError, refetch: refetchOutlet } = useQuery({
    queryKey: ['financial-command', 'profit-by-outlet', dateRange],
    queryFn: () => financialCommandApi.getProfitByOutlet({ dateRange }),
  });

  // Cash Flow
  const { data: cashFlow, isLoading: cashFlowLoading, error: cashFlowError, refetch: refetchCashFlow } = useQuery({
    queryKey: ['financial-command', 'cash-flow', dateRange],
    queryFn: () => financialCommandApi.getCashFlow({ dateRange }),
  });

  // Payment Methods
  const { data: paymentMethods, isLoading: paymentLoading, error: paymentError, refetch: refetchPayment } = useQuery({
    queryKey: ['financial-command', 'payment-methods', dateRange],
    queryFn: () => financialCommandApi.getPaymentMethodsAnalysis({ dateRange }),
  });

  // Expense Categories
  const { data: expenseCategories, isLoading: expenseLoading, error: expenseError, refetch: refetchExpense } = useQuery({
    queryKey: ['financial-command', 'expense-categories', dateRange],
    queryFn: () => financialCommandApi.getExpenseCategories({ dateRange }),
  });

  const isLoading = revenueLoading || outletLoading || cashFlowLoading;
  const queryError = revenueError || outletError || cashFlowError || paymentError || expenseError;

  // Prepare chart data
  const revenueExpenseChartData = revenueExpense?.revenueByDate.map((rev) => {
    const expense = revenueExpense.expensesByDate.find((exp) => exp.date === rev.date);
    return {
      date: new Date(rev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      Pendapatan: rev.revenue,
      Pengeluaran: expense?.expenses || 0,
      Laba: rev.revenue - (expense?.expenses || 0),
    };
  }) || [];

  const cashFlowChartData = cashFlow?.cashFlowByDate.map((cf) => ({
    date: new Date(cf.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    'Kas Masuk': cf.cashIn,
    'Kas Keluar': cf.cashOut,
    'Arus Bersih': cf.netCashFlow,
  })) || [];

  const paymentMethodsPieData = paymentMethods?.methods.map((m) => ({
    name: paymentMethodLabel(m.method),
    value: m.totalAmount,
  })) || [];

  if (queryError) {
    return (
      <ErrorState
        title="Gagal memuat data keuangan"
        error={queryError}
        onRetry={() => {
          void refetchRevenue();
          void refetchOutlet();
          void refetchCashFlow();
          void refetchPayment();
          void refetchExpense();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Net Profit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Laba Bersih
              </CardTitle>
              {revenueExpense && revenueExpense.netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${
                  revenueExpense && revenueExpense.netProfit >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatCurrency(revenueExpense?.netProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margin: {(revenueExpense?.profitMargin ?? 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pendapatan
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(revenueExpense?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Penjualan periode ini</p>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pengeluaran
              </CardTitle>
              <Receipt className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(revenueExpense?.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Harga pokok penjualan (HPP) periode ini</p>
            </CardContent>
          </Card>

          {/* Cash Flow */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Arus Kas Bersih
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${
                  cashFlow && cashFlow.netCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(cashFlow?.netCashFlow || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Aliran kas bersih</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Tabs */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as typeof selectedView)}>
        <TabsList>
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="outlets">Per Outlet</TabsTrigger>
          <TabsTrigger value="cash-flow">Arus Kas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue vs Expenses Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Pendapatan vs Pengeluaran</CardTitle>
              <CardDescription>Trend penjualan dan pengeluaran</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="h-80" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={revenueExpenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Pendapatan"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Pengeluaran"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Laba"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Metode Pembayaran
              </CardTitle>
              <CardDescription>Distribusi metode pembayaran</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <RechartsPieChart>
                    <Pie
                      data={paymentMethodsPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsPieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Expense Categories Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Kategori Pengeluaran
              </CardTitle>
              <CardDescription>Beban (HPP), pengurang pendapatan, dan pembelian</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="space-y-3">
                  {expenseCategories?.categories.map((category, index) => {
                    const percentage = expenseCategories.totalExpenses > 0
                      ? (category.amount / expenseCategories.totalExpenses) * 100
                      : 0;

                    return (
                      <div key={category.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{category.category}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(category.amount)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    );
                  })}

                  {/* Refunds/discounts reduce revenue; they are not expenses */}
                  {expenseCategories && expenseCategories.contraRevenue.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Pengurang Pendapatan</p>
                      {expenseCategories.contraRevenue.map((item) => (
                        <div key={item.category}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{CONTRA_REVENUE_LABELS[item.category] ?? item.category}</span>
                            <span className="font-bold">{formatCurrency(item.amount)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Supplier purchases: cash out, informational only */}
                  {expenseCategories && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Pembelian Supplier</span>
                        <span className="font-bold">{formatCurrency(expenseCategories.purchases.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{expenseCategories.purchases.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outlets View */}
      {selectedView === 'outlets' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laba per Outlet</CardTitle>
            <CardDescription>Analisis profitabilitas per cabang</CardDescription>
          </CardHeader>
          <CardContent>
            {outletLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : profitByOutlet && profitByOutlet.outlets.length > 0 ? (
              <div className="space-y-4">
                {profitByOutlet.outlets.map((outlet, index) => (
                  <div
                    key={outlet.outletId}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-lg">{outlet.outletName}</p>
                          <p className="text-sm text-muted-foreground">
                            Margin: {outlet.profitMargin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-2xl font-bold ${
                            outlet.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(outlet.profit)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          {outlet.profit >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-600" />
                          )}
                          <span>Laba Bersih</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-emerald-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pendapatan</p>
                          <p className="font-semibold">{formatCurrency(outlet.revenue)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-3 w-3 text-red-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pengeluaran</p>
                          <p className="font-semibold">{formatCurrency(outlet.expenses)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-3 w-3 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">HPP</p>
                          <p className="font-semibold">{formatCurrency(outlet.breakdown?.cogs ?? 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Belum ada data outlet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cash Flow View */}
      {selectedView === 'cash-flow' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cash Flow Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Tren Arus Kas</CardTitle>
              <CardDescription>Aliran kas masuk dan keluar</CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <Skeleton className="h-80" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="Kas Masuk" fill="#10b981" />
                    <Bar dataKey="Kas Keluar" fill="#ef4444" />
                    <Bar dataKey="Arus Bersih" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cash In by Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kas Masuk per Metode</CardTitle>
              <CardDescription>Penerimaan per metode pembayaran</CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {cashFlow?.cashInByMethod.map((method, _index) => {
                    const percentage = cashFlow.totalCashIn > 0
                      ? (method.amount / cashFlow.totalCashIn) * 100
                      : 0;

                    return (
                      <div key={method.method} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{paymentMethodLabel(method.method)}</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(method.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Arus Kas</CardTitle>
              <CardDescription>Ringkasan aliran kas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Total Kas Masuk</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(cashFlow?.totalCashIn || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Total Kas Keluar</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(cashFlow?.totalCashOut || 0)}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    cashFlow && cashFlow.netCashFlow >= 0
                      ? 'bg-blue-50'
                      : 'bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet
                      className={`h-5 w-5 ${
                        cashFlow && cashFlow.netCashFlow >= 0
                          ? 'text-blue-600'
                          : 'text-yellow-600'
                      }`}
                    />
                    <span className="font-medium">Arus Kas Bersih</span>
                  </div>
                  <span
                    className={`text-xl font-bold ${
                      cashFlow && cashFlow.netCashFlow >= 0
                        ? 'text-blue-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {formatCurrency(cashFlow?.netCashFlow || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
