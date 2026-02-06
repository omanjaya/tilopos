/**
 * Self-Order Menu Service
 *
 * Responsibilities:
 * - Fetch and format menu for self-order customers
 * - Include products, categories, variants, and modifiers
 * - Filter only active items
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MenuResponse } from '../types/self-order.types';

@Injectable()
export class SelfOrderMenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get menu for self-order
   */
  async getMenu(outletId: string): Promise<MenuResponse> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      include: { business: true },
    });

    if (!outlet) throw new NotFoundException('Outlet not found');

    const categories = await this.prisma.category.findMany({
      where: { businessId: outlet.businessId, isActive: true },
      include: {
        products: {
          where: { isActive: true },
          include: {
            variants: { where: { isActive: true } },
            productModifierGroups: {
              include: {
                modifierGroup: {
                  include: { modifiers: { where: { isActive: true } } },
                },
              },
            },
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
          basePrice: Number(prod.basePrice),
          variants: prod.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: Number(v.price),
          })),
          modifierGroups: prod.productModifierGroups.map((pmg) => ({
            id: pmg.modifierGroup.id,
            name: pmg.modifierGroup.name,
            isRequired: pmg.modifierGroup.isRequired,
            modifiers: pmg.modifierGroup.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              price: Number(m.price),
            })),
          })),
        })),
      })),
    };
  }
}
