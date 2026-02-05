import { Global, Module } from '@nestjs/common';
import { EventStore } from './event-store';
import { EventStoreV2 } from './event-store-v2.service';
import { SagaOrchestrator } from './saga-orchestrator';
import { PrismaService } from '../database/prisma.service';

@Global()
@Module({
  providers: [
    EventStore,
    SagaOrchestrator,
    {
      provide: EventStoreV2,
      useFactory: (prisma: PrismaService) => {
        return new EventStoreV2(prisma);
      },
      inject: [PrismaService],
    },
  ],
  exports: [EventStore, EventStoreV2, SagaOrchestrator],
})
export class EventStoreModule {}
