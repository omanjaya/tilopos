import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

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

@Injectable()
export class CreateSelfOrderSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionOutput> {
    const sessionCode = `SO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const session = await this.prisma.selfOrderSession.create({
      data: {
        outletId: input.outletId,
        tableId: input.tableId || null,
        sessionCode,
        status: 'active',
        language: input.language || 'id',
        expiresAt,
      },
    });

    const qrCodeUrl = `/self-order/${sessionCode}`;

    return {
      sessionId: session.id,
      sessionCode,
      qrCodeUrl,
      expiresAt,
    };
  }
}
