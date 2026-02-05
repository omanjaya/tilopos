import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [StorageModule, MulterModule.register({ storage: undefined })],
  controllers: [UploadsController],
})
export class UploadsModule {}
