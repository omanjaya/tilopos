import { Module } from '@nestjs/common';
import { BundlePackagesController } from './bundle-packages.controller';
import { BundlePackagesService } from './bundle-packages.service';

@Module({
  controllers: [BundlePackagesController],
  providers: [BundlePackagesService],
  exports: [BundlePackagesService],
})
export class BundlePackagesModule {}
