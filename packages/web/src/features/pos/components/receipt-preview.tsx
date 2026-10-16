import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { id as idLocale } from 'date-fns/locale';
import { Printer, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import type { ReceiptData, TransactionItem, Payment } from '@/types/pos.types';
import { useFeatureStore } from '@/stores/feature.store';
import { toast } from '@/lib/toast-utils';
import { printReceipt, templateLines, PAYMENT_METHOD_LABELS } from '../utils/receipt-html';
import { posApi } from '@/api/endpoints/pos.api';
import { useAuthStore } from '@/stores/auth.store';
import { hasRole } from '@/config/permissions';

interface ReceiptPreviewProps {
    data: ReceiptData;
    open: boolean;
    onClose: () => void;
    onPrint?: () => void;
}


export function ReceiptPreview({ data, open, onClose, onPrint }: ReceiptPreviewProps) {
    const { transaction, business, outlet, employee, customer, table } = data;

    const isFeatureEnabled = useFeatureStore((s) => s.isFeatureEnabled);
    const showTable = isFeatureEnabled(FEATURES.TABLE_MANAGEMENT);

    // Outlet receipt template (GET /settings/pos/receipt is readable by POS roles). While it
    // loads or if it cannot be loaded, the receipt uses the default layout.
    const role = useAuthStore((s) => s.user?.role);
    const outletId = outlet.id;
    const { data: template } = useQuery({
        queryKey: ['pos', 'receipt-template', outletId],
        queryFn: () => posApi.getReceiptTemplate(outletId!),
        enabled: open && !!outletId && hasRole(role, 'FRONT_OF_HOUSE'),
        staleTime: 5 * 60 * 1000,
    });
    const showAddress = template?.showAddress ?? true;
    const showPhone = template?.showPhone ?? true;
    const showTax = template?.showTaxBreakdown ?? true;
    const showPaymentMethod = template?.showPaymentMethod ?? true;
    const headerLines = templateLines(template?.headerText);
    const footerLines = templateLines(template?.footerText);
    const roundingAmount = transaction.roundingAmount ?? 0;

    const handlePrint = () => {
        try {
            printReceipt(data, { showTable, template });
            onPrint?.();
        } catch (error) {
            toast.error({
                title: 'Gagal Mencetak Struk',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan',
            });
        }
    };

    const totalPaid = transaction.payments.reduce((sum, p) => sum + p.amount, 0);
    const changeAmount = transaction.changeAmount ?? Math.max(0, totalPaid - transaction.total);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md p-0 gap-0">
                {/* Change Banner - shown prominently at top (screen only) */}
                <div className="bg-green-50 border-b border-green-200 p-4 rounded-t-lg print:hidden">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-800">Transaksi Berhasil</p>
                            <p className="text-xs text-green-600">{transaction.transactionNumber}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                            <p className="text-sm font-bold">{formatCurrency(transaction.total)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dibayar</p>
                            <p className="text-sm font-bold">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kembalian</p>
                            <p className={`text-lg font-bold ${changeAmount > 0 ? 'text-green-700' : ''}`}>
                                {formatCurrency(changeAmount)}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogHeader className="p-4 pb-0 print:hidden">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Struk Pembayaran</DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Cetak
                            </Button>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Preview struk pembayaran</DialogDescription>
                </DialogHeader>

                {/* Receipt Content - printable area */}
                <div id="receipt-content" className="p-4 bg-white text-black font-mono text-xs max-h-[50vh] overflow-y-auto">
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h2 className="font-bold text-base">{business.name}</h2>
                        <p>{outlet.name}</p>
                        {showAddress && outlet.address && <p className="text-[10px]">{outlet.address}</p>}
                        {showPhone && outlet.phone && <p className="text-[10px]">Telp: {outlet.phone}</p>}
                        {business.taxId && <p className="text-[10px]">NPWP: {business.taxId}</p>}
                        {headerLines.map((line, i) => (
                            <p key={i} className="text-[10px]">{line}</p>
                        ))}
                    </div>

                    <Separator className="border-dashed my-2" />

                    {/* Transaction Info */}
                    <div className="grid grid-cols-2 gap-x-2 mb-2">
                        <span>No. Transaksi:</span>
                        <span className="text-right">{transaction.transactionNumber}</span>
                        <span>Tanggal:</span>
                        <span className="text-right">
                            {format(new Date(transaction.createdAt), 'dd/MM/yyyy', { locale: idLocale })}
                        </span>
                        <span>Jam:</span>
                        <span className="text-right">
                            {format(new Date(transaction.createdAt), 'HH:mm:ss', { locale: idLocale })}
                        </span>
                        <span>Kasir:</span>
                        <span className="text-right">{employee.name}</span>
                        {customer && (
                            <>
                                <span>Pelanggan:</span>
                                <span className="text-right">{customer.name}</span>
                            </>
                        )}
                        {/* Show table for F&B */}
                        <FeatureGate feature={FEATURES.TABLE_MANAGEMENT}>
                            {table && (
                                <>
                                    <span>Meja:</span>
                                    <span className="text-right font-semibold">{table.name}</span>
                                </>
                            )}
                        </FeatureGate>
                    </div>

                    <Separator className="border-dashed my-2" />

                    {/* Items */}
                    <div className="space-y-1 mb-2">
                        {transaction.items.map((item) => (
                            <ReceiptItem key={item.id} item={item} />
                        ))}
                    </div>

                    <Separator className="border-dashed my-2" />

                    {/* Totals */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(transaction.subtotal)}</span>
                        </div>
                        {transaction.discountAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Diskon</span>
                                <span>-{formatCurrency(transaction.discountAmount)}</span>
                            </div>
                        )}
                        {showTax && transaction.serviceCharge > 0 && (
                            <div className="flex justify-between">
                                <span>Biaya Layanan</span>
                                <span>{formatCurrency(transaction.serviceCharge)}</span>
                            </div>
                        )}
                        {showTax && transaction.taxAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Pajak (PPN{transaction.subtotal - transaction.discountAmount > 0 ? ` ${Math.round((transaction.taxAmount / (transaction.subtotal - transaction.discountAmount)) * 100)}%` : ''})</span>
                                <span>{formatCurrency(transaction.taxAmount)}</span>
                            </div>
                        )}
                        {roundingAmount !== 0 && (
                            <div className="flex justify-between">
                                <span>Pembulatan</span>
                                <span>{formatCurrency(roundingAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-sm">
                            <span>TOTAL</span>
                            <span>{formatCurrency(transaction.total)}</span>
                        </div>
                    </div>

                    <Separator className="border-dashed my-2" />

                    {/* Payments */}
                    <div className="space-y-1 mb-2">
                        <p className="font-semibold">Pembayaran:</p>
                        {showPaymentMethod ? (
                            transaction.payments.map((payment, idx) => (
                                <ReceiptPayment key={idx} payment={payment} />
                            ))
                        ) : (
                            <div className="flex justify-between">
                                <span>Dibayar</span>
                                <span>{formatCurrency(totalPaid)}</span>
                            </div>
                        )}
                        {transaction.changeAmount > 0 && (
                            <div className="flex justify-between font-semibold">
                                <span>Kembalian</span>
                                <span>{formatCurrency(transaction.changeAmount)}</span>
                            </div>
                        )}
                    </div>

                    <Separator className="border-dashed my-2" />

                    {/* Footer */}
                    <div className="text-center mt-4">
                        {footerLines.length > 0 ? (
                            footerLines.map((line, i) => (
                                <p key={i} className={i === 0 ? 'font-semibold' : 'text-[10px]'}>{line}</p>
                            ))
                        ) : (
                            <>
                                <p className="font-semibold">Terima Kasih!</p>
                                <p className="text-[10px] mt-1">Barang yang sudah dibeli tidak dapat dikembalikan</p>
                                <p className="text-[10px]">kecuali ada kerusakan dari pabrik.</p>
                            </>
                        )}
                        <p className="text-[10px] mt-2">*** Simpan struk ini sebagai bukti pembayaran ***</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ReceiptItemProps {
    item: TransactionItem;
}

function ReceiptItem({ item }: ReceiptItemProps) {
    const hasModifiers = item.modifiers.length > 0;

    return (
        <div>
            <div className="flex justify-between">
                <span className="flex-1">
                    {item.quantity}x {item.productName}
                    {item.variantName && ` (${item.variantName})`}
                </span>
                <span className="tabular-nums">{formatCurrency(item.subtotal)}</span>
            </div>
            {hasModifiers && (
                <div className="ml-3 text-[10px] text-gray-600">
                    {item.modifiers.map((mod) => (
                        <div key={mod.id} className="flex justify-between">
                            <span>+ {mod.name}</span>
                            <span>{formatCurrency(mod.price)}</span>
                        </div>
                    ))}
                </div>
            )}
            {item.notes && (
                <p className="ml-3 text-[10px] text-gray-600 italic">
                    Catatan: {item.notes}
                </p>
            )}
        </div>
    );
}

interface ReceiptPaymentProps {
    payment: Payment;
}

function ReceiptPayment({ payment }: ReceiptPaymentProps) {
    return (
        <div className="flex justify-between">
            <span>{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</span>
            <span>{formatCurrency(payment.amount)}</span>
        </div>
    );
}
