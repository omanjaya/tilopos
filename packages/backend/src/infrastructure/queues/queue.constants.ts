export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  REPORT: 'report',
  STOCK_ALERT: 'stock-alert',
  SETTLEMENT: 'settlement',
} as const;

export const JOB_NAMES = {
  SEND_EMAIL: 'send-email',
  SEND_RECEIPT_EMAIL: 'send-receipt-email',
  SEND_REPORT_EMAIL: 'send-report-email',
  SEND_NOTIFICATION: 'send-notification',
  SEND_BULK_NOTIFICATION: 'send-bulk-notification',
  GENERATE_REPORT: 'generate-report',
  CHECK_LOW_STOCK: 'check-low-stock',
  PROCESS_SETTLEMENT: 'process-settlement',
  DAILY_SETTLEMENT: 'daily-settlement',
} as const;

export const JOB_OPTIONS = {
  DEFAULT: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
  EMAIL: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 1000 },
  },
  REPORT: {
    attempts: 2,
    backoff: { type: 'fixed' as const, delay: 10000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
} as const;
