import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  BusinessRecord,
  UpdateBusinessData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing business-level settings.
 * Handles CRUD operations for business entities.
 */
@Injectable()
export class BusinessSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a business by ID
   * @throws NotFoundException if business not found
   */
  async findBusiness(businessId: string): Promise<BusinessRecord> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  /**
   * Update business information
   */
  async updateBusiness(businessId: string, data: UpdateBusinessData): Promise<BusinessRecord> {
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.settings !== undefined && { settings: data.settings as never }),
      },
    });
  }
}
