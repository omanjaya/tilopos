import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceType, DevicePlatform } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  IDeviceRepository,
  CreateDeviceData,
  DeviceRecord,
} from '../../domain/interfaces/repositories/device.repository';

/**
 * Every lookup/mutation by id is scoped to the caller's business
 * (Docs/ENGINEERING-RULES.md R3). `businessId` is declared optional only to stay
 * assignable to IDeviceRepository; passing undefined makes the strictWhere
 * middleware throw, so unscoped access fails loudly.
 */
@Injectable()
export class PrismaDeviceRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<DeviceRecord[]> {
    return this.prisma.device.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findById(id: string, businessId?: string): Promise<DeviceRecord | null> {
    return this.prisma.device.findFirst({ where: { id, businessId } });
  }

  async create(data: CreateDeviceData): Promise<DeviceRecord> {
    return this.prisma.device.create({
      data: {
        businessId: data.businessId,
        outletId: data.outletId,
        deviceName: data.deviceName,
        deviceType: data.deviceType as DeviceType,
        platform: data.platform as DevicePlatform | null,
        deviceIdentifier: data.deviceIdentifier,
      },
    });
  }

  async updateSync(id: string, businessId?: string): Promise<DeviceRecord> {
    const now = new Date();
    const { count } = await this.prisma.device.updateMany({
      where: { id, businessId },
      data: { lastSyncAt: now, lastActiveAt: now },
    });
    if (count === 0) {
      throw new NotFoundException('Device not found');
    }
    const device = await this.findById(id, businessId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  async deactivate(id: string, businessId?: string): Promise<void> {
    const { count } = await this.prisma.device.updateMany({
      where: { id, businessId },
      data: { isActive: false },
    });
    if (count === 0) {
      throw new NotFoundException('Device not found');
    }
  }
}
