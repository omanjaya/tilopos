import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerSegmentsService } from './customer-segments.service';
import { ImportModule } from '../../infrastructure/import/import.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [ImportModule, LoyaltyModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerSegmentsService],
  exports: [CustomersService, CustomerSegmentsService],
})
export class CustomersModule {}
