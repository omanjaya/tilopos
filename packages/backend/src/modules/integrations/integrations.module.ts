/**
 * Integrations Module
 *
 * Provides API endpoints for external integrations:
 * - Food Delivery (GoFood, GrabFood, ShopeeFood)
 * - E-commerce (Tokopedia, Shopee)
 * - Social Commerce (WhatsApp, Instagram, Facebook)
 */

import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsModule as InfraIntegrationsModule } from '../../infrastructure/services/integrations.module';

@Module({
  imports: [InfraIntegrationsModule],
  controllers: [IntegrationsController],
  exports: [],
})
export class IntegrationsModule {}
