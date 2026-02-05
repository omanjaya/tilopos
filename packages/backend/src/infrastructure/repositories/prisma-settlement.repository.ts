import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  ISettlementRepository,
  SettlementRecord,
} from '../../domain/interfaces/repositories/settlement.repository';

@Injectable()
export class PrismaSettlementRepository implements ISettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOutletId(outletId: string): Promise<SettlementRecord[]> {
    const settlements = await this.prisma.paymentSettlement.findMany({
      where: { outletId },
      orderBy: { settlementDate: 'desc' },
    });

    return settlements.map((settlement) => this.mapToRecord(settlement));
  }

  async create(data: {
    outletId: string;
    paymentMethod: string;
    settlementDate: Date;
    totalTransactions: number;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    referenceNumber: string | null;
  }): Promise<SettlementRecord> {
    const settlement = await this.prisma.paymentSettlement.create({
      data: {
        outletId: data.outletId,
        paymentMethod: data.paymentMethod,
        settlementDate: data.settlementDate,
        totalTransactions: data.totalTransactions,
        grossAmount: new Decimal(data.grossAmount),
        feeAmount: new Decimal(data.feeAmount),
        netAmount: new Decimal(data.netAmount),
        referenceNumber: data.referenceNumber,
      },
    });

    return this.mapToRecord(settlement);
  }

  async settle(id: string): Promise<SettlementRecord> {
    const settlement = await this.prisma.paymentSettlement.update({
      where: { id },
      data: { status: 'settled', settledAt: new Date() },
    });

    return this.mapToRecord(settlement);
  }

  async dispute(id: string): Promise<SettlementRecord> {
    const settlement = await this.prisma.paymentSettlement.update({
      where: { id },
      data: { status: 'disputed' },
    });

    return this.mapToRecord(settlement);
  }

  private mapToRecord(settlement: {
    id: string;
    outletId: string;
    paymentMethod: string;
    settlementDate: Date;
    totalTransactions: number;
    grossAmount: Decimal;
    feeAmount: Decimal;
    netAmount: Decimal;
    status: string;
    referenceNumber: string | null;
    settledAt: Date | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): SettlementRecord {
    return {
      id: settlement.id,
      outletId: settlement.outletId,
      paymentMethod: settlement.paymentMethod,
      settlementDate: settlement.settlementDate,
      totalTransactions: settlement.totalTransactions,
      grossAmount: settlement.grossAmount.toNumber(),
      feeAmount: settlement.feeAmount.toNumber(),
      netAmount: settlement.netAmount.toNumber(),
      status: settlement.status,
      referenceNumber: settlement.referenceNumber,
      settledAt: settlement.settledAt,
      metadata: settlement.metadata,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
    };
  }
}
