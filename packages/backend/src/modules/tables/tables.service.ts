import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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

export interface CreateTableDto {
  outletId: string;
  name: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
}

export interface UpdateTableDto {
  name?: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
  isActive?: boolean;
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

export interface WaitingListDto {
  id: string;
  outletId: string;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  preferredSection: string | null;
  tableId: string | null;
  status: string;
  estimatedWait: number | null;
  notes: string | null;
  queuedAt: Date;
  notifiedAt: Date | null;
  seatedAt: Date | null;
}

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TableDto> {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    return this.toDto(table);
  }

  async findByOutlet(
    outletId: string,
    options?: { section?: string; status?: TableStatus; activeOnly?: boolean },
  ): Promise<TableDto[]> {
    const where: Record<string, unknown> = { outletId };

    if (options?.section) {
      where.section = options.section;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.activeOnly !== false) {
      where.isActive = true;
    }

    const tables = await this.prisma.table.findMany({
      where,
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    });

    return tables.map((t) => this.toDto(t));
  }

  async create(data: CreateTableDto): Promise<TableDto> {
    const existing = await this.prisma.table.findFirst({
      where: { outletId: data.outletId, name: data.name, isActive: true },
    });

    if (existing) {
      throw new NotFoundException('Table with this name already exists in the outlet');
    }

    const table = await this.prisma.table.create({
      data: {
        outletId: data.outletId,
        name: data.name,
        capacity: data.capacity ?? 4,
        section: data.section ?? null,
        positionX: data.positionX ?? null,
        positionY: data.positionY ?? null,
      },
    });

    return this.toDto(table);
  }

  async update(id: string, data: UpdateTableDto): Promise<TableDto> {
    const existing = await this.prisma.table.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.section !== undefined) updateData.section = data.section;
    if (data.positionX !== undefined) updateData.positionX = data.positionX;
    if (data.positionY !== undefined) updateData.positionY = data.positionY;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const table = await this.prisma.table.update({
      where: { id },
      data: updateData,
    });

    return this.toDto(table);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.table.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    if (existing.status === 'occupied') {
      throw new NotFoundException('Cannot deactivate an occupied table');
    }

    await this.prisma.table.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updateStatus(id: string, status: TableStatus, currentOrderId?: string): Promise<TableDto> {
    const existing = await this.prisma.table.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    const table = await this.prisma.table.update({
      where: { id },
      data: {
        status,
        currentOrderId: currentOrderId ?? null,
        occupiedAt: status === 'occupied' ? new Date() : null,
      },
    });

    return this.toDto(table);
  }

  async getSections(outletId: string): Promise<string[]> {
    const tables = await this.prisma.table.findMany({
      where: { outletId, isActive: true, section: { not: null } },
      select: { section: true },
      distinct: ['section'],
      orderBy: { section: 'asc' },
    });

    return tables.map((t) => t.section).filter((s): s is string => s !== null);
  }

  // ==================== Reservations ====================

  async createReservation(data: {
    tableId: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    reservedAt: Date;
    notes?: string;
  }): Promise<ReservationDto> {
    const table = await this.prisma.table.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw new NotFoundException(`Table ${data.tableId} not found`);
    }

    if (!table.isActive) {
      throw new BadRequestException('Cannot reserve an inactive table');
    }

    // Check for conflicting reservations within a 2-hour window
    const reservedStart = new Date(data.reservedAt);
    const windowStart = new Date(reservedStart.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(reservedStart.getTime() + 2 * 60 * 60 * 1000);

    const conflict = await this.prisma.waitingList.findFirst({
      where: {
        tableId: data.tableId,
        status: 'waiting',
        queuedAt: { gte: windowStart, lte: windowEnd },
        notes: { startsWith: '[RESERVATION]' },
      },
    });

    if (conflict) {
      throw new BadRequestException(
        'Table already has a reservation within the requested time window',
      );
    }

    const reservation = await this.prisma.waitingList.create({
      data: {
        outletId: table.outletId,
        tableId: data.tableId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        partySize: data.partySize,
        queuedAt: data.reservedAt,
        notes: data.notes ? `[RESERVATION] ${data.notes}` : '[RESERVATION]',
        status: 'waiting',
      },
    });

    return this.toReservationDto(reservation);
  }

  async getReservations(outletId: string, date: Date): Promise<ReservationDto[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await this.prisma.waitingList.findMany({
      where: {
        outletId,
        notes: { startsWith: '[RESERVATION]' },
        queuedAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['waiting', 'notified', 'seated'] },
      },
      orderBy: { queuedAt: 'asc' },
    });

    return reservations.map((r) => this.toReservationDto(r));
  }

  async cancelReservation(reservationId: string): Promise<ReservationDto> {
    const reservation = await this.prisma.waitingList.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (reservation.status !== 'waiting' && reservation.status !== 'notified') {
      throw new BadRequestException(`Cannot cancel reservation in status: ${reservation.status}`);
    }

    const updated = await this.prisma.waitingList.update({
      where: { id: reservationId },
      data: { status: 'cancelled' },
    });

    // If the table was reserved, free it
    if (reservation.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: reservation.tableId },
      });
      if (table && table.status === 'reserved') {
        await this.prisma.table.update({
          where: { id: reservation.tableId },
          data: { status: 'available' },
        });
      }
    }

    return this.toReservationDto(updated);
  }

  async checkInReservation(reservationId: string): Promise<ReservationDto> {
    const reservation = await this.prisma.waitingList.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (reservation.status !== 'waiting' && reservation.status !== 'notified') {
      throw new BadRequestException(`Cannot check in reservation in status: ${reservation.status}`);
    }

    const updated = await this.prisma.waitingList.update({
      where: { id: reservationId },
      data: {
        status: 'seated',
        seatedAt: new Date(),
      },
    });

    // Mark the table as occupied
    if (reservation.tableId) {
      await this.prisma.table.update({
        where: { id: reservation.tableId },
        data: {
          status: 'occupied',
          occupiedAt: new Date(),
        },
      });
    }

    return this.toReservationDto(updated);
  }

  // ==================== Waiting List ====================

  async addToWaitingList(data: {
    outletId: string;
    customerName: string;
    partySize: number;
    phone?: string;
    preferredSection?: string;
  }): Promise<WaitingListDto> {
    const entry = await this.prisma.waitingList.create({
      data: {
        outletId: data.outletId,
        customerName: data.customerName,
        customerPhone: data.phone ?? null,
        partySize: data.partySize,
        preferredSection: data.preferredSection ?? null,
        status: 'waiting',
      },
    });

    return this.toWaitingListDto(entry);
  }

  async getWaitingList(outletId: string): Promise<WaitingListDto[]> {
    const entries = await this.prisma.waitingList.findMany({
      where: {
        outletId,
        status: { in: ['waiting', 'notified'] },
        OR: [{ notes: { not: { startsWith: '[RESERVATION]' } } }, { notes: null }],
      },
      orderBy: { queuedAt: 'asc' },
    });

    return entries.map((e) => this.toWaitingListDto(e));
  }

  async notifyFromWaitingList(waitingId: string): Promise<WaitingListDto> {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id: waitingId },
    });

    if (!entry) {
      throw new NotFoundException(`Waiting list entry ${waitingId} not found`);
    }

    if (entry.status !== 'waiting') {
      throw new BadRequestException(`Cannot notify entry in status: ${entry.status}`);
    }

    const updated = await this.prisma.waitingList.update({
      where: { id: waitingId },
      data: {
        status: 'notified',
        notifiedAt: new Date(),
      },
    });

    return this.toWaitingListDto(updated);
  }

  async seatFromWaitingList(waitingId: string, tableId: string): Promise<WaitingListDto> {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id: waitingId },
    });

    if (!entry) {
      throw new NotFoundException(`Waiting list entry ${waitingId} not found`);
    }

    if (entry.status !== 'waiting' && entry.status !== 'notified') {
      throw new BadRequestException(`Cannot seat entry in status: ${entry.status}`);
    }

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException(`Table ${tableId} not found`);
    }

    if (table.status !== 'available') {
      throw new BadRequestException(
        `Table ${table.name} is not available (current status: ${table.status})`,
      );
    }

    const updated = await this.prisma.waitingList.update({
      where: { id: waitingId },
      data: {
        status: 'seated',
        tableId,
        seatedAt: new Date(),
      },
    });

    await this.prisma.table.update({
      where: { id: tableId },
      data: {
        status: 'occupied',
        occupiedAt: new Date(),
      },
    });

    return this.toWaitingListDto(updated);
  }

  // ==================== Private Helpers ====================

  private toReservationDto(entry: {
    id: string;
    outletId: string;
    tableId: string | null;
    customerName: string;
    customerPhone: string | null;
    partySize: number;
    queuedAt: Date;
    notes: string | null;
    status: string;
    createdAt: Date;
  }): ReservationDto {
    return {
      id: entry.id,
      outletId: entry.outletId,
      tableId: entry.tableId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      partySize: entry.partySize,
      reservedAt: entry.queuedAt,
      notes: entry.notes?.replace('[RESERVATION] ', '').replace('[RESERVATION]', '') || null,
      status: entry.status,
      createdAt: entry.createdAt,
    };
  }

  private toWaitingListDto(entry: {
    id: string;
    outletId: string;
    customerName: string;
    customerPhone: string | null;
    partySize: number;
    preferredSection: string | null;
    tableId: string | null;
    status: string;
    estimatedWait: number | null;
    notes: string | null;
    queuedAt: Date;
    notifiedAt: Date | null;
    seatedAt: Date | null;
  }): WaitingListDto {
    return {
      id: entry.id,
      outletId: entry.outletId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      partySize: entry.partySize,
      preferredSection: entry.preferredSection,
      tableId: entry.tableId,
      status: entry.status,
      estimatedWait: entry.estimatedWait,
      notes: entry.notes,
      queuedAt: entry.queuedAt,
      notifiedAt: entry.notifiedAt,
      seatedAt: entry.seatedAt,
    };
  }

  private toDto(table: {
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
  }): TableDto {
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
