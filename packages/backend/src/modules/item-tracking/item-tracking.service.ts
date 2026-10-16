import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceItemStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { DocumentNumberService } from '@shared/numbering';
import { CUSTOMER_PUBLIC_SELECT } from '@shared/constants/selects';
import type { ReceiveServiceItemDto, UpdateServiceItemDto } from './dto/service-item.dto';

/** Customer fields returned with a ticket (R12). */
const WITH_CUSTOMER = { customer: { select: CUSTOMER_PUBLIC_SELECT } } as const;
const DEFAULT_LIST_LIMIT = 200;

@Injectable()
export class ItemTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  /**
   * Receives an item. The ticket number (`TK-YYYYMMDD-0001`, Jakarta business day) comes
   * from the atomic per-business counter inside the same transaction, so concurrent
   * receives never collide (R15). Outlet and customer must belong to the business (R3).
   */
  async receive(businessId: string, data: ReceiveServiceItemDto) {
    await this.tenant.assertOutlet({ businessId }, data.outletId);
    await this.tenant.assertOwned('customer', data.customerId, businessId);

    return this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.documentNumbers.next(tx, businessId, 'TK');
      return tx.serviceItem.create({
        data: {
          businessId,
          outletId: data.outletId,
          customerId: data.customerId ?? null,
          ticketNumber,
          itemName: data.itemName,
          itemDescription: data.itemDescription ?? null,
          quantity: data.quantity ?? 1,
          serviceName: data.serviceName,
          servicePrice: new Prisma.Decimal(data.servicePrice),
          status: 'received',
          estimatedReady: data.estimatedReady ? new Date(data.estimatedReady) : null,
          customerName: data.customerName ?? null,
          customerPhone: data.customerPhone ?? null,
          notes: data.notes ?? null,
        },
        include: WITH_CUSTOMER,
      });
    });
  }

  async updateStatus(id: string, businessId: string, status: ServiceItemStatus) {
    const now = new Date();
    const timestamps: Prisma.ServiceItemUpdateManyMutationInput = {};
    if (status === 'processing') timestamps.processedAt = now;
    else if (status === 'ready') timestamps.readyAt = now;
    else if (status === 'delivered') timestamps.deliveredAt = now;

    const result = await this.prisma.serviceItem.updateMany({
      where: { id, businessId },
      data: { status, ...timestamps },
    });
    if (result.count === 0) throw new NotFoundException('Service item not found');
    return this.findById(id, businessId);
  }

  async update(id: string, businessId: string, data: UpdateServiceItemDto) {
    const updateData: Prisma.ServiceItemUpdateManyMutationInput = {};
    if (data.itemName !== undefined) updateData.itemName = data.itemName;
    if (data.itemDescription !== undefined) updateData.itemDescription = data.itemDescription;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;
    if (data.servicePrice !== undefined) {
      updateData.servicePrice = new Prisma.Decimal(data.servicePrice);
    }
    if (data.estimatedReady !== undefined) {
      updateData.estimatedReady = data.estimatedReady ? new Date(data.estimatedReady) : null;
    }
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const result = await this.prisma.serviceItem.updateMany({
      where: { id, businessId },
      data: updateData,
    });
    if (result.count === 0) throw new NotFoundException('Service item not found');
    return this.findById(id, businessId);
  }

  async findById(id: string, businessId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, businessId },
      include: WITH_CUSTOMER,
    });
    if (!item) throw new NotFoundException('Service item not found');
    return item;
  }

  async findByTicket(ticketNumber: string, businessId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { ticketNumber, businessId },
      include: WITH_CUSTOMER,
    });
    if (!item) throw new NotFoundException('Service item not found');
    return item;
  }

  async listByOutlet(
    outletId: string,
    businessId: string,
    filters: { status?: ServiceItemStatus; search?: string; page?: number; limit?: number } = {},
  ) {
    await this.tenant.assertOutlet({ businessId }, outletId);
    const where: Prisma.ServiceItemWhereInput = { outletId, businessId };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { itemName: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const take = filters.limit ?? DEFAULT_LIST_LIMIT;
    return this.prisma.serviceItem.findMany({
      where,
      include: WITH_CUSTOMER,
      orderBy: { receivedAt: 'desc' },
      skip: ((filters.page ?? 1) - 1) * take,
      take,
    });
  }

  async listByCustomer(customerId: string, businessId: string) {
    return this.prisma.serviceItem.findMany({
      where: { customerId, businessId },
      include: WITH_CUSTOMER,
      orderBy: { receivedAt: 'desc' },
      take: DEFAULT_LIST_LIMIT,
    });
  }

  async getActive(outletId: string, businessId: string) {
    await this.tenant.assertOutlet({ businessId }, outletId);
    return this.prisma.serviceItem.findMany({
      where: { outletId, businessId, status: { in: ['received', 'processing', 'ready'] } },
      include: WITH_CUSTOMER,
      orderBy: { receivedAt: 'asc' },
      take: DEFAULT_LIST_LIMIT,
    });
  }

  async delete(id: string, businessId: string) {
    const result = await this.prisma.serviceItem.deleteMany({ where: { id, businessId } });
    if (result.count === 0) throw new NotFoundException('Service item not found');
  }
}
