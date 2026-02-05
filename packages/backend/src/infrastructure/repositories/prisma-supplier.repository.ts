import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
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
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { outletId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    return purchaseOrders.map((po) => this.mapPurchaseOrderToRecord(po));
  }

  async findPurchaseOrderById(id: string): Promise<PurchaseOrderRecord | null> {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    });

    if (!purchaseOrder) {
      return null;
    }

    return this.mapPurchaseOrderToRecord(purchaseOrder);
  }

  async createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrderRecord> {
    const po = await this.prisma.purchaseOrder.create({
      data: {
        outletId: data.outletId,
        supplierId: data.supplierId,
        poNumber: data.poNumber,
        totalAmount: new Decimal(data.totalAmount),
        createdBy: data.createdBy,
        items: {
          create: data.items.map((i) => ({
            itemName: i.itemName,
            quantityOrdered: new Decimal(i.quantityOrdered),
            unitCost: new Decimal(i.unitCost),
            subtotal: new Decimal(i.subtotal),
            productId: i.productId,
            variantId: i.variantId,
            ingredientId: i.ingredientId,
          })),
        },
      },
      include: { supplier: true, items: true },
    });

    return this.mapPurchaseOrderToRecord(po);
  }

  async receivePurchaseOrder(id: string): Promise<PurchaseOrderRecord> {
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'received', receivedAt: new Date() },
      include: { supplier: true, items: true },
    });

    return this.mapPurchaseOrderToRecord(po);
  }

  private mapPurchaseOrderToRecord(po: {
    id: string;
    outletId: string;
    supplierId: string;
    poNumber: string;
    status: string;
    totalAmount: Decimal;
    notes: string | null;
    orderedAt: Date | null;
    receivedAt: Date | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PurchaseOrderRecord {
    return {
      id: po.id,
      outletId: po.outletId,
      supplierId: po.supplierId,
      poNumber: po.poNumber,
      status: po.status,
      totalAmount: po.totalAmount.toNumber(),
      notes: po.notes,
      orderedAt: po.orderedAt,
      receivedAt: po.receivedAt,
      createdBy: po.createdBy,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    };
  }
}
