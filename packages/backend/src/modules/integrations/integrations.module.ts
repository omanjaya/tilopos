/**
 * Integrations Module
 *
 * Placeholder API for external integrations (food delivery, e-commerce, social
 * commerce): actions answer 501 (see controller). The infrastructure module is
 * imported because it hosts MarketplaceService and its polling job.
 */

import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsModule as InfraIntegrationsModule } from '../../infrastructure/services/integrations.module';

@Module({
  imports: [InfraIntegrationsModule],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
