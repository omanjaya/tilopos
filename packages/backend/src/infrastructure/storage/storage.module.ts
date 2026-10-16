import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { ImageProcessorService } from './image-processor.service';
import { resolveS3Settings, resolveStorageDriver } from './storage.config';

@Module({
  providers: [
    StorageService,
    {
      provide: 'STORAGE_ADAPTER',
      useFactory: (configService: ConfigService) => {
        if (resolveStorageDriver(configService) === 's3') {
          return new S3StorageAdapter(resolveS3Settings(configService));
        }
        return new LocalStorageAdapter(configService.get<string>('CDN_URL'));
      },
      inject: [ConfigService],
    },
    ImageProcessorService,
  ],
  exports: [StorageService, ImageProcessorService],
})
export class StorageModule {}
