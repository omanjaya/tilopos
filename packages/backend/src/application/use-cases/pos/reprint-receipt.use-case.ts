import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { money, sumMoney, nonNegative } from '@shared/utils/money';

@Injectable()
export class ReprintReceiptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(transactionId: string, businessId: string): Promise<Record<string, unknown>> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, outlet: { businessId } },
      include: {
        items: { include: { modifiers: true } },
        payments: true,
        outlet: { select: { id: true, name: true, address: true, phone: true, businessId: true } },
        employee: { select: { name: true } },
        customer: { select: { name: true } },
        table: { select: { name: true } },
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, address: true, phone: true, taxId: true },
    });

    const outlet = transaction.outlet;
    const employee = transaction.employee;
    const customer = transaction.customer;
    const grandTotal = money(transaction.grandTotal);
    const totalPaid = sumMoney(
      transaction.payments.filter((p) => p.status === 'completed').map((p) => p.amount),
    );
    const changeAmount = nonNegative(totalPaid.minus(grandTotal)).toNumber();
    const items = transaction.items;
    const payments = transaction.payments;

    return {
      transaction: {
        id: transaction.id,
        transactionNumber: transaction.receiptNumber,
        receiptNumber: transaction.receiptNumber,
        transactionType: transaction.transactionType,
        orderType: transaction.orderType,
        status: transaction.status,
        subtotal: money(transaction.subtotal).toNumber(),
        discountAmount: money(transaction.discountAmount).toNumber(),
        taxAmount: money(transaction.taxAmount).toNumber(),
        serviceCharge: money(transaction.serviceCharge).toNumber(),
        roundingAmount: money(transaction.roundingAmount).toNumber(),
        total: grandTotal.toNumber(),
        grandTotal: grandTotal.toNumber(),
        changeAmount,
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        items: items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          quantity: money(item.quantity).toNumber(),
          unitPrice: money(item.unitPrice).toNumber(),
          discountAmount: money(item.discountAmount).toNumber(),
          subtotal: money(item.subtotal).toNumber(),
          totalPrice: money(item.subtotal).toNumber(),
          modifiers: item.modifiers.map((m) => ({
            id: m.id,
            name: m.modifierName,
            price: money(m.price).toNumber(),
          })),
          notes: item.notes,
        })),
        payments: payments.map((p) => ({
          id: p.id,
          method: p.paymentMethod,
          amount: money(p.amount).toNumber(),
          status: p.status,
          reference: p.referenceNumber,
          referenceNumber: p.referenceNumber,
        })),
      },
      business: business || { name: '-', address: '-', phone: '-', taxId: null },
      outlet: { id: outlet.id, name: outlet.name, address: outlet.address, phone: outlet.phone },
      employee: employee || { name: '-' },
      customer: customer ? { name: customer.name } : undefined,
      table: transaction.table ? { name: transaction.table.name } : undefined,
      isReprint: true,
      reprintedAt: new Date().toISOString(),
    };
  }
}
