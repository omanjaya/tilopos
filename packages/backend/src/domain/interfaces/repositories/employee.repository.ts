export interface IEmployeeRepository {
  /** Pass businessId whenever the id comes from a client (R3). */
  findById(id: string, businessId?: string): Promise<EmployeeRecord | null>;
  findByEmail(email: string): Promise<EmployeeRecord | null>;
  findByGoogleId(googleId: string): Promise<EmployeeRecord | null>;
  findByBusinessId(businessId: string): Promise<EmployeeRecord[]>;
  save(employee: EmployeeRecord): Promise<EmployeeRecord>;
  update(id: string, data: Partial<EmployeeRecord>, businessId?: string): Promise<EmployeeRecord>;
}

export interface EmployeeRecord {
  id: string;
  businessId: string;
  outletId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  pin: string | null;
  role: string;
  permissions: unknown;
  hourlyRate: number | null;
  isActive: boolean;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  googleId: string | null;
  authProvider: string;
  profilePhotoUrl: string | null;
  preferences: Record<string, unknown> | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}
