import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, EmployeeRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { IEmployeeRepository, EmployeeRecord } from '../../domain/interfaces/repositories/employee.repository';

@Injectable()
export class PrismaEmployeeRepository implements IEmployeeRepository {
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

  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { email, isActive: true },
    });

    if (!employee) {
      return null;
    }

    return this.mapToRecord(employee);
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
    });

    return employees.map((employee) => this.mapToRecord(employee));
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
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
