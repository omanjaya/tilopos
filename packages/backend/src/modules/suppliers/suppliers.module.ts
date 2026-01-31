import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaSupplierRepository } from '../../infrastructure/repositories/prisma-supplier.repository';

@Module({
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    { provide: REPOSITORY_TOKENS.SUPPLIER, useClass: PrismaSupplierRepository },
  ],
})
export class SuppliersModule {}
