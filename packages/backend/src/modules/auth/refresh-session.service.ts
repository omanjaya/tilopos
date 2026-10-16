import { assertSessionActive } from '@infrastructure/auth/session-access';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { Prisma, AuthSession } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AccessTokenPayload } from '@infrastructure/auth/access-token';
import { durationToSeconds } from '../../config/env.validation';

interface SessionIdentity {
  employeeId: string;
  businessId: string;
  outletId: string | null;
}

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async create(identity: SessionIdentity) {
    const seconds = durationToSeconds(this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '7d')!;
    return this.prisma.$transaction(async (tx) => {
      const employee = await this.employee(tx, identity);
      const session = await tx.authSession.create({
        data: {
          businessId: identity.businessId,
          employeeId: identity.employeeId,
          outletId: identity.outletId,
          expiresAt: new Date(Date.now() + seconds * 1000),
        },
      });
      return this.issue(tx, session, employee);
    });
  }

  async rotate(raw: string | undefined) {
    const token = await this.lookup(raw);
    if (!token) throw new UnauthorizedException('Invalid refresh token');
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize rotation and revocation across replicas. The family row is stable
      // even after rotation, unlike the individual refresh-token row.
      await this.lock(tx, token.sessionId, token.businessId);
      const session = await tx.authSession.findFirst({
        where: { id: token.sessionId, businessId: token.businessId },
      });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
      const consumed = await tx.refreshToken.updateMany({
        where: {
          id: token.id,
          sessionId: session.id,
          businessId: session.businessId,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      if (token.consumedAt || consumed.count !== 1) {
        await this.revokeFamily(tx, session.id, session.businessId);
        // Throw only AFTER commit: throwing here would undo reuse revocation.
        return null;
      }
      const employee = await this.employee(tx, session).catch((error: unknown) => {
        if (error instanceof UnauthorizedException) return null;
        throw error;
      });
      if (!employee) {
        await this.revokeFamily(tx, session.id, session.businessId);
        return null;
      }
      return this.issue(tx, session, employee);
    });
    if (!result) throw new UnauthorizedException('Invalid refresh token');
    return result;
  }

  async revoke(raw: string | undefined): Promise<void> {
    const token = await this.lookup(raw);
    if (!token) return; // Logout is idempotent, including an already cleared cookie.
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, token.sessionId, token.businessId);
      await this.revokeFamily(tx, token.sessionId, token.businessId);
    });
  }

  async assertActive(payload: AccessTokenPayload): Promise<void> {
    await assertSessionActive(this.prisma, payload);
  }

  private lookup(raw: string | undefined) {
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    // The opaque credential is the lookup key; tenant scope comes from its
    // server-owned record, never from an unauthenticated request parameter.
    return this.prisma.refreshToken.findUnique({ where: { tokenHash: this.hash(raw) } });
  }

  private lock(tx: Prisma.TransactionClient, id: string, businessId: string) {
    return tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${id}::uuid AND business_id = ${businessId}::uuid FOR UPDATE`;
  }

  private revokeFamily(tx: Prisma.TransactionClient, id: string, businessId: string) {
    return tx.authSession.updateMany({
      where: { id, businessId },
      data: { revokedAt: new Date() },
    });
  }

  private async employee(tx: Prisma.TransactionClient, identity: SessionIdentity) {
    const employee = await tx.employee.findFirst({
      where: { id: identity.employeeId, businessId: identity.businessId },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        outletId: true,
        emailVerified: true,
      },
    });
    if (!employee?.isActive) throw new UnauthorizedException('Account is inactive');
    if (identity.outletId) {
      const outlet = await tx.outlet.findFirst({
        where: { id: identity.outletId, businessId: identity.businessId, isActive: true },
        select: { id: true },
      });
      if (
        !outlet ||
        (!['owner', 'manager', 'super_admin'].includes(employee.role) &&
          identity.outletId !== employee.outletId)
      ) {
        throw new UnauthorizedException('Outlet access is no longer valid');
      }
    }
    return employee;
  }

  private async issue(
    tx: Prisma.TransactionClient,
    session: AuthSession,
    employee: { id: string; name: string; role: string; emailVerified: boolean },
  ) {
    const refreshToken = randomBytes(32).toString('base64url');
    await tx.refreshToken.create({
      data: {
        businessId: session.businessId,
        sessionId: session.id,
        tokenHash: this.hash(refreshToken),
      },
    });
    return {
      refreshToken,
      expiresAt: session.expiresAt,
      accessToken: this.jwt.sign({
        typ: 'access',
        sid: session.id,
        sub: employee.id,
        businessId: session.businessId,
        outletId: session.outletId,
        role: employee.role,
        emailVerified: employee.emailVerified,
      }),
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      businessId: session.businessId,
      outletId: session.outletId,
    };
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
