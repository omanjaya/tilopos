import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, SerialNumberStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { CUSTOMER_PUBLIC_SELECT } from '@shared/constants/selects';
import { addBusinessDays, endOfBusinessDay } from '@shared/utils/business-time';
import type {
  RegisterSerialNumberDto,
  BulkRegisterItemDto,
  UpdateSerialNumberDto,
} from '@application/dtos/serial-number.dto';

/** Product fields safe to return with a serial (no costPrice, R12). */
const SERIAL_PRODUCT_SELECT = { id: true, name: true, sku: true } as const;
const MAX_SERIAL_ROWS = 500;

/**
 * Allowed status transitions. A serial can only be sold from stock (or after a
 * return), returned after sale/warranty, sent to warranty after sale, and marked
 * defective while it is not with a customer.
 */
const TRANSITIONS: Record<'sold' | 'returned' | 'warranty' | 'defective', SerialNumberStatus[]> = {
  sold: ['in_stock', 'returned'],
  returned: ['sold', 'warranty'],
  warranty: ['sold'],
  defective: ['in_stock', 'returned', 'warranty'],
};

function mapUnique(err: unknown, serial: string): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return new ConflictException(`Serial number "${serial}" already exists for this business`);
  }
  return err;
}

@Injectable()
export class SerialNumbersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  async register(businessId: string, data: RegisterSerialNumberDto) {
    await this.tenant.assertOutlet({ businessId }, data.outletId);
    await this.tenant.assertOwned('product', data.productId, businessId);
    try {
      return await this.prisma.serialNumber.create({
        data: {
          businessId,
          productId: data.productId,
          outletId: data.outletId,
          serialNumber: data.serialNumber,
          status: 'in_stock',
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          costPrice: data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice) : null,
          notes: data.notes ?? null,
        },
      });
    } catch (err) {
      throw mapUnique(err, data.serialNumber);
    }
  }

  async bulkRegister(businessId: string, items: BulkRegisterItemDto[]) {
    const serials = items.map((i) => i.serialNumber);
    const dup = serials.find((s, idx) => serials.indexOf(s) !== idx);
    if (dup) throw new ConflictException(`Serial number "${dup}" appears more than once`);

    await this.tenant.assertOwned(
      'outlet',
      items.map((i) => i.outletId),
      businessId,
    );
    await this.tenant.assertOwned(
      'product',
      items.map((i) => i.productId),
      businessId,
    );

    try {
      return await this.prisma.$transaction(
        items.map((item) =>
          this.prisma.serialNumber.create({
            data: {
              businessId,
              productId: item.productId,
              outletId: item.outletId,
              serialNumber: item.serialNumber,
              status: 'in_stock',
              costPrice: item.costPrice !== undefined ? new Prisma.Decimal(item.costPrice) : null,
            },
          }),
        ),
      );
    } catch (err) {
      throw mapUnique(err, 'in this batch');
    }
  }

  async markSold(id: string, businessId: string, customerId?: string, transactionId?: string) {
    await this.tenant.assertOwned('customer', customerId, businessId);
    await this.tenant.assertOwned('transaction', transactionId, businessId);
    return this.transition(id, businessId, 'sold', {
      soldDate: new Date(),
      customerId: customerId ?? null,
      transactionId: transactionId ?? null,
    });
  }

  async markReturned(id: string, businessId: string, notes?: string) {
    return this.transition(id, businessId, 'returned', notes !== undefined ? { notes } : {});
  }

  async markWarranty(id: string, businessId: string, notes?: string) {
    return this.transition(id, businessId, 'warranty', notes !== undefined ? { notes } : {});
  }

  async markDefective(id: string, businessId: string, notes?: string) {
    return this.transition(id, businessId, 'defective', notes !== undefined ? { notes } : {});
  }

  /** Conditional status change: only from the allowed previous statuses (R9). */
  private async transition(
    id: string,
    businessId: string,
    to: keyof typeof TRANSITIONS,
    extra: Prisma.SerialNumberUncheckedUpdateManyInput,
  ) {
    const result = await this.prisma.serialNumber.updateMany({
      where: { id, businessId, status: { in: TRANSITIONS[to] } },
      data: { ...extra, status: to },
    });
    if (result.count === 0) {
      const current = await this.findOneOrFail(id, businessId);
      throw new ConflictException(
        `Serial number cannot change from "${current.status}" to "${to}"`,
      );
    }
    return this.findOneOrFail(id, businessId);
  }

  async findBySerial(serialNumber: string, businessId: string) {
    const serial = await this.prisma.serialNumber.findUnique({
      where: { businessId_serialNumber: { businessId, serialNumber } },
      include: {
        product: { select: SERIAL_PRODUCT_SELECT },
        customer: { select: CUSTOMER_PUBLIC_SELECT },
      },
    });
    if (!serial) {
      throw new NotFoundException(`Serial number "${serialNumber}" not found`);
    }
    return serial;
  }

  async listByProduct(
    productId: string,
    outletId: string,
    businessId: string,
    status?: SerialNumberStatus,
  ) {
    await this.tenant.assertOutlet({ businessId }, outletId);
    return this.prisma.serialNumber.findMany({
      where: { businessId, productId, outletId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      take: MAX_SERIAL_ROWS,
    });
  }

  async listByCustomer(customerId: string, businessId: string) {
    return this.prisma.serialNumber.findMany({
      where: { businessId, customerId },
      include: { product: { select: SERIAL_PRODUCT_SELECT } },
      orderBy: { soldDate: 'desc' },
      take: MAX_SERIAL_ROWS,
    });
  }

  async getWarrantyExpiring(businessId: string, days = 30) {
    const now = new Date();
    return this.prisma.serialNumber.findMany({
      where: {
        businessId,
        status: 'sold',
        warrantyExpiry: { not: null, lte: endOfBusinessDay(addBusinessDays(now, days)), gte: now },
      },
      include: {
        product: { select: SERIAL_PRODUCT_SELECT },
        customer: { select: CUSTOMER_PUBLIC_SELECT },
      },
      orderBy: { warrantyExpiry: 'asc' },
      take: MAX_SERIAL_ROWS,
    });
  }

  async update(id: string, businessId: string, data: UpdateSerialNumberDto) {
    try {
      const result = await this.prisma.serialNumber.updateMany({
        where: { id, businessId },
        data: {
          ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
          ...(data.purchaseDate !== undefined && {
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          }),
          ...(data.warrantyExpiry !== undefined && {
            warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          }),
          ...(data.costPrice !== undefined && {
            costPrice: data.costPrice === null ? null : new Prisma.Decimal(data.costPrice),
          }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      });
      if (result.count === 0) throw new NotFoundException('Serial number not found');
    } catch (err) {
      throw mapUnique(err, data.serialNumber ?? '');
    }
    return this.findOneOrFail(id, businessId);
  }

  async findById(id: string, businessId: string) {
    return this.findOneOrFail(id, businessId);
  }

  async delete(id: string, businessId: string) {
    const result = await this.prisma.serialNumber.deleteMany({ where: { id, businessId } });
    if (result.count === 0) throw new NotFoundException('Serial number not found');
  }

  private async findOneOrFail(id: string, businessId: string) {
    const serial = await this.prisma.serialNumber.findFirst({ where: { id, businessId } });
    if (!serial) throw new NotFoundException('Serial number not found');
    return serial;
  }
}
