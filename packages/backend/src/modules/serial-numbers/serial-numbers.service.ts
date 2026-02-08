import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RegisterSerialNumberDto {
  productId: string;
  outletId: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  costPrice?: number;
  notes?: string;
}

export interface BulkRegisterItemDto {
  productId: string;
  outletId: string;
  serialNumber: string;
  costPrice?: number;
}

@Injectable()
export class SerialNumbersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(businessId: string, data: RegisterSerialNumberDto) {
    const existing = await this.prisma.serialNumber.findUnique({
      where: {
        businessId_serialNumber: {
          businessId,
          serialNumber: data.serialNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Serial number "${data.serialNumber}" already exists for this business`,
      );
    }

    return this.prisma.serialNumber.create({
      data: {
        businessId,
        productId: data.productId,
        outletId: data.outletId,
        serialNumber: data.serialNumber,
        status: 'in_stock',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        costPrice: data.costPrice ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async bulkRegister(businessId: string, items: BulkRegisterItemDto[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.serialNumber.create({
          data: {
            businessId,
            productId: item.productId,
            outletId: item.outletId,
            serialNumber: item.serialNumber,
            status: 'in_stock',
            costPrice: item.costPrice ?? null,
          },
        }),
      ),
    );
  }

  async markSold(
    id: string,
    businessId: string,
    customerId?: string,
    transactionId?: string,
  ) {
    const serial = await this.findOneOrFail(id, businessId);

    return this.prisma.serialNumber.update({
      where: { id: serial.id },
      data: {
        status: 'sold',
        soldDate: new Date(),
        customerId: customerId ?? null,
        transactionId: transactionId ?? null,
      },
    });
  }

  async markReturned(id: string, businessId: string, notes?: string) {
    const serial = await this.findOneOrFail(id, businessId);

    return this.prisma.serialNumber.update({
      where: { id: serial.id },
      data: {
        status: 'returned',
        ...(notes !== undefined && { notes }),
      },
    });
  }

  async markWarranty(id: string, businessId: string, notes?: string) {
    const serial = await this.findOneOrFail(id, businessId);

    return this.prisma.serialNumber.update({
      where: { id: serial.id },
      data: {
        status: 'warranty',
        ...(notes !== undefined && { notes }),
      },
    });
  }

  async markDefective(id: string, businessId: string, notes?: string) {
    const serial = await this.findOneOrFail(id, businessId);

    return this.prisma.serialNumber.update({
      where: { id: serial.id },
      data: {
        status: 'defective',
        ...(notes !== undefined && { notes }),
      },
    });
  }

  async findBySerial(serialNumber: string, businessId: string) {
    const serial = await this.prisma.serialNumber.findUnique({
      where: {
        businessId_serialNumber: {
          businessId,
          serialNumber,
        },
      },
      include: {
        product: true,
        customer: true,
      },
    });

    if (!serial) {
      throw new NotFoundException(
        `Serial number "${serialNumber}" not found`,
      );
    }

    return serial;
  }

  async listByProduct(
    productId: string,
    outletId: string,
    businessId: string,
    status?: string,
  ) {
    return this.prisma.serialNumber.findMany({
      where: {
        businessId,
        productId,
        outletId,
        ...(status && { status: status as never }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByCustomer(customerId: string, businessId: string) {
    return this.prisma.serialNumber.findMany({
      where: {
        businessId,
        customerId,
      },
      include: {
        product: true,
      },
      orderBy: { soldDate: 'desc' },
    });
  }

  async getWarrantyExpiring(businessId: string, days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.serialNumber.findMany({
      where: {
        businessId,
        status: 'sold',
        warrantyExpiry: {
          not: null,
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        product: true,
        customer: true,
      },
      orderBy: { warrantyExpiry: 'asc' },
    });
  }

  async update(
    id: string,
    businessId: string,
    data: Partial<{
      serialNumber: string;
      purchaseDate: string | null;
      warrantyExpiry: string | null;
      costPrice: number | null;
      notes: string | null;
    }>,
  ) {
    const serial = await this.findOneOrFail(id, businessId);

    return this.prisma.serialNumber.update({
      where: { id: serial.id },
      data: {
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.purchaseDate !== undefined && {
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        }),
        ...(data.warrantyExpiry !== undefined && {
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async findById(id: string, businessId: string) {
    return this.findOneOrFail(id, businessId);
  }

  async delete(id: string, businessId: string) {
    const serial = await this.findOneOrFail(id, businessId);
    await this.prisma.serialNumber.delete({ where: { id: serial.id } });
  }

  private async findOneOrFail(id: string, businessId: string) {
    const serial = await this.prisma.serialNumber.findFirst({
      where: { id, businessId },
    });

    if (!serial) {
      throw new NotFoundException('Serial number not found');
    }

    return serial;
  }
}
