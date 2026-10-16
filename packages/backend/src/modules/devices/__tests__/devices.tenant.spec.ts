import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../../infrastructure/auth/roles.decorator';
import { PrismaDeviceRepository } from '../../../infrastructure/repositories/prisma-device.repository';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PublishVersionDto } from '../../../application/dtos/device-features.dto';
import { DevicesController } from '../devices.controller';
import { DevicesService } from '../devices.service';

describe('Devices tenant scoping', () => {
  const device = { findFirst: jest.fn(), updateMany: jest.fn() };
  const prisma = { device } as unknown as PrismaService;
  const repo = new PrismaDeviceRepository(prisma);

  beforeEach(() => jest.resetAllMocks());

  it('findById filters by id AND businessId', async () => {
    device.findFirst.mockResolvedValue(null);
    await expect(repo.findById('dev-1', 'biz-a')).resolves.toBeNull();
    expect(device.findFirst).toHaveBeenCalledWith({ where: { id: 'dev-1', businessId: 'biz-a' } });
  });

  it('deactivate of another tenant device is a 404 (count 0)', async () => {
    device.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.deactivate('dev-b', 'biz-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(device.updateMany).toHaveBeenCalledWith({
      where: { id: 'dev-b', businessId: 'biz-a' },
      data: { isActive: false },
    });
  });

  it('updateSync of another tenant device is a 404 (count 0)', async () => {
    device.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.updateSync('dev-b', 'biz-a')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('service update-check/ack are scoped by businessId', async () => {
    const service = new DevicesService(prisma);
    device.findFirst.mockResolvedValue(null);
    await expect(service.checkForUpdate('dev-b', 'biz-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(device.findFirst).toHaveBeenCalledWith({ where: { id: 'dev-b', businessId: 'biz-a' } });

    device.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.acknowledgeUpdate('dev-b', 'biz-a', '1.0.0')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(device.updateMany.mock.calls[0][0].where).toEqual({ id: 'dev-b', businessId: 'biz-a' });
  });
});

describe('Devices authorization and routing', () => {
  it('publishing an app version is platform-only (super_admin)', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, DevicesController.prototype.publishVersion);
    expect(roles).toEqual(['super_admin']);
  });

  it('register and deactivate require owner/manager', () => {
    for (const handler of [
      DevicesController.prototype.register,
      DevicesController.prototype.deactivate,
    ]) {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['owner', 'manager']);
    }
  });

  it('static /versions routes are declared before /:id', () => {
    const names = Object.getOwnPropertyNames(DevicesController.prototype);
    expect(names.indexOf('listVersions')).toBeLessThan(names.indexOf('get'));
    expect(names.indexOf('publishVersion')).toBeLessThan(names.indexOf('get'));
  });

  it('downloadUrl must be https and version semver', async () => {
    const bad = plainToInstance(PublishVersionDto, {
      version: '1.2',
      platform: 'android',
      downloadUrl: 'http://evil.example.com/app.apk',
    });
    const errors = await validate(bad);
    expect(errors.map((e) => e.property).sort()).toEqual(['downloadUrl', 'version']);

    const good = plainToInstance(PublishVersionDto, {
      version: '1.2.3',
      platform: 'android',
      downloadUrl: 'https://cdn.example.com/app.apk',
    });
    expect(await validate(good)).toEqual([]);
  });
});
