import { Module } from '@nestjs/common';
import { FeatureService } from './services/feature.service';
import { BusinessTypeService } from './services/business-type.service';
import { OutletFeatureService } from './services/outlet-feature.service';
import { OutletTypeService } from './services/outlet-type.service';
import { FeatureController } from './controllers/feature.controller';
import { OutletFeatureController } from './controllers/outlet-feature.controller';
import { FeatureGuard } from '@common/guards/feature.guard';

@Module({
  controllers: [FeatureController, OutletFeatureController],
  providers: [
    FeatureService,
    BusinessTypeService,
    OutletFeatureService,
    OutletTypeService,
    FeatureGuard,
  ],
  exports: [
    FeatureService,
    BusinessTypeService,
    OutletFeatureService,
    OutletTypeService,
    FeatureGuard,
  ],
})
export class BusinessModule {}
