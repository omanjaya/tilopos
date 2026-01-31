import { Global, Module } from '@nestjs/common';
import { EventStore } from './event-store';
import { EventStoreV2 } from './event-store-v2.service';
import { SagaOrchestrator } from './saga-orchestrator';

@Global()
@Module({
  providers: [
    EventStore,
    SagaOrchestrator,
    {
      provide: EventStoreV2,
      useFactory: () => {
        const prisma = require('../database/prisma.service').PrismaService;
        const eventStoreV2 = new EventStoreV2(prisma);
        return eventStoreV2;
      },
    },
  ],
  exports: [
    EventStore,
    EventStoreV2,
    SagaOrchestrator,
  ],
})
export class EventStoreModule {}
