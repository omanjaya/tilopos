import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Shift } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { money } from '../../shared/utils/money';
import type {
  IShiftRepository,
  ShiftRecord,
  CreateShiftData,
  CloseShiftData,
} from '../../domain/interfaces/repositories/shift.repository';

/** Cash values arrive as JS numbers; persist them as 2-dp decimals (no float artefacts). */
const cash = (value: number): Prisma.Decimal => money(value).toDecimalPlaces(2);

@Injectable()
export class PrismaShiftRepository implements IShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  private scoped(id: string, businessId: string): Prisma.ShiftWhereInput {
    return { id, outlet: { businessId } };
  }

  async findById(id: string, businessId: string): Promise<ShiftRecord | null> {
    const shift = await this.prisma.shift.findFirst({ where: this.scoped(id, businessId) });
    return shift ? this.mapToRecord(shift) : null;
  }

  async findOpenShift(employeeId: string): Promise<ShiftRecord | null> {
    const shift = await this.prisma.shift.findFirst({
      where: { employeeId, status: 'open' },
    });
    return shift ? this.mapToRecord(shift) : null;
  }

  async create(data: CreateShiftData): Promise<ShiftRecord> {
    const created = await this.prisma.shift.create({
      data: {
        outletId: data.outletId,
        employeeId: data.employeeId,
        startedAt: data.startedAt,
        openingCash: cash(data.openingCash),
        status: 'open',
      },
    });
    return this.mapToRecord(created);
  }

  async close(id: string, businessId: string, data: CloseShiftData): Promise<ShiftRecord> {
    // Conditional transition: only an open shift of this tenant can be closed, exactly once.
    const { count } = await this.prisma.shift.updateMany({
      where: { ...this.scoped(id, businessId), status: 'open' },
      data: {
        closingCash: cash(data.closingCash),
        expectedCash: cash(data.expectedCash),
        cashDifference: cash(data.cashDifference),
        endedAt: data.endedAt,
        status: 'closed',
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    const shift = await this.prisma.shift.findFirst({ where: this.scoped(id, businessId) });
    if (!shift) throw new NotFoundException('Shift not found');
    if (count === 0) throw new ConflictException('Shift is already closed');
    return this.mapToRecord(shift);
  }

  async addCashIn(id: string, businessId: string, amount: number): Promise<void> {
    await this.incrementOpenShift(id, businessId, { cashIn: { increment: cash(amount) } });
  }

  async addCashOut(id: string, businessId: string, amount: number): Promise<void> {
    await this.incrementOpenShift(id, businessId, { cashOut: { increment: cash(amount) } });
  }

  private async incrementOpenShift(
    id: string,
    businessId: string,
    data: Prisma.ShiftUpdateManyMutationInput,
  ): Promise<void> {
    const { count } = await this.prisma.shift.updateMany({
      where: { ...this.scoped(id, businessId), status: 'open' },
      data,
    });
    if (count === 0) {
      const exists = await this.prisma.shift.count({ where: this.scoped(id, businessId) });
      if (!exists) throw new NotFoundException('Shift not found');
      throw new ConflictException('Shift is not open');
    }
  }

  private mapToRecord(shift: Shift): ShiftRecord {
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
      cashIn: shift.cashIn.toNumber(),
      cashOut: shift.cashOut.toNumber(),
      notes: shift.notes,
      status: shift.status,
      createdAt: shift.createdAt,
    };
  }
}
