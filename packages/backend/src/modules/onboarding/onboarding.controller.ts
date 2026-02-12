import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { OnboardingService } from './onboarding.service';
import type { OnboardingProgressResponse } from './dto/onboarding.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * Get onboarding progress for the authenticated user's business
   *
   * Returns the status of all onboarding checklist items:
   * - Account created (always true if authenticated)
   * - Products added (target: 5 products)
   * - Payment method configured
   * - Employee added (target: at least 1)
   * - First transaction completed
   * - Printer configured
   *
   * Also includes overall progress percentage (0-100) and completion timestamp.
   */
  @Get('progress')
  @ApiOperation({ summary: 'Get onboarding progress' })
  async getProgress(@CurrentUser() user: AuthUser): Promise<OnboardingProgressResponse> {
    return this.onboardingService.getProgress(user.businessId);
  }

  /**
   * Dismiss the onboarding checklist
   *
   * Marks the onboarding as dismissed in business settings.
   * This allows users to hide the checklist if they prefer not to complete it.
   */
  @Post('dismiss')
  @ApiOperation({ summary: 'Dismiss onboarding checklist' })
  async dismissChecklist(@CurrentUser() user: AuthUser) {
    return this.onboardingService.dismissChecklist(user.businessId);
  }
}
