import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { SupplierAnalyticsController } from './controllers/supplier-analytics.controller';
import { InventoryService } from './inventory.service';
import { OutletProductService } from './outlet-product.service';
import { CreateProductUseCase } from '../../application/use-cases/inventory/create-product.use-case';
import { UpdateStockUseCase } from '../../application/use-cases/inventory/update-stock.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaProductRepository } from '../../infrastructure/repositories/prisma-product.repository';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/prisma-inventory.repository';
import { ImportModule } from '../../infrastructure/import/import.module';

@Module({
  imports: [ImportModule],
  controllers: [InventoryController, SupplierAnalyticsController],
  providers: [
    InventoryService,
    OutletProductService,
    CreateProductUseCase,
    UpdateStockUseCase,
    { provide: REPOSITORY_TOKENS.PRODUCT, useClass: PrismaProductRepository },
    { provide: REPOSITORY_TOKENS.INVENTORY, useClass: PrismaInventoryRepository },
  ],
  exports: [InventoryService, OutletProductService],
})
export class InventoryModule {}
