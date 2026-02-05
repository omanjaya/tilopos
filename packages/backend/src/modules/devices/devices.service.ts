import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// ==================== Types ====================

export interface AppVersionRecord {
  id: string;
  version: string;
  platform: string;
  releaseNotes: string | null;
  downloadUrl: string | null;
  minRequired: string | null;
  forceUpdate: boolean;
  publishedAt: Date;
  createdAt: Date;
}

export interface DeviceUpdateCheckResult {
  deviceId: string;
  currentVersion: string | null;
  updateAvailable: boolean;
  latestVersion: string | null;
  forceUpdate: boolean;
  downloadUrl: string | null;
  releaseNotes: string | null;
  lastChecked: Date;
}

// ==================== Service ====================

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  /**
   * In-memory store for app versions.
   * In production, this should be a dedicated database table (e.g., app_versions).
   * Structure: Map<id, AppVersionRecord>
   */
  private readonly appVersions = new Map<string, AppVersionRecord>();
  private versionCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Version Management ====================

  /**
   * List all published app versions, optionally filtered by platform.
   */
  async listVersions(platform?: string): Promise<AppVersionRecord[]> {
    const versions = Array.from(this.appVersions.values());

    const filtered = platform ? versions.filter((v) => v.platform === platform) : versions;

    // Sort by publish date descending (newest first)
    return filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  /**
   * Publish a new app version and notify all devices of that platform.
   */
  async publishVersion(data: {
    version: string;
    platform: string;
    releaseNotes?: string;
    downloadUrl?: string;
    forceUpdate?: boolean;
  }): Promise<AppVersionRecord> {
    // Validate version format (basic semver check)
    if (!/^\d+\.\d+\.\d+/.test(data.version)) {
      throw new BadRequestException('Version must follow semantic versioning (e.g., 1.2.0)');
    }

    // Check if this version already exists for the platform
    const existing = Array.from(this.appVersions.values()).find(
      (v) => v.version === data.version && v.platform === data.platform,
    );

    if (existing) {
      throw new BadRequestException(
        `Version ${data.version} already published for ${data.platform}`,
      );
    }

    this.versionCounter++;
    const id = `appver_${this.versionCounter}_${Date.now()}`;

    const record: AppVersionRecord = {
      id,
      version: data.version,
      platform: data.platform,
      releaseNotes: data.releaseNotes || null,
      downloadUrl: data.downloadUrl || null,
      minRequired: null,
      forceUpdate: data.forceUpdate || false,
      publishedAt: new Date(),
      createdAt: new Date(),
    };

    this.appVersions.set(id, record);

    this.logger.log(
      `Published version ${data.version} for ${data.platform} (force: ${data.forceUpdate})`,
    );

    // Notify devices of the platform about the new version
    await this.notifyDevicesOfUpdate(data.platform, record);

    return record;
  }

  /**
   * Check if an update is available for a specific device.
   * Updates the device's lastActiveAt timestamp.
   */
  async checkForUpdate(deviceId: string): Promise<DeviceUpdateCheckResult> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Update last active timestamp
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastActiveAt: new Date() },
    });

    const currentVersion = device.appVersion;
    const platform = device.platform;

    // Find the latest version for this device's platform
    const latestVersion = platform ? this.getLatestVersionForPlatform(platform) : null;

    let updateAvailable = false;
    let forceUpdate = false;

    if (latestVersion && currentVersion) {
      updateAvailable = this.isNewerVersion(latestVersion.version, currentVersion);
      forceUpdate =
        latestVersion.forceUpdate || this.isBelowMinRequired(currentVersion, latestVersion);
    } else if (latestVersion && !currentVersion) {
      // Device has no version reported, update is available
      updateAvailable = true;
      forceUpdate = latestVersion.forceUpdate;
    }

    return {
      deviceId: device.id,
      currentVersion,
      updateAvailable,
      latestVersion: latestVersion?.version || null,
      forceUpdate,
      downloadUrl: updateAvailable ? latestVersion?.downloadUrl || null : null,
      releaseNotes: updateAvailable ? latestVersion?.releaseNotes || null : null,
      lastChecked: new Date(),
    };
  }

  /**
   * Acknowledge that a device has installed an update.
   * Updates the device's appVersion field.
   */
  async acknowledgeUpdate(
    deviceId: string,
    version: string,
  ): Promise<{ success: boolean; deviceId: string; version: string }> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        appVersion: version,
        lastActiveAt: new Date(),
      },
    });

    this.logger.log(`Device ${deviceId} acknowledged update to version ${version}`);

    return {
      success: true,
      deviceId,
      version,
    };
  }

  // ==================== Notification Helpers ====================

  /**
   * Notify all active devices of a platform about a new version.
   * Creates notification log entries for each device.
   */
  private async notifyDevicesOfUpdate(
    platform: string,
    versionRecord: AppVersionRecord,
  ): Promise<void> {
    // Find all active devices of the specified platform
    const devices = await this.prisma.device.findMany({
      where: {
        platform: platform as any, // Type assertion needed for dynamic platform value
        isActive: true,
      },
      include: {
        business: { select: { id: true } },
      },
    });

    if (devices.length === 0) {
      this.logger.debug(`No active ${platform} devices to notify`);
      return;
    }

    // Create notification logs for each device
    const notifications = devices
      .filter((device) => {
        // Only notify devices that are not already on the latest version
        if (!device.appVersion) return true;
        return this.isNewerVersion(versionRecord.version, device.appVersion);
      })
      .map((device) => ({
        businessId: device.businessId,
        outletId: device.outletId,
        notificationType: 'system_error' as const, // Using system_error as closest available type
        channel: 'push' as const,
        title: `Update Available: v${versionRecord.version}`,
        body:
          versionRecord.releaseNotes ||
          `A new version (${versionRecord.version}) is available for your ${platform} device.`,
        metadata: {
          type: 'app_update',
          version: versionRecord.version,
          platform,
          forceUpdate: versionRecord.forceUpdate,
          downloadUrl: versionRecord.downloadUrl,
          deviceId: device.id,
        },
      }));

    if (notifications.length > 0) {
      await this.prisma.notificationLog.createMany({
        data: notifications,
      });

      this.logger.log(
        `Notified ${notifications.length} ${platform} devices about version ${versionRecord.version}`,
      );
    }
  }

  // ==================== Version Comparison Helpers ====================

  /**
   * Get the latest published version for a platform.
   */
  private getLatestVersionForPlatform(platform: string): AppVersionRecord | null {
    const versions = Array.from(this.appVersions.values())
      .filter((v) => v.platform === platform)
      .sort((a, b) => this.compareVersions(b.version, a.version));

    return versions.length > 0 ? versions[0] : null;
  }

  /**
   * Compare two semantic version strings.
   * Returns positive if a > b, negative if a < b, 0 if equal.
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  }

  /**
   * Check if newVersion is newer than currentVersion.
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    return this.compareVersions(newVersion, currentVersion) > 0;
  }

  /**
   * Check if the device's current version is below the minimum required version.
   */
  private isBelowMinRequired(currentVersion: string, latestVersion: AppVersionRecord): boolean {
    if (!latestVersion.minRequired) return false;
    return this.compareVersions(latestVersion.minRequired, currentVersion) > 0;
  }
}
