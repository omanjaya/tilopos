import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ServiceItemStatus } from '@prisma/client';

export interface ReceiveItemDto {
  outletId: string;
  customerId?: string;
  itemName: string;
  itemDescription?: string;
  quantity?: number;
  serviceName: string;
  servicePrice: number;
  estimatedReady?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

export interface UpdateItemDto {
  itemName?: string;
  itemDescription?: string;
  quantity?: number;
  serviceName?: string;
  servicePrice?: number;
  estimatedReady?: string | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

@Injectable()
export class ItemTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateTicketNumber(businessId: string): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    const prefix = `TK-${dateStr}-`;

    const lastItem = await this.prisma.serviceItem.findFirst({
      where: {
        businessId,
        ticketNumber: { startsWith: prefix },
      },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });

    let sequence = 1;
    if (lastItem) {
      const lastSeq = parseInt(lastItem.ticketNumber.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  async receive(businessId: string, data: ReceiveItemDto) {
    const ticketNumber = await this.generateTicketNumber(businessId);

    return this.prisma.serviceItem.create({
      data: {
        businessId,
        outletId: data.outletId,
        customerId: data.customerId ?? null,
        ticketNumber,
        itemName: data.itemName,
        itemDescription: data.itemDescription ?? null,
        quantity: data.quantity ?? 1,
        serviceName: data.serviceName,
        servicePrice: data.servicePrice,
        status: 'received',
        estimatedReady: data.estimatedReady ? new Date(data.estimatedReady) : null,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
        notes: data.notes ?? null,
      },
      include: { customer: true },
    });
  }

  async updateStatus(id: string, businessId: string, status: ServiceItemStatus) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, businessId },
    });

    if (!item) {
      throw new NotFoundException('Service item not found');
    }

    const timestamps: Record<string, Date> = {};
    if (status === 'processing') {
      timestamps.processedAt = new Date();
    } else if (status === 'ready') {
      timestamps.readyAt = new Date();
    } else if (status === 'delivered') {
      timestamps.deliveredAt = new Date();
    }

    return this.prisma.serviceItem.update({
      where: { id },
      data: { status, ...timestamps },
      include: { customer: true },
    });
  }

  async update(id: string, businessId: string, data: UpdateItemDto) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, businessId },
    });

    if (!item) {
      throw new NotFoundException('Service item not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.itemName !== undefined) updateData.itemName = data.itemName;
    if (data.itemDescription !== undefined) updateData.itemDescription = data.itemDescription;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;
    if (data.servicePrice !== undefined) updateData.servicePrice = data.servicePrice;
    if (data.estimatedReady !== undefined) {
      updateData.estimatedReady = data.estimatedReady ? new Date(data.estimatedReady) : null;
    }
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.serviceItem.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });
  }

  async findById(id: string, businessId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, businessId },
      include: { customer: true },
    });

    if (!item) {
      throw new NotFoundException('Service item not found');
    }

    return item;
  }

  async findByTicket(ticketNumber: string, businessId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { ticketNumber, businessId },
      include: { customer: true },
    });

    if (!item) {
      throw new NotFoundException('Service item not found');
    }

    return item;
  }

  async listByOutlet(
    outletId: string,
    businessId: string,
    filters?: { status?: ServiceItemStatus; search?: string },
  ) {
    const where: Record<string, unknown> = { outletId, businessId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { itemName: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.serviceItem.findMany({
      where,
      include: { customer: true },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async listByCustomer(customerId: string, businessId: string) {
    return this.prisma.serviceItem.findMany({
      where: { customerId, businessId },
      include: { customer: true },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async getActive(outletId: string, businessId: string) {
    return this.prisma.serviceItem.findMany({
      where: {
        outletId,
        businessId,
        status: { in: ['received', 'processing', 'ready'] },
      },
      include: { customer: true },
      orderBy: { receivedAt: 'asc' },
    });
  }

  async delete(id: string, businessId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, businessId },
    });

    if (!item) {
      throw new NotFoundException('Service item not found');
    }

    await this.prisma.serviceItem.delete({ where: { id } });
  }
}
