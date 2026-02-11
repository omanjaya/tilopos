import { Module } from '@nestjs/common';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';
import { TransferTemplatesController } from './transfer-templates.controller';
import { TransferTemplatesService } from './transfer-templates.service';
import { RequestTransferUseCase } from '../../application/use-cases/stock-transfers/request-transfer.use-case';

@Module({
  controllers: [StockTransfersController, TransferTemplatesController],
  providers: [RequestTransferUseCase, StockTransfersService, TransferTemplatesService],
  exports: [TransferTemplatesService],
})
export class StockTransfersModule {}
