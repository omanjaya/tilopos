import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import { LoginDto } from '../../application/dtos/auth.dto';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthGoogleTokenDto, GoogleOAuthProfile } from './dto/oauth-login.dto';

interface GoogleAuthRequest extends Request {
  user: GoogleOAuthProfile;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
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
}
