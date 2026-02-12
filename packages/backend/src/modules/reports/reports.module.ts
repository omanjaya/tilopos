import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportModule } from '../../infrastructure/export/export.module';
import { GenerateSalesReportUseCase } from '../../application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '../../application/use-cases/reports/generate-inventory-report.use-case';

// Import all new controllers
import { SalesReportsController } from './controllers/sales-reports.controller';
import { InventoryReportsController } from './controllers/inventory-reports.controller';
import { CustomerReportsController } from './controllers/customer-reports.controller';
import { FinancialReportsController } from './controllers/financial-reports.controller';
import { EmployeeReportsController } from './controllers/employee-reports.controller';
import { KitchenReportsController } from './controllers/kitchen-reports.controller';
import { ProductReportsController } from './controllers/product-reports.controller';
import { PaymentReportsController } from './controllers/payment-reports.controller';
import { PromotionReportsController } from './controllers/promotion-reports.controller';
import { CustomReportsController } from './controllers/custom-reports.controller';
import { TableReportsController } from './controllers/table-reports.controller';
import { StaffReportsController } from './controllers/staff-reports.controller';
import { AppointmentReportsController } from './controllers/appointment-reports.controller';
import { OwnerAnalyticsController } from './controllers/owner-analytics.controller';
import { FinancialCommandController } from './controllers/financial-command.controller';
import { StaffPerformanceController } from './controllers/staff-performance.controller';
import { DashboardReportsController } from './controllers/dashboard-reports.controller';
import { InvoiceReportsController } from './controllers/invoice-reports.controller';

@Module({
  imports: [ExportModule],
  controllers: [
    SalesReportsController,
    DashboardReportsController,
    InventoryReportsController,
    CustomerReportsController,
    FinancialReportsController,
    EmployeeReportsController,
    KitchenReportsController,
    ProductReportsController,
    PaymentReportsController,
    PromotionReportsController,
    CustomReportsController,
    TableReportsController,
    StaffReportsController,
    AppointmentReportsController,
    OwnerAnalyticsController,
    FinancialCommandController,
    StaffPerformanceController,
    InvoiceReportsController,
  ],
  providers: [GenerateSalesReportUseCase, GenerateInventoryReportUseCase, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
