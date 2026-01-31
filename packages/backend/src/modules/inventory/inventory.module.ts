import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { CreateProductUseCase } from '../../application/use-cases/inventory/create-product.use-case';
import { UpdateStockUseCase } from '../../application/use-cases/inventory/update-stock.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaProductRepository } from '../../infrastructure/repositories/prisma-product.repository';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/prisma-inventory.repository';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    CreateProductUseCase,
    UpdateStockUseCase,
    { provide: REPOSITORY_TOKENS.PRODUCT, useClass: PrismaProductRepository },
    { provide: REPOSITORY_TOKENS.INVENTORY, useClass: PrismaInventoryRepository },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
