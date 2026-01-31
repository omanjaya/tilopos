import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';
import type { SettlementJobData } from './processors/settlement.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.SETTLEMENT)
    private readonly settlementQueue: Queue<SettlementJobData>,
  ) {}

  async addSettlementJob(data: SettlementJobData): Promise<void> {
    await this.settlementQueue.add('process-settlement', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
