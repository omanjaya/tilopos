import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  OutletRecord,
  CreateOutletData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing outlet settings.
 * Handles CRUD operations for outlet entities.
 */
@Injectable()
export class OutletSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all outlets for a business
   */
  async findOutlets(businessId: string): Promise<OutletRecord[]> {
    const outlets = await this.prisma.outlet.findMany({ where: { businessId } });

    return outlets.map((o) => ({
      ...o,
      taxRate: o.taxRate.toNumber(),
      serviceCharge: o.serviceCharge.toNumber(),
    }));
  }

  /**
   * Find outlet by ID
   */
  async findOutletById(id: string): Promise<OutletRecord | null> {
    const outlet = await this.prisma.outlet.findUnique({ where: { id } });

    if (!outlet) {
      return null;
    }

    return {
      ...outlet,
      taxRate: outlet.taxRate.toNumber(),
      serviceCharge: outlet.serviceCharge.toNumber(),
    };
  }

  /**
   * Create a new outlet
   */
  async createOutlet(data: CreateOutletData): Promise<OutletRecord> {
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

    return {
      ...outlet,
      taxRate: outlet.taxRate.toNumber(),
      serviceCharge: outlet.serviceCharge.toNumber(),
    };
  }

  /**
   * Update outlet information
   */
  async updateOutlet(id: string, data: Record<string, unknown>): Promise<OutletRecord> {
    const outlet = await this.prisma.outlet.update({
      where: { id },
      data: data as Record<string, never>,
    });

    return {
      ...outlet,
      taxRate: outlet.taxRate.toNumber(),
      serviceCharge: outlet.serviceCharge.toNumber(),
    };
  }

  /**
   * Soft delete an outlet (set isActive to false)
   */
  async deleteOutlet(id: string): Promise<void> {
    await this.prisma.outlet.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
