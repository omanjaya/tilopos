import { Controller, Get, Post, Put, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { INotificationRepository } from '../../domain/interfaces/repositories/notification.repository';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(REPOSITORY_TOKENS.NOTIFICATION)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  @Get('settings')
  async getSettings(@CurrentUser() user: AuthUser) {
    return this.notificationRepo.findSettingsByBusinessId(user.businessId);
  }

  @Post('settings')
  async createSetting(
    @Body()
    dto: {
      outletId?: string;
      notificationType:
        | 'low_stock'
        | 'large_transaction'
        | 'refund'
        | 'online_order'
        | 'shift_reminder'
        | 'system_error';
      channel: 'push' | 'email' | 'sms' | 'whatsapp';
      isEnabled: boolean;
      threshold?: Record<string, unknown>;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationRepo.createSetting({
      businessId: user.businessId,
      outletId: dto.outletId || null,
      employeeId: user.employeeId,
      notificationType: dto.notificationType,
      channel: dto.channel,
      isEnabled: dto.isEnabled,
      threshold: dto.threshold || {},
    });
  }

  @Put('settings/:id')
  async updateSetting(
    @Param('id') id: string,
    @Body() dto: { isEnabled?: boolean; threshold?: Record<string, unknown> },
  ) {
    return this.notificationRepo.updateSetting(id, {
      isEnabled: dto.isEnabled,
      threshold: dto.threshold,
    });
  }

  @Get('logs')
  async getLogs(@CurrentUser() user: AuthUser) {
    return this.notificationRepo.findLogsByRecipientId(user.employeeId, 50);
  }

  @Put('logs/:id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationRepo.markLogAsRead(id);
  }
}
