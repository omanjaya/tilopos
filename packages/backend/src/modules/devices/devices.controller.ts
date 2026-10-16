import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles, AllowAnyRole } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { PrismaDeviceRepository } from '../../infrastructure/repositories/prisma-device.repository';
import { DevicesService } from './devices.service';
import {
  PublishVersionDto,
  DeviceUpdateAckDto,
  RegisterDeviceDto,
  ListVersionsQueryDto,
} from '../../application/dtos/device-features.dto';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(
    @Inject(REPOSITORY_TOKENS.DEVICE)
    private readonly deviceRepo: PrismaDeviceRepository,
    private readonly devicesService: DevicesService,
    private readonly tenant: TenantAccessService,
  ) {}

  // ==================== App Version Management ====================
  // Static routes are declared before ':id' so Express does not match them as an id.

  @Get('versions')
  @ApiOperation({
    summary: 'List all published app versions',
    description: 'Returns all published app versions, optionally filtered by platform.',
  })
  async listVersions(@Query() query: ListVersionsQueryDto) {
    return this.devicesService.listVersions(query.platform);
  }

  /** Platform-level (cross-tenant) action: super_admin only. */
  @Post('versions')
  @Roles(EmployeeRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Publish a new app version (platform admin)',
    description: 'Publishes a new version and notifies all active devices of the target platform.',
  })
  async publishVersion(@Body() dto: PublishVersionDto) {
    return this.devicesService.publishVersion({
      version: dto.version,
      platform: dto.platform,
      releaseNotes: dto.releaseNotes,
      downloadUrl: dto.downloadUrl,
      forceUpdate: dto.forceUpdate,
    });
  }

  // ==================== Device CRUD ====================

  @Get()
  @ApiOperation({ summary: 'List all devices for business' })
  async list(@CurrentUser() user: AuthUser) {
    return this.deviceRepo.findByBusinessId(user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Register a new device' })
  async register(@Body() dto: RegisterDeviceDto, @CurrentUser() user: AuthUser) {
    if (dto.outletId) {
      await this.tenant.assertOutlet(user, dto.outletId);
    }
    return this.deviceRepo.create({
      businessId: user.businessId,
      outletId: dto.outletId ?? null,
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      platform: dto.platform ?? null,
      deviceIdentifier: dto.deviceIdentifier ?? null,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const d = await this.deviceRepo.findById(id, user.businessId);
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  @Put(':id/sync')
  @AllowAnyRole()
  @ApiOperation({ summary: 'Update device sync timestamp' })
  async sync(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.deviceRepo.updateSync(id, user.businessId);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate a device' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.deviceRepo.deactivate(id, user.businessId);
    return { message: 'Device deactivated' };
  }

  // ==================== Device Update Check ====================

  @Get(':id/update-check')
  @ApiOperation({
    summary: 'Check for available updates for a device',
    description:
      'Returns whether an update is available, the latest version info, and whether the update is forced.',
  })
  async checkForUpdate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.devicesService.checkForUpdate(id, user.businessId);
  }

  @Post(':id/update-ack')
  @AllowAnyRole()
  @ApiOperation({
    summary: 'Acknowledge update installed on device',
    description:
      'Called by the device after successfully installing an update. Updates the device app version.',
  })
  async acknowledgeUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeviceUpdateAckDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.devicesService.acknowledgeUpdate(id, user.businessId, dto.version);
  }
}
