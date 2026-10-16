import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  BusinessRecord,
  UpdateBusinessData,
} from '../../../domain/interfaces/repositories/settings.repository';
import { mutateBusinessSettings } from './json-settings';

/**
 * Repository for managing business-level settings.
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
   * Update business profile. `data.settings` is a PATCH of already-whitelisted
   * keys; it is merged into business.settings under a row lock so other
   * settings (payment methods, printers, tax, onboarding flags) are preserved.
   */
  async updateBusiness(businessId: string, data: UpdateBusinessData): Promise<BusinessRecord> {
    const patch = data.settings;
    if (patch && Object.keys(patch).length > 0) {
      await mutateBusinessSettings(this.prisma, businessId, (current) => ({
        settings: { ...current, ...patch },
        result: undefined,
      }));
    }

    const profile = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
    };
    if (Object.keys(profile).length === 0) {
      return this.findBusiness(businessId);
    }
    return this.prisma.business.update({ where: { id: businessId }, data: profile });
  }
}
