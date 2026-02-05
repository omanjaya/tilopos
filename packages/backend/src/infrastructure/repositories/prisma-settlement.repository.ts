import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ISettlementRepository,
  SettlementRecord,
} from '../../domain/interfaces/repositories/settlement.repository';

@Injectable()
export class PrismaSettlementRepository implements ISettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOutletId(outletId: string): Promise<SettlementRecord[]> {
    return this.prisma.paymentSettlement.findMany({
      where: { outletId },
      orderBy: { settlementDate: 'desc' },
    });
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
    return this.prisma.paymentSettlement.create({
      data: {
        outletId: data.outletId,
        paymentMethod: data.paymentMethod,
        settlementDate: data.settlementDate,
        totalTransactions: data.totalTransactions,
        grossAmount: data.grossAmount,
        feeAmount: data.feeAmount,
        netAmount: data.netAmount,
        referenceNumber: data.referenceNumber,
      },
    });
  }

  async settle(id: string): Promise<SettlementRecord> {
    return this.prisma.paymentSettlement.update({
      where: { id },
      data: { status: 'settled', settledAt: new Date() },
    });
  }

  async dispute(id: string): Promise<SettlementRecord> {
    return this.prisma.paymentSettlement.update({
      where: { id },
      data: { status: 'disputed' },
    });
  }
}
