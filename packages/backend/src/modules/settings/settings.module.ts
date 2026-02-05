import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaSettingsRepository } from '../../infrastructure/repositories/prisma-settings.repository';

@Module({
  controllers: [SettingsController],
  providers: [{ provide: REPOSITORY_TOKENS.SETTINGS, useClass: PrismaSettingsRepository }],
})
export class SettingsModule {}
