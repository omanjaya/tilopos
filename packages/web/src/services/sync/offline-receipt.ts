/**
 * Receipt for a sale queued offline, built only from local data (cart snapshot,
 * logged-in user) so it can be shown and printed without a network.
 * Amounts are the POS-side calculation; the server recomputes them on sync.
 */

import type { CartItem, OrderType, PaymentEntry, ReceiptData } from '@/types/pos.types';

export interface OfflineReceiptInput {
  clientTransactionId: string;
  occurredAt: string;
  outletId: string;
  outletName?: string;
  employeeId: string;
  employeeName: string;
  orderType: OrderType;
  items: CartItem[];
  payments: PaymentEntry[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  customerName?: string;
  tableName?: string;
  notes?: string;
}

export function offlineReceiptNumber(clientTransactionId: string): string {
  return `OFFLINE-${clientTransactionId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function buildOfflineReceipt(input: OfflineReceiptInput): ReceiptData {
  const paidAmount = input.payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    transaction: {
      id: input.clientTransactionId,
      transactionNumber: offlineReceiptNumber(input.clientTransactionId),
      outletId: input.outletId,
      employeeId: input.employeeId,
      orderType: input.orderType,
      status: 'pending',
      subtotal: input.subtotal,
      discountAmount: input.discountTotal,
      taxAmount: input.taxAmount,
      serviceCharge: input.serviceCharge,
      total: input.total,
      paidAmount,
      changeAmount: Math.max(0, paidAmount - input.total),
      items: input.items.map((item) => {
        const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0);
        return {
          id: item.id,
          productId: item.productId,
          productName: item.name,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: Math.round((item.price + modifiersTotal) * item.quantity),
          discountAmount: 0,
          modifiers: item.modifiers.map((m) => ({ id: m.id, name: m.name, price: m.price })),
          notes: item.notes,
        };
      }),
      payments: input.payments.map((p, index) => ({
        id: `${input.clientTransactionId}-p${index}`,
        method: p.method,
        amount: p.amount,
        referenceNumber: p.referenceNumber,
        status: 'pending',
        createdAt: input.occurredAt,
      })),
      notes: input.notes
        ? `${input.notes} — Transaksi offline, menunggu sinkronisasi`
        : 'Transaksi offline, menunggu sinkronisasi',
      createdAt: input.occurredAt,
    },
    business: { name: input.outletName ?? '', address: '', phone: '' },
    outlet: { name: input.outletName ?? '', address: '', phone: '' },
    employee: { name: input.employeeName },
    customer: input.customerName ? { name: input.customerName } : undefined,
    table: input.tableName ? { name: input.tableName } : undefined,
  };
}
