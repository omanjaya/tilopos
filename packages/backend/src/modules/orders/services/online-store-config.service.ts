/**
 * Online Store Configuration Service
 *
 * Responsibilities:
 * - Fetch store configuration by slug
 * - Manage store settings
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { OnlineStoreConfig } from '../types/online-store.types';

@Injectable()
export class OnlineStoreConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get store by slug
   */
  async getStore(slug: string): Promise<OnlineStoreConfig | null> {
    const store = await this.prisma.onlineStore.findFirst({
      where: { slug, isActive: true },
    });

    if (!store) return null;

    return {
      id: store.id,
      businessId: store.businessId,
      storeName: store.storeName,
      slug: store.slug,
      description: store.description || undefined,
      logoUrl: store.logoUrl || undefined,
      bannerUrl: store.bannerUrl || undefined,
      themeSettings: store.themeSettings as Record<string, unknown>,
      shippingMethods: store.shippingMethods as unknown[],
      paymentMethods: store.paymentMethods as unknown[],
      isActive: store.isActive,
    };
  }
}
