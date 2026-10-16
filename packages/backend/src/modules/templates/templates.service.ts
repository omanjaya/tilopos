import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isValidBusinessType } from '../../config/business-types.config';
import * as fs from 'fs';
import * as path from 'path';

/** Template type codes are file names: only lowercase letters, digits and underscores. */
const TYPE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

interface TemplateCategory {
  name: string;
  sortOrder: number;
}

interface TemplateProduct {
  name: string;
  category: string;
  price: number;
  unit: string;
  type: string;
}

interface TemplateModifierOption {
  name: string;
  price: number;
}

interface TemplateModifierGroup {
  name: string;
  required: boolean;
  maxSelect: number;
  options: TemplateModifierOption[];
}

interface TemplateTable {
  name: string;
  capacity: number;
}

export interface TemplateData {
  type: string;
  label: string;
  description: string;
  icon: string;
  categories: TemplateCategory[];
  products: TemplateProduct[];
  modifierGroups: TemplateModifierGroup[];
  units: string[];
  tables: TemplateTable[];
  paymentMethods: string[];
  taxRate: number;
}

export interface TemplateSummary {
  type: string;
  label: string;
  description: string;
  icon: string;
  counts: {
    categories: number;
    products: number;
    modifierGroups: number;
    tables: number;
    units: number;
  };
}

export interface ApplySections {
  categories?: boolean;
  products?: boolean;
  modifiers?: boolean;
  tables?: boolean;
  /** Units are applied through each product's sellUnit; kept for request compatibility. */
  units?: boolean;
}

export interface ApplyTemplateResult {
  categories: number;
  products: number;
  modifierGroups: number;
  modifiers: number;
  tables: number;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly templatesDir = path.resolve(
    __dirname,
    '../../infrastructure/database/templates',
  );

  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(): Promise<TemplateSummary[]> {
    const files = fs.readdirSync(this.templatesDir).filter((f) => f.endsWith('.json'));
    return files.map((file) => {
      const data = this.readTemplateFile(file);
      return {
        type: data.type,
        label: data.label,
        description: data.description,
        icon: data.icon,
        counts: {
          categories: data.categories.length,
          products: data.products.length,
          modifierGroups: data.modifierGroups.length,
          tables: data.tables.length,
          units: data.units.length,
        },
      };
    });
  }

  /**
   * Loads a template by business type code. The code is whitelisted against the
   * known business types and the resolved path must stay inside templatesDir,
   * so `../` sequences can never escape the directory.
   */
  async getTemplate(typeCode: string): Promise<TemplateData> {
    const filePath = this.resolveTemplatePath(typeCode);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException(`Template "${typeCode}" not found`);
    }
    return this.readTemplateFile(path.basename(filePath));
  }

  /**
   * Applies a template to an outlet. Idempotent: rows that already exist by name
   * (categories, modifier groups, products for the business; tables for the
   * outlet) are reused/reactivated instead of duplicated.
   *
   * Pass `tx` to run inside a caller's transaction (e.g. a business type change).
   */
  async applyTemplate(
    businessId: string,
    outletId: string,
    typeCode: string,
    sections: ApplySections,
    tx?: Prisma.TransactionClient,
  ): Promise<ApplyTemplateResult> {
    const template = await this.getTemplate(typeCode);
    if (tx) {
      return this.applyTemplateData(tx, businessId, outletId, template, sections);
    }
    return this.prisma.$transaction(
      (client) => this.applyTemplateData(client, businessId, outletId, template, sections),
      { timeout: 30_000 },
    );
  }

  async applyTemplateData(
    tx: Prisma.TransactionClient,
    businessId: string,
    outletId: string,
    template: TemplateData,
    sections: ApplySections,
  ): Promise<ApplyTemplateResult> {
    const outlet = await tx.outlet.findFirst({
      where: { id: outletId, businessId },
      select: { id: true },
    });
    if (!outlet) {
      throw new ForbiddenException('Outlet is not accessible');
    }

    const result: ApplyTemplateResult = {
      categories: 0,
      products: 0,
      modifierGroups: 0,
      modifiers: 0,
      tables: 0,
    };

    // 1. Categories (reuse by name)
    const categoryMap = new Map<string, string>();
    if (sections.categories && template.categories.length > 0) {
      const names = template.categories.map((c) => c.name);
      const existing = await tx.category.findMany({
        where: { businessId, name: { in: names } },
        select: { id: true, name: true },
      });
      existing.forEach((c) => categoryMap.set(c.name, c.id));
      const toCreate = template.categories.filter((c) => !categoryMap.has(c.name));
      if (toCreate.length > 0) {
        const created = await tx.category.createManyAndReturn({
          data: toCreate.map((c) => ({ businessId, name: c.name, sortOrder: c.sortOrder })),
          select: { id: true, name: true },
        });
        created.forEach((c) => categoryMap.set(c.name, c.id));
        result.categories = created.length;
      }
    }

    // 2. Modifier groups (reuse by name), before products so they can be linked
    const modifierGroupIds: string[] = [];
    if (sections.modifiers && template.modifierGroups.length > 0) {
      const names = template.modifierGroups.map((m) => m.name);
      const existing = await tx.modifierGroup.findMany({
        where: { businessId, name: { in: names } },
        select: { id: true, name: true },
      });
      const byName = new Map(existing.map((m) => [m.name, m.id]));
      const toCreate = template.modifierGroups.filter((m) => !byName.has(m.name));
      if (toCreate.length > 0) {
        const created = await tx.modifierGroup.createManyAndReturn({
          data: toCreate.map((mg) => ({
            businessId,
            name: mg.name,
            selectionType: mg.maxSelect === 1 ? 'single' : 'multiple',
            isRequired: mg.required,
            minSelection: mg.required ? 1 : 0,
            maxSelection: mg.maxSelect,
          })),
          select: { id: true, name: true },
        });
        created.forEach((m) => byName.set(m.name, m.id));
        const modifiers = toCreate.flatMap((mg) =>
          mg.options.map((opt, idx) => ({
            modifierGroupId: byName.get(mg.name)!,
            name: opt.name,
            price: opt.price,
            sortOrder: idx + 1,
          })),
        );
        if (modifiers.length > 0) {
          await tx.modifier.createMany({ data: modifiers });
        }
        result.modifierGroups = created.length;
        result.modifiers = modifiers.length;
      }
      template.modifierGroups.forEach((m) => modifierGroupIds.push(byName.get(m.name)!));
    }

    // 3. Products (reuse by name) + outlet availability
    if (sections.products && template.products.length > 0) {
      const names = template.products.map((p) => p.name);
      const existing = await tx.product.findMany({
        where: { businessId, name: { in: names } },
        select: { id: true, name: true },
      });
      const byName = new Map(existing.map((p) => [p.name, p.id]));
      const toCreate = template.products.filter((p) => !byName.has(p.name));
      if (toCreate.length > 0) {
        const created = await tx.product.createManyAndReturn({
          data: toCreate.map((prod) => ({
            businessId,
            categoryId: categoryMap.get(prod.category) ?? null,
            name: prod.name,
            basePrice: prod.price,
            sellUnit: prod.unit,
            trackStock: prod.type === 'product',
          })),
          select: { id: true, name: true },
        });
        created.forEach((p) => byName.set(p.name, p.id));
        result.products = created.length;

        if (modifierGroupIds.length > 0) {
          await tx.productModifierGroup.createMany({
            data: created.flatMap((p) =>
              modifierGroupIds.map((mgId, idx) => ({
                productId: p.id,
                modifierGroupId: mgId,
                sortOrder: idx + 1,
              })),
            ),
            skipDuplicates: true,
          });
        }
      }

      const productIds = template.products.map((p) => byName.get(p.name)!);
      // Reactivate availability for products already linked to this outlet...
      await tx.outletProduct.updateMany({
        where: { outletId, productId: { in: productIds }, isActive: false },
        data: { isActive: true },
      });
      // ...and link the rest.
      await tx.outletProduct.createMany({
        data: productIds.map((productId) => ({ outletId, productId, sortOrder: 0 })),
        skipDuplicates: true,
      });
    }

    // 4. Tables (reuse by name within the outlet)
    if (sections.tables && template.tables.length > 0) {
      const names = template.tables.map((t) => t.name);
      const existing = await tx.table.findMany({
        where: { outletId, name: { in: names } },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((t) => t.name));
      await tx.table.updateMany({
        where: { outletId, name: { in: names }, isActive: false },
        data: { isActive: true },
      });
      const toCreate = template.tables.filter((t) => !existingNames.has(t.name));
      if (toCreate.length > 0) {
        const { count } = await tx.table.createMany({
          data: toCreate.map((t) => ({ outletId, name: t.name, capacity: t.capacity })),
        });
        result.tables = count;
      }
    }

    this.logger.debug(`Applied template "${template.type}" to outlet ${outletId}`);
    return result;
  }

  /** Returns the absolute template path, or null when typeCode is not an allowed code. */
  private resolveTemplatePath(typeCode: string): string | null {
    if (
      typeof typeCode !== 'string' ||
      !TYPE_CODE_PATTERN.test(typeCode) ||
      !isValidBusinessType(typeCode)
    ) {
      return null;
    }
    const filePath = path.resolve(this.templatesDir, `${typeCode}.json`);
    if (path.dirname(filePath) !== this.templatesDir) {
      return null;
    }
    return filePath;
  }

  private readTemplateFile(fileName: string): TemplateData {
    const filePath = path.join(this.templatesDir, path.basename(fileName));
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as TemplateData;
  }
}
