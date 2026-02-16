import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { OnboardingService } from './onboarding.service';
import { GuidedSetupDto } from './dto/guided-setup.dto';
import type { OnboardingProgressResponse } from './dto/onboarding.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get onboarding progress' })
  async getProgress(@CurrentUser() user: AuthUser): Promise<OnboardingProgressResponse> {
    return this.onboardingService.getProgress(user.businessId);
  }

  @Post('dismiss')
  @ApiOperation({ summary: 'Dismiss onboarding checklist' })
  async dismissChecklist(@CurrentUser() user: AuthUser) {
    return this.onboardingService.dismissChecklist(user.businessId);
  }

  @Post('setup')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Complete guided setup (all-in-one)' })
  async guidedSetup(
    @CurrentUser() user: AuthUser,
    @Body() dto: GuidedSetupDto,
  ) {
    return this.onboardingService.guidedSetup(
      user.businessId,
      user.employeeId,
      user.outletId,
      dto,
    );
  }
}
