import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '@shared/tenant';
import type {
  CreateUnitConversionDto,
  UpdateUnitConversionDto,
} from '@application/dtos/unit-conversion.dto';

export interface ConvertedQuantity {
  fromQuantity: number;
  fromUnit: string;
  fromUnitLabel: string;
  toQuantity: number;
  toUnit: string;
  toUnitLabel: string;
}

type Caller = Pick<AuthUser, 'businessId'>;

/** Upper bound for per-product conversion lists (R13). */
const MAX_CONVERSIONS = 100;

/**
 * Unit conversions per product. Every read/write is scoped through
 * `product.businessId` (R3); default flips run in one transaction (R9).
 */
@Injectable()
export class UnitConversionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  private scope(user: Caller) {
    return { product: { businessId: user.businessId } };
  }

  async findById(user: Caller, id: string) {
    const conv = await this.prisma.unitConversion.findFirst({ where: { id, ...this.scope(user) } });
    if (!conv) throw new NotFoundException('Unit conversion not found');
    return conv;
  }

  async listByProduct(user: Caller, productId: string) {
    await this.tenant.assertOwned('product', productId, user.businessId);
    return this.prisma.unitConversion.findMany({
      where: { productId },
      orderBy: { isDefault: 'desc' },
      take: MAX_CONVERSIONS,
    });
  }

  async create(user: Caller, dto: CreateUnitConversionDto) {
    await this.tenant.assertOwned('product', dto.productId, user.businessId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.unitConversion.updateMany({
            where: { productId: dto.productId, isDefault: true },
            data: { isDefault: false },
          });
        }
        return tx.unitConversion.create({
          data: {
            productId: dto.productId,
            fromUnit: dto.fromUnit,
            fromUnitLabel: dto.fromUnitLabel,
            toUnit: dto.toUnit,
            toUnitLabel: dto.toUnitLabel,
            conversionFactor: new Prisma.Decimal(dto.conversionFactor),
            isDefault: dto.isDefault ?? false,
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('This conversion already exists for the product');
      }
      throw err;
    }
  }

  async update(user: Caller, id: string, dto: UpdateUnitConversionDto) {
    return this.prisma.$transaction(async (tx) => {
      const conv = await tx.unitConversion.findFirst({ where: { id, ...this.scope(user) } });
      if (!conv) throw new NotFoundException('Unit conversion not found');

      if (dto.isDefault) {
        await tx.unitConversion.updateMany({
          where: { productId: conv.productId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.unitConversion.update({
        where: { id },
        data: {
          fromUnitLabel: dto.fromUnitLabel,
          toUnitLabel: dto.toUnitLabel,
          conversionFactor:
            dto.conversionFactor !== undefined
              ? new Prisma.Decimal(dto.conversionFactor)
              : undefined,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async delete(user: Caller, id: string) {
    const result = await this.prisma.unitConversion.deleteMany({
      where: { id, ...this.scope(user) },
    });
    if (result.count === 0) throw new NotFoundException('Unit conversion not found');
  }

  /**
   * Convert quantity between units for a product.
   * E.g., 5 boxes → 60 pieces (if 1 box = 12 pieces)
   */
  async convert(
    user: Caller,
    productId: string,
    quantity: number,
    fromUnit: string,
    toUnit: string,
  ): Promise<ConvertedQuantity> {
    await this.tenant.assertOwned('product', productId, user.businessId);
    const qty = new Prisma.Decimal(quantity);

    const direct = await this.prisma.unitConversion.findUnique({
      where: { productId_fromUnit_toUnit: { productId, fromUnit, toUnit } },
    });
    if (direct) {
      return {
        fromQuantity: quantity,
        fromUnit: direct.fromUnit,
        fromUnitLabel: direct.fromUnitLabel,
        toQuantity: qty.times(direct.conversionFactor).toNumber(),
        toUnit: direct.toUnit,
        toUnitLabel: direct.toUnitLabel,
      };
    }

    const reverse = await this.prisma.unitConversion.findUnique({
      where: { productId_fromUnit_toUnit: { productId, fromUnit: toUnit, toUnit: fromUnit } },
    });
    if (reverse) {
      const factor = new Prisma.Decimal(reverse.conversionFactor);
      return {
        fromQuantity: quantity,
        fromUnit: reverse.toUnit,
        fromUnitLabel: reverse.toUnitLabel,
        toQuantity: factor.gt(0) ? qty.dividedBy(factor).toNumber() : 0,
        toUnit: reverse.fromUnit,
        toUnitLabel: reverse.fromUnitLabel,
      };
    }

    throw new NotFoundException(`No conversion found for ${fromUnit} → ${toUnit} on this product`);
  }

  /**
   * Stock of the product's base row at an outlet expressed in every configured unit.
   * E.g., "50 pieces (4 boxes + 2 pieces)"
   */
  async getStockInAllUnits(user: Caller, productId: string, outletId: string) {
    await this.tenant.assertOutlet(user, outletId);
    await this.tenant.assertOwned('product', productId, user.businessId);

    const stockLevel = await this.prisma.stockLevel.findFirst({
      where: { productId, outletId, variantId: null },
      select: { quantity: true },
    });
    if (!stockLevel) return { baseQuantity: 0, conversions: [] };

    const baseQty = new Prisma.Decimal(stockLevel.quantity);
    const conversions = await this.prisma.unitConversion.findMany({
      where: { productId },
      take: MAX_CONVERSIONS,
    });

    const result = conversions.map((conv) => {
      const factor = new Prisma.Decimal(conv.conversionFactor);
      const wholeUnits = factor.gt(0) ? baseQty.dividedToIntegerBy(factor) : new Prisma.Decimal(0);
      const remainder = factor.gt(0) ? baseQty.mod(factor) : baseQty;
      return {
        unit: conv.fromUnit,
        unitLabel: conv.fromUnitLabel,
        wholeUnits: wholeUnits.toNumber(),
        remainder: remainder.toNumber(),
        remainderUnit: conv.toUnit,
        remainderUnitLabel: conv.toUnitLabel,
        totalInBaseUnit: baseQty.toNumber(),
      };
    });

    return { baseQuantity: baseQty.toNumber(), conversions: result };
  }
}
