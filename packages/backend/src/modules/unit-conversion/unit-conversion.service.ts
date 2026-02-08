import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface CreateUnitConversionDto {
  productId: string;
  fromUnit: string;
  fromUnitLabel: string;
  toUnit: string;
  toUnitLabel: string;
  conversionFactor: number;
  isDefault?: boolean;
}

export interface UpdateUnitConversionDto {
  fromUnitLabel?: string;
  toUnitLabel?: string;
  conversionFactor?: number;
  isDefault?: boolean;
}

export interface ConvertedQuantity {
  fromQuantity: number;
  fromUnit: string;
  fromUnitLabel: string;
  toQuantity: number;
  toUnit: string;
  toUnitLabel: string;
}

@Injectable()
export class UnitConversionService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProduct(productId: string) {
    return this.prisma.unitConversion.findMany({
      where: { productId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async create(dto: CreateUnitConversionDto) {
    if (dto.conversionFactor <= 0) {
      throw new BadRequestException('Conversion factor must be positive');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.unitConversion.updateMany({
        where: { productId: dto.productId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.unitConversion.create({
      data: {
        productId: dto.productId,
        fromUnit: dto.fromUnit,
        fromUnitLabel: dto.fromUnitLabel,
        toUnit: dto.toUnit,
        toUnitLabel: dto.toUnitLabel,
        conversionFactor: dto.conversionFactor,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateUnitConversionDto) {
    const conv = await this.prisma.unitConversion.findUnique({ where: { id } });
    if (!conv) throw new NotFoundException('Unit conversion not found');

    if (dto.conversionFactor !== undefined && dto.conversionFactor <= 0) {
      throw new BadRequestException('Conversion factor must be positive');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.unitConversion.updateMany({
        where: { productId: conv.productId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.unitConversion.update({
      where: { id },
      data: {
        fromUnitLabel: dto.fromUnitLabel,
        toUnitLabel: dto.toUnitLabel,
        conversionFactor: dto.conversionFactor,
        isDefault: dto.isDefault,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.unitConversion.delete({ where: { id } });
  }

  /**
   * Convert quantity between units for a product.
   * E.g., 5 boxes → 60 pieces (if 1 box = 12 pieces)
   */
  async convert(
    productId: string,
    quantity: number,
    fromUnit: string,
    toUnit: string,
  ): Promise<ConvertedQuantity> {
    // Try direct conversion
    let conv = await this.prisma.unitConversion.findUnique({
      where: { productId_fromUnit_toUnit: { productId, fromUnit, toUnit } },
    });

    if (conv) {
      return {
        fromQuantity: quantity,
        fromUnit: conv.fromUnit,
        fromUnitLabel: conv.fromUnitLabel,
        toQuantity: quantity * Number(conv.conversionFactor),
        toUnit: conv.toUnit,
        toUnitLabel: conv.toUnitLabel,
      };
    }

    // Try reverse conversion
    conv = await this.prisma.unitConversion.findUnique({
      where: { productId_fromUnit_toUnit: { productId, fromUnit: toUnit, toUnit: fromUnit } },
    });

    if (conv) {
      const factor = Number(conv.conversionFactor);
      return {
        fromQuantity: quantity,
        fromUnit: conv.toUnit,
        fromUnitLabel: conv.toUnitLabel,
        toQuantity: factor > 0 ? quantity / factor : 0,
        toUnit: conv.fromUnit,
        toUnitLabel: conv.fromUnitLabel,
      };
    }

    throw new NotFoundException(
      `No conversion found for ${fromUnit} → ${toUnit} on this product`,
    );
  }

  /**
   * Get stock display with all available units.
   * E.g., "50 pieces (4 boxes + 2 pieces)"
   */
  async getStockInAllUnits(productId: string, outletId: string) {
    const stockLevel = await this.prisma.stockLevel.findFirst({
      where: { productId, outletId },
      select: { quantity: true },
    });

    if (!stockLevel) return { baseQuantity: 0, conversions: [] };

    const baseQty = Number(stockLevel.quantity);
    const conversions = await this.prisma.unitConversion.findMany({
      where: { productId },
    });

    const result = conversions.map((conv) => {
      const factor = Number(conv.conversionFactor);
      const wholeUnits = Math.floor(baseQty / factor);
      const remainder = baseQty % factor;

      return {
        unit: conv.fromUnit,
        unitLabel: conv.fromUnitLabel,
        wholeUnits,
        remainder,
        remainderUnit: conv.toUnit,
        remainderUnitLabel: conv.toUnitLabel,
        totalInBaseUnit: baseQty,
      };
    });

    return { baseQuantity: baseQty, conversions: result };
  }
}
