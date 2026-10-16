import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DocumentNumberService } from '@shared/numbering';
import { resolveOrderItems, type OrderItemRequest } from './order-items.helper';

export type OrderItemInput = OrderItemRequest;

export interface CreateOrderInput {
  /** Tenant of the caller; every referenced id is verified against it. */
  businessId: string;
  outletId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  customerId?: string;
  items: OrderItemInput[];
  priority?: number;
  notes?: string;
  /**
   * Optional fixed order id. Used as an idempotency key by callers that derive
   * the order from another record (e.g. a POS transaction): a replayed event
   * hits the primary key and is rejected with a ConflictException.
   */
  id?: string;
  /** Optional fixed order number (max 20 chars), e.g. the POS receipt number. */
  orderNumber?: string;
  /**
   * What to do when the table is already occupied. 'reject' (default) fails with
   * 409; 'keep' still creates the order linked to the table without claiming it
   * (used for already-paid POS transactions, which must reach the kitchen).
   */
  onTableUnavailable?: 'reject' | 'keep';
}

export interface CreateOrderOutput {
  orderId: string;
  orderNumber: string;
  estimatedTime: number | null;
}

const MAX_ORDER_ITEMS = 100;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    if (!input.businessId || !input.outletId) {
      throw new BadRequestException('businessId and outletId are required');
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('An order needs at least one item');
    }
    if (input.items.length > MAX_ORDER_ITEMS) {
      throw new BadRequestException(`An order can have at most ${MAX_ORDER_ITEMS} items`);
    }

    const orderId = input.id ?? randomUUID();

    let orderNumber: string;
    try {
      orderNumber = await this.prisma.$transaction(async (tx) => {
        const outlet = await tx.outlet.findFirst({
          where: { id: input.outletId, businessId: input.businessId },
          select: { id: true },
        });
        if (!outlet) {
          throw new BadRequestException('Outlet not found');
        }

        const items = await resolveOrderItems(tx, input.businessId, input.items);

        if (input.customerId) {
          const customer = await tx.customer.findFirst({
            where: { id: input.customerId, businessId: input.businessId },
            select: { id: true },
          });
          if (!customer) {
            throw new BadRequestException('Customer not found');
          }
        }

        // Claim the table first with a conditional update: two concurrent orders
        // can never both occupy it, and a failed claim leaves no orphan order.
        if (input.tableId) {
          const table = await tx.table.findFirst({
            where: { id: input.tableId, outletId: input.outletId, isActive: true },
            select: { id: true },
          });
          if (!table) {
            throw new BadRequestException('Table not found');
          }
          const claimed = await tx.table.updateMany({
            where: { id: input.tableId, outletId: input.outletId, status: 'available' },
            data: { status: 'occupied', currentOrderId: orderId, occupiedAt: new Date() },
          });
          if (claimed.count !== 1 && input.onTableUnavailable !== 'keep') {
            throw new ConflictException('Table is not available');
          }
        }

        const number =
          input.orderNumber && input.orderNumber.length <= 20
            ? input.orderNumber
            : await this.documentNumbers.next(tx, input.businessId, 'ORD');

        await tx.order.create({
          data: {
            id: orderId,
            outletId: input.outletId,
            orderNumber: number,
            orderType: input.orderType,
            tableId: input.tableId ?? null,
            customerId: input.customerId ?? null,
            status: 'pending',
            priority: input.priority ?? 0,
            notes: input.notes ?? null,
            items: {
              create: items.map((item) => ({ ...item, status: 'pending' as const })),
            },
          },
        });

        return number;
      });
    } catch (error) {
      if (input.id && isUniqueViolation(error)) {
        throw new ConflictException(`Order ${input.id} already exists`);
      }
      throw error;
    }

    this.eventBus.publish(new OrderStatusChangedEvent(orderId, input.outletId, '', 'pending'));

    return { orderId, orderNumber, estimatedTime: null };
  }
}
