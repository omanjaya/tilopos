import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { SupplierAnalyticsController } from './controllers/supplier-analytics.controller';
import { InventoryService } from './inventory.service';
import { OutletProductService } from './outlet-product.service';
import { CreateProductUseCase } from '../../application/use-cases/inventory/create-product.use-case';
import { UpdateStockUseCase } from '../../application/use-cases/inventory/update-stock.use-case';
import { CalculateMovingAverageCostUseCase } from '../../application/use-cases/inventory/calculate-moving-average-cost.use-case';
import { ReceivePurchaseOrderUseCase } from '../../application/use-cases/inventory/receive-purchase-order.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaProductRepository } from '../../infrastructure/repositories/prisma-product.repository';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/prisma-inventory.repository';
import { ImportModule } from '../../infrastructure/import/import.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [ImportModule, StorageModule],
  controllers: [InventoryController, SupplierAnalyticsController],
  providers: [
    InventoryService,
    OutletProductService,
    CreateProductUseCase,
    UpdateStockUseCase,
    CalculateMovingAverageCostUseCase,
    ReceivePurchaseOrderUseCase,
    { provide: REPOSITORY_TOKENS.PRODUCT, useClass: PrismaProductRepository },
    { provide: REPOSITORY_TOKENS.INVENTORY, useClass: PrismaInventoryRepository },
  ],
  exports: [
    InventoryService,
    OutletProductService,
    CalculateMovingAverageCostUseCase,
    ReceivePurchaseOrderUseCase,
  ],
})
export class InventoryModule {}
