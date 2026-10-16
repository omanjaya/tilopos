import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import type {
  ITableRepository,
  TableRecord,
  CreateTableData,
  UpdateTableData,
} from '../../domain/interfaces/repositories/table.repository';
import { PrismaService } from '../database/prisma.service';
import type { Table } from '@prisma/client';

/** uq_table_outlet_name_active: one active table per (outlet, name). */
function rethrowDuplicateName(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(
      ErrorCode.DUPLICATE_TABLE,
      'Table with this name already exists',
      HttpStatus.CONFLICT,
    );
  }
  throw error;
}

@Injectable()
export class PrismaTableRepository implements ITableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, businessId: string): Promise<TableRecord | null> {
    const table = await this.prisma.table.findFirst({
      where: { id, outlet: { businessId } },
    });

    if (!table) {
      return null;
    }

    return this.toRecord(table);
  }

  async findByOutlet(outletId: string, activeOnly = true): Promise<TableRecord[]> {
    const tables = await this.prisma.table.findMany({
      where: { outletId, ...(activeOnly && { isActive: true }) },
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    });

    return tables.map((t) => this.toRecord(t));
  }

  async findBySection(outletId: string, section: string): Promise<TableRecord[]> {
    const tables = await this.prisma.table.findMany({
      where: { outletId, section, isActive: true },
      orderBy: { name: 'asc' },
    });

    return tables.map((t) => this.toRecord(t));
  }

  async findByStatus(
    outletId: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
  ): Promise<TableRecord[]> {
    const tables = await this.prisma.table.findMany({
      where: { outletId, status, isActive: true },
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    });

    return tables.map((t) => this.toRecord(t));
  }

  async create(data: CreateTableData): Promise<TableRecord> {
    const created = await this.prisma.table
      .create({
        data: {
          outletId: data.outletId,
          name: data.name,
          capacity: data.capacity ?? 4,
          section: data.section,
          positionX: data.positionX,
          positionY: data.positionY,
        },
      })
      .catch(rethrowDuplicateName);

    return this.toRecord(created);
  }

  async update(id: string, data: UpdateTableData, businessId: string): Promise<TableRecord> {
    const { count } = await this.prisma.table
      .updateMany({
        where: { id, outlet: { businessId } },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          ...(data.section !== undefined && { section: data.section }),
          ...(data.positionX !== undefined && { positionX: data.positionX }),
          ...(data.positionY !== undefined && { positionY: data.positionY }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      })
      .catch(rethrowDuplicateName);
    return this.reload(id, businessId, count);
  }

  async delete(id: string, businessId: string): Promise<void> {
    const { count } = await this.prisma.table.updateMany({
      where: { id, outlet: { businessId } },
      data: { isActive: false },
    });
    if (count === 0) {
      throw new NotFoundException('Table not found');
    }
  }

  async updateStatus(
    id: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
    currentOrderId: string | undefined,
    businessId: string,
  ): Promise<TableRecord> {
    const { count } = await this.prisma.table.updateMany({
      where: { id, outlet: { businessId } },
      data: {
        status,
        currentOrderId: currentOrderId ?? null,
        occupiedAt: status === 'occupied' ? new Date() : null,
      },
    });
    return this.reload(id, businessId, count);
  }

  private async reload(id: string, businessId: string, count: number): Promise<TableRecord> {
    const table = count > 0 ? await this.findById(id, businessId) : null;
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  private toRecord(table: Table): TableRecord {
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
