import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { WaitingListStatus } from '@prisma/client';

export interface CreateWaitingListDto {
  outletId: string;
  customerName: string;
  customerPhone?: string;
  partySize: number;
  preferredSection?: string;
  notes?: string;
}

export interface UpdateWaitingListDto {
  status?: WaitingListStatus;
  tableId?: string;
  notes?: string;
  estimatedWait?: number;
}

@Injectable()
export class WaitingListService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsGateway?: NotificationsGateway,
  ) {}

  async create(data: CreateWaitingListDto) {
    // Calculate estimated wait based on current queue
    const currentQueue = await this.prisma.waitingList.count({
      where: {
        outletId: data.outletId,
        status: 'waiting',
      },
    });
    const estimatedWait = (currentQueue + 1) * 15; // 15 min per party

    const entry = await this.prisma.waitingList.create({
      data: {
        outletId: data.outletId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        partySize: data.partySize,
        preferredSection: data.preferredSection,
        notes: data.notes,
        estimatedWait,
      },
      include: {
        outlet: { select: { name: true } },
        table: { select: { name: true } },
      },
    });

    // Emit real-time event
    this.notificationsGateway?.emitQueueCustomerAdded(data.outletId, {
      customerId: entry.id,
      customerName: data.customerName,
      partySize: data.partySize,
      position: currentQueue + 1,
      estimatedWaitMinutes: estimatedWait,
    });

    return entry;
  }

  async findByOutlet(outletId: string, status?: WaitingListStatus) {
    return this.prisma.waitingList.findMany({
      where: {
        outletId,
        ...(status && { status }),
      },
      include: {
        table: { select: { id: true, name: true, section: true } },
      },
      orderBy: { queuedAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.waitingList.findUnique({
      where: { id },
      include: {
        outlet: { select: { name: true, phone: true } },
        table: { select: { id: true, name: true, section: true, capacity: true } },
      },
    });
  }

  async update(id: string, data: UpdateWaitingListDto) {
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'notified') {
        updateData.notifiedAt = new Date();
      } else if (data.status === 'seated') {
        updateData.seatedAt = new Date();
      }
    }

    if (data.tableId !== undefined) updateData.tableId = data.tableId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.estimatedWait !== undefined) updateData.estimatedWait = data.estimatedWait;

    return this.prisma.waitingList.update({
      where: { id },
      data: updateData,
      include: {
        table: { select: { id: true, name: true } },
      },
    });
  }

  async notify(id: string) {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id },
      select: { outletId: true, customerName: true, tableId: true },
    });

    const result = await this.update(id, { status: 'notified' as WaitingListStatus });

    // Emit real-time event
    if (entry) {
      this.notificationsGateway?.emitQueueCustomerCalled(entry.outletId, {
        customerId: id,
        customerName: entry.customerName,
        tableId: entry.tableId || '',
        tableName: result.table?.name || '',
      });
    }

    return result;
  }

  async seat(id: string, tableId: string) {
    // Update waiting list entry
    const entry = await this.prisma.waitingList.update({
      where: { id },
      data: {
        status: 'seated',
        tableId,
        seatedAt: new Date(),
      },
      include: {
        table: { select: { id: true, name: true } },
      },
    });

    // Update table status
    await this.prisma.table.update({
      where: { id: tableId },
      data: {
        status: 'occupied',
        occupiedAt: new Date(),
      },
    });

    // Emit real-time event
    if (entry.table) {
      this.notificationsGateway?.emitQueueCustomerSeated(entry.outletId, {
        customerId: entry.id,
        customerName: entry.customerName,
        tableId,
        tableName: entry.table.name,
      });
    }

    return entry;
  }

  async cancel(id: string) {
    return this.prisma.waitingList.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async markNoShow(id: string) {
    return this.prisma.waitingList.update({
      where: { id },
      data: { status: 'no_show' },
    });
  }

  async delete(id: string) {
    await this.prisma.waitingList.delete({ where: { id } });
  }

  async getQueuePosition(id: string) {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id },
      select: { outletId: true, queuedAt: true, status: true },
    });

    if (!entry || entry.status !== 'waiting') {
      return { position: 0, estimatedWait: 0 };
    }

    const position = await this.prisma.waitingList.count({
      where: {
        outletId: entry.outletId,
        status: 'waiting',
        queuedAt: { lt: entry.queuedAt },
      },
    });

    return {
      position: position + 1,
      estimatedWait: (position + 1) * 15,
    };
  }

  async getStats(outletId: string) {
    const [waiting, notified, seated, cancelled, noShow] = await Promise.all([
      this.prisma.waitingList.count({ where: { outletId, status: 'waiting' } }),
      this.prisma.waitingList.count({ where: { outletId, status: 'notified' } }),
      this.prisma.waitingList.count({
        where: {
          outletId,
          status: 'seated',
          seatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.waitingList.count({
        where: {
          outletId,
          status: 'cancelled',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.waitingList.count({
        where: {
          outletId,
          status: 'no_show',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // Calculate average wait time for seated today
    const seatedToday = await this.prisma.waitingList.findMany({
      where: {
        outletId,
        status: 'seated',
        seatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      select: { queuedAt: true, seatedAt: true },
    });

    const avgWaitTime =
      seatedToday.length > 0
        ? seatedToday.reduce((sum, entry) => {
            const wait = entry.seatedAt
              ? (entry.seatedAt.getTime() - entry.queuedAt.getTime()) / 60000
              : 0;
            return sum + wait;
          }, 0) / seatedToday.length
        : 0;

    return {
      waiting,
      notified,
      seatedToday: seated,
      cancelledToday: cancelled,
      noShowToday: noShow,
      avgWaitTime: Math.round(avgWaitTime),
      estimatedWait: waiting * 15,
    };
  }
}
