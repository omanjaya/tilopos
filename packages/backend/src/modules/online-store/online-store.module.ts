import { Module } from '@nestjs/common';
import { OnlineStoreController } from './online-store.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaOnlineStoreRepository } from '../../infrastructure/repositories/prisma-online-store.repository';
import { OnlineStoreSyncService } from './online-store-sync.service';
import { OnlineStoreService } from './online-store.service';

@Module({
  controllers: [OnlineStoreController],
  providers: [
    { provide: REPOSITORY_TOKENS.ONLINE_STORE, useClass: PrismaOnlineStoreRepository },
    OnlineStoreSyncService,
    OnlineStoreService,
  ],
  exports: [OnlineStoreSyncService, OnlineStoreService],
})
export class OnlineStoreModule {}
