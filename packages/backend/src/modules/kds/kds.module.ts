import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KdsController } from './kds.controller';
import { KdsGateway } from './kds.gateway';
import { BumpOrderUseCase } from '../../application/use-cases/kds/bump-order.use-case';
import { GetStationOrdersUseCase } from '../../application/use-cases/kds/get-station-orders.use-case';
import { KdsAnalyticsService } from './kds-analytics.service';
import { KdsService } from './kds.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [KdsController],
  providers: [
    KdsGateway,
    BumpOrderUseCase,
    GetStationOrdersUseCase,
    KdsAnalyticsService,
    KdsService,
    PrismaService,
  ],
  exports: [KdsGateway, KdsAnalyticsService, KdsService],
})
export class KdsModule {}
