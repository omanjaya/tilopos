import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { ImageProcessorService } from './image-processor.service';

@Module({
  providers: [
    StorageService,
    {
      provide: 'STORAGE_ADAPTER',
      useFactory: (configService: ConfigService) => {
        const s3AccessKey = configService.get<string>('S3_ACCESS_KEY_ID');
        if (s3AccessKey) {
          return new S3StorageAdapter(configService);
        }
        return new LocalStorageAdapter();
      },
      inject: [ConfigService],
    },
    S3StorageAdapter,
    ImageProcessorService,
  ],
  exports: [StorageService, S3StorageAdapter, ImageProcessorService],
})
export class StorageModule {}
