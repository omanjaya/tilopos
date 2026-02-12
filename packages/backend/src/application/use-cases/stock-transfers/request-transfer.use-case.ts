import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockTransferStatusChangedEvent } from '@domain/events/stock-transfer-status-changed.event';

export interface TransferItemInput {
  productId?: string;
  variantId?: string;
  ingredientId?: string;
  itemName: string;
  quantity: number;
}

export interface RequestTransferInput {
  businessId: string;
  sourceOutletId: string;
  destinationOutletId: string;
  items: TransferItemInput[];
  notes?: string;
  requestedBy: string;
}

export interface RequestTransferOutput {
  transferId: string;
  transferNumber: string;
  status: string;
}

@Injectable()
export class RequestTransferUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: RequestTransferInput): Promise<RequestTransferOutput> {
    const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        businessId: input.businessId,
        transferNumber,
        sourceOutletId: input.sourceOutletId,
        destinationOutletId: input.destinationOutletId,
        status: 'pending',
        notes: input.notes || null,
        requestedBy: input.requestedBy,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId || null,
            variantId: item.variantId || null,
            ingredientId: item.ingredientId || null,
            itemName: item.itemName,
            quantitySent: item.quantity,
          })),
        },
      },
    });

    // Emit event for real-time updates
    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        transfer.id,
        input.sourceOutletId,
        input.destinationOutletId,
        input.businessId,
        'requested', // previousStatus for new transfer
        'requested',
        input.requestedBy,
      ),
    );

    return {
      transferId: transfer.id,
      transferNumber,
      status: 'requested',
    };
  }
}
