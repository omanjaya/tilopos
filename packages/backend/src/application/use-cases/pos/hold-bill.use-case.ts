import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { HeldBillStore, type HeldBillItem } from '@infrastructure/cache/held-bill.store';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { SalePricingService, type SaleLineInput } from '@application/services/sale-pricing.service';
import { TenantAccessService } from '@shared/tenant/tenant-access.service';
import { sumMoney } from '@shared/utils/money';

export interface HoldBillInput {
  businessId: string;
  outletId: string;
  employeeId: string;
  role: string;
  clientBillId?: string;
  tableId?: string;
  customerId?: string;
  customerName?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  discountAmount?: number;
  discountPercent?: number;
  items: SaleLineInput[];
  notes?: string;
}

@Injectable()
export class HoldBillUseCase {
  constructor(
    private readonly heldBillStore: HeldBillStore,
    private readonly prisma: PrismaService,
    private readonly pricing: SalePricingService,
    private readonly tenant: TenantAccessService,
  ) {}

  async execute(input: HoldBillInput): Promise<{ billId: string }> {
    const billId = input.clientBillId ?? randomUUID();
    await this.tenant.assertOwned('customer', input.customerId, input.businessId);
    await this.tenant.assertOwned(
      'product',
      input.items.map((i) => i.productId),
      input.businessId,
    );
    await this.tenant.assertOwned(
      'productVariant',
      input.items.map((i) => i.variantId),
      input.businessId,
    );
    await this.tenant.assertOwned(
      'bundlePackage',
      input.items.map((i) => i.bundleId),
      input.businessId,
    );
    let tableName: string | undefined;
    if (input.tableId) {
      await this.tenant.assertOwned('table', input.tableId, input.businessId);
      const table = await this.prisma.table.findFirst({
        where: {
          id: input.tableId,
          outletId: input.outletId,
          outlet: { businessId: input.businessId },
        },
        select: { name: true },
      });
      if (!table) throw new NotFoundException('Table not found');
      tableName = table.name;
    }
    const discounts =
      (input.discountPercent ?? 0) > 0
        ? [{ type: 'percentage' as const, value: input.discountPercent! }]
        : (input.discountAmount ?? 0) > 0
          ? [{ type: 'fixed' as const, value: input.discountAmount! }]
          : [];
    const priced = await this.pricing.priceSale(
      {
        businessId: input.businessId,
        outletId: input.outletId,
        role: input.role,
        customerId: input.customerId,
        orderType: input.orderType ?? 'dine_in',
        applyCashRounding: false,
      },
      input.items,
      discounts,
    );
    const items: HeldBillItem[] = priced.lines.map((line) => {
      const override = priced.priceOverrides.find(
        (p) =>
          p.productId === line.productId &&
          p.variantId === line.variantId &&
          p.bundleId === line.bundleId,
      );
      return {
        productId: line.productId ?? undefined,
        bundleId: line.bundleId ?? undefined,
        variantId: line.variantId ?? undefined,
        productName: line.productName,
        variantName: line.variantName ?? undefined,
        quantity: line.quantity,
        notes: line.notes ?? undefined,
        unitPrice: line.unitPrice.minus(sumMoney(line.modifiers.map((m) => m.price))).toNumber(),
        originalPrice: override?.serverPrice,
        modifierIds: line.modifiers.map((m) => m.modifierId),
        modifiers: line.modifiers.map((m) => ({
          id: m.modifierId,
          name: m.modifierName,
          price: m.price.toNumber(),
        })),
      };
    });
    // Explicit whitelist makes the retry identity independent of request key order.
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          businessId: input.businessId,
          outletId: input.outletId,
          employeeId: input.employeeId,
          customerId: input.customerId,
          customerName: input.customerName,
          tableId: input.tableId,
          orderType: input.orderType ?? 'dine_in',
          discountAmount: input.discountAmount ?? 0,
          discountPercent: input.discountPercent ?? 0,
          notes: input.notes,
          items: input.items.map((i) => ({
            productId: i.productId,
            bundleId: i.bundleId,
            variantId: i.variantId,
            quantity: i.quantity,
            modifierIds: i.modifierIds ?? [],
            notes: i.notes,
            unitPrice: i.unitPrice,
          })),
        }),
      )
      .digest('hex');
    await this.heldBillStore.hold({
      id: billId,
      businessId: input.businessId,
      outletId: input.outletId,
      employeeId: input.employeeId,
      tableId: input.tableId,
      tableName,
      customerId: input.customerId,
      customerName: input.customerName,
      orderType: input.orderType ?? 'dine_in',
      discountAmount: input.discountAmount ?? 0,
      discountPercent: input.discountPercent ?? 0,
      discountTotal: priced.discountAmount.toNumber(),
      items,
      notes: input.notes,
      subtotal: priced.subtotal.toNumber(),
      heldAt: new Date().toISOString(),
      requestHash,
    });
    return { billId };
  }
}
