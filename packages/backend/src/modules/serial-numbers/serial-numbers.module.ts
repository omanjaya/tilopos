import { Module } from '@nestjs/common';
import { SerialNumbersService } from './serial-numbers.service';
import { SerialNumbersController } from './serial-numbers.controller';

// PrismaService comes from the global DatabaseModule; do not re-provide it here.
@Module({
  controllers: [SerialNumbersController],
  providers: [SerialNumbersService],
  exports: [SerialNumbersService],
})
export class SerialNumbersModule {}
