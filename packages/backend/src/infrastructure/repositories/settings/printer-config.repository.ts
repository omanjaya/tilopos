import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

export interface PrinterConfigData {
  id: string;
  name: string;
  type: 'receipt' | 'kitchen' | 'label';
  connection: 'usb' | 'network' | 'bluetooth';
  ipAddress: string | null;
  port: number | null;
  isActive: boolean;
  autoPrint: boolean;
  copies: number;
  outletId: string;
}

export interface CreatePrinterConfigData {
  name: string;
  type: 'receipt' | 'kitchen' | 'label';
  connection: 'usb' | 'network' | 'bluetooth';
  ipAddress?: string;
  port?: number;
  autoPrint?: boolean;
  copies?: number;
  outletId: string;
}

export interface UpdatePrinterConfigData {
  name?: string;
  type?: 'receipt' | 'kitchen' | 'label';
  connection?: 'usb' | 'network' | 'bluetooth';
  ipAddress?: string;
  port?: number;
  isActive?: boolean;
  autoPrint?: boolean;
  copies?: number;
  outletId?: string;
}

@Injectable()
export class PrinterConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  async getPrinterConfigs(businessId: string): Promise<PrinterConfigData[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const settings = (business.settings as Record<string, unknown>) || {};
    const configs = settings.printerConfigs as PrinterConfigData[] | undefined;

    if (configs && Array.isArray(configs)) {
      return configs;
    }

    return [];
  }

  async createPrinterConfig(
    businessId: string,
    data: CreatePrinterConfigData,
  ): Promise<PrinterConfigData> {
    const configs = await this.getPrinterConfigs(businessId);
    const newConfig: PrinterConfigData = {
      id: this.generateId(),
      name: data.name,
      type: data.type,
      connection: data.connection,
      ipAddress: data.ipAddress ?? null,
      port: data.port ?? null,
      isActive: true,
      autoPrint: data.autoPrint ?? true,
      copies: data.copies ?? 1,
      outletId: data.outletId,
    };

    configs.push(newConfig);
    await this.savePrinterConfigs(businessId, configs);
    return newConfig;
  }

  async updatePrinterConfig(
    businessId: string,
    id: string,
    data: UpdatePrinterConfigData,
  ): Promise<PrinterConfigData> {
    const configs = await this.getPrinterConfigs(businessId);
    const index = configs.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new NotFoundException('Printer config not found');
    }

    const existing = configs[index];
    const updated: PrinterConfigData = {
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.connection !== undefined && { connection: data.connection }),
      ...(data.ipAddress !== undefined && { ipAddress: data.ipAddress }),
      ...(data.port !== undefined && { port: data.port }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.autoPrint !== undefined && { autoPrint: data.autoPrint }),
      ...(data.copies !== undefined && { copies: data.copies }),
      ...(data.outletId !== undefined && { outletId: data.outletId }),
    };

    configs[index] = updated;
    await this.savePrinterConfigs(businessId, configs);
    return updated;
  }

  async deletePrinterConfig(businessId: string, id: string): Promise<void> {
    const configs = await this.getPrinterConfigs(businessId);
    const index = configs.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new NotFoundException('Printer config not found');
    }

    const filtered = configs.filter((c) => c.id !== id);
    await this.savePrinterConfigs(businessId, filtered);
  }

  private async savePrinterConfigs(
    businessId: string,
    configs: PrinterConfigData[],
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    const currentSettings = (business?.settings as Record<string, unknown>) || {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          printerConfigs: configs,
        } as never,
      },
    });
  }
}
