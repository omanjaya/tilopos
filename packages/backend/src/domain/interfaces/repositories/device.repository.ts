export interface DeviceRecord {
  id: string;
  businessId: string;
  outletId: string | null;
  deviceName: string;
  deviceType: string;
  platform: string | null;
  deviceIdentifier: string | null;
  appVersion: string | null;
  lastSyncAt: Date | null;
  lastActiveAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeviceRepository {
  findByBusinessId(businessId: string): Promise<DeviceRecord[]>;
  findById(id: string): Promise<DeviceRecord | null>;
  create(data: CreateDeviceData): Promise<DeviceRecord>;
  updateSync(id: string): Promise<DeviceRecord>;
  deactivate(id: string): Promise<void>;
}

export interface CreateDeviceData {
  businessId: string;
  outletId: string | null;
  deviceName: string;
  deviceType: string;
  platform: string | null;
  deviceIdentifier: string | null;
}
