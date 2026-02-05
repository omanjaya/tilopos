import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { MfaService } from './mfa.service';
import { EnableMfaDto, VerifyMfaDto, DisableMfaDto } from '../dto/mfa.dto';
import { AuthService } from '../auth.service';

@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
  ) {}

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async setup(@CurrentUser() user: AuthUser) {
    return this.mfaService.generateSecret(user.employeeId);
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async enable(@CurrentUser() user: AuthUser, @Body() dto: EnableMfaDto) {
    return this.mfaService.enableMfa(user.employeeId, dto.token);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfaAndLogin(dto.mfaToken, dto.token);
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async disable(@CurrentUser() user: AuthUser, @Body() dto: DisableMfaDto) {
    return this.mfaService.disableMfa(user.employeeId, dto.token);
  }
}
