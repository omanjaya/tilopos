import { Module } from '@nestjs/common';
import { StockOpnameController } from './stock-opname.controller';
import { StockOpnameService } from './stock-opname.service';
import { CreateStockOpnameUseCase } from '../../application/use-cases/stock-opname/create-stock-opname.use-case';
import { UpdateOpnameItemsUseCase } from '../../application/use-cases/stock-opname/update-opname-items.use-case';
import { CompleteStockOpnameUseCase } from '../../application/use-cases/stock-opname/complete-stock-opname.use-case';
import { CancelStockOpnameUseCase } from '../../application/use-cases/stock-opname/cancel-stock-opname.use-case';

@Module({
  controllers: [StockOpnameController],
  providers: [
    StockOpnameService,
    CreateStockOpnameUseCase,
    UpdateOpnameItemsUseCase,
    CompleteStockOpnameUseCase,
    CancelStockOpnameUseCase,
  ],
})
export class StockOpnameModule {}
