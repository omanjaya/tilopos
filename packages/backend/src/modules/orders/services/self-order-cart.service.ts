/**
 * Self-Order Cart Service
 *
 * Responsibilities:
 * - Add items to cart (create SelfOrderItem)
 * - Update cart item quantity
 * - Remove items from cart
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SelfOrderSessionService } from './self-order-session.service';
import { AddToCartDto, SelfOrderSessionInfo, ModifiersJson } from '../types/self-order.types';

@Injectable()
export class SelfOrderCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SelfOrderSessionService,
  ) {}

  /**
   * Add item to cart (creates SelfOrderItem)
   */
  async addToCart(data: AddToCartDto): Promise<SelfOrderSessionInfo> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session || session.status !== 'active') {
      throw new BadRequestException('Invalid or expired session');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { variants: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    const modifiers = data.modifierIds
      ? await this.prisma.modifier.findMany({
          where: { id: { in: data.modifierIds } },
        })
      : [];

    const modifiersJson = modifiers.map((m) => ({
      id: m.id,
      name: m.name,
      price: Number(m.price),
    }));

    // Create SelfOrderItem
    await this.prisma.selfOrderItem.create({
      data: {
        sessionId: data.sessionId,
        productId: data.productId,
        variantId: data.variantId,
        quantity: data.quantity,
        modifiers: modifiersJson as unknown as ModifiersJson,
        notes: data.notes,
      },
    });

    return this.sessionService.getSession(session.sessionCode);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    sessionId: string,
    itemIndex: number,
    quantity: number,
  ): Promise<SelfOrderSessionInfo> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: sessionId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session || session.status !== 'active') {
      throw new BadRequestException('Invalid or expired session');
    }

    if (itemIndex < 0 || itemIndex >= session.items.length) {
      throw new BadRequestException('Invalid item index');
    }

    const item = session.items[itemIndex];

    if (quantity <= 0) {
      await this.prisma.selfOrderItem.delete({ where: { id: item.id } });
    } else {
      await this.prisma.selfOrderItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }

    return this.sessionService.getSession(session.sessionCode);
  }
}
