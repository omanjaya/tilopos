import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type {
  CreateBundlePackageDto,
  UpdateBundlePackageDto,
} from '@application/dtos/bundle-package.dto';

@Injectable()
export class BundlePackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(businessId: string, filters?: { search?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = { businessId };
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
    });

    return bundles;
  }

  async create(businessId: string, dto: CreateBundlePackageDto) {
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
        // Assign to all outlets
        const outlets = await tx.outlet.findMany({
          where: { businessId },
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
    const existing = await this.prisma.bundlePackage.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new NotFoundException('Bundle package not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update bundle fields
      await tx.bundlePackage.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          imageUrl: dto.imageUrl,
          price: dto.price,
          costPrice: dto.costPrice,
          isActive: dto.isActive,
        },
      });

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
    const existing = await this.prisma.bundlePackage.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new NotFoundException('Bundle package not found');
    }

    await this.prisma.bundlePackage.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
