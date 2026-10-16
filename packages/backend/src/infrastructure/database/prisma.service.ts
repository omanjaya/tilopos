import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { assertScopedWhere } from './strict-where';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // R4: reject queries whose tenant filter silently became `undefined`
    this.$use(async (params, next) => {
      assertScopedWhere(params.model, params.action, params.args?.where);
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
