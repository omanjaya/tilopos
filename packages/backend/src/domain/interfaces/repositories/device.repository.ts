export interface IDeviceRepository {
  findByBusinessId(businessId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: CreateDeviceData): Promise<any>;
  updateSync(id: string): Promise<any>;
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
