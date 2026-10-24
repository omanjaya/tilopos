import { ExportModule } from '@infrastructure/export/export.module';
import { EmailModule } from '@infrastructure/notifications/email/email.module';
import { GenerateSalesReportUseCase } from '@application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '@application/use-cases/reports/generate-inventory-report.use-case';
import { AnalyticsQueriesService } from '@infrastructure/services/analytics-queries.service';
import { ReportScheduleScheduler } from './report-schedule.scheduler';
import { ScheduledReportRenderer } from './scheduled-report.renderer';
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
  PrinterConfigRepository,
  ReportScheduleRepository,
} from '../../infrastructure/repositories/settings';

@Module({
  imports: [ExportModule, EmailModule],
  controllers: [SettingsController],
  providers: [
    ReportScheduleScheduler,
    ScheduledReportRenderer,
    GenerateSalesReportUseCase,
    GenerateInventoryReportUseCase,
    AnalyticsQueriesService,
    // Specialized repositories
    BusinessSettingsRepository,
    OutletSettingsRepository,
    ModifierGroupRepository,
    LoyaltySettingsRepository,
    TaxConfigurationRepository,
    ReceiptTemplateRepository,
    OperatingHoursRepository,
    PaymentMethodRepository,
    PrinterConfigRepository,
    ReportScheduleRepository,
    // Main facade repository
    {
      provide: REPOSITORY_TOKENS.SETTINGS,
      useClass: SettingsRepository,
    },
  ],
})
export class SettingsModule {}
