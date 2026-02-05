import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      transferId: transfer.id,
      transferNumber,
      status: 'pending',
    };
  }
}
