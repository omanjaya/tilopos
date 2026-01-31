import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface ReportJobData {
  reportType: 'sales' | 'inventory' | 'financial' | 'employee' | 'customer';
  format: 'pdf' | 'excel';
  filters: {
    businessId: string;
    outletId?: string;
    startDate: string;
    endDate: string;
  };
  requestedBy: string;
}

@Processor(QUEUE_NAMES.REPORT)
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  async process(job: Job<ReportJobData>): Promise<void> {
    this.logger.log(
      `Processing report job ${job.id}: ${job.data.reportType} (${job.data.format})`,
    );
    // Will be replaced with real PDF/Excel generation in Phase 3
    this.logger.log(`[Queue] Report generated: ${job.data.reportType}.${job.data.format}`);
  }
}
