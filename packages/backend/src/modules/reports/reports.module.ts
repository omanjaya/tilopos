import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExportModule } from '../../infrastructure/export/export.module';
import { GenerateSalesReportUseCase } from '../../application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '../../application/use-cases/reports/generate-inventory-report.use-case';

@Module({
  imports: [ExportModule],
  controllers: [ReportsController],
  providers: [GenerateSalesReportUseCase, GenerateInventoryReportUseCase, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
