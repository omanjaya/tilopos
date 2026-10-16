import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import type {
  BundlePackageItemDto,
  CreateBundlePackageDto,
  UpdateBundlePackageDto,
} from '@application/dtos/bundle-package.dto';

const DEFAULT_LIST_LIMIT = 200;

@Injectable()
export class BundlePackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  /**
   * Every product/variant/outlet referenced by a bundle must belong to the business,
   * and each variant must belong to its item's product (R3).
   */
  private async assertReferences(
    businessId: string,
    items: BundlePackageItemDto[] | undefined,
    outletIds: string[] | undefined,
  ): Promise<void> {
    if (items?.length) {
      await this.tenant.assertOwned(
        'product',
        items.map((i) => i.productId),
        businessId,
      );
      const withVariant = items.filter((i) => i.variantId);
      if (withVariant.length) {
        const variants = await this.prisma.productVariant.findMany({
          where: {
            id: { in: withVariant.map((i) => i.variantId as string) },
            product: { businessId },
          },
          select: { id: true, productId: true },
        });
        const owner = new Map(variants.map((v) => [v.id, v.productId]));
        for (const item of withVariant) {
          if (owner.get(item.variantId as string) !== item.productId) {
            throw new BadRequestException('Variant does not belong to the given product');
          }
        }
      }
    }
    await this.tenant.assertOwned('outlet', outletIds, businessId);
  }

  async findAll(
    businessId: string,
    filters?: { search?: string; isActive?: boolean; page?: number; limit?: number },
  ) {
    const take = filters?.limit ?? DEFAULT_LIST_LIMIT;
    const where: Prisma.BundlePackageWhereInput = { businessId };
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.bundlePackage.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
            variant: { select: { id: true, name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        outlets: {
          include: {
            outlet: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: ((filters?.page ?? 1) - 1) * take,
      take,
    });
  }

  async findById(id: string, businessId: string) {
    const bundle = await this.prisma.bundlePackage.findFirst({
      where: { id, businessId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
            variant: { select: { id: true, name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        outlets: {
          include: {
            outlet: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!bundle) {
      throw new NotFoundException('Bundle package not found');
    }

    return bundle;
  }

  async findForPOS(outletId: string, businessId: string) {
    await this.tenant.assertOutlet({ businessId }, outletId);
    const bundles = await this.prisma.bundlePackage.findMany({
      where: {
        businessId,
        isActive: true,
        outlets: {
          some: { outletId, isActive: true },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                productModifierGroups: {
                  include: {
                    modifierGroup: {
                      include: {
                        modifiers: { where: { isActive: true } },
                      },
                    },
                  },
                },
              },
            },
            variant: { select: { id: true, name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      take: DEFAULT_LIST_LIMIT,
    });

    return bundles;
  }

  async create(businessId: string, dto: CreateBundlePackageDto) {
    await this.assertReferences(businessId, dto.items, dto.outletIds);
    return this.prisma.$transaction(async (tx) => {
      const bundle = await tx.bundlePackage.create({
        data: {
          businessId,
          name: dto.name,
          description: dto.description,
          imageUrl: dto.imageUrl,
          price: dto.price,
          costPrice: dto.costPrice,
          isActive: dto.isActive ?? true,
          items: {
            create: dto.items.map((item, index) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              sortOrder: item.sortOrder ?? index,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
              variant: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Assign outlets
      if (dto.outletIds && dto.outletIds.length > 0) {
        await tx.bundlePackageOutlet.createMany({
          data: dto.outletIds.map((outletId) => ({
            bundleId: bundle.id,
            outletId,
          })),
        });
      } else {
        // Assign to all active outlets
        const outlets = await tx.outlet.findMany({
          where: { businessId, isActive: true },
          select: { id: true },
        });
        if (outlets.length > 0) {
          await tx.bundlePackageOutlet.createMany({
            data: outlets.map((outlet) => ({
              bundleId: bundle.id,
              outletId: outlet.id,
            })),
          });
        }
      }

      return bundle;
    });
  }

  async update(id: string, businessId: string, dto: UpdateBundlePackageDto) {
    await this.assertReferences(businessId, dto.items, dto.outletIds);

    return this.prisma.$transaction(async (tx) => {
      // Scoped update doubles as the existence/ownership check inside the transaction.
      const updated = await tx.bundlePackage.updateMany({
        where: { id, businessId },
        data: {
          name: dto.name,
          description: dto.description,
          imageUrl: dto.imageUrl,
          price: dto.price,
          costPrice: dto.costPrice,
          isActive: dto.isActive,
        },
      });
      if (updated.count === 0) {
        throw new NotFoundException('Bundle package not found');
      }

      // Replace items if provided
      if (dto.items) {
        await tx.bundlePackageItem.deleteMany({ where: { bundleId: id } });
        await tx.bundlePackageItem.createMany({
          data: dto.items.map((item, index) => ({
            bundleId: id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }

      // Replace outlets if provided
      if (dto.outletIds) {
        await tx.bundlePackageOutlet.deleteMany({ where: { bundleId: id } });
        if (dto.outletIds.length > 0) {
          await tx.bundlePackageOutlet.createMany({
            data: dto.outletIds.map((outletId) => ({
              bundleId: id,
              outletId,
            })),
          });
        }
      }

      return tx.bundlePackage.findFirst({
        where: { id },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
              variant: { select: { id: true, name: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
          outlets: {
            include: { outlet: { select: { id: true, name: true } } },
          },
        },
      });
    });
  }

  async softDelete(id: string, businessId: string) {
    const result = await this.prisma.bundlePackage.updateMany({
      where: { id, businessId },
      data: { isActive: false },
    });
    if (result.count === 0) {
      throw new NotFoundException('Bundle package not found');
    }
  }
}
