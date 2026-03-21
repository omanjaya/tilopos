import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

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

interface ApplySections {
  categories?: boolean;
  products?: boolean;
  modifiers?: boolean;
  tables?: boolean;
  units?: boolean;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly templatesDir = path.join(__dirname, '../../infrastructure/database/templates');

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

  async getTemplate(typeCode: string): Promise<TemplateData> {
    const fileName = `${typeCode}.json`;
    const filePath = path.join(this.templatesDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Template "${typeCode}" not found`);
    }
    return this.readTemplateFile(fileName);
  }

  async applyTemplate(
    businessId: string,
    outletId: string,
    typeCode: string,
    sections: ApplySections,
  ) {
    const template = await this.getTemplate(typeCode);

    return this.prisma.$transaction(async (tx) => {
      const result = {
        categories: 0,
        products: 0,
        modifierGroups: 0,
        modifiers: 0,
        tables: 0,
      };

      // 1. Create categories
      const categoryMap = new Map<string, string>();
      if (sections.categories) {
        for (const cat of template.categories) {
          const created = await tx.category.create({
            data: {
              businessId,
              name: cat.name,
              sortOrder: cat.sortOrder,
            },
          });
          categoryMap.set(cat.name, created.id);
          result.categories++;
        }
      }

      // 2. Create modifier groups (before products so we can link them)
      const modifierGroupIds: string[] = [];
      if (sections.modifiers) {
        for (const mg of template.modifierGroups) {
          const created = await tx.modifierGroup.create({
            data: {
              businessId,
              name: mg.name,
              selectionType: mg.maxSelect === 1 ? 'single' : 'multiple',
              isRequired: mg.required,
              minSelection: mg.required ? 1 : 0,
              maxSelection: mg.maxSelect,
              modifiers: {
                create: mg.options.map((opt, idx) => ({
                  name: opt.name,
                  price: opt.price,
                  sortOrder: idx + 1,
                })),
              },
            },
          });
          modifierGroupIds.push(created.id);
          result.modifierGroups++;
          result.modifiers += mg.options.length;
        }
      }

      // 3. Create products + outlet products
      if (sections.products) {
        for (const prod of template.products) {
          const categoryId = categoryMap.get(prod.category) || null;

          const created = await tx.product.create({
            data: {
              businessId,
              categoryId,
              name: prod.name,
              basePrice: prod.price,
              sellUnit: prod.unit,
              trackStock: prod.type === 'product',
              outletProducts: {
                create: {
                  outletId,
                  sortOrder: 0,
                },
              },
              ...(sections.modifiers && modifierGroupIds.length > 0
                ? {
                    productModifierGroups: {
                      create: modifierGroupIds.map((mgId, idx) => ({
                        modifierGroupId: mgId,
                        sortOrder: idx + 1,
                      })),
                    },
                  }
                : {}),
            },
          });
          result.products++;
          this.logger.debug(`Created product: ${created.name}`);
        }
      }

      // 4. Create tables
      if (sections.tables && template.tables.length > 0) {
        for (const table of template.tables) {
          await tx.table.create({
            data: {
              outletId,
              name: table.name,
              capacity: table.capacity,
            },
          });
          result.tables++;
        }
      }

      return result;
    });
  }

  private readTemplateFile(fileName: string): TemplateData {
    const filePath = path.join(this.templatesDir, fileName);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as TemplateData;
  }
}
