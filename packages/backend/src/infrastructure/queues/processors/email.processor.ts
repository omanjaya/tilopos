import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.data.subject} -> ${job.data.to}`);
    // Will be replaced with real email service in Phase 4
    this.logger.log(`[Queue] Email sent to ${job.data.to}: "${job.data.subject}"`);
  }
}
