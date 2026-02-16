import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { TemplatesModule } from '../templates/templates.module';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [TemplatesModule, BusinessModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
