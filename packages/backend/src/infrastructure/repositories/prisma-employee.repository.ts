import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, EmployeeRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '../../domain/interfaces/repositories/employee.repository';

/** Upper bound for findByBusinessId (R13). */
const MAX_BUSINESS_EMPLOYEES = 1000;

/**
 * NOTE: findById/update are keyed by id only (the IEmployeeRepository contract).
 * Callers must compare `record.businessId` with the caller's business before
 * using or returning the record, and must never return the record to a client
 * as-is: it contains the PIN hash and MFA secret (used by auth flows).
 */
@Injectable()
export class PrismaEmployeeRepository implements IEmployeeRepository {
  private readonly logger = new Logger(PrismaEmployeeRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EmployeeRecord | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return null;
    }

    return this.mapToRecord(employee);
  }

  /**
   * Find the active employee with this email (case-insensitive) across all
   * businesses — during login the tenant is not known yet.
   * Email is not unique in the schema, so an ambiguous match (the same email
   * active in two businesses) returns null instead of picking an arbitrary
   * tenant. Create/update reject new duplicates (EmployeeManagementService).
   */
  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const matches = await this.prisma.employee.findMany({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
      take: 2,
    });

    if (matches.length !== 1) {
      if (matches.length > 1) {
        this.logger.warn('Login email matches more than one active employee; refusing to pick one');
      }
      return null;
    }

    return this.mapToRecord(matches[0]);
  }

  async findByGoogleId(googleId: string): Promise<EmployeeRecord | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { googleId, isActive: true },
    });

    if (!employee) {
      return null;
    }

    return this.mapToRecord(employee);
  }

  async findByBusinessId(businessId: string): Promise<EmployeeRecord[]> {
    const employees = await this.prisma.employee.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      take: MAX_BUSINESS_EMPLOYEES,
    });

    return employees.map((employee) =>
      this.mapToRecord({ ...employee, pin: null, mfaSecret: null }),
    );
  }

  async save(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const created = await this.prisma.employee.create({
      data: {
        id: employee.id,
        businessId: employee.businessId,
        outletId: employee.outletId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        pin: employee.pin,
        role: employee.role as EmployeeRole,
        permissions: employee.permissions as Prisma.InputJsonValue,
        hourlyRate: employee.hourlyRate !== null ? new Decimal(employee.hourlyRate) : null,
        isActive: employee.isActive,
        mfaSecret: employee.mfaSecret,
        mfaEnabled: employee.mfaEnabled,
        googleId: employee.googleId,
        authProvider: employee.authProvider,
      },
    });

    return this.mapToRecord(created);
  }

  async update(id: string, data: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.pin !== undefined) {
      updateData.pin = data.pin;
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions as Prisma.InputJsonValue;
    }
    if (data.hourlyRate !== undefined) {
      updateData.hourlyRate = data.hourlyRate !== null ? new Decimal(data.hourlyRate) : null;
    }
    if (data.outletId !== undefined) {
      updateData.outletId = data.outletId;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.mfaSecret !== undefined) {
      updateData.mfaSecret = data.mfaSecret;
    }
    if (data.mfaEnabled !== undefined) {
      updateData.mfaEnabled = data.mfaEnabled;
    }
    if (data.googleId !== undefined) {
      updateData.googleId = data.googleId;
    }
    if (data.authProvider !== undefined) {
      updateData.authProvider = data.authProvider;
    }
    if (data.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = data.profilePhotoUrl;
    }
    if (data.preferences !== undefined) {
      updateData.preferences = data.preferences as Prisma.InputJsonValue;
    }
    if (data.emailVerified !== undefined) {
      updateData.emailVerified = data.emailVerified;
    }
    if (data.onboardingCompleted !== undefined) {
      updateData.onboardingCompleted = data.onboardingCompleted;
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: updateData,
    });

    return this.mapToRecord(updated);
  }

  private mapToRecord(employee: {
    id: string;
    businessId: string;
    outletId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    pin: string | null;
    role: string;
    permissions: Prisma.JsonValue;
    hourlyRate: Decimal | null;
    isActive: boolean;
    mfaSecret: string | null;
    mfaEnabled: boolean;
    googleId: string | null;
    authProvider: string;
    profilePhotoUrl?: string | null;
    preferences?: Prisma.JsonValue | null;
    emailVerified?: boolean;
    onboardingCompleted?: boolean;
    lastLoginAt?: Date | null;
    lastLoginIp?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EmployeeRecord {
    return {
      id: employee.id,
      businessId: employee.businessId,
      outletId: employee.outletId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      pin: employee.pin,
      role: employee.role,
      permissions: employee.permissions,
      hourlyRate: employee.hourlyRate !== null ? employee.hourlyRate.toNumber() : null,
      isActive: employee.isActive,
      mfaSecret: employee.mfaSecret,
      mfaEnabled: employee.mfaEnabled,
      googleId: employee.googleId,
      authProvider: employee.authProvider,
      profilePhotoUrl: employee.profilePhotoUrl ?? null,
      preferences: (employee.preferences as Record<string, unknown> | null) ?? null,
      emailVerified: employee.emailVerified ?? false,
      onboardingCompleted: employee.onboardingCompleted ?? false,
      lastLoginAt: employee.lastLoginAt ?? null,
      lastLoginIp: employee.lastLoginIp ?? null,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
