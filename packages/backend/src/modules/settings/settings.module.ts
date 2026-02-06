import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import {
  SettingsRepository,
  BusinessSettingsRepository,
  OutletSettingsRepository,
  ModifierGroupRepository,
  LoyaltySettingsRepository,
  TaxConfigurationRepository,
  ReceiptTemplateRepository,
  OperatingHoursRepository,
  PaymentMethodRepository,
} from '../../infrastructure/repositories/settings';

@Module({
  controllers: [SettingsController],
  providers: [
    // Specialized repositories
    BusinessSettingsRepository,
    OutletSettingsRepository,
    ModifierGroupRepository,
    LoyaltySettingsRepository,
    TaxConfigurationRepository,
    ReceiptTemplateRepository,
    OperatingHoursRepository,
    PaymentMethodRepository,
    // Main facade repository
    {
      provide: REPOSITORY_TOKENS.SETTINGS,
      useClass: SettingsRepository,
    },
  ],
})
export class SettingsModule {}
