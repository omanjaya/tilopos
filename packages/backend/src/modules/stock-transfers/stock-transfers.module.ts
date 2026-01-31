import { Module } from '@nestjs/common';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';
import { RequestTransferUseCase } from '../../application/use-cases/stock-transfers/request-transfer.use-case';

@Module({
  controllers: [StockTransfersController],
  providers: [RequestTransferUseCase, StockTransfersService],
})
export class StockTransfersModule {}
