import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';

/**
 * How each tenant-owned model reaches its businessId.
 * - 'direct'  → model.businessId
 * - 'outlet'  → model.outlet.businessId
 * - 'product' → model.product.businessId
 */
const OWNERSHIP = {
  outlet: 'direct',
  employee: 'direct',
  category: 'direct',
  product: 'direct',
  customer: 'direct',
  modifierGroup: 'direct',
  ingredient: 'direct',
  supplier: 'direct',
  stockTransfer: 'direct',
  loyaltyTier: 'direct',
  loyaltyProgram: 'direct',
  onlineStore: 'direct',
  promotion: 'direct',
  voucher: 'direct',
  reportTemplate: 'direct',
  appointment: 'direct',
  workOrder: 'direct',
  serialNumber: 'direct',
  serviceItem: 'direct',
  pricingRule: 'direct',
  bundlePackage: 'direct',
  device: 'direct',
  notificationSetting: 'direct',
  transaction: 'outlet',
  shift: 'outlet',
  table: 'outlet',
  order: 'outlet',
  purchaseOrder: 'outlet',
  paymentSettlement: 'outlet',
  selfOrderSession: 'outlet',
  waitingList: 'outlet',
  creditSale: 'outlet',
  stockOpname: 'outlet',
  batchLot: 'outlet',
  productVariant: 'product',
  priceTier: 'product',
  unitConversion: 'product',
  recipe: 'product',
} as const;

export type TenantModel = keyof typeof OWNERSHIP;

type CountDelegate = { count(args: { where: Record<string, unknown> }): Promise<number> };

/**
 * Single place to verify that ids supplied by a client belong to the caller's
 * business (Docs/ENGINEERING-RULES.md R3/R4). Use it before reading or writing
 * any row referenced by a client-supplied id.
 */
@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asserts the outlet exists in the caller's business and returns its id.
   * A missing outletId is a 400, never "no filter".
   */
  async assertOutlet(
    user: Pick<AuthUser, 'businessId'>,
    outletId: string | null | undefined,
  ): Promise<string> {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }
    await this.assertOwned('outlet', outletId, user.businessId);
    return outletId;
  }

  /**
   * For list endpoints: returns [outletId] when one is requested (after an
   * ownership check), otherwise every outlet of the caller's business.
   * Always query with `outletId: { in: ids }`.
   */
  async resolveOutletIds(
    user: Pick<AuthUser, 'businessId'>,
    outletId?: string | null,
  ): Promise<string[]> {
    if (outletId) {
      return [await this.assertOutlet(user, outletId)];
    }
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });
    return outlets.map((o) => o.id);
  }

  /**
   * Asserts every id belongs to `businessId`. Empty/undefined input is a no-op,
   * so optional references can be passed straight through.
   */
  async assertOwned(
    model: TenantModel,
    ids: string | readonly (string | null | undefined)[] | null | undefined,
    businessId: string,
  ): Promise<void> {
    if (!businessId) {
      throw new ForbiddenException('Business context required');
    }
    const list = (Array.isArray(ids) ? ids : [ids]).filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    const unique = [...new Set(list)];
    if (unique.length === 0) {
      return;
    }

    const scope =
      OWNERSHIP[model] === 'direct'
        ? { businessId }
        : OWNERSHIP[model] === 'outlet'
          ? { outlet: { businessId } }
          : { product: { businessId } };

    const delegate = (this.prisma as unknown as Record<string, CountDelegate>)[model];
    const count = await delegate.count({ where: { id: { in: unique }, ...scope } });
    if (count !== unique.length) {
      throw new ForbiddenException(`One or more ${model} references are not accessible`);
    }
  }
}
