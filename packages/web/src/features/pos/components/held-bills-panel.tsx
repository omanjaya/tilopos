import { ErrorState } from '@/components/shared/error-state';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { FileText, Play, Trash2, Clock, User, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { formatCurrency } from '@/lib/format';

import type { HeldBill } from '@/types/pos.types';

interface HeldBillsPanelProps {
    busy?: boolean;
    isLoading?: boolean;
    error?: unknown;
    onRetry?: () => void;
    isOffline?: boolean;
    legacyCount?: number;
    onAdoptLegacy?: () => void;
    bills: HeldBill[];
    open: boolean;
    onClose: () => void;
    onResume: (bill: HeldBill) => void;
    onDelete: (billId: string) => void;
}

export function HeldBillsPanel({
    bills,
    open,
    onClose,
    onResume,
    onDelete, busy, isLoading, error, onRetry, isOffline, legacyCount = 0, onAdoptLegacy,
}: HeldBillsPanelProps) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Pesanan Ditahan
                        <Badge variant="secondary" className="ml-2">
                            {bills.length} pesanan
                        </Badge>
                    </DialogTitle>
                    <DialogDescription className="sr-only">Daftar pesanan yang ditahan</DialogDescription>
                </DialogHeader>

                {isOffline && <p className="text-sm text-muted-foreground">Offline: hanya pesanan lokal yang belum pernah dikirim yang dapat dilanjutkan.</p>}
                {isLoading && <p role="status" className="text-sm">Memuat dan menyinkronkan pesanan…</p>}
                {!!error && <ErrorState title="Gagal menyinkronkan pesanan" description="Salinan lokal tetap tersimpan. Coba lagi saat koneksi tersedia." onRetry={onRetry} />}
                {legacyCount > 0 && <div className="text-sm space-y-2">
                    <p>{legacyCount} pesanan lokal lama belum memiliki outlet. Pastikan outlet saat ini adalah outlet asal pesanan.</p>
                    <Button variant="outline" disabled={busy} onClick={() => {
                        if (window.confirm('Tetapkan pesanan lokal lama bisnis ini ke outlet yang sedang dipilih?')) onAdoptLegacy?.();
                    }}>Tetapkan ke outlet ini</Button>
                </div>}
                <div className="flex-1 overflow-auto -mx-6 px-6">
                    {bills.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <FileText className="h-16 w-16 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Tidak ada pesanan ditahan</p>
                            <p className="text-sm">Pesanan yang ditahan akan muncul di sini</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bills.map((bill) => (
                                <HeldBillCard
                                    key={bill.id}
                                    bill={bill}
                                    busy={busy} isOffline={isOffline}
                                    onResume={() => onResume(bill)}
                                    onDelete={() => onDelete(bill.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface HeldBillCardProps {
    busy?: boolean;
    isOffline?: boolean;
    bill: HeldBill;
    onResume: () => void;
    onDelete: () => void;
}

function HeldBillCard({ bill, onResume, onDelete, busy, isOffline }: HeldBillCardProps) {
    const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0);
    // Display estimate only (items minus the bill discount, before tax/service);
    // the payable total is recalculated when the bill is resumed. Rounded to rupiah.
    const itemsSubtotal = Math.round(bill.items.reduce((sum, item) => {
        const modifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
        return sum + (item.price + modifiersTotal) * item.quantity;
    }, 0));
    const billDiscount = bill.discountPercent
        ? Math.round((itemsSubtotal * Math.min(bill.discountPercent, 100)) / 100)
        : Math.min(bill.discountAmount ?? 0, itemsSubtotal);
    const total = bill.subtotal !== undefined ? bill.subtotal - (bill.discountTotal ?? billDiscount) : itemsSubtotal - billDiscount;

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {bill.tableName && (
                                <Badge variant="outline" className="gap-1">
                                    <Table className="h-3 w-3" />
                                    {bill.tableName}
                                </Badge>
                            )}
                            {bill.customerName && (
                                <Badge variant="outline" className="gap-1">
                                    <User className="h-3 w-3" />
                                    {bill.customerName}
                                </Badge>
                            )}
                            <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(bill.createdAt), 'HH:mm', { locale: idLocale })}
                            </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                            {itemCount} item • Subtotal {formatCurrency(total)}
                            <span className="block text-xs mt-1">{bill.pendingAction === 'resume' ? 'Pengambilan belum terkonfirmasi — lanjutkan untuk memulihkan' : bill.pendingAction === 'delete' ? 'Penghapusan belum terkonfirmasi — ulangi hapus' : bill.syncState === 'synced' ? 'Tersimpan di server' : bill.syncState === 'uncertain' ? 'Pengiriman belum terkonfirmasi' : 'Hanya di perangkat ini'}</span>
                        </div>

                        {/* Item preview */}
                        <div className="text-sm">
                            {bill.items.slice(0, 3).map((item, idx) => (
                                <span key={item.id}>
                                    {idx > 0 && ', '}
                                    {item.quantity}x {item.name}
                                </span>
                            ))}
                            {bill.items.length > 3 && (
                                <span className="text-muted-foreground">
                                    {' '}
                                    +{bill.items.length - 3} lainnya
                                </span>
                            )}
                        </div>

                        {bill.notes && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                                Catatan: {bill.notes}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                        <Button
                            disabled={busy || bill.pendingAction === 'delete' || (isOffline && bill.syncState !== 'pending')}
                            onClick={onResume}
                            className="gap-1 bg-gradient-to-r from-primary to-primary/80"
                        >
                            <Play className="h-4 w-4" />
                            Lanjutkan
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={busy || bill.pendingAction === 'resume' || (isOffline && bill.syncState !== 'pending')}
                            onClick={onDelete}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
