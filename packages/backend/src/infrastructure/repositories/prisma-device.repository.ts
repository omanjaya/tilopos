import { Injectable } from '@nestjs/common';
import { DeviceType, DevicePlatform } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  IDeviceRepository,
  CreateDeviceData,
  DeviceRecord,
} from '../../domain/interfaces/repositories/device.repository';

@Injectable()
export class PrismaDeviceRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<DeviceRecord[]> {
    return this.prisma.device.findMany({
      where: { businessId, isActive: true },
    });
  }

  async findById(id: string): Promise<DeviceRecord | null> {
    return this.prisma.device.findUnique({ where: { id } });
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

  async updateSync(id: string): Promise<DeviceRecord> {
    return this.prisma.device.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.device.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
