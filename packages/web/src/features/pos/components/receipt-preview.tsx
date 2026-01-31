import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import type { ReceiptData, TransactionItem, Payment, PaymentMethod } from '@/types/pos.types';

interface ReceiptPreviewProps {
    data: ReceiptData;
    open: boolean;
    onClose: () => void;
    onPrint?: () => void;
}

const paymentMethodNames: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    debit_card: 'Kartu Debit',
    credit_card: 'Kartu Kredit',
    gopay: 'GoPay',
    ovo: 'OVO',
    dana: 'DANA',
    shopeepay: 'ShopeePay',
    linkaja: 'LinkAja',
};

export function ReceiptPreview({ data, open, onClose, onPrint }: ReceiptPreviewProps) {
    const { transaction, business, outlet, employee, customer } = data;

    const handlePrint = () => {
        window.print();
        onPrint?.();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Struk Pembayaran</DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Cetak
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Receipt Content - printable area */}
                <div id="receipt-content" className="p-4 bg-white text-black font-mono text-xs">
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h2 className="font-bold text-base">{business.name}</h2>
                        <p>{outlet.name}</p>
                        <p className="text-[10px]">{outlet.address}</p>
                        {outlet.phone && <p className="text-[10px]">Telp: {outlet.phone}</p>}
                        {business.taxId && <p className="text-[10px]">NPWP: {business.taxId}</p>}
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
                        {transaction.serviceCharge > 0 && (
                            <div className="flex justify-between">
                                <span>Biaya Layanan</span>
                                <span>{formatCurrency(transaction.serviceCharge)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Pajak (PPN 11%)</span>
                            <span>{formatCurrency(transaction.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm">
                            <span>TOTAL</span>
                            <span>{formatCurrency(transaction.total)}</span>
                        </div>
                    </div>

                    <Separator className="border-dashed my-2" />

                    {/* Payments */}
                    <div className="space-y-1 mb-2">
                        <p className="font-semibold">Pembayaran:</p>
                        {transaction.payments.map((payment, idx) => (
                            <ReceiptPayment key={idx} payment={payment} />
                        ))}
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
                        <p className="font-semibold">Terima Kasih!</p>
                        <p className="text-[10px] mt-1">Barang yang sudah dibeli tidak dapat dikembalikan</p>
                        <p className="text-[10px]">kecuali ada kerusakan dari pabrik.</p>
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
            <span>{paymentMethodNames[payment.method] || payment.method}</span>
            <span>{formatCurrency(payment.amount)}</span>
        </div>
    );
}

// Simple receipt for thermal printer (80mm)
export function ThermalReceipt({ data }: { data: ReceiptData }) {
    const { transaction, business, outlet, employee } = data;

    return (
        <div
            className="bg-white text-black p-2 font-mono text-[10px] leading-tight"
            style={{ width: '80mm' }}
        >
            {/* Header */}
            <div className="text-center mb-2">
                <p className="font-bold text-sm">{business.name}</p>
                <p>{outlet.name}</p>
                <p>{outlet.address}</p>
                {outlet.phone && <p>Telp: {outlet.phone}</p>}
            </div>

            <p className="border-t border-dashed" />

            <div className="py-1">
                <p>No: {transaction.transactionNumber}</p>
                <p>
                    {format(new Date(transaction.createdAt), 'dd/MM/yy HH:mm', {
                        locale: idLocale,
                    })}
                </p>
                <p>Kasir: {employee.name}</p>
            </div>

            <p className="border-t border-dashed" />

            {/* Items */}
            <div className="py-1">
                {transaction.items.map((item) => (
                    <div key={item.id} className="mb-1">
                        <p>
                            {item.quantity}x {item.productName}
                        </p>
                        <p className="text-right">{formatCurrency(item.subtotal)}</p>
                    </div>
                ))}
            </div>

            <p className="border-t border-dashed" />

            {/* Totals */}
            <div className="py-1">
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
                <div className="flex justify-between">
                    <span>PPN</span>
                    <span>{formatCurrency(transaction.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>{formatCurrency(transaction.total)}</span>
                </div>
            </div>

            <p className="border-t border-dashed" />

            {/* Payment */}
            <div className="py-1">
                {transaction.payments.map((p, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{paymentMethodNames[p.method]}</span>
                        <span>{formatCurrency(p.amount)}</span>
                    </div>
                ))}
                {transaction.changeAmount > 0 && (
                    <div className="flex justify-between font-bold">
                        <span>Kembali</span>
                        <span>{formatCurrency(transaction.changeAmount)}</span>
                    </div>
                )}
            </div>

            <p className="border-t border-dashed" />

            {/* Footer */}
            <div className="text-center pt-2">
                <p className="font-bold">Terima Kasih!</p>
                <p>Simpan struk ini</p>
            </div>
        </div>
    );
}
