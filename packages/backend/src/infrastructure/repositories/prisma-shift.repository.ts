import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import type {
  IShiftRepository,
  ShiftRecord,
  CreateShiftData,
  CloseShiftData,
} from '../../domain/interfaces/repositories/shift.repository';

@Injectable()
export class PrismaShiftRepository implements IShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ShiftRecord | null> {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      return null;
    }

    return this.mapToRecord(shift);
  }

  async findOpenShift(employeeId: string): Promise<ShiftRecord | null> {
    const shift = await this.prisma.shift.findFirst({
      where: { employeeId, status: 'open' },
    });

    if (!shift) {
      return null;
    }

    return this.mapToRecord(shift);
  }

  async create(data: CreateShiftData): Promise<ShiftRecord> {
    const created = await this.prisma.shift.create({
      data: {
        outletId: data.outletId,
        employeeId: data.employeeId,
        startedAt: data.startedAt,
        openingCash: new Decimal(data.openingCash),
        status: 'open',
      },
    });

    return this.mapToRecord(created);
  }

  async close(id: string, data: CloseShiftData): Promise<ShiftRecord> {
    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        closingCash: new Decimal(data.closingCash),
        expectedCash: new Decimal(data.expectedCash),
        cashDifference: new Decimal(data.cashDifference),
        endedAt: data.endedAt,
        status: 'closed',
      },
    });

    return this.mapToRecord(updated);
  }

  async addCashIn(id: string, amount: number): Promise<void> {
    await this.prisma.shift.update({
      where: { id },
      data: {
        cashIn: {
          increment: amount,
        },
      },
    });
  }

  async addCashOut(id: string, amount: number): Promise<void> {
    await this.prisma.shift.update({
      where: { id },
      data: {
        cashOut: {
          increment: amount,
        },
      },
    });
  }

  private mapToRecord(shift: {
    id: string;
    outletId: string;
    employeeId: string;
    startedAt: Date;
    endedAt: Date | null;
    openingCash: Decimal;
    closingCash: Decimal | null;
    expectedCash: Decimal | null;
    cashDifference: Decimal | null;
    cashIn?: Decimal | null;
    cashOut?: Decimal | null;
    notes: string | null;
    status: string;
    createdAt: Date;
  }): ShiftRecord {
    return {
      id: shift.id,
      outletId: shift.outletId,
      employeeId: shift.employeeId,
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      openingCash: shift.openingCash.toNumber(),
      closingCash: shift.closingCash !== null ? shift.closingCash.toNumber() : null,
      expectedCash: shift.expectedCash !== null ? shift.expectedCash.toNumber() : null,
      cashDifference: shift.cashDifference !== null ? shift.cashDifference.toNumber() : null,
      cashIn: shift.cashIn !== undefined && shift.cashIn !== null ? shift.cashIn.toNumber() : null,
      cashOut:
        shift.cashOut !== undefined && shift.cashOut !== null ? shift.cashOut.toNumber() : null,
      notes: shift.notes,
      status: shift.status,
      createdAt: shift.createdAt,
    };
  }
}
