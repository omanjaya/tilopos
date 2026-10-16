import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { canSeeCost, serializeProduct } from './product-serializer';

type Db = PrismaService | Prisma.TransactionClient;

/** Upper bound for "whole catalog" array responses (POS catalog, assignment UI). */
export const MAX_CATALOG_ROWS = 5000;

const PRODUCT_LIST_INCLUDE = {
  variants: { where: { isActive: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

export type ProductListRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_LIST_INCLUDE }>;

export interface ProductListOptions {
  where?: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput;
  skip?: number;
  take?: number;
  /** Product.isActive filter; null = both. Defaults to active only. */
  productIsActive?: boolean | null;
}

@Injectable()
export class OutletProductService {
  private readonly logger = new Logger(OutletProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Where clause for the products assigned to an outlet of `businessId`.
   * `productIsActive` null means active and inactive products (manager catalogue view).
   */
  outletProductsWhere(
    outletId: string,
    businessId: string,
    productIsActive: boolean | null = true,
  ): Prisma.ProductWhereInput {
    return {
      businessId,
      ...(productIsActive === null ? {} : { isActive: productIsActive }),
      outletProducts: { some: { outletId, isActive: true } },
    };
  }

  /**
   * Products assigned to an outlet. Always scoped by businessId so a foreign
   * product that somehow got linked to this outlet is never returned.
   */
  async getProductsForOutlet(
    outletId: string,
    businessId: string,
    opts: ProductListOptions = {},
  ): Promise<{ rows: ProductListRow[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      AND: [
        this.outletProductsWhere(outletId, businessId, opts.productIsActive ?? true),
        opts.where ?? {},
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_LIST_INCLUDE,
        orderBy: opts.orderBy ?? { name: 'asc' },
        skip: opts.skip,
        take: opts.take ?? MAX_CATALOG_ROWS,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { rows, total };
  }

  /** Remove a product from an outlet (soft delete). */
  async removeProduct(outletId: string, productId: string): Promise<void> {
    await this.prisma.outletProduct.updateMany({
      where: { outletId, productId },
      data: { isActive: false },
    });
    this.logger.log(`Product ${productId} removed from outlet ${outletId}`);
  }

  /**
   * Bulk assign products to an outlet. Only products of `businessId` are linked;
   * the caller gets `skipped` for ids that are not (or no longer) in the business.
   */
  async bulkAssign(
    outletId: string,
    businessId: string,
    productIds: string[],
  ): Promise<{ assigned: number; skipped: number }> {
    const unique = [...new Set(productIds)];
    const owned = await this.prisma.product.findMany({
      where: { id: { in: unique }, businessId },
      select: { id: true },
    });
    const ownedIds = owned.map((p) => p.id);

    if (ownedIds.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await this.linkProducts(tx, [outletId], ownedIds);
      });
    }

    this.logger.log(`${ownedIds.length} products assigned to outlet ${outletId}`);
    return { assigned: ownedIds.length, skipped: unique.length - ownedIds.length };
  }

  /** Bulk remove products from an outlet (soft delete of the assignment). */
  async bulkRemove(
    outletId: string,
    businessId: string,
    productIds: string[],
  ): Promise<{ removed: number }> {
    const result = await this.prisma.outletProduct.updateMany({
      where: { outletId, productId: { in: productIds }, product: { businessId } },
      data: { isActive: false },
    });
    return { removed: result.count };
  }

  /**
   * Products of the business NOT yet assigned to an outlet (for the assignment UI).
   * Prices are numbers; cost prices only for roles that may see them (R12).
   */
  async getUnassignedProducts(outletId: string, businessId: string, role: string) {
    const rows = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        outletProducts: { none: { outletId, isActive: true } },
      },
      include: PRODUCT_LIST_INCLUDE,
      orderBy: { name: 'asc' },
      take: MAX_CATALOG_ROWS,
    });
    const showCost = canSeeCost(role);
    return rows.map((row) => serializeProduct(row, showCost));
  }

  /**
   * Auto-assign products to every active outlet of a business (two statements,
   * no per-outlet loop). Pass `tx` to run inside the caller's transaction.
   */
  async assignToAllOutlets(
    businessId: string,
    productIds: string | string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    if (ids.length === 0) return;
    const db: Db = tx ?? this.prisma;
    const outlets = await db.outlet.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });
    if (outlets.length === 0) return;
    await this.linkProducts(
      db,
      outlets.map((o) => o.id),
      ids,
    );
  }

  /** Creates missing (outlet, product) links and re-activates existing ones. */
  private async linkProducts(db: Db, outletIds: string[], productIds: string[]): Promise<void> {
    await db.outletProduct.createMany({
      data: outletIds.flatMap((outletId) =>
        productIds.map((productId) => ({ outletId, productId, isActive: true })),
      ),
      skipDuplicates: true,
    });
    await db.outletProduct.updateMany({
      where: { outletId: { in: outletIds }, productId: { in: productIds }, isActive: false },
      data: { isActive: true },
    });
  }
}
