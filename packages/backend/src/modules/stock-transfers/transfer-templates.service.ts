import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TenantAccessService } from '../../shared/tenant';
import type {
  CreateTransferTemplateDto,
  TransferTemplateItemDto,
  UpdateTransferTemplateDto,
} from '../../application/dtos/stock-transfer.dto';
import { assertTransferItemsOwned } from './transfer-stock.helper';

export interface TransferTemplate {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  sourceOutletId: string;
  destinationOutletId: string;
  sourceOutletName?: string;
  destinationOutletName?: string;
  items: TransferTemplateItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface TransferTemplateItem {
  id: string;
  templateId: string;
  productId: string | null;
  variantId: string | null;
  ingredientId: string | null;
  itemName: string;
  defaultQuantity: number;
}

/** Upper bound for the template list (R13). */
const MAX_TEMPLATES = 200;

const TEMPLATE_INCLUDE = {
  sourceOutlet: { select: { name: true } },
  destinationOutlet: { select: { name: true } },
  items: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.TransferTemplateInclude;

type TemplateRow = Prisma.TransferTemplateGetPayload<{ include: typeof TEMPLATE_INCLUDE }>;

@Injectable()
export class TransferTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  async list(businessId: string): Promise<TransferTemplate[]> {
    const templates = await this.prisma.transferTemplate.findMany({
      where: { businessId },
      include: TEMPLATE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: MAX_TEMPLATES,
    });
    const usage = await this.usageCounts(
      businessId,
      templates.map((t) => t.id),
    );
    return templates.map((t) => this.map(t, usage.get(t.id) ?? 0));
  }

  async get(id: string, businessId: string): Promise<TransferTemplate> {
    const template = await this.prisma.transferTemplate.findFirst({
      where: { id, businessId },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    const usage = await this.usageCounts(businessId, [id]);
    return this.map(template, usage.get(id) ?? 0);
  }

  async create(
    businessId: string,
    createdBy: string,
    dto: CreateTransferTemplateDto,
  ): Promise<TransferTemplate> {
    await this.assertReferences(businessId, dto.sourceOutletId, dto.destinationOutletId, dto.items);

    const created = await this.prisma.transferTemplate.create({
      data: {
        businessId,
        createdBy,
        name: dto.name,
        description: dto.description ?? null,
        sourceOutletId: dto.sourceOutletId,
        destinationOutletId: dto.destinationOutletId,
        // Nested create: header and items are written in one statement batch/transaction.
        items: { create: dto.items.map((item) => this.itemData(item)) },
      },
      select: { id: true },
    });
    return this.get(created.id, businessId);
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateTransferTemplateDto,
  ): Promise<TransferTemplate> {
    const existing = await this.prisma.transferTemplate.findFirst({
      where: { id, businessId },
      select: { sourceOutletId: true, destinationOutletId: true },
    });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    await this.assertReferences(
      businessId,
      dto.sourceOutletId ?? existing.sourceOutletId,
      dto.destinationOutletId ?? existing.destinationOutletId,
      dto.items ?? [],
    );

    await this.prisma.$transaction(async (tx) => {
      // Ownership re-checked inside the transaction by scoping the header update.
      const header = await tx.transferTemplate.updateMany({
        where: { id, businessId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.sourceOutletId !== undefined && { sourceOutletId: dto.sourceOutletId }),
          ...(dto.destinationOutletId !== undefined && {
            destinationOutletId: dto.destinationOutletId,
          }),
          updatedAt: new Date(),
        },
      });
      if (header.count === 0) {
        throw new NotFoundException('Template not found');
      }
      if (dto.items) {
        await tx.transferTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.transferTemplateItem.createMany({
          data: dto.items.map((item) => ({ ...this.itemData(item), templateId: id })),
        });
      }
    });

    return this.get(id, businessId);
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Items cascade on delete (TransferTemplateItem.template onDelete: Cascade).
    const result = await this.prisma.transferTemplate.deleteMany({ where: { id, businessId } });
    if (result.count === 0) {
      throw new NotFoundException('Template not found');
    }
  }

  // -------------------------------------------------------------------------

  private async assertReferences(
    businessId: string,
    sourceOutletId: string,
    destinationOutletId: string,
    items: readonly TransferTemplateItemDto[],
  ): Promise<void> {
    if (sourceOutletId === destinationOutletId) {
      throw new BadRequestException('Outlet asal dan tujuan tidak boleh sama');
    }
    await this.tenant.assertOutlet({ businessId }, sourceOutletId);
    await this.tenant.assertOutlet({ businessId }, destinationOutletId);
    if (items.length > 0) {
      await assertTransferItemsOwned(this.prisma, this.tenant, businessId, items);
    }
  }

  private itemData(item: TransferTemplateItemDto) {
    return {
      productId: item.productId ?? null,
      variantId: item.variantId ?? null,
      ingredientId: item.ingredientId ?? null,
      itemName: item.itemName,
      defaultQuantity: item.defaultQuantity,
    };
  }

  /** Number of this business's transfers created from each template (stock_transfers.template_id). */
  private async usageCounts(businessId: string, ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.stockTransfer.groupBy({
      by: ['templateId'],
      where: { businessId, templateId: { in: ids } },
      _count: { _all: true },
    });
    return new Map(
      rows
        .filter((r): r is typeof r & { templateId: string } => r.templateId !== null)
        .map((r) => [r.templateId, r._count._all]),
    );
  }

  private map(row: TemplateRow, usageCount: number): TransferTemplate {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      description: row.description,
      sourceOutletId: row.sourceOutletId,
      destinationOutletId: row.destinationOutletId,
      sourceOutletName: row.sourceOutlet?.name,
      destinationOutletName: row.destinationOutlet?.name,
      items: row.items.map((item) => ({
        id: item.id,
        templateId: item.templateId,
        productId: item.productId,
        variantId: item.variantId,
        ingredientId: item.ingredientId,
        itemName: item.itemName,
        defaultQuantity: Number(item.defaultQuantity),
      })),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      usageCount,
    };
  }
}
