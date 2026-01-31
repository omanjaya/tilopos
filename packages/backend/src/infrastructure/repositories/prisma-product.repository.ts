import { Injectable } from '@nestjs/common';
import type { IProductRepository, ProductRecord } from '../../domain/interfaces/repositories/product.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumber, decimalToNumberRequired } from './decimal.helper';
import type { Product as PrismaProduct, ProductVariant as PrismaProductVariant } from '@prisma/client';

type ProductWithVariants = PrismaProduct & {
  variants?: PrismaProductVariant[];
};

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
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
    });

    return products.map((product) => this.toProductRecord(product));
  }

  async findByCategoryId(categoryId: string): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: { categoryId, isActive: true },
      orderBy: { name: 'asc' },
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

  async update(id: string, data: Partial<ProductRecord>): Promise<ProductRecord> {
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
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

  async delete(id: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
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
    };
  }
}
