export interface LoginRequest {
  email: string;
  /** 4-8 digits (LoginDto); new PINs are always 6 digits. */
  pin: string;
  outletId?: string;
}

/** POST /auth/login when the employee has MFA enabled (login.use-case.ts). */
export interface MfaChallengeResponse {
  requiresMfa: true;
  mfaToken: string;
}

export type LoginResult = LoginResponse | MfaChallengeResponse;

export function isMfaChallenge(r: LoginResult): r is MfaChallengeResponse {
  return (r as MfaChallengeResponse).requiresMfa === true;
}

/** POST /auth/mfa/verify response (auth.service.ts createLoginResponse). */
export interface MfaVerifyResponse {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  businessId: string;
  outletId: string | null;
}

/** GET /auth/me response (auth.service.ts getEmployeeProfile). */
export interface MeResponse {
  id: string;
  businessId: string;
  outletId: string | null;
  outletName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  profilePhotoUrl: string | null;
  onboardingCompleted: boolean;
  isActive: boolean;
  mfaEnabled: boolean;
  emailVerified: boolean;
  /** Stored profile preferences ({} when never set). */
  preferences: UserPreferences;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  businessId: string;
  outletId: string | null;
  outletName: string | null;
  onboardingCompleted: boolean;
  emailVerified: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  role: EmployeeRole;
  businessId: string | null;
  outletId: string | null;
  employeeId: string;
  outletName?: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  createdAt?: string;
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language?: 'id' | 'en';
  timezone?: 'asia-jakarta' | 'asia-makassar' | 'asia-jayapura';
  dateFormat?: 'dd/mm/yyyy' | 'mm/dd/yyyy';
  currencyFormat?: 'dot' | 'comma';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  profilePhotoUrl?: string;
  preferences?: UserPreferences;
}

export interface UpdateProfileResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  preferences: UserPreferences | null;
}

export interface ChangePinRequest {
  currentPin: string;
  newPin: string;
}

export interface ChangePinResponse {
  success: boolean;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface ActivityLogResponse {
  activities: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type EmployeeRole =
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'supervisor'
  | 'cashier'
  | 'kitchen'
  | 'inventory';
