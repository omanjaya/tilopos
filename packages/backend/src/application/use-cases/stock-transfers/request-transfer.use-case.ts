import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockTransferStatusChangedEvent } from '@domain/events/stock-transfer-status-changed.event';
import { TenantAccessService } from '@shared/tenant';
import { DocumentNumberService } from '@shared/numbering';
import {
  assertTemplateOwned,
  assertTransferItemsOwned,
} from '../../../modules/stock-transfers/transfer-stock.helper';

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
  /** Template the request was created from (must belong to the business). */
  templateId?: string;
  requestedBy: string;
}

export interface RequestTransferOutput {
  transferId: string;
  transferNumber: string;
  status: 'pending';
}

@Injectable()
export class RequestTransferUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly tenant: TenantAccessService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async execute(input: RequestTransferInput): Promise<RequestTransferOutput> {
    const { businessId } = input;
    if (input.sourceOutletId === input.destinationOutletId) {
      throw new BadRequestException('Outlet asal dan tujuan tidak boleh sama');
    }
    if (!input.items?.length) {
      throw new BadRequestException('Minimal 1 item diperlukan');
    }
    if (input.items.some((i) => !(i.quantity > 0))) {
      throw new BadRequestException('Kuantitas item harus lebih dari 0');
    }

    // R3: every client-supplied id must belong to the caller's business.
    await this.tenant.assertOutlet({ businessId }, input.sourceOutletId);
    await this.tenant.assertOutlet({ businessId }, input.destinationOutletId);
    await assertTransferItemsOwned(this.prisma, this.tenant, businessId, input.items);
    await assertTemplateOwned(this.prisma, businessId, input.templateId);

    const transfer = await this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.documentNumbers.next(tx, businessId, 'TRF');
      return tx.stockTransfer.create({
        data: {
          businessId,
          transferNumber,
          sourceOutletId: input.sourceOutletId,
          destinationOutletId: input.destinationOutletId,
          status: 'pending',
          notes: input.notes || null,
          templateId: input.templateId ?? null,
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
        select: { id: true, transferNumber: true },
      });
    });

    // Published after commit. The domain event vocabulary calls a pending transfer "requested".
    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        transfer.id,
        input.sourceOutletId,
        input.destinationOutletId,
        businessId,
        'requested',
        'requested',
        input.requestedBy,
      ),
    );

    return {
      transferId: transfer.id,
      transferNumber: transfer.transferNumber,
      status: 'pending',
    };
  }
}
