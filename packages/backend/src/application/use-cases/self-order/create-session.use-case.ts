import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError, ErrorCode } from '@shared/errors/app-error';
import { secureCode } from '@shared/utils/secure-code';

export interface CreateSessionInput {
  outletId: string;
  tableId?: string;
  language?: string;
}

export interface CreateSessionOutput {
  sessionId: string;
  sessionCode: string;
  qrCodeUrl: string;
  expiresAt: Date;
}

/** Session lifetime; extendSession caps the total at SELF_ORDER_MAX_LIFETIME_MS. */
export const SELF_ORDER_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
/** Session codes are bearer credentials for public endpoints: 16 chars of a 32-symbol alphabet = 80 bits. */
export const SELF_ORDER_CODE_LENGTH = 16;

@Injectable()
export class CreateSelfOrderSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionOutput> {
    if (!input.outletId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'outletId is required');
    }

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: input.outletId, isActive: true },
      select: { id: true },
    });
    if (!outlet) {
      throw new AppError(ErrorCode.OUTLET_NOT_FOUND, 'Outlet not found', HttpStatus.NOT_FOUND);
    }

    if (input.tableId) {
      const table = await this.prisma.table.findFirst({
        where: { id: input.tableId, outletId: outlet.id, isActive: true },
        select: { id: true },
      });
      if (!table) {
        throw new AppError(
          ErrorCode.TABLE_NOT_FOUND,
          'Table not found for this outlet',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const sessionCode = secureCode(SELF_ORDER_CODE_LENGTH);
    const expiresAt = new Date(Date.now() + SELF_ORDER_SESSION_TTL_MS);

    const session = await this.prisma.selfOrderSession.create({
      data: {
        outletId: outlet.id,
        tableId: input.tableId || null,
        sessionCode,
        status: 'active',
        language: input.language || 'id',
        expiresAt,
      },
    });

    return {
      sessionId: session.id,
      sessionCode,
      qrCodeUrl: `/order/${sessionCode}`,
      expiresAt,
    };
  }
}
