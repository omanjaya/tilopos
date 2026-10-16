import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant/tenant-access.service';
import { DocumentNumberService } from '@shared/numbering/document-number.service';
import { CUSTOMER_PUBLIC_SELECT, EMPLOYEE_PUBLIC_SELECT } from '@shared/constants/selects';
import { multiplyMoney, roundRupiah, sumMoney, toNumber } from '@shared/utils/money';
import type {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  WorkOrderItemDto,
  WorkOrderListQueryDto,
} from './work-orders.dto';

/** Never include full employee/customer rows (PIN hash, MFA secret…) — R12. */
const INCLUDE = {
  customer: { select: CUSTOMER_PUBLIC_SELECT },
  employee: { select: EMPLOYEE_PUBLIC_SELECT },
  items: true,
} satisfies Prisma.WorkOrderInclude;

/** Allowed status transitions (terminal states cannot be left). */
export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  pending: ['in_progress', 'waiting_parts', 'completed', 'cancelled'],
  in_progress: ['waiting_parts', 'completed', 'cancelled'],
  waiting_parts: ['in_progress', 'completed', 'cancelled'],
  completed: ['delivered', 'in_progress'],
  delivered: [],
  cancelled: [],
};

const itemSubtotal = (item: Pick<WorkOrderItemDto, 'quantity' | 'unitPrice'>) =>
  roundRupiah(multiplyMoney(item.quantity, item.unitPrice));

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly numbers: DocumentNumberService,
  ) {}

  async create(businessId: string, data: CreateWorkOrderDto) {
    await this.tenant.assertOwned('outlet', data.outletId, businessId);
    await this.tenant.assertOwned('customer', data.customerId, businessId);
    await this.tenant.assertOwned('employee', data.employeeId, businessId);

    return this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.numbers.next(tx, businessId, 'WO', { daily: true, pad: 4 });
      return tx.workOrder.create({
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
          items: data.items?.length
            ? {
                create: data.items.map((item) => ({
                  description: item.description,
                  type: item.type,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: itemSubtotal(item),
                })),
              }
            : undefined,
        },
        include: INCLUDE,
      });
    });
  }

  async update(id: string, businessId: string, data: UpdateWorkOrderDto) {
    await this.tenant.assertOwned('customer', data.customerId, businessId);
    await this.tenant.assertOwned('employee', data.employeeId, businessId);

    const patch: Prisma.WorkOrderUncheckedUpdateManyInput = {};
    if (data.customerId !== undefined) patch.customerId = data.customerId;
    if (data.employeeId !== undefined) patch.employeeId = data.employeeId;
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.itemDescription !== undefined) patch.itemDescription = data.itemDescription;
    if (data.itemBrand !== undefined) patch.itemBrand = data.itemBrand;
    if (data.itemModel !== undefined) patch.itemModel = data.itemModel;
    if (data.itemSerial !== undefined) patch.itemSerial = data.itemSerial;
    if (data.diagnosis !== undefined) patch.diagnosis = data.diagnosis;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.estimatedCost !== undefined) patch.estimatedCost = data.estimatedCost;
    if (data.finalCost !== undefined) patch.finalCost = data.finalCost;
    if (data.estimatedDate !== undefined) {
      patch.estimatedDate = data.estimatedDate ? new Date(data.estimatedDate) : null;
    }
    if (data.customerName !== undefined) patch.customerName = data.customerName;
    if (data.customerPhone !== undefined) patch.customerPhone = data.customerPhone;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { count } = await this.prisma.workOrder.updateMany({
      where: { id, businessId },
      data: patch,
    });
    if (count === 0) throw new NotFoundException('Work order not found');
    return this.findById(id, businessId);
  }

  /** Conditional transition from the status we validated (R9). */
  async updateStatus(id: string, businessId: string, status: WorkOrderStatus) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, businessId },
      select: { status: true },
    });
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (!WORK_ORDER_TRANSITIONS[workOrder.status].includes(status)) {
      throw new BadRequestException(`Cannot change status from ${workOrder.status} to ${status}`);
    }

    const data: Prisma.WorkOrderUpdateManyMutationInput = { status };
    if (status === WorkOrderStatus.completed) data.completedAt = new Date();
    if (status === WorkOrderStatus.delivered) data.deliveredAt = new Date();

    const { count } = await this.prisma.workOrder.updateMany({
      where: { id, businessId, status: workOrder.status },
      data,
    });
    if (count === 0) {
      throw new ConflictException('Work order was changed by someone else, reload and retry');
    }
    return this.findById(id, businessId);
  }

  async findById(id: string, businessId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, businessId },
      include: INCLUDE,
    });
    if (!workOrder) throw new NotFoundException('Work order not found');
    return workOrder;
  }

  async list(outletId: string, businessId: string, filters: WorkOrderListQueryDto = {}) {
    await this.tenant.assertOwned('outlet', outletId, businessId);

    const where: Prisma.WorkOrderWhereInput = { outletId, businessId };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      const contains = { contains: filters.search, mode: 'insensitive' as const };
      where.OR = [
        { orderNumber: contains },
        { title: contains },
        { customerName: contains },
        { customerPhone: contains },
        { itemDescription: contains },
        { itemSerial: contains },
      ];
    }

    const take = filters.limit ?? 100;
    return this.prisma.workOrder.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take,
      skip: ((filters.page ?? 1) - 1) * take,
    });
  }

  async addItem(workOrderId: string, businessId: string, data: WorkOrderItemDto) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, businessId },
      select: { id: true },
    });
    if (!workOrder) throw new NotFoundException('Work order not found');

    return this.prisma.workOrderItem.create({
      data: {
        workOrderId,
        description: data.description,
        type: data.type,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: itemSubtotal(data),
      },
    });
  }

  async removeItem(itemId: string, businessId: string) {
    const { count } = await this.prisma.workOrderItem.deleteMany({
      where: { id: itemId, workOrder: { businessId } },
    });
    if (count === 0) throw new NotFoundException('Work order item not found');
    return { id: itemId, deleted: true };
  }

  async calculateTotal(workOrderId: string, businessId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, businessId },
      select: { id: true },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const items = await this.prisma.workOrderItem.findMany({
      where: { workOrderId, workOrder: { businessId } },
      select: { subtotal: true },
    });

    return {
      workOrderId,
      total: toNumber(sumMoney(items.map((i) => i.subtotal))),
      itemCount: items.length,
    };
  }
}
