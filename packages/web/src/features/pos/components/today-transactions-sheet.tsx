import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { transactionsApi } from '@/api/endpoints/transactions.api';
import { formatCurrency, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    Search,
    Printer,
    Receipt,
    CheckCircle2,
    XCircle,
    RefreshCcw,
    Clock,
} from 'lucide-react';
import type { Transaction, TransactionStatus } from '@/types/transaction.types';

interface TodayTransactionsSheetProps {
    open: boolean;
    onClose: () => void;
    outletId: string;
    onPrintReceipt: (transaction: Transaction) => void;
}

const STATUS_CONFIG: Record<
    TransactionStatus,
    { label: string; color: string; icon: React.ReactNode }
> = {
    completed: {
        label: 'Selesai',
        color: 'bg-green-500/10 text-green-600',
        icon: <CheckCircle2 className="h-3 w-3" />,
    },
    voided: {
        label: 'Dibatalkan',
        color: 'bg-red-500/10 text-red-600',
        icon: <XCircle className="h-3 w-3" />,
    },
    refunded: {
        label: 'Refund',
        color: 'bg-purple-500/10 text-purple-600',
        icon: <RefreshCcw className="h-3 w-3" />,
    },
    held: {
        label: 'Ditahan',
        color: 'bg-yellow-500/10 text-yellow-600',
        icon: <Clock className="h-3 w-3" />,
    },
    partial_refund: {
        label: 'Refund Sebagian',
        color: 'bg-orange-500/10 text-orange-600',
        icon: <RefreshCcw className="h-3 w-3" />,
    },
};

export function TodayTransactionsSheet({
    open,
    onClose,
    outletId,
    onPrintReceipt,
}: TodayTransactionsSheetProps) {
    const [search, setSearch] = useState('');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const {
        data: transactions,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ['today-transactions', outletId],
        queryFn: () =>
            transactionsApi.list({
                outletId,
                startDate: startOfDay,
                endDate: endOfDay,
                limit: 100,
            }),
        enabled: open && !!outletId,
        refetchInterval: open ? 30000 : false, // Refetch every 30s when open
    });

    // Filter transactions by search
    const filteredTransactions = (transactions ?? []).filter((tx) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            tx.transactionNumber.toLowerCase().includes(searchLower) ||
            tx.items.some((item) =>
                item.productName.toLowerCase().includes(searchLower)
            )
        );
    });

    // Calculate totals
    const completedTransactions = filteredTransactions.filter(
        (tx) => tx.status === 'completed'
    );
    const totalSales = completedTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalTransactions = completedTransactions.length;

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
                <SheetHeader className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                Transaksi Hari Ini
                            </SheetTitle>
                            <SheetDescription>
                                {format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })}
                            </SheetDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            className="h-9 w-9"
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-background rounded-lg p-3 border">
                            <p className="text-xs text-muted-foreground">Total Penjualan</p>
                            <p className="text-lg font-bold text-primary">
                                {formatCurrency(totalSales)}
                            </p>
                        </div>
                        <div className="bg-background rounded-lg p-3 border">
                            <p className="text-xs text-muted-foreground">Transaksi</p>
                            <p className="text-lg font-bold">{totalTransactions}</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari no. transaksi atau produk..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </SheetHeader>

                {/* Transactions List */}
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-lg" />
                            ))
                        ) : filteredTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-muted/50 p-4 mb-3">
                                    <Receipt className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="font-medium">Belum ada transaksi</p>
                                <p className="text-sm text-muted-foreground">
                                    Transaksi hari ini akan muncul di sini
                                </p>
                            </div>
                        ) : (
                            filteredTransactions.map((transaction) => (
                                <TransactionCard
                                    key={transaction.id}
                                    transaction={transaction}
                                    onPrint={() => onPrintReceipt(transaction)}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

interface TransactionCardProps {
    transaction: Transaction;
    onPrint: () => void;
}

function TransactionCard({ transaction, onPrint }: TransactionCardProps) {
    const status = STATUS_CONFIG[transaction.status];
    const itemCount = transaction.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                            #{transaction.transactionNumber}
                        </span>
                        <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0', status.color)}
                        >
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                        </Badge>
                    </div>

                    {/* Time & Items */}
                    <p className="text-xs text-muted-foreground">
                        {formatTime(transaction.createdAt)} • {itemCount} item
                    </p>

                    {/* Items Preview */}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {transaction.items.map((i) => i.productName).join(', ')}
                    </p>
                </div>

                {/* Total & Actions */}
                <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-primary">
                        {formatCurrency(transaction.totalAmount)}
                    </span>
                    {transaction.status === 'completed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={onPrint}
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Cetak
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
