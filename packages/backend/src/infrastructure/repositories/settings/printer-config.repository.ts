import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { findBusinessSettings, mutateBusinessSettings, type JsonObject } from './json-settings';

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

function readList(settings: JsonObject): PrinterConfigData[] {
  const list = settings.printerConfigs;
  return Array.isArray(list) ? (list as PrinterConfigData[]).map((item) => ({ ...item })) : [];
}

/**
 * Stored in business.settings.printerConfigs; every write is a locked read-modify-write
 * (mutateBusinessSettings) so concurrent settings edits are not lost.
 */
@Injectable()
export class PrinterConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  async getPrinterConfigs(businessId: string): Promise<PrinterConfigData[]> {
    return readList(await findBusinessSettings(this.prisma, businessId));
  }

  async createPrinterConfig(
    businessId: string,
    data: CreatePrinterConfigData,
  ): Promise<PrinterConfigData> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const configs = readList(current);
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
      return { settings: { ...current, printerConfigs: configs }, result: newConfig };
    });
  }

  async updatePrinterConfig(
    businessId: string,
    id: string,
    data: UpdatePrinterConfigData,
  ): Promise<PrinterConfigData> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const configs = readList(current);
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
      return { settings: { ...current, printerConfigs: configs }, result: updated };
    });
  }

  async deletePrinterConfig(businessId: string, id: string): Promise<void> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const configs = readList(current);
      const index = configs.findIndex((c) => c.id === id);

      if (index === -1) {
        throw new NotFoundException('Printer config not found');
      }

      const filtered = configs.filter((c) => c.id !== id);
      return { settings: { ...current, printerConfigs: filtered }, result: undefined };
    });
  }
}
