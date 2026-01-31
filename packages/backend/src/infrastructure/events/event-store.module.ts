import { Global, Module } from '@nestjs/common';
import { EventStore } from './event-store';

@Global()
@Module({
  providers: [EventStore],
  exports: [EventStore],
})
export class EventStoreModule {}
