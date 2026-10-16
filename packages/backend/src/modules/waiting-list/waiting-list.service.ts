import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma, WaitingListStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { startOfBusinessDay } from '../../shared/utils/business-time';

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

const MINUTES_PER_PARTY = 15;
const DEFAULT_LIST_LIMIT = 200;

/**
 * Allowed status transitions. seated / cancelled / no_show are terminal.
 */
const TRANSITIONS: Record<WaitingListStatus, readonly WaitingListStatus[]> = {
  waiting: ['notified', 'seated', 'cancelled', 'no_show'],
  notified: ['seated', 'cancelled', 'no_show'],
  seated: [],
  cancelled: [],
  no_show: [],
};

/**
 * Reservations share the waiting_list table (notes prefix '[RESERVATION]', see
 * TablesService). They are never part of the walk-in queue.
 */
const NOT_RESERVATION: Prisma.WaitingListWhereInput = {
  OR: [{ notes: null }, { NOT: { notes: { startsWith: '[RESERVATION]' } } }],
};

const TABLE_SELECT = { id: true, name: true, section: true } as const;

@Injectable()
export class WaitingListService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsGateway?: NotificationsGateway,
  ) {}

  /** `outletId` must already be verified by TenantAccessService. */
  async create(data: CreateWaitingListDto) {
    const currentQueue = await this.prisma.waitingList.count({
      where: { outletId: data.outletId, status: 'waiting', ...NOT_RESERVATION },
    });
    const estimatedWait = (currentQueue + 1) * MINUTES_PER_PARTY;

    const entry = await this.prisma.waitingList.create({
      data: {
        outletId: data.outletId,
        customerName: data.customerName,
        customerPhone: data.customerPhone ?? null,
        partySize: data.partySize,
        preferredSection: data.preferredSection ?? null,
        notes: data.notes ?? null,
        estimatedWait,
      },
      include: {
        outlet: { select: { name: true } },
        table: { select: TABLE_SELECT },
      },
    });

    this.notificationsGateway?.emitQueueCustomerAdded(data.outletId, {
      customerId: entry.id,
      customerName: data.customerName,
      partySize: data.partySize,
      position: currentQueue + 1,
      estimatedWaitMinutes: estimatedWait,
    });

    return entry;
  }

  /**
   * Walk-in queue of the given (verified) outlets. Without a status filter only
   * the open queue plus today's closed entries are returned, never full history.
   */
  async findByOutlet(outletIds: string[], status?: WaitingListStatus, limit?: number) {
    if (outletIds.length === 0) return [];
    const where: Prisma.WaitingListWhereInput = {
      outletId: { in: outletIds },
      AND: [
        NOT_RESERVATION,
        status
          ? { status }
          : {
              OR: [
                { status: { in: ['waiting', 'notified'] } },
                { queuedAt: { gte: startOfBusinessDay() } },
              ],
            },
      ],
    };
    return this.prisma.waitingList.findMany({
      where,
      include: { table: { select: TABLE_SELECT } },
      orderBy: { queuedAt: 'asc' },
      take: limit ?? DEFAULT_LIST_LIMIT,
    });
  }

  /** Entry of the caller's business, or 404. */
  async findById(id: string, businessId: string) {
    const entry = await this.prisma.waitingList.findFirst({
      where: { id, outlet: { businessId } },
      include: {
        outlet: { select: { name: true, phone: true } },
        table: { select: { ...TABLE_SELECT, capacity: true } },
      },
    });
    if (!entry) {
      throw new NotFoundException(`Waiting list entry ${id} not found`);
    }
    return entry;
  }

  async update(id: string, businessId: string, data: UpdateWaitingListDto) {
    if (data.status === 'seated') {
      if (!data.tableId) {
        throw new ConflictException('tableId is required to seat a customer');
      }
      return this.seat(id, businessId, data.tableId);
    }

    const entry = await this.findById(id, businessId);
    if (data.tableId !== undefined) {
      await this.assertTableInOutlet(data.tableId, entry.outletId);
    }

    const updateData: Prisma.WaitingListUncheckedUpdateManyInput = {};
    if (data.status !== undefined && data.status !== entry.status) {
      this.assertTransition(entry.status, data.status);
      updateData.status = data.status;
      if (data.status === 'notified') updateData.notifiedAt = new Date();
    }
    if (data.tableId !== undefined) updateData.tableId = data.tableId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.estimatedWait !== undefined) updateData.estimatedWait = data.estimatedWait;

    const result = await this.prisma.waitingList.updateMany({
      where: { id: entry.id, status: entry.status },
      data: updateData,
    });
    if (result.count !== 1) {
      throw new ConflictException('Waiting list entry was changed concurrently');
    }
    return this.reload(entry.id);
  }

  async notify(id: string, businessId: string) {
    const result = await this.transition(id, businessId, 'notified', { notifiedAt: new Date() });

    this.notificationsGateway?.emitQueueCustomerCalled(result.outletId, {
      customerId: id,
      customerName: result.customerName,
      tableId: result.tableId || '',
      tableName: result.table?.name || '',
    });
    return result;
  }

  /**
   * Seats an entry at a table of the SAME outlet. The table is claimed with a
   * conditional update (status 'available') in the same $transaction as the
   * entry, so two hosts can never seat two parties at one table.
   */
  async seat(id: string, businessId: string, tableId: string) {
    const entry = await this.findById(id, businessId);
    this.assertTransition(entry.status, 'seated');
    await this.assertTableInOutlet(tableId, entry.outletId);

    const seated = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.table.updateMany({
        where: { id: tableId, outletId: entry.outletId, isActive: true, status: 'available' },
        data: { status: 'occupied', occupiedAt: now },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Table is not available');
      }
      const updated = await tx.waitingList.updateMany({
        where: { id: entry.id, status: entry.status },
        data: { status: 'seated', tableId, seatedAt: now },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Waiting list entry was changed concurrently');
      }
      return tx.waitingList.findUniqueOrThrow({
        where: { id: entry.id },
        include: { table: { select: TABLE_SELECT } },
      });
    });

    if (seated.table) {
      this.notificationsGateway?.emitQueueCustomerSeated(seated.outletId, {
        customerId: seated.id,
        customerName: seated.customerName,
        tableId,
        tableName: seated.table.name,
      });
    }
    return seated;
  }

  async cancel(id: string, businessId: string) {
    return this.transition(id, businessId, 'cancelled');
  }

  async markNoShow(id: string, businessId: string) {
    return this.transition(id, businessId, 'no_show');
  }

  async delete(id: string, businessId: string) {
    const result = await this.prisma.waitingList.deleteMany({
      where: { id, outlet: { businessId } },
    });
    if (result.count !== 1) {
      throw new NotFoundException(`Waiting list entry ${id} not found`);
    }
  }

  /** Queue position of an entry the caller is already allowed to see. */
  async getQueuePosition(id: string) {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id },
      select: { outletId: true, queuedAt: true, status: true },
    });
    if (!entry || entry.status !== 'waiting') {
      return { position: 0, estimatedWait: 0 };
    }
    const ahead = await this.prisma.waitingList.count({
      where: {
        outletId: entry.outletId,
        status: 'waiting',
        queuedAt: { lt: entry.queuedAt },
        ...NOT_RESERVATION,
      },
    });
    return {
      position: ahead + 1,
      estimatedWait: (ahead + 1) * MINUTES_PER_PARTY,
    };
  }

  /**
   * Public (customer QR) view: only status and queue position, never the
   * customer's name or phone. Unknown ids are a 404.
   */
  async getPublicPosition(id: string) {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id },
      select: { status: true, notes: true },
    });
    if (!entry || entry.notes?.startsWith('[RESERVATION]')) {
      throw new NotFoundException('Entry not found');
    }
    const position = await this.getQueuePosition(id);
    return { status: entry.status, ...position };
  }

  async getStats(outletIds: string[]) {
    const empty = {
      waiting: 0,
      notified: 0,
      seatedToday: 0,
      cancelledToday: 0,
      noShowToday: 0,
      avgWaitTime: 0,
      estimatedWait: 0,
    };
    if (outletIds.length === 0) return empty;

    const today = startOfBusinessDay();
    const base: Prisma.WaitingListWhereInput = { outletId: { in: outletIds }, ...NOT_RESERVATION };
    const [waiting, notified, seated, cancelled, noShow, seatedToday] = await Promise.all([
      this.prisma.waitingList.count({ where: { ...base, status: 'waiting' } }),
      this.prisma.waitingList.count({ where: { ...base, status: 'notified' } }),
      this.prisma.waitingList.count({
        where: { ...base, status: 'seated', seatedAt: { gte: today } },
      }),
      this.prisma.waitingList.count({
        where: { ...base, status: 'cancelled', createdAt: { gte: today } },
      }),
      this.prisma.waitingList.count({
        where: { ...base, status: 'no_show', createdAt: { gte: today } },
      }),
      this.prisma.waitingList.findMany({
        where: { ...base, status: 'seated', seatedAt: { gte: today } },
        select: { queuedAt: true, seatedAt: true },
        take: 1000,
      }),
    ]);

    const avgWaitTime =
      seatedToday.length > 0
        ? seatedToday.reduce(
            (sum, e) =>
              sum + (e.seatedAt ? (e.seatedAt.getTime() - e.queuedAt.getTime()) / 60000 : 0),
            0,
          ) / seatedToday.length
        : 0;

    return {
      waiting,
      notified,
      seatedToday: seated,
      cancelledToday: cancelled,
      noShowToday: noShow,
      avgWaitTime: Math.round(avgWaitTime),
      estimatedWait: waiting * MINUTES_PER_PARTY,
    };
  }

  // ==================== helpers ====================

  private assertTransition(from: WaitingListStatus, to: WaitingListStatus): void {
    if (!TRANSITIONS[from].includes(to)) {
      throw new ConflictException(`Cannot change waiting list entry from ${from} to ${to}`);
    }
  }

  private async assertTableInOutlet(tableId: string, outletId: string): Promise<void> {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, outletId },
      select: { id: true },
    });
    if (!table) {
      throw new NotFoundException('Table not found in this outlet');
    }
  }

  private async transition(
    id: string,
    businessId: string,
    to: WaitingListStatus,
    extra: Prisma.WaitingListUpdateManyMutationInput = {},
  ) {
    const entry = await this.findById(id, businessId);
    this.assertTransition(entry.status, to);
    const result = await this.prisma.waitingList.updateMany({
      where: { id: entry.id, status: entry.status },
      data: { ...extra, status: to },
    });
    if (result.count !== 1) {
      throw new ConflictException('Waiting list entry was changed concurrently');
    }
    return this.reload(entry.id);
  }

  private reload(id: string) {
    return this.prisma.waitingList.findUniqueOrThrow({
      where: { id },
      include: { table: { select: TABLE_SELECT } },
    });
  }
}
