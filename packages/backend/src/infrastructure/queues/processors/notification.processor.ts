import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface NotificationJobData {
  recipientId: string;
  channel: 'push' | 'email' | 'sms' | 'whatsapp';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(
      `Processing notification job ${job.id}: [${job.data.channel}] "${job.data.title}" -> ${job.data.recipientId}`,
    );
    // Will be replaced with notification dispatcher in Phase 4
    this.logger.log(`[Queue] Notification dispatched via ${job.data.channel}`);
  }
}
