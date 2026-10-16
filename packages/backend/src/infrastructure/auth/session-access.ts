import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import { AccessTokenPayload, toAuthUser } from './access-token';

/** Uncached so server-side logout takes effect on the next authenticated request. */
export async function assertSessionActive(
  prisma: PrismaService,
  payload: AccessTokenPayload,
): Promise<void> {
  const user = toAuthUser(payload);
  if (!payload.sid || payload.typ !== 'access') throw new UnauthorizedException('Session required');
  const session = await prisma.authSession.findFirst({
    where: {
      id: payload.sid,
      businessId: user.businessId,
      employeeId: user.employeeId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!session) throw new UnauthorizedException('Session is no longer valid');
}
