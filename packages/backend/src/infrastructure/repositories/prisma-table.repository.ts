import { Injectable } from '@nestjs/common';
import type {
  ITableRepository,
  TableRecord,
  CreateTableData,
  UpdateTableData,
} from '../../domain/interfaces/repositories/table.repository';
import { PrismaService } from '../database/prisma.service';
import type { Table } from '@prisma/client';

@Injectable()
export class PrismaTableRepository implements ITableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TableRecord | null> {
    const table = await this.prisma.table.findUnique({
      where: { id },
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
    const created = await this.prisma.table.create({
      data: {
        outletId: data.outletId,
        name: data.name,
        capacity: data.capacity ?? 4,
        section: data.section,
        positionX: data.positionX,
        positionY: data.positionY,
      },
    });

    return this.toRecord(created);
  }

  async update(id: string, data: UpdateTableData): Promise<TableRecord> {
    const updated = await this.prisma.table.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.section !== undefined && { section: data.section }),
        ...(data.positionX !== undefined && { positionX: data.positionX }),
        ...(data.positionY !== undefined && { positionY: data.positionY }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.toRecord(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.table.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updateStatus(
    id: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
    currentOrderId?: string,
  ): Promise<TableRecord> {
    const updated = await this.prisma.table.update({
      where: { id },
      data: {
        status,
        currentOrderId: currentOrderId ?? null,
        occupiedAt: status === 'occupied' ? new Date() : null,
      },
    });

    return this.toRecord(updated);
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
