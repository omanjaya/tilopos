import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  OperatingHours,
  OperatingHoursData,
  OutletOperatingHoursEntry,
} from '../../../domain/interfaces/repositories/settings.repository';
import { asJsonObject, findOwnedOutletSettings, mutateOutletSettings } from './json-settings';

// Default: Open Mon-Sat 08:00-22:00, Closed Sunday
const DEFAULT_LEGACY_HOURS: OperatingHours[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: dayOfWeek !== 0,
  openTime: '08:00',
  closeTime: '22:00',
}));

const DEFAULT_HOURS: OutletOperatingHoursEntry[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: '08:00',
  closeTime: '22:00',
  isClosed: dayOfWeek === 0,
}));

/**
 * Operating hours stored in outlet.settings. Scoped to the caller's business;
 * an unknown outlet is a 404. A known outlet without configuration gets the default week.
 */
@Injectable()
export class OperatingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Legacy Operating Hours ====================

  async getOperatingHours(businessId: string, outletId: string): Promise<OperatingHours[]> {
    const outlet = await findOwnedOutletSettings(this.prisma, businessId, outletId);
    const hours = asJsonObject(outlet.settings).operatingHours;
    return Array.isArray(hours) ? (hours as OperatingHours[]) : DEFAULT_LEGACY_HOURS;
  }

  async updateOperatingHours(
    businessId: string,
    outletId: string,
    data: OperatingHoursData[],
  ): Promise<void> {
    await mutateOutletSettings(this.prisma, businessId, outletId, (current) => ({
      settings: {
        ...current,
        operatingHours: data.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
          breakStart: h.breakStart,
          breakEnd: h.breakEnd,
        })),
      },
    }));
  }

  // ==================== Outlet Operating Hours (New Format) ====================

  async getOutletOperatingHours(
    businessId: string,
    outletId: string,
  ): Promise<OutletOperatingHoursEntry[]> {
    const outlet = await findOwnedOutletSettings(this.prisma, businessId, outletId);
    const hours = asJsonObject(outlet.settings).operatingHoursV2;
    return Array.isArray(hours) && hours.length === 7
      ? (hours as OutletOperatingHoursEntry[])
      : DEFAULT_HOURS;
  }

  async updateOutletOperatingHours(
    businessId: string,
    outletId: string,
    data: OutletOperatingHoursEntry[],
  ): Promise<OutletOperatingHoursEntry[]> {
    const hours = data.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
      isClosed: h.isClosed,
    }));
    await mutateOutletSettings(this.prisma, businessId, outletId, (current) => ({
      settings: { ...current, operatingHoursV2: hours },
    }));
    return hours;
  }
}
