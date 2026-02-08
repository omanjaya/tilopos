import { Module } from '@nestjs/common';
import { FeatureService } from './services/feature.service';
import { BusinessTypeService } from './services/business-type.service';
import { FeatureController } from './controllers/feature.controller';
import { FeatureGuard } from '@common/guards/feature.guard';

@Module({
    controllers: [FeatureController],
    providers: [
        FeatureService,
        BusinessTypeService,
        FeatureGuard,
    ],
    exports: [
        FeatureService,
        BusinessTypeService,
        FeatureGuard,
    ],
})
export class BusinessModule { }
