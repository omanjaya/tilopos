import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import type { ICustomerRepository, CustomerRecord } from '../../domain/interfaces/repositories/customer.repository';

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerRecord | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return null;
    }

    return this.mapToRecord(customer);
  }

  async findByBusinessId(businessId: string): Promise<CustomerRecord[]> {
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    return customers.map((customer) => this.mapToRecord(customer));
  }

  async findByPhone(businessId: string, phone: string): Promise<CustomerRecord | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { businessId, phone, isActive: true },
    });

    if (!customer) {
      return null;
    }

    return this.mapToRecord(customer);
  }

  async save(customer: CustomerRecord): Promise<CustomerRecord> {
    const created = await this.prisma.customer.create({
      data: {
        id: customer.id,
        businessId: customer.businessId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyTier: customer.loyaltyTier,
        totalSpent: new Decimal(customer.totalSpent),
        visitCount: customer.visitCount,
        isActive: customer.isActive,
      },
    });

    return this.mapToRecord(created);
  }

  async update(id: string, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
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
    if (data.loyaltyPoints !== undefined) {
      updateData.loyaltyPoints = data.loyaltyPoints;
    }
    if (data.loyaltyTier !== undefined) {
      updateData.loyaltyTier = data.loyaltyTier;
    }
    if (data.totalSpent !== undefined) {
      updateData.totalSpent = new Decimal(data.totalSpent);
    }
    if (data.visitCount !== undefined) {
      updateData.visitCount = data.visitCount;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return this.mapToRecord(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private mapToRecord(customer: {
    id: string;
    businessId: string;
    name: string;
    email: string | null;
    phone: string | null;
    loyaltyPoints: number;
    loyaltyTier: string;
    totalSpent: Decimal;
    visitCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerRecord {
    return {
      id: customer.id,
      businessId: customer.businessId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints,
      loyaltyTier: customer.loyaltyTier,
      totalSpent: customer.totalSpent.toNumber(),
      visitCount: customer.visitCount,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
