import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IProductRepository,
  ProductRecord,
} from '../../domain/interfaces/repositories/product.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumber, decimalToNumberRequired } from './decimal.helper';
import type {
  Product as PrismaProduct,
  ProductVariant as PrismaProductVariant,
} from '@prisma/client';

type ProductWithVariants = PrismaProduct & {
  variants?: PrismaProductVariant[];
};

/** Upper bound for list methods (R13). */
const MAX_ROWS = 5000;

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass `businessId` whenever the id comes from a client (R3). The unscoped form is
   * kept only for interface compatibility and is scheduled for removal (handoff B6/B2).
   */
  async findById(id: string, businessId?: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findFirst({
      where: businessId ? { id, businessId } : { id },
      include: { variants: true },
    });

    if (!product) {
      return null;
    }

    return this.toProductRecord(product);
  }

  async findByBusinessId(businessId: string): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      take: MAX_ROWS,
    });

    return products.map((product) => this.toProductRecord(product));
  }

  /** Unused; kept only because IProductRepository still declares it (handoff B6). */
  async findByCategoryId(categoryId: string, businessId?: string): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: { categoryId, isActive: true, ...(businessId && { businessId }) },
      orderBy: { name: 'asc' },
      take: MAX_ROWS,
    });

    return products.map((product) => this.toProductRecord(product));
  }

  async findBySku(businessId: string, sku: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findFirst({
      where: { businessId, sku },
    });

    if (!product) {
      return null;
    }

    return this.toProductRecord(product);
  }

  async save(product: ProductRecord): Promise<ProductRecord> {
    const created = await this.prisma.product.create({
      data: {
        id: product.id,
        businessId: product.businessId,
        categoryId: product.categoryId,
        sku: product.sku,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        hasVariants: product.hasVariants,
        trackStock: product.trackStock,
        isActive: product.isActive,
      },
      include: { variants: true },
    });

    return this.toProductRecord(created);
  }

  async update(
    id: string,
    data: Partial<ProductRecord>,
    businessId?: string,
  ): Promise<ProductRecord> {
    if (businessId) {
      const owned = await this.prisma.product.count({ where: { id, businessId } });
      if (owned === 0) throw new NotFoundException('Product not found');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        // categoryId is never taken from a ProductRecord here: it must be verified
        // against the business by the caller (ProductCatalogService.updateProduct).
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.hasVariants !== undefined && { hasVariants: data.hasVariants }),
        ...(data.trackStock !== undefined && { trackStock: data.trackStock }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { variants: true },
    });

    return this.toProductRecord(updated);
  }

  async delete(id: string, businessId?: string): Promise<void> {
    const result = await this.prisma.product.updateMany({
      where: businessId ? { id, businessId } : { id },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Product not found');
  }

  private toProductRecord(product: ProductWithVariants): ProductRecord {
    return {
      id: product.id,
      businessId: product.businessId,
      categoryId: product.categoryId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      basePrice: decimalToNumberRequired(product.basePrice),
      costPrice: decimalToNumber(product.costPrice),
      hasVariants: product.hasVariants,
      trackStock: product.trackStock,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants?.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        barcode: v.barcode,
        name: v.name,
        price: decimalToNumberRequired(v.price),
        costPrice: decimalToNumber(v.costPrice),
        isActive: v.isActive,
        createdAt: v.createdAt,
      })),
    };
  }
}
