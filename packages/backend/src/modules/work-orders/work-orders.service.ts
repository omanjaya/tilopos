import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { WorkOrderStatus } from '@prisma/client';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async generateOrderNumber(businessId: string): Promise<string> {
    const now = new Date();
    const dateStr =
      String(now.getFullYear()) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const prefix = `WO-${dateStr}-`;

    const lastOrder = await this.prisma.workOrder.findFirst({
      where: {
        businessId,
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  async create(
    businessId: string,
    data: {
      outletId: string;
      customerId?: string;
      employeeId?: string;
      title: string;
      description?: string;
      itemDescription?: string;
      itemBrand?: string;
      itemModel?: string;
      itemSerial?: string;
      diagnosis?: string;
      priority?: string;
      estimatedCost?: number;
      estimatedDate?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      items?: {
        description: string;
        type: string;
        quantity: number;
        unitPrice: number;
      }[];
    },
  ) {
    const orderNumber = await this.generateOrderNumber(businessId);

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          businessId,
          outletId: data.outletId,
          customerId: data.customerId ?? null,
          employeeId: data.employeeId ?? null,
          orderNumber,
          title: data.title,
          description: data.description ?? null,
          itemDescription: data.itemDescription ?? null,
          itemBrand: data.itemBrand ?? null,
          itemModel: data.itemModel ?? null,
          itemSerial: data.itemSerial ?? null,
          diagnosis: data.diagnosis ?? null,
          priority: data.priority ?? 'normal',
          estimatedCost: data.estimatedCost ?? null,
          estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
          customerName: data.customerName ?? null,
          customerPhone: data.customerPhone ?? null,
          notes: data.notes ?? null,
          items: data.items
            ? {
                create: data.items.map((item) => ({
                  description: item.description,
                  type: item.type,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.quantity * item.unitPrice,
                })),
              }
            : undefined,
        },
        include: {
          customer: true,
          employee: true,
          items: true,
        },
      });

      return workOrder;
    });
  }

  async update(
    id: string,
    businessId: string,
    data: {
      customerId?: string;
      employeeId?: string;
      title?: string;
      description?: string;
      itemDescription?: string;
      itemBrand?: string;
      itemModel?: string;
      itemSerial?: string;
      diagnosis?: string;
      priority?: string;
      estimatedCost?: number;
      finalCost?: number;
      estimatedDate?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
    },
  ) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, businessId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.employeeId !== undefined && { employeeId: data.employeeId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.itemDescription !== undefined && { itemDescription: data.itemDescription }),
        ...(data.itemBrand !== undefined && { itemBrand: data.itemBrand }),
        ...(data.itemModel !== undefined && { itemModel: data.itemModel }),
        ...(data.itemSerial !== undefined && { itemSerial: data.itemSerial }),
        ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.estimatedCost !== undefined && { estimatedCost: data.estimatedCost }),
        ...(data.finalCost !== undefined && { finalCost: data.finalCost }),
        ...(data.estimatedDate !== undefined && {
          estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
        }),
        ...(data.customerName !== undefined && { customerName: data.customerName }),
        ...(data.customerPhone !== undefined && { customerPhone: data.customerPhone }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        customer: true,
        employee: true,
        items: true,
      },
    });
  }

  async updateStatus(id: string, businessId: string, status: WorkOrderStatus) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, businessId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const updateData: { status: WorkOrderStatus; completedAt?: Date; deliveredAt?: Date } = {
      status,
    };

    if (status === WorkOrderStatus.completed) {
      updateData.completedAt = new Date();
    }

    if (status === WorkOrderStatus.delivered) {
      updateData.deliveredAt = new Date();
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        employee: true,
        items: true,
      },
    });
  }

  async findById(id: string, businessId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        employee: true,
        items: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return workOrder;
  }

  async list(
    outletId: string,
    businessId: string,
    filters?: {
      status?: WorkOrderStatus;
      search?: string;
    },
  ) {
    const where: {
      outletId: string;
      businessId: string;
      status?: WorkOrderStatus;
      OR?: Array<Record<string, unknown>>;
    } = {
      outletId,
      businessId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' as const } },
        { title: { contains: filters.search, mode: 'insensitive' as const } },
        { customerName: { contains: filters.search, mode: 'insensitive' as const } },
        { customerPhone: { contains: filters.search, mode: 'insensitive' as const } },
        { itemDescription: { contains: filters.search, mode: 'insensitive' as const } },
        { itemSerial: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }

    return this.prisma.workOrder.findMany({
      where,
      include: {
        customer: true,
        employee: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addItem(
    workOrderId: string,
    businessId: string,
    data: {
      description: string;
      type: string;
      quantity: number;
      unitPrice: number;
    },
  ) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, businessId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const subtotal = data.quantity * data.unitPrice;

    return this.prisma.workOrderItem.create({
      data: {
        workOrderId,
        description: data.description,
        type: data.type,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal,
      },
    });
  }

  async removeItem(itemId: string, businessId: string) {
    const item = await this.prisma.workOrderItem.findUnique({
      where: { id: itemId },
      include: {
        workOrder: { select: { businessId: true } },
      },
    });

    if (!item || item.workOrder.businessId !== businessId) {
      throw new NotFoundException('Work order item not found');
    }

    return this.prisma.workOrderItem.delete({
      where: { id: itemId },
    });
  }

  async calculateTotal(workOrderId: string) {
    const items = await this.prisma.workOrderItem.findMany({
      where: { workOrderId },
    });

    const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    return { workOrderId, total, itemCount: items.length };
  }
}
