import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  OperatingHours,
  OperatingHoursData,
  OutletOperatingHoursEntry,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing operating hours.
 * Handles store opening/closing times and schedules.
 */
@Injectable()
export class OperatingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Legacy Operating Hours ====================

  /**
   * Get operating hours for an outlet (legacy format)
   * Returns default schedule if not configured
   */
  async getOperatingHours(outletId: string): Promise<OperatingHours[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });

    const settings = (outlet?.settings as Record<string, unknown>) || {};
    const hours = settings.operatingHours as OperatingHours[] | undefined;

    if (hours && Array.isArray(hours)) {
      return hours;
    }

    // Default: Open Mon-Sat 08:00-22:00, Closed Sunday
    return [
      { dayOfWeek: 0, isOpen: false, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '22:00' },
    ];
  }

  /**
   * Update operating hours (legacy format)
   */
  async updateOperatingHours(outletId: string, data: OperatingHoursData[]): Promise<void> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });

    const currentSettings = (outlet?.settings as Record<string, unknown>) || {};
    await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        settings: {
          ...currentSettings,
          operatingHours: data,
        } as never,
      },
    });
  }

  // ==================== Outlet Operating Hours (New Format) ====================

  /**
   * Get outlet operating hours (new format)
   * @throws NotFoundException if outlet not found
   */
  async getOutletOperatingHours(outletId: string): Promise<OutletOperatingHoursEntry[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }

    const settings = (outlet.settings as Record<string, unknown>) || {};
    const hours = settings.operatingHoursV2 as OutletOperatingHoursEntry[] | undefined;

    if (hours && Array.isArray(hours) && hours.length === 7) {
      return hours;
    }

    // Default: Open Mon-Sat 08:00-22:00, Closed Sunday
    return [
      { dayOfWeek: 0, openTime: '08:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 6, openTime: '08:00', closeTime: '22:00', isClosed: false },
    ];
  }

  /**
   * Update outlet operating hours (new format)
   * @throws NotFoundException if outlet not found
   */
  async updateOutletOperatingHours(
    outletId: string,
    data: OutletOperatingHoursEntry[],
  ): Promise<OutletOperatingHoursEntry[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }

    const currentSettings = (outlet.settings as Record<string, unknown>) || {};
    await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        settings: {
          ...currentSettings,
          operatingHoursV2: data,
        } as never,
      },
    });

    return data;
  }
}
