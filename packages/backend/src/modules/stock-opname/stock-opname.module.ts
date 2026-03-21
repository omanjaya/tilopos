import { Module } from '@nestjs/common';
import { StockOpnameController } from './stock-opname.controller';
import { CreateStockOpnameUseCase } from '../../application/use-cases/stock-opname/create-stock-opname.use-case';
import { UpdateOpnameItemsUseCase } from '../../application/use-cases/stock-opname/update-opname-items.use-case';
import { CompleteStockOpnameUseCase } from '../../application/use-cases/stock-opname/complete-stock-opname.use-case';
import { CancelStockOpnameUseCase } from '../../application/use-cases/stock-opname/cancel-stock-opname.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/prisma-inventory.repository';

@Module({
  controllers: [StockOpnameController],
  providers: [
    CreateStockOpnameUseCase,
    UpdateOpnameItemsUseCase,
    CompleteStockOpnameUseCase,
    CancelStockOpnameUseCase,
    { provide: REPOSITORY_TOKENS.INVENTORY, useClass: PrismaInventoryRepository },
  ],
})
export class StockOpnameModule {}
