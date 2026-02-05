import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IDeviceRepository } from '../../domain/interfaces/repositories/device.repository';
import { DevicesService } from './devices.service';
import { PublishVersionDto, DeviceUpdateAckDto } from '../../application/dtos/device-features.dto';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    @Inject(REPOSITORY_TOKENS.DEVICE)
    private readonly deviceRepo: IDeviceRepository,
    private readonly devicesService: DevicesService,
  ) {}

  // ==================== Device CRUD ====================

  @Get()
  @ApiOperation({ summary: 'List all devices for business' })
  async list(@CurrentUser() user: AuthUser) {
    return this.deviceRepo.findByBusinessId(user.businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new device' })
  async register(
    @Body()
    dto: {
      deviceName: string;
      deviceType: 'tablet' | 'phone' | 'desktop' | 'kds_display';
      platform?: 'android' | 'ios' | 'windows' | 'web';
      deviceIdentifier?: string;
      outletId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.deviceRepo.create({
      businessId: user.businessId,
      outletId: dto.outletId || null,
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      platform: dto.platform || null,
      deviceIdentifier: dto.deviceIdentifier || null,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  async get(@Param('id') id: string) {
    const d = await this.deviceRepo.findById(id);
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  @Put(':id/sync')
  @ApiOperation({ summary: 'Update device sync timestamp' })
  async sync(@Param('id') id: string) {
    return this.deviceRepo.updateSync(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a device' })
  async deactivate(@Param('id') id: string) {
    await this.deviceRepo.deactivate(id);
    return { message: 'Device deactivated' };
  }

  // ==================== App Version Management ====================

  @Get('versions')
  @ApiOperation({
    summary: 'List all published app versions',
    description: 'Returns all published app versions, optionally filtered by platform.',
  })
  @ApiQuery({ name: 'platform', required: false, enum: ['android', 'ios', 'windows', 'web'] })
  async listVersions(@Query('platform') platform?: string) {
    return this.devicesService.listVersions(platform);
  }

  @Post('versions')
  @Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Publish a new app version',
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

  // ==================== Device Update Check ====================

  @Get(':id/update-check')
  @ApiOperation({
    summary: 'Check for available updates for a device',
    description:
      'Returns whether an update is available, the latest version info, and whether the update is forced.',
  })
  async checkForUpdate(@Param('id') id: string) {
    return this.devicesService.checkForUpdate(id);
  }

  @Post(':id/update-ack')
  @ApiOperation({
    summary: 'Acknowledge update installed on device',
    description:
      'Called by the device after successfully installing an update. Updates the device app version.',
  })
  async acknowledgeUpdate(@Param('id') id: string, @Body() dto: DeviceUpdateAckDto) {
    return this.devicesService.acknowledgeUpdate(id, dto.version);
  }
}
