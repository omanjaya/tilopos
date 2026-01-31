import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { FileText, Play, Trash2, Clock, User, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { formatCurrency } from '@/lib/format';

import type { HeldBill } from '@/types/pos.types';

interface HeldBillsPanelProps {
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
    onDelete,
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
                </DialogHeader>

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
    bill: HeldBill;
    onResume: () => void;
    onDelete: () => void;
}

function HeldBillCard({ bill, onResume, onDelete }: HeldBillCardProps) {
    const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0);
    const total = bill.items.reduce((sum, item) => {
        const modifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
        return sum + (item.price + modifiersTotal) * item.quantity;
    }, 0);

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
                            {itemCount} item • {formatCurrency(total)}
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
                            onClick={onResume}
                            className="gap-1 bg-gradient-to-r from-primary to-primary/80"
                        >
                            <Play className="h-4 w-4" />
                            Lanjutkan
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
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
