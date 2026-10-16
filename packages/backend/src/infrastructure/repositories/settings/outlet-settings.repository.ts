import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Outlet, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toNumber } from '../../../shared/utils/money';
import type {
  OutletRecord,
  CreateOutletData,
} from '../../../domain/interfaces/repositories/settings.repository';

export interface UpdateOutletData {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  taxRate?: number;
  serviceCharge?: number;
  isActive?: boolean;
}

/** Rates are percentages stored as Decimal; converted only at the API boundary. */
function toRecord(outlet: Outlet): OutletRecord {
  return {
    ...outlet,
    taxRate: toNumber(outlet.taxRate),
    serviceCharge: toNumber(outlet.serviceCharge),
  };
}

/** Outlet codes are unique per business (uq_outlet_business_code). */
function rethrowDuplicateCode(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Kode outlet sudah dipakai di bisnis ini');
  }
  throw error;
}

/**
 * Repository for outlet settings. Every read/write is scoped to the caller's business.
 */
@Injectable()
export class OutletSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOutlets(businessId: string): Promise<OutletRecord[]> {
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
    return outlets.map(toRecord);
  }

  async findOutletById(businessId: string, id: string): Promise<OutletRecord | null> {
    const outlet = await this.prisma.outlet.findFirst({ where: { id, businessId } });
    return outlet ? toRecord(outlet) : null;
  }

  async createOutlet(data: CreateOutletData): Promise<OutletRecord> {
    try {
      const outlet = await this.prisma.outlet.create({
        data: {
          businessId: data.businessId,
          name: data.name,
          code: data.code || null,
          address: data.address || null,
          phone: data.phone || null,
          taxRate: data.taxRate ?? 11,
          serviceCharge: data.serviceCharge ?? 0,
        },
      });
      return toRecord(outlet);
    } catch (error) {
      rethrowDuplicateCode(error);
    }
  }

  async updateOutlet(
    businessId: string,
    id: string,
    data: UpdateOutletData,
  ): Promise<OutletRecord> {
    const updateData: Prisma.OutletUpdateManyMutationInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.serviceCharge !== undefined) updateData.serviceCharge = data.serviceCharge;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    try {
      const { count } = await this.prisma.outlet.updateMany({
        where: { id, businessId },
        data: updateData,
      });
      if (count === 0) {
        throw new NotFoundException('Outlet not found');
      }
    } catch (error) {
      rethrowDuplicateCode(error);
    }

    const outlet = await this.findOutletById(businessId, id);
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    return outlet;
  }

  /** Soft delete (isActive = false). */
  async deleteOutlet(businessId: string, id: string): Promise<void> {
    const { count } = await this.prisma.outlet.updateMany({
      where: { id, businessId },
      data: { isActive: false },
    });
    if (count === 0) {
      throw new NotFoundException('Outlet not found');
    }
  }
}
