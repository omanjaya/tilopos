import { Injectable } from '@nestjs/common';
import type {
  ISupplierRepository,
  CreateSupplierData,
  CreatePurchaseOrderData,
  SupplierRecord,
  PurchaseOrderRecord,
} from '../../domain/interfaces/repositories/supplier.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<SupplierRecord[]> {
    return this.prisma.supplier.findMany({
      where: { businessId, isActive: true },
    });
  }

  async save(data: CreateSupplierData): Promise<SupplierRecord> {
    return this.prisma.supplier.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>): Promise<SupplierRecord> {
    return this.prisma.supplier.update({
      where: { id },
      data: data as Record<string, never>,
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findPurchaseOrdersByOutlet(outletId: string): Promise<PurchaseOrderRecord[]> {
    return this.prisma.purchaseOrder.findMany({
      where: { outletId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPurchaseOrderById(id: string): Promise<PurchaseOrderRecord | null> {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    });
  }

  async createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrderRecord> {
    return this.prisma.purchaseOrder.create({
      data: {
        outletId: data.outletId,
        supplierId: data.supplierId,
        poNumber: data.poNumber,
        totalAmount: data.totalAmount,
        createdBy: data.createdBy,
        items: {
          create: data.items.map((i) => ({
            itemName: i.itemName,
            quantityOrdered: i.quantityOrdered,
            unitCost: i.unitCost,
            subtotal: i.subtotal,
            productId: i.productId,
            variantId: i.variantId,
            ingredientId: i.ingredientId,
          })),
        },
      },
    });
  }

  async receivePurchaseOrder(id: string): Promise<PurchaseOrderRecord> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'received', receivedAt: new Date() },
    });
  }
}
