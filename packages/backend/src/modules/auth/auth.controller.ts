import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
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
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { OAuthGoogleTokenDto, GoogleOAuthProfile } from './dto/oauth-login.dto';

interface GoogleAuthRequest extends Request {
  user: GoogleOAuthProfile;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changePinUseCase: ChangePinUseCase,
    private readonly getActivityLogUseCase: GetActivityLogUseCase,
    private readonly logAuditEventUseCase: LogAuditEventUseCase,
    private readonly authService: AuthService,
    private readonly businessTypeService: BusinessTypeService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.loginUseCase.execute({
      email: dto.email,
      pin: dto.pin,
      outletId: dto.outletId,
    });

    // Log successful login (non-blocking)
    if ('accessToken' in result) {
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
      const userAgent = req.headers['user-agent'] || null;
      this.logAuditEventUseCase
        .execute({
          businessId: result.businessId,
          outletId: result.outletId || undefined,
          employeeId: result.employeeId,
          action: 'LOGIN',
          entityType: 'auth',
          entityId: result.employeeId,
          ipAddress: ipAddress || undefined,
          metadata: { userAgent },
        })
        .catch(() => {
          /* ignore audit log failures */
        });
    }

    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new business account' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Get('business-type-presets')
  @ApiOperation({ summary: 'Get all business type presets (public)' })
  getBusinessTypePresets() {
    return {
      presets: this.businessTypeService.getAllPresets(),
      grouped: this.businessTypeService.getPresetsGrouped(),
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google OAuth consent screen
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: GoogleAuthRequest, @Res() res: Response) {
    const profile = req.user;
    const employee = await this.authService.validateOAuthUser(profile);
    const result = await this.authService.loginWithOAuth(employee);

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';

    if ('requiresMfa' in result) {
      res.redirect(`${frontendUrl}/auth/mfa?mfaToken=${encodeURIComponent(result.mfaToken)}`);
      return;
    }

    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(result.accessToken)}`);
  }

  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async googleTokenLogin(@Body() dto: OAuthGoogleTokenDto) {
    const profile = await this.authService.verifyGoogleIdToken(dto.idToken);
    const employee = await this.authService.validateOAuthUser(profile);
    return this.authService.loginWithOAuth(employee);
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = req.headers['user-agent'] || null;
    this.logAuditEventUseCase
      .execute({
        businessId: user.businessId,
        outletId: user.outletId || undefined,
        employeeId: user.employeeId,
        action: 'UPDATE_PROFILE',
        entityType: 'auth',
        entityId: user.employeeId,
        ipAddress: ipAddress || undefined,
        metadata: { userAgent, updatedFields: Object.keys(dto) },
      })
      .catch(() => {});

    return result;
  }

  /**
   * Change user PIN
   * PUT /api/v1/auth/change-pin
   */
  @Put('change-pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user PIN' })
  async changePin(@CurrentUser() user: AuthUser, @Body() dto: ChangePinDto, @Req() req: Request) {
    const result = await this.changePinUseCase.execute({
      employeeId: user.employeeId,
      currentPin: dto.currentPin,
      newPin: dto.newPin,
    });

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = req.headers['user-agent'] || null;
    this.logAuditEventUseCase
      .execute({
        businessId: user.businessId,
        outletId: user.outletId || undefined,
        employeeId: user.employeeId,
        action: 'CHANGE_PIN',
        entityType: 'auth',
        entityId: user.employeeId,
        ipAddress: ipAddress || undefined,
        metadata: { userAgent },
      })
      .catch(() => {});

    return result;
  }

  /**
   * Send/resend verification email
   * POST /api/v1/auth/send-verification-email
   */
  @Post('send-verification-email')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivityLog(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.getActivityLogUseCase.execute({
      employeeId: user.employeeId,
      page,
      limit,
    });
  }
}
