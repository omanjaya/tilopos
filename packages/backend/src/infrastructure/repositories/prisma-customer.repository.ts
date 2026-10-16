import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import type {
  ICustomerRepository,
  CustomerRecord,
} from '../../domain/interfaces/repositories/customer.repository';

/** Upper bound for the unpaginated list (R13). */
const MAX_CUSTOMERS_PER_LIST = 1000;

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass `businessId` whenever the id comes from a client (R3). The optional
   * parameter keeps the domain interface signature; callers in this codebase
   * always scope (the domain interface should make it required — see handoff).
   */
  async findById(id: string, businessId?: string): Promise<CustomerRecord | null> {
    const customer = await this.prisma.customer.findFirst({
      where: businessId ? { id, businessId } : { id },
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
      take: MAX_CUSTOMERS_PER_LIST,
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
        // New customers always start with zero balance/spend (server-owned fields).
        loyaltyPoints: 0,
        totalSpent: new Decimal(0),
        visitCount: 0,
        loyaltyTier: customer.loyaltyTier,
        isActive: customer.isActive,
      },
    });

    return this.mapToRecord(created);
  }

  /**
   * Contact-detail update only. Loyalty balance, tier, totalSpent and visitCount are
   * changed exclusively by the loyalty use-cases with atomic increments (R7/R9).
   */
  async update(
    id: string,
    data: Partial<CustomerRecord>,
    businessId?: string,
  ): Promise<CustomerRecord> {
    const updateData: Prisma.CustomerUpdateManyMutationInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const where = businessId ? { id, businessId } : { id };
    const { count } = await this.prisma.customer.updateMany({ where, data: updateData });
    if (count === 0) {
      throw new NotFoundException('Customer not found');
    }
    const updated = await this.prisma.customer.findFirstOrThrow({ where });
    return this.mapToRecord(updated);
  }

  async delete(id: string, businessId?: string): Promise<void> {
    const { count } = await this.prisma.customer.updateMany({
      where: businessId ? { id, businessId } : { id },
      data: { isActive: false },
    });
    if (count === 0) {
      throw new NotFoundException('Customer not found');
    }
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
