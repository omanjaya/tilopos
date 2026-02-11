import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

interface OutletProductRecord {
  id: string;
  outletId: string;
  productId: string;
  isActive: boolean;
  sortOrder: number;
}

@Injectable()
export class OutletProductService {
  private readonly logger = new Logger(OutletProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get products assigned to a specific outlet (with full product data)
   */
  async getProductsForOutlet(outletId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        outletProducts: {
          some: { outletId, isActive: true },
        },
      },
      include: {
        variants: { where: { isActive: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products;
  }

  /**
   * Assign a product to an outlet
   */
  async assignProduct(outletId: string, productId: string): Promise<OutletProductRecord> {
    const record = await this.prisma.outletProduct.upsert({
      where: {
        outletId_productId: { outletId, productId },
      },
      create: { outletId, productId, isActive: true },
      update: { isActive: true },
    });

    this.logger.log(`Product ${productId} assigned to outlet ${outletId}`);
    return record;
  }

  /**
   * Remove a product from an outlet (soft delete)
   */
  async removeProduct(outletId: string, productId: string): Promise<void> {
    await this.prisma.outletProduct.updateMany({
      where: { outletId, productId },
      data: { isActive: false },
    });

    this.logger.log(`Product ${productId} removed from outlet ${outletId}`);
  }

  /**
   * Bulk assign multiple products to an outlet
   */
  async bulkAssign(outletId: string, productIds: string[]): Promise<{ assigned: number }> {
    let assigned = 0;

    for (const productId of productIds) {
      await this.prisma.outletProduct.upsert({
        where: {
          outletId_productId: { outletId, productId },
        },
        create: { outletId, productId, isActive: true },
        update: { isActive: true },
      });
      assigned++;
    }

    this.logger.log(`${assigned} products assigned to outlet ${outletId}`);
    return { assigned };
  }

  /**
   * Bulk remove multiple products from an outlet
   */
  async bulkRemove(outletId: string, productIds: string[]): Promise<{ removed: number }> {
    const result = await this.prisma.outletProduct.updateMany({
      where: { outletId, productId: { in: productIds } },
      data: { isActive: false },
    });

    return { removed: result.count };
  }

  /**
   * Get products NOT yet assigned to an outlet (for assignment UI)
   */
  async getUnassignedProducts(outletId: string, businessId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        outletProducts: {
          none: { outletId, isActive: true },
        },
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products;
  }

  /**
   * Auto-assign a product to all outlets of a business
   */
  async assignToAllOutlets(businessId: string, productId: string): Promise<void> {
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    for (const outlet of outlets) {
      await this.prisma.outletProduct.upsert({
        where: {
          outletId_productId: { outletId: outlet.id, productId },
        },
        create: { outletId: outlet.id, productId, isActive: true },
        update: { isActive: true },
      });
    }
  }
}
