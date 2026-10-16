import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, WaitingList } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { parseBusinessDate } from '../../shared/utils/business-time';

export interface TableDto {
  id: string;
  outletId: string;
  name: string;
  capacity: number;
  section: string | null;
  positionX: number | null;
  positionY: number | null;
  status: string;
  currentOrderId: string | null;
  occupiedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ReservationDto {
  id: string;
  outletId: string;
  tableId: string | null;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  reservedAt: Date;
  notes: string | null;
  status: string;
  createdAt: Date;
}

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

/**
 * Reservations are stored in the waiting_list table, tagged by a notes prefix
 * (there is no Reservation model yet — see handoff). WaitingListService excludes
 * these rows from the walk-in queue.
 */
export const RESERVATION_PREFIX = '[RESERVATION]';
const RESERVATION_WINDOW_MS = 2 * 60 * 60 * 1000;
const OPEN_RESERVATION = ['waiting', 'notified'] as const;

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Tables ====================

  /** Loads a table of the caller's business or throws 404. */
  async findById(id: string, businessId: string): Promise<TableDto> {
    const table = await this.prisma.table.findFirst({
      where: { id, outlet: { businessId } },
    });
    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }
    return this.toDto(table);
  }

  async updateStatus(
    id: string,
    businessId: string,
    status: TableStatus,
    currentOrderId?: string,
  ): Promise<TableDto> {
    const existing = await this.findById(id, businessId);

    if (currentOrderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: currentOrderId, outletId: existing.outletId },
        select: { id: true },
      });
      if (!order) {
        throw new BadRequestException('Order does not belong to this table’s outlet');
      }
    }
    if (status !== 'occupied' && currentOrderId) {
      throw new BadRequestException('currentOrderId is only allowed for occupied tables');
    }

    const table = await this.prisma.table.update({
      where: { id: existing.id },
      data: {
        status,
        currentOrderId: status === 'occupied' ? (currentOrderId ?? null) : null,
        occupiedAt: status === 'occupied' ? new Date() : null,
      },
    });
    return this.toDto(table);
  }

  async getSections(outletIds: string[]): Promise<string[]> {
    if (outletIds.length === 0) return [];
    const tables = await this.prisma.table.findMany({
      where: { outletId: { in: outletIds }, isActive: true, section: { not: null } },
      select: { section: true },
      distinct: ['section'],
      orderBy: { section: 'asc' },
    });
    return tables.map((t) => t.section).filter((s): s is string => s !== null);
  }

  // ==================== Reservations ====================

  async createReservation(
    businessId: string,
    data: {
      tableId: string;
      customerName: string;
      customerPhone: string;
      partySize: number;
      reservedAt: Date;
      notes?: string;
    },
  ): Promise<ReservationDto> {
    if (Number.isNaN(data.reservedAt.getTime())) {
      throw new BadRequestException('Invalid reservedAt');
    }
    const table = await this.prisma.table.findFirst({
      where: { id: data.tableId, outlet: { businessId } },
    });
    if (!table) {
      throw new NotFoundException(`Table ${data.tableId} not found`);
    }
    if (!table.isActive) {
      throw new BadRequestException('Cannot reserve an inactive table');
    }

    const windowStart = new Date(data.reservedAt.getTime() - RESERVATION_WINDOW_MS);
    const windowEnd = new Date(data.reservedAt.getTime() + RESERVATION_WINDOW_MS);

    // Serializable: the conflict check and the insert must see the same snapshot,
    // otherwise two hosts can book the same table for the same slot.
    const reservation = await this.prisma.$transaction(
      async (tx) => {
        const conflict = await tx.waitingList.findFirst({
          where: {
            tableId: table.id,
            status: { in: [...OPEN_RESERVATION] },
            queuedAt: { gte: windowStart, lte: windowEnd },
            notes: { startsWith: RESERVATION_PREFIX },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            'Table already has a reservation within the requested time window',
          );
        }
        return tx.waitingList.create({
          data: {
            outletId: table.outletId,
            tableId: table.id,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            partySize: data.partySize,
            queuedAt: data.reservedAt,
            notes: data.notes ? `${RESERVATION_PREFIX} ${data.notes}` : RESERVATION_PREFIX,
            status: 'waiting',
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return this.toReservationDto(reservation);
  }

  /** Reservations of one business day (YYYY-MM-DD, Asia/Jakarta). */
  async getReservations(outletIds: string[], date: string): Promise<ReservationDto[]> {
    if (outletIds.length === 0) return [];
    let range: { start: Date; end: Date };
    try {
      range = parseBusinessDate(date);
    } catch {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const reservations = await this.prisma.waitingList.findMany({
      where: {
        outletId: { in: outletIds },
        notes: { startsWith: RESERVATION_PREFIX },
        queuedAt: { gte: range.start, lte: range.end },
        status: { in: ['waiting', 'notified', 'seated'] },
      },
      orderBy: { queuedAt: 'asc' },
      take: 500,
    });
    return reservations.map((r) => this.toReservationDto(r));
  }

  async cancelReservation(reservationId: string, businessId: string): Promise<ReservationDto> {
    const reservation = await this.findReservation(reservationId, businessId);

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.waitingList.updateMany({
        where: { id: reservation.id, status: { in: [...OPEN_RESERVATION] } },
        data: { status: 'cancelled' },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(`Cannot cancel reservation in status: ${reservation.status}`);
      }
      if (reservation.tableId) {
        // Only release the table if it is still held by a reservation.
        await tx.table.updateMany({
          where: { id: reservation.tableId, status: 'reserved' },
          data: { status: 'available' },
        });
      }
      const updated = await tx.waitingList.findUniqueOrThrow({ where: { id: reservation.id } });
      return this.toReservationDto(updated);
    });
  }

  async checkInReservation(reservationId: string, businessId: string): Promise<ReservationDto> {
    const reservation = await this.findReservation(reservationId, businessId);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.waitingList.updateMany({
        where: { id: reservation.id, status: { in: [...OPEN_RESERVATION] } },
        data: { status: 'seated', seatedAt: now },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(`Cannot check in reservation in status: ${reservation.status}`);
      }
      if (reservation.tableId) {
        const seated = await tx.table.updateMany({
          where: {
            id: reservation.tableId,
            outletId: reservation.outletId,
            status: { in: ['available', 'reserved'] },
          },
          data: { status: 'occupied', occupiedAt: now },
        });
        if (seated.count !== 1) {
          throw new ConflictException('The reserved table is not available');
        }
      }
      const updated = await tx.waitingList.findUniqueOrThrow({ where: { id: reservation.id } });
      return this.toReservationDto(updated);
    });
  }

  // ==================== Private Helpers ====================

  private async findReservation(id: string, businessId: string): Promise<WaitingList> {
    const where: Prisma.WaitingListWhereInput = {
      id,
      outlet: { businessId },
      notes: { startsWith: RESERVATION_PREFIX },
    };
    const reservation = await this.prisma.waitingList.findFirst({ where });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }
    return reservation;
  }

  private toReservationDto(entry: WaitingList): ReservationDto {
    const notes = entry.notes?.startsWith(RESERVATION_PREFIX)
      ? entry.notes.slice(RESERVATION_PREFIX.length).trim()
      : entry.notes;
    return {
      id: entry.id,
      outletId: entry.outletId,
      tableId: entry.tableId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      partySize: entry.partySize,
      reservedAt: entry.queuedAt,
      notes: notes || null,
      status: entry.status,
      createdAt: entry.createdAt,
    };
  }

  private toDto(table: TableDto): TableDto {
    return {
      id: table.id,
      outletId: table.outletId,
      name: table.name,
      capacity: table.capacity,
      section: table.section,
      positionX: table.positionX,
      positionY: table.positionY,
      status: table.status,
      currentOrderId: table.currentOrderId,
      occupiedAt: table.occupiedAt,
      isActive: table.isActive,
      createdAt: table.createdAt,
    };
  }
}
