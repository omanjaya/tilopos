import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import { businessDateKey } from '@shared/utils/business-time';

export interface DocumentNumberOptions {
  /**
   * Restart the counter every business day (Asia/Jakarta) and embed the date:
   * `PREFIX-YYYYMMDD-0001`. Default `true`. With `false` the counter never resets:
   * `PREFIX-000123`.
   */
  daily?: boolean;
  /** Zero-padding of the counter. Default 4 for daily, 6 for non-daily numbers. */
  pad?: number;
  /** Reference instant used for the business day. Default: now. */
  date?: Date;
}

type SqlClient = Prisma.TransactionClient | PrismaService;

const PREFIX_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;

/**
 * Per-tenant, gap-tolerant, collision-free document numbers (R15).
 *
 * One `document_sequences` row per (businessId, prefix, dateKey) is created or
 * incremented by a single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`,
 * so concurrent callers can never receive the same value. Pass the transaction
 * client (`tx`) when the number is used inside a `$transaction`, so a rolled-back
 * document also rolls back its counter increment.
 */
@Injectable()
export class DocumentNumberService {
  async next(
    tx: SqlClient,
    businessId: string,
    prefix: string,
    opts: DocumentNumberOptions = {},
  ): Promise<string> {
    if (!businessId) {
      throw new Error('DocumentNumberService.next: businessId is required');
    }
    if (!PREFIX_PATTERN.test(prefix)) {
      throw new Error(
        `DocumentNumberService.next: invalid prefix "${prefix}" (1-20 chars of A-Z, 0-9, _ or -)`,
      );
    }

    const daily = opts.daily ?? true;
    const pad = opts.pad ?? (daily ? 4 : 6);
    const dateKey = daily ? businessDateKey(opts.date ?? new Date()) : '';

    const rows = await tx.$queryRaw<Array<{ last_value: number | bigint }>>`
      INSERT INTO document_sequences (id, business_id, prefix, date_key, last_value, updated_at)
      VALUES (gen_random_uuid(), ${businessId}::uuid, ${prefix}, ${dateKey}, 1, now())
      ON CONFLICT (business_id, prefix, date_key)
      DO UPDATE SET last_value = document_sequences.last_value + 1, updated_at = now()
      RETURNING last_value
    `;

    const value = rows[0]?.last_value;
    if (value === undefined || value === null) {
      throw new Error('DocumentNumberService.next: sequence upsert returned no row');
    }

    const counter = String(Number(value)).padStart(pad, '0');
    return daily ? `${prefix}-${dateKey}-${counter}` : `${prefix}-${counter}`;
  }
}
