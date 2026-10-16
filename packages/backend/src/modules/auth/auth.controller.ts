import { SessionCookieService } from './session-cookie.service';
import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  NotImplementedException,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '../../application/use-cases/auth/register.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile.use-case';
import { ChangePinUseCase } from '../../application/use-cases/auth/change-pin.use-case';
import { GetActivityLogUseCase } from '../../application/use-cases/auth/get-activity-log.use-case';
import { LogAuditEventUseCase } from '../../application/use-cases/audit/log-audit-event.use-case';
import { LoginDto, UpdateProfileDto, ChangePinDto } from '../../application/dtos/auth.dto';
import { RegisterDto } from '../../application/dtos/register.dto';
import { AuthService } from './auth.service';
import { BusinessTypeService } from '../business/services/business-type.service';
import { AllowAnyRole } from '@infrastructure/auth/roles.decorator';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { OAuthGoogleTokenDto } from './dto/oauth-login.dto';
import { PaginationQueryDto } from '@shared/dtos/pagination-query.dto';
import { Public } from '@shared/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changePinUseCase: ChangePinUseCase,
    private readonly getActivityLogUseCase: GetActivityLogUseCase,
    private readonly logAuditEventUseCase: LogAuditEventUseCase,
    private readonly authService: AuthService,
    private readonly businessTypeService: BusinessTypeService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.sessionCookie.assertRequest(req);
    const result = await this.loginUseCase.execute({
      email: dto.email,
      pin: dto.pin,
      outletId: dto.outletId,
    });

    // Log successful login (non-blocking)
    if ('accessToken' in result) {
      this.audit(req, {
        businessId: result.businessId,
        outletId: result.outletId,
        employeeId: result.employeeId,
        action: 'LOGIN',
      });
    }

    return this.sessionCookie.attach(result, req, res);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new business account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.sessionCookie.assertRequest(req);
    return this.sessionCookie.attach(await this.registerUseCase.execute(dto), req, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.sessionCookie.refresh(req, res);
  }

  // Cookie-authenticated so an expired access token cannot prevent logout.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.sessionCookie.logout(req, res);
  }

  @Public()
  @Get('business-type-presets')
  @ApiOperation({ summary: 'Get all business type presets (public)' })
  getBusinessTypePresets() {
    return {
      presets: this.businessTypeService.getAllPresets(),
      grouped: this.businessTypeService.getPresetsGrouped(),
    };
  }

  /**
   * Server-side Google OAuth redirect flow is not implemented (no
   * passport-google-oauth20 strategy). Use POST /auth/oauth/google with a
   * Google ID token instead. Kept as honest 501s instead of a fake strategy
   * that accepted any bearer JWT and put tokens in redirect URLs.
   */
  @Public()
  @Get('google')
  googleAuth(): never {
    throw new NotImplementedException('Use POST /auth/oauth/google with a Google ID token');
  }

  @Public()
  @Get('google/callback')
  googleAuthCallback(): never {
    throw new NotImplementedException('Use POST /auth/oauth/google with a Google ID token');
  }

  @Public()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async googleTokenLogin(
    @Body() dto: OAuthGoogleTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.sessionCookie.assertRequest(req);
    const profile = await this.authService.verifyGoogleIdToken(dto.idToken);
    const employee = await this.authService.validateOAuthUser(profile);
    return this.sessionCookie.attach(await this.authService.loginWithOAuth(employee), req, res);
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getEmployeeProfile(user.employeeId);
  }

  /**
   * Mark onboarding as completed
   * POST /api/v1/auth/complete-onboarding
   */
  @Post('complete-onboarding')
  @AllowAnyRole()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark user onboarding as completed' })
  async completeOnboarding(@CurrentUser() user: AuthUser) {
    return this.authService.completeOnboarding(user.employeeId);
  }

  /**
   * Update user profile
   * PATCH /api/v1/auth/profile
   */
  @Patch('profile')
  @AllowAnyRole()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    const result = await this.updateProfileUseCase.execute({
      employeeId: user.employeeId,
      name: dto.name,
      phone: dto.phone,
      profilePhotoUrl: dto.profilePhotoUrl,
      preferences: dto.preferences,
    });

    this.audit(req, {
      businessId: user.businessId,
      outletId: user.outletId,
      employeeId: user.employeeId,
      action: 'UPDATE_PROFILE',
      metadata: { updatedFields: Object.keys(dto) },
    });

    return result;
  }

  /**
   * Change user PIN
   * PUT /api/v1/auth/change-pin
   */
  @Put('change-pin')
  @AllowAnyRole()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Change user PIN' })
  async changePin(@CurrentUser() user: AuthUser, @Body() dto: ChangePinDto, @Req() req: Request) {
    const result = await this.changePinUseCase.execute({
      employeeId: user.employeeId,
      currentPin: dto.currentPin,
      newPin: dto.newPin,
    });

    this.audit(req, {
      businessId: user.businessId,
      outletId: user.outletId,
      employeeId: user.employeeId,
      action: 'CHANGE_PIN',
    });

    return result;
  }

  /**
   * Send/resend verification email
   * POST /api/v1/auth/send-verification-email
   */
  @Post('send-verification-email')
  @AllowAnyRole()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send or resend verification email' })
  async sendVerificationEmail(@CurrentUser() user: AuthUser) {
    return this.authService.sendVerificationEmail(user.employeeId);
  }

  /**
   * Verify email from link (public)
   * GET /api/v1/auth/verify-email?token=xxx
   */
  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token' })
  @ApiQuery({ name: 'token', required: true, type: String })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * Get user activity log
   * GET /api/v1/auth/activity
   */
  @Get('activity')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user activity log' })
  async getActivityLog(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.getActivityLogUseCase.execute({
      employeeId: user.employeeId,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Security audit entry (non-blocking). The IP is req.ip, which honours the
   * `trust proxy` setting in main.ts — never the raw X-Forwarded-For header.
   */
  private audit(
    req: Request,
    entry: {
      businessId: string;
      outletId: string | null;
      employeeId: string;
      action: string;
      metadata?: Record<string, unknown>;
    },
  ): void {
    this.logAuditEventUseCase
      .execute({
        businessId: entry.businessId,
        outletId: entry.outletId || undefined,
        employeeId: entry.employeeId,
        action: entry.action,
        entityType: 'auth',
        entityId: entry.employeeId,
        ipAddress: req.ip || undefined,
        metadata: { userAgent: req.headers['user-agent'] || null, ...entry.metadata },
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Audit log write failed for ${entry.action} (${entry.employeeId}): ${(error as Error).message}`,
        );
      });
  }
}
