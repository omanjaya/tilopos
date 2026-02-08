import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { SerialNumbersService } from './serial-numbers.service';
import { SerialNumbersController } from './serial-numbers.controller';

@Module({
  controllers: [SerialNumbersController],
  providers: [PrismaService, SerialNumbersService],
  exports: [SerialNumbersService],
})
export class SerialNumbersModule {}
