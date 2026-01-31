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
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile.use-case';
import { ChangePinUseCase } from '../../application/use-cases/auth/change-pin.use-case';
import { GetActivityLogUseCase } from '../../application/use-cases/auth/get-activity-log.use-case';
import { LoginDto, UpdateProfileDto, ChangePinDto } from '../../application/dtos/auth.dto';
import { AuthService } from './auth.service';
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
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changePinUseCase: ChangePinUseCase,
    private readonly getActivityLogUseCase: GetActivityLogUseCase,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute({
      email: dto.email,
      pin: dto.pin,
      outletId: dto.outletId,
    });
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google OAuth consent screen
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: GoogleAuthRequest,
    @Res() res: Response,
  ) {
    const profile = req.user;
    const employee = await this.authService.validateOAuthUser(profile);
    const result = await this.authService.loginWithOAuth(employee);

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';

    if ('requiresMfa' in result) {
      res.redirect(
        `${frontendUrl}/auth/mfa?mfaToken=${encodeURIComponent(result.mfaToken)}`,
      );
      return;
    }

    res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.accessToken)}`,
    );
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
    // This would need to be implemented - fetch full user details from employee repository
    // For now, returning the user from JWT token
    return {
      id: user.employeeId,
      businessId: user.businessId,
      outletId: user.outletId,
      role: user.role,
    };
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
  ) {
    return this.updateProfileUseCase.execute({
      employeeId: user.employeeId,
      name: dto.name,
      phone: dto.phone,
      profilePhotoUrl: dto.profilePhotoUrl,
      preferences: dto.preferences,
    });
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
  async changePin(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePinDto,
  ) {
    return this.changePinUseCase.execute({
      employeeId: user.employeeId,
      currentPin: dto.currentPin,
      newPin: dto.newPin,
    });
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
