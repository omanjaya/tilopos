/**
 * Online Store Catalog Service
 *
 * Responsibilities:
 * - Fetch product catalog for online store
 * - Check stock availability
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StoreCatalogResponse } from '../types/online-store.types';

@Injectable()
export class OnlineStoreCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get store catalog
   */
  async getCatalog(storeId: string): Promise<StoreCatalogResponse> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      include: { business: true },
    });

    if (!store) throw new NotFoundException('Store not found');

    const categories = await this.prisma.category.findMany({
      where: { businessId: store.businessId, isActive: true },
      include: {
        products: {
          where: { isActive: true },
          include: {
            stockLevels: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        products: cat.products.map((prod) => ({
          id: prod.id,
          name: prod.name,
          description: prod.description || undefined,
          imageUrl: prod.imageUrl || undefined,
          price: Number(prod.basePrice),
          inStock: prod.stockLevels.some((sl) => Number(sl.quantity) > 0),
        })),
      })),
    };
  }
}
