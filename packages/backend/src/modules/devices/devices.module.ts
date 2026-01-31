import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaDeviceRepository } from '../../infrastructure/repositories/prisma-device.repository';

@Module({
  controllers: [DevicesController],
  providers: [
    DevicesService,
    { provide: REPOSITORY_TOKENS.DEVICE, useClass: PrismaDeviceRepository },
  ],
  exports: [DevicesService],
})
export class DevicesModule {}
