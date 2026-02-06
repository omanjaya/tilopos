/**
 * Self-Order Submission Service
 *
 * Responsibilities:
 * - Submit order to KDS
 * - Process payment
 * - Confirm payment received
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../../domain/events/order-status-changed.event';
import {
  SelfOrderPaymentDto,
  OrderSubmissionResult,
  PaymentResult,
} from '../types/self-order.types';

@Injectable()
export class SelfOrderSubmissionService {
  private readonly logger = new Logger(SelfOrderSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Submit order and send to KDS
   */
  async submitOrder(sessionId: string): Promise<OrderSubmissionResult> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        items: {
          include: { product: true, variant: true },
        },
      },
    });

    if (!session || session.status !== 'active') {
      throw new BadRequestException('Invalid or expired session');
    }

    if (session.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Generate order number
    const orderCount = await this.prisma.order.count({
      where: { outletId: session.outletId },
    });
    const orderNumber = `SO${(orderCount + 1).toString().padStart(4, '0')}`;

    // Create KDS order
    const order = await this.prisma.order.create({
      data: {
        outletId: session.outletId,
        orderNumber,
        orderType: session.tableId ? 'dine_in' : 'takeaway',
        tableId: session.tableId,
        status: 'pending',
        notes: `Self-order from ${session.table?.name || 'counter'}`,
        items: {
          create: session.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.name,
            quantity: item.quantity,
            status: 'pending',
            notes: item.notes,
          })),
        },
      },
    });

    // Update session status
    await this.prisma.selfOrderSession.update({
      where: { id: sessionId },
      data: {
        status: 'submitted',
      },
    });

    // Emit event so KDS picks up the new order
    this.eventBus.publish(
      new OrderStatusChangedEvent(order.id, session.outletId, 'none', 'pending'),
    );

    this.logger.log(
      `Self-order submitted: ${orderNumber} from ${session.table?.name || 'counter'}`,
    );

    return { orderId: order.id, orderNumber };
  }

  /**
   * Process payment for self-order
   */
  async processPayment(data: SelfOrderPaymentDto): Promise<PaymentResult> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: data.sessionId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'submitted') {
      throw new BadRequestException('Order not submitted yet');
    }

    // In production, integrate with payment gateway
    // For now, return mock QRIS
    const total = session.items.reduce((sum, item) => {
      const price = Number(item.variant?.price ?? item.product.basePrice);
      return sum + price * item.quantity;
    }, 0);

    const qrCode = `00020101021226610014ID.QRIS.WWW0118936008990000${total}5204539953033605802ID`;

    return {
      success: true,
      qrCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  /**
   * Confirm payment received
   */
  async confirmPayment(sessionId: string, _referenceNumber: string): Promise<void> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.selfOrderSession.update({
      where: { id: sessionId },
      data: {
        status: 'paid',
      },
    });

    this.logger.log(`Self-order payment confirmed: ${sessionId}`);
  }
}
