import type { Request, Response } from 'express';
import { SessionCookieService } from '../session-cookie.service';
import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { AllowAnyRole } from '@infrastructure/auth/roles.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { LogAuditEventUseCase } from '../../../application/use-cases/audit/log-audit-event.use-case';
import { MfaService } from './mfa.service';
import { EnableMfaDto, VerifyMfaDto, DisableMfaDto } from '../dto/mfa.dto';
import { AuthService } from '../auth.service';
import { Public } from '@shared/decorators/public.decorator';

@ApiTags('MFA')
@ApiBearerAuth()
@Controller('auth/mfa')
export class MfaController {
  private readonly logger = new Logger(MfaController.name);

  constructor(
    private readonly sessionCookie: SessionCookieService,
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly logAuditEventUseCase: LogAuditEventUseCase,
  ) {}

  @Post('setup')
  @AllowAnyRole()
  @HttpCode(HttpStatus.OK)
  async setup(@CurrentUser() user: AuthUser) {
    return this.mfaService.generateSecret(user.employeeId);
  }

  @Post('enable')
  @AllowAnyRole()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async enable(@CurrentUser() user: AuthUser, @Body() dto: EnableMfaDto) {
    const result = await this.mfaService.enableMfa(user.employeeId, dto.token);
    this.audit(user, 'MFA_ENABLED');
    return result;
  }

  /** Strict per-IP throttle on top of the per-account lockout in AuthService. */
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async verify(
    @Body() dto: VerifyMfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.sessionCookie.assertRequest(req);
    return this.sessionCookie.attach(
      await this.authService.verifyMfaAndLogin(dto.mfaToken, dto.token),
      req,
      res,
    );
  }

  @Post('disable')
  @AllowAnyRole()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async disable(@CurrentUser() user: AuthUser, @Body() dto: DisableMfaDto) {
    const result = await this.mfaService.disableMfa(user.employeeId, dto.token, dto.pin);
    this.audit(user, 'MFA_DISABLED');
    return result;
  }

  private audit(user: AuthUser, action: string): void {
    this.logAuditEventUseCase
      .execute({
        businessId: user.businessId,
        outletId: user.outletId || undefined,
        employeeId: user.employeeId,
        action,
        entityType: 'auth',
        entityId: user.employeeId,
      })
      .catch((error: unknown) => {
        this.logger.warn(`Audit log write failed for ${action}: ${(error as Error).message}`);
      });
  }
}
