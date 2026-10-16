import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Inject,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { AllowAnyRole, Roles } from '../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ScopedNotificationRepository } from '../../infrastructure/repositories/prisma-notification.repository';
import {
  CreateNotificationSettingDto,
  NotificationLogsQueryDto,
  UpdateNotificationSettingDto,
} from './dto/notification-settings.dto';

const SETTINGS_MANAGERS: string[] = [EmployeeRole.OWNER, EmployeeRole.MANAGER];

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(REPOSITORY_TOKENS.NOTIFICATION)
    private readonly notificationRepo: ScopedNotificationRepository,
    private readonly tenant: TenantAccessService,
  ) {}

  /** Owners/managers see every setting of the business; other roles only their own. */
  @Get('settings')
  async getSettings(@CurrentUser() user: AuthUser) {
    const ownOnly = !SETTINGS_MANAGERS.includes(user.role);
    return this.notificationRepo.findSettingsByBusinessId(
      user.businessId,
      ownOnly ? user.employeeId : undefined,
    );
  }

  @Post('settings')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async createSetting(@Body() dto: CreateNotificationSettingDto, @CurrentUser() user: AuthUser) {
    if (dto.outletId) {
      await this.tenant.assertOutlet(user, dto.outletId);
    }
    return this.notificationRepo.createSetting({
      businessId: user.businessId,
      outletId: dto.outletId ?? null,
      employeeId: user.employeeId,
      notificationType: dto.notificationType,
      channel: dto.channel,
      isEnabled: dto.isEnabled,
      threshold: dto.threshold ? { ...dto.threshold } : {},
    });
  }

  @Put('settings/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateSetting(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationRepo.updateSetting(
      id,
      {
        isEnabled: dto.isEnabled,
        threshold: dto.threshold ? { ...dto.threshold } : undefined,
      },
      user.businessId,
    );
  }

  /** The caller's own notifications, newest first (paginated, max 100). */
  @Get('logs')
  async getLogs(@CurrentUser() user: AuthUser, @Query() query: NotificationLogsQueryDto) {
    const limit = query.limit ?? 50;
    const page = query.page ?? 1;
    return this.notificationRepo.findLogsByRecipientId(
      user.employeeId,
      limit,
      user.businessId,
      (page - 1) * limit,
    );
  }

  @Put('logs/read-all')
  @AllowAnyRole()
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationRepo.markAllLogsAsRead(user.employeeId, user.businessId);
  }

  @Put('logs/:id/read')
  @AllowAnyRole()
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.notificationRepo.markLogAsRead(id, user.employeeId, user.businessId);
  }
}
