/** Indonesian labels for the backend PaymentMethod enum (prisma/schema.prisma). */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  card: 'Kartu',
  debit_card: 'Kartu Debit',
  credit_card: 'Kartu Kredit',
  qris: 'QRIS',
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
  linkaja: 'LinkAja',
  bank_transfer: 'Transfer Bank',
  credit_note: 'Nota Kredit',
  credit: 'Kredit (BON)',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '-';
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? method;
}
