import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { EmployeeRole } from '@shared/constants/roles';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { OutletAccessGuard } from '@shared/guards/outlet-access.guard';
import { toPrismaPage } from '@shared/dtos/pagination-query.dto';
import { money } from '@shared/utils/money';
import type { CreateCategoryDto, UpdateCategoryDto } from '@application/dtos/category.dto';
import type { UpdateProductDto, VariantDto, UpdateVariantDto } from '@application/dtos/product.dto';
import {
  XLSX_IMPORT_FIELDS,
  type ProductListQueryDto,
  type CategoryListQueryDto,
  type ImportXlsxDto,
} from '@application/dtos/product-query.dto';
import {
  ExcelParserService,
  type ColumnMapping,
} from '@infrastructure/import/excel-parser.service';
import { MAX_CATALOG_ROWS, OutletProductService } from './outlet-product.service';
import { canSeeCost, serializeProduct } from './product-serializer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_DETAIL_INCLUDE = {
  variants: { where: { isActive: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

const LOOKUP_PRODUCT_INCLUDE = {
  variants: { where: { isActive: true } },
  category: { select: { name: true } },
  priceTiers: { where: { isActive: true }, orderBy: { minQuantity: 'asc' } },
} satisfies Prisma.ProductInclude;

const LOOKUP_VARIANT_INCLUDE = {
  product: {
    include: {
      category: { select: { name: true } },
      priceTiers: { where: { isActive: true }, orderBy: { minQuantity: 'asc' } },
    },
  },
} satisfies Prisma.ProductVariantInclude;

/** Roles that manage the catalogue and may list inactive products. */
const CATALOG_MANAGER_ROLES: ReadonlySet<string> = new Set([
  EmployeeRole.SUPER_ADMIN,
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.INVENTORY,
]);

/** Modifier group as exposed on product lists (POS product modal). */
export interface ProductModifierGroupView {
  id: string;
  name: string;
  selectionType: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number | null;
  modifiers: { id: string; name: string; price: number }[];
}

export interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Product, variant and category catalogue logic (moved out of InventoryController, R18).
 * Every query is scoped by the caller's businessId (R3) and cost prices are hidden
 * from roles that must not see them (R12).
 */
@Injectable()
export class ProductCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly outletProducts: OutletProductService,
    private readonly excelParser: ExcelParserService,
  ) {}

  // ==================== Products ====================

  /**
   * Lists products visible to the caller. Without page/limit the response stays a plain
   * array (capped at MAX_CATALOG_ROWS) for backward compatibility with the POS catalog;
   * with page or limit it is `{ data, total, page, limit, totalPages }`.
   */
  async listProducts(user: AuthUser, query: ProductListQueryDto, outletId?: string) {
    const where = this.productFilter(query);
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [query.sortBy ?? 'name']: query.sortOrder ?? 'asc',
    };
    const wantsPage = query.page !== undefined || query.limit !== undefined;
    const page = wantsPage ? toPrismaPage(query) : { skip: 0, take: MAX_CATALOG_ROWS };

    const scopedOutlet =
      outletId ??
      (!OutletAccessGuard.canAccessAllOutlets(user) && user.outletId ? user.outletId : undefined);
    const productIsActive = this.productActiveFilter(user, query);

    let rows: Prisma.ProductGetPayload<{ include: typeof PRODUCT_DETAIL_INCLUDE }>[];
    let total: number;
    if (scopedOutlet) {
      ({ rows, total } = await this.outletProducts.getProductsForOutlet(
        scopedOutlet,
        user.businessId,
        { where, orderBy, productIsActive, ...page },
      ));
    } else {
      const fullWhere: Prisma.ProductWhereInput = {
        AND: [
          {
            businessId: user.businessId,
            ...(productIsActive === null ? {} : { isActive: productIsActive }),
          },
          where,
        ],
      };
      [rows, total] = await Promise.all([
        this.prisma.product.findMany({
          where: fullWhere,
          include: PRODUCT_DETAIL_INCLUDE,
          orderBy,
          ...page,
        }),
        this.prisma.product.count({ where: fullWhere }),
      ]);
    }

    const showCost = canSeeCost(user.role);
    const modifierGroups = await this.loadModifierGroups(
      user.businessId,
      rows.map((p) => p.id),
    );
    const data = rows.map((p) => ({
      ...serializeProduct(p, showCost),
      modifierGroups: modifierGroups.get(p.id) ?? [],
    }));
    if (!wantsPage) return data;
    return {
      data,
      total,
      page: query.page ?? 1,
      limit: page.take,
      totalPages: Math.max(1, Math.ceil(total / page.take)),
    } satisfies PaginatedList<(typeof data)[number]>;
  }

  /**
   * Product.isActive filter for a list: catalogue managers may ask for inactive (or all)
   * products so a deactivated product can be found and re-activated; every other role
   * (POS, kitchen) only ever sees active products. null = no filter.
   */
  private productActiveFilter(user: AuthUser, query: ProductListQueryDto): boolean | null {
    const status = CATALOG_MANAGER_ROLES.has(user.role) ? (query.status ?? 'active') : 'active';
    if (status === 'all') return null;
    return status === 'active';
  }

  /**
   * Active modifier groups (with their active modifiers) attached to the given products,
   * keyed by productId. One query for the whole page (R13), scoped by businessId (R3).
   */
  private async loadModifierGroups(
    businessId: string,
    productIds: string[],
  ): Promise<Map<string, ProductModifierGroupView[]>> {
    const result = new Map<string, ProductModifierGroupView[]>();
    if (productIds.length === 0) return result;
    const links = await this.prisma.productModifierGroup.findMany({
      where: {
        productId: { in: productIds },
        product: { businessId },
        modifierGroup: { businessId, isActive: true },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        productId: true,
        modifierGroup: {
          select: {
            id: true,
            name: true,
            selectionType: true,
            isRequired: true,
            minSelection: true,
            maxSelection: true,
            modifiers: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });
    for (const { productId, modifierGroup: g } of links) {
      const list = result.get(productId) ?? [];
      list.push({
        id: g.id,
        name: g.name,
        selectionType: g.selectionType,
        isRequired: g.isRequired,
        minSelection: g.minSelection,
        maxSelection: g.maxSelection,
        modifiers: g.modifiers.map((m) => ({ id: m.id, name: m.name, price: Number(m.price) })),
      });
      result.set(productId, list);
    }
    return result;
  }

  private productFilter(query: ProductListQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    return where;
  }

  async lookupByBarcode(user: AuthUser, code: string) {
    const showCost = canSeeCost(user.role);
    const base = { businessId: user.businessId, isActive: true };

    for (const key of ['barcode', 'sku'] as const) {
      const product = await this.prisma.product.findFirst({
        where: { ...base, [key]: code },
        include: LOOKUP_PRODUCT_INCLUDE,
      });
      if (product) {
        return {
          found: true,
          type: 'product',
          product: serializeProduct(product, showCost),
          variant: null,
        };
      }
    }

    for (const key of ['barcode', 'sku'] as const) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { [key]: code, isActive: true, product: base },
        include: LOOKUP_VARIANT_INCLUDE,
      });
      if (variant) {
        const { product, ...rest } = variant;
        return {
          found: true,
          type: 'variant',
          product: serializeProduct(product, showCost),
          variant: serializeProduct(rest, showCost),
        };
      }
    }

    throw new NotFoundException(`No product found with barcode/SKU: ${code}`);
  }

  async getProduct(user: AuthUser, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId: user.businessId },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return serializeProduct(product, canSeeCost(user.role));
  }

  async updateProduct(user: AuthUser, id: string, dto: UpdateProductDto) {
    await this.findOwnedProduct(user.businessId, id);
    if (dto.categoryId) {
      await this.tenant.assertOwned('category', dto.categoryId, user.businessId);
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.sku !== undefined) data.sku = dto.sku.trim() || null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.basePrice !== undefined) data.basePrice = money(dto.basePrice);
    if (dto.costPrice !== undefined) data.costPrice = money(dto.costPrice);
    if (dto.trackStock !== undefined) data.trackStock = dto.trackStock;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      await this.prisma.product.updateMany({ where: { id, businessId: user.businessId }, data });
    } catch (err) {
      throw this.mapUniqueViolation(err, 'SKU or barcode is already used by another product');
    }
    return this.getProduct(user, id);
  }

  async deactivateProduct(user: AuthUser, id: string): Promise<void> {
    const result = await this.prisma.product.updateMany({
      where: { id, businessId: user.businessId },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Product not found');
  }

  // ==================== Variants ====================

  async addVariant(user: AuthUser, productId: string, dto: VariantDto) {
    const product = await this.findOwnedProduct(user.businessId, productId);

    const variant = await this.prisma.$transaction(async (tx) => {
      await this.lockBusinessSkus(tx, user.businessId);
      if (dto.sku) await this.assertVariantSkuFree(tx, user.businessId, dto.sku);

      const created = await tx.productVariant.create({
        data: {
          productId,
          name: dto.name,
          sku: dto.sku || null,
          barcode: dto.barcode || null,
          price: money(dto.price),
          costPrice: dto.costPrice !== undefined ? money(dto.costPrice) : null,
        },
      });

      if (!product.hasVariants) {
        await tx.product.update({ where: { id: productId }, data: { hasVariants: true } });
      }

      if (product.trackStock) {
        const outlets = await tx.outletProduct.findMany({
          where: { productId, isActive: true, outlet: { businessId: user.businessId } },
          select: { outletId: true },
        });
        if (outlets.length > 0) {
          await tx.stockLevel.createMany({
            data: outlets.map((o) => ({
              outletId: o.outletId,
              productId,
              variantId: created.id,
              quantity: 0,
            })),
            skipDuplicates: true,
          });
        }
      }
      return created;
    });

    return serializeProduct(variant, canSeeCost(user.role));
  }

  async updateVariant(user: AuthUser, productId: string, variantId: string, dto: UpdateVariantDto) {
    await this.findOwnedProduct(user.businessId, productId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { id: variantId, productId, product: { businessId: user.businessId } },
      });
      if (!variant) throw new NotFoundException('Variant not found');

      if (dto.sku && dto.sku !== variant.sku) {
        await this.lockBusinessSkus(tx, user.businessId);
        await this.assertVariantSkuFree(tx, user.businessId, dto.sku, variantId);
      }

      return tx.productVariant.update({
        where: { id: variantId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.sku !== undefined && { sku: dto.sku || null }),
          ...(dto.barcode !== undefined && { barcode: dto.barcode || null }),
          ...(dto.price !== undefined && { price: money(dto.price) }),
          ...(dto.costPrice !== undefined && { costPrice: money(dto.costPrice) }),
        },
      });
    });

    return serializeProduct(updated, canSeeCost(user.role));
  }

  async deactivateVariant(user: AuthUser, productId: string, variantId: string) {
    const result = await this.prisma.productVariant.updateMany({
      where: { id: variantId, productId, product: { businessId: user.businessId } },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Variant not found');

    const txCount = await this.prisma.transactionItem.count({ where: { variantId } });
    return {
      message: 'Variant deactivated',
      hadTransactions: txCount > 0,
      transactionCount: txCount,
    };
  }

  // ==================== Categories ====================

  async listCategories(user: AuthUser, query: CategoryListQueryDto) {
    const canSeeInactive =
      query.includeInactive === true &&
      (OutletAccessGuard.canAccessAllOutlets(user) || user.role === EmployeeRole.MANAGER);

    const categories = await this.prisma.category.findMany({
      where: { businessId: user.businessId, ...(canSeeInactive ? {} : { isActive: true }) },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      take: MAX_CATALOG_ROWS,
    });
    return categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
  }

  async getCategory(user: AuthUser, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, businessId: user.businessId },
      include: { children: { where: { isActive: true, businessId: user.businessId } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createCategory(user: AuthUser, dto: CreateCategoryDto) {
    if (dto.parentId) {
      if (!UUID_RE.test(dto.parentId)) throw new BadRequestException('parentId must be a UUID');
      await this.tenant.assertOwned('category', dto.parentId, user.businessId);
    }
    return this.prisma.category.create({
      data: {
        businessId: user.businessId,
        name: dto.name,
        parentId: dto.parentId || null,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(user: AuthUser, id: string, dto: UpdateCategoryDto) {
    const result = await this.prisma.category.updateMany({
      where: { id, businessId: user.businessId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    if (result.count === 0) throw new NotFoundException('Category not found');
    return this.getCategory(user, id);
  }

  async deactivateCategory(user: AuthUser, id: string): Promise<void> {
    const result = await this.prisma.category.updateMany({
      where: { id, businessId: user.businessId },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Category not found');
  }

  // ==================== Cost price history ====================

  async getCostHistory(user: AuthUser, productId: string, variantId?: string) {
    await this.findOwnedProduct(user.businessId, productId);
    if (variantId) {
      const variant = await this.prisma.productVariant.count({
        where: { id: variantId, productId, product: { businessId: user.businessId } },
      });
      if (variant === 0) throw new NotFoundException('Variant not found');
    }

    return this.prisma.costPriceHistory.findMany({
      where: variantId ? { variantId } : { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ==================== XLSX import ====================

  async previewXlsx(buffer: Buffer) {
    return this.excelParser.previewAllSheets(buffer);
  }

  /**
   * Imports products from an XLSX sheet. All rows are validated first; valid rows are
   * then created in ONE transaction (all-or-nothing for the valid set), the `category`
   * column is resolved (or created) by name, and products are linked to every active
   * outlet with set-based statements.
   */
  async importXlsx(user: AuthUser, buffer: Buffer, dto: ImportXlsxDto) {
    const mappings = this.parseMappings(dto.mappings);
    const rows = await this.excelParser.parseRows(buffer, dto.sheetName, mappings);

    const errors: string[] = [];
    const seenSkus = new Set<string>();
    const valid: Array<{
      line: number;
      name: string;
      sku: string | null;
      basePrice: Prisma.Decimal;
      costPrice: Prisma.Decimal | null;
      description: string | null;
      sellUnit: string | null;
      category: string | null;
    }> = [];

    rows.forEach((row, i) => {
      const line = i + 2; // header is row 1
      const name = String(row.name ?? '')
        .trim()
        .slice(0, 255);
      if (!name) {
        errors.push(`Row ${line}: Product name is required`);
        return;
      }
      const basePrice = this.parseAmount(row.price ?? row.basePrice ?? 0);
      if (basePrice === null) {
        errors.push(`Row ${line}: Price must be a non-negative number`);
        return;
      }
      const hasCost = row.costPrice !== null && row.costPrice !== undefined && row.costPrice !== '';
      const costPrice = hasCost ? this.parseAmount(row.costPrice) : null;
      if (hasCost && costPrice === null) {
        errors.push(`Row ${line}: Cost price must be a non-negative number`);
        return;
      }
      const sku =
        row.sku !== null && row.sku !== undefined ? String(row.sku).trim().slice(0, 100) : '';
      if (sku) {
        if (seenSkus.has(sku)) {
          errors.push(`Row ${line}: Duplicate SKU "${sku}" in file`);
          return;
        }
        seenSkus.add(sku);
      }
      valid.push({
        line,
        name,
        sku: sku || null,
        basePrice,
        costPrice,
        description: row.description ? String(row.description).slice(0, 1000) : null,
        sellUnit: row.unit ? String(row.unit).trim().slice(0, 30) : null,
        category: row.category ? String(row.category).trim().slice(0, 255) : null,
      });
    });

    let imported = 0;
    if (valid.length > 0) {
      imported = await this.prisma.$transaction(
        async (tx) => {
          await this.lockBusinessSkus(tx, user.businessId);

          // SKUs already used in the business are rejected per row (one query).
          const skus = valid.map((v) => v.sku).filter((s): s is string => !!s);
          const taken = skus.length
            ? await tx.product.findMany({
                where: { businessId: user.businessId, sku: { in: skus } },
                select: { sku: true },
              })
            : [];
          const takenSet = new Set(taken.map((t) => t.sku));
          const toCreate = valid.filter((v) => {
            if (v.sku && takenSet.has(v.sku)) {
              errors.push(`Row ${v.line}: SKU "${v.sku}" already exists`);
              return false;
            }
            return true;
          });
          if (toCreate.length === 0) return 0;

          const categoryIds = await this.resolveCategories(
            tx,
            user.businessId,
            toCreate.map((v) => v.category).filter((c): c is string => !!c),
          );

          const productIds: string[] = [];
          await tx.product.createMany({
            data: toCreate.map((v) => {
              const id = randomUUID();
              productIds.push(id);
              return {
                id,
                businessId: user.businessId,
                name: v.name,
                sku: v.sku,
                basePrice: v.basePrice,
                costPrice: v.costPrice,
                description: v.description,
                sellUnit: v.sellUnit,
                categoryId: v.category ? (categoryIds.get(v.category.toLowerCase()) ?? null) : null,
                trackStock: true,
              };
            }),
          });
          await this.outletProducts.assignToAllOutlets(user.businessId, productIds, tx);
          return productIds.length;
        },
        { timeout: 60_000 },
      );
    }

    errors.sort((a, b) => this.rowOf(a) - this.rowOf(b));
    return { imported, errors, total: rows.length };
  }

  private rowOf(message: string): number {
    const m = /^Row (\d+)/.exec(message);
    return m ? Number(m[1]) : 0;
  }

  private parseMappings(json: string): ColumnMapping[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new BadRequestException('Invalid mappings JSON');
    }
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50) {
      throw new BadRequestException('mappings must be a non-empty array (max 50)');
    }
    const allowed = new Set<string>(XLSX_IMPORT_FIELDS);
    return parsed.map((m: unknown) => {
      const item = m as Partial<ColumnMapping> | null;
      if (
        !item ||
        typeof item.excelColumn !== 'string' ||
        item.excelColumn.length > 200 ||
        typeof item.field !== 'string' ||
        !allowed.has(item.field)
      ) {
        throw new BadRequestException(
          `Each mapping needs excelColumn (string) and field (one of ${XLSX_IMPORT_FIELDS.join(', ')})`,
        );
      }
      return { excelColumn: item.excelColumn, field: item.field };
    });
  }

  /** Returns a non-negative Decimal or null when the cell is not a valid amount. */
  private parseAmount(value: unknown): Prisma.Decimal | null {
    const text = typeof value === 'number' ? String(value) : String(value ?? '').trim();
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    const amount = money(text);
    return amount.greaterThan(1_000_000_000_000) ? null : amount;
  }

  /** Maps lower-cased category name -> id, creating missing categories. */
  private async resolveCategories(
    tx: Prisma.TransactionClient,
    businessId: string,
    names: string[],
  ): Promise<Map<string, string>> {
    const byKey = new Map<string, string>();
    for (const n of names) byKey.set(n.toLowerCase(), n);
    if (byKey.size === 0) return new Map();

    const load = async () =>
      tx.category.findMany({
        where: {
          businessId,
          OR: [...byKey.values()].map((name) => ({
            name: { equals: name, mode: 'insensitive' as const },
          })),
        },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      });

    const result = new Map<string, string>();
    for (const c of await load()) {
      const key = c.name.toLowerCase();
      if (!result.has(key)) result.set(key, c.id);
    }
    const missing = [...byKey.entries()].filter(([key]) => !result.has(key));
    if (missing.length > 0) {
      await tx.category.createMany({
        data: missing.map(([, name]) => ({ businessId, name })),
      });
      for (const c of await load()) {
        const key = c.name.toLowerCase();
        if (!result.has(key)) result.set(key, c.id);
      }
    }
    return result;
  }

  // ==================== helpers ====================

  private async findOwnedProduct(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
      select: { id: true, hasVariants: true, trackStock: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * Serialises SKU assignment per business for the rest of the transaction. Variant
   * SKUs have no DB unique constraint, so check-then-insert must not race.
   */
  private async lockBusinessSkus(tx: Prisma.TransactionClient, businessId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sku:${businessId}`}))`;
  }

  private async assertVariantSkuFree(
    tx: Prisma.TransactionClient,
    businessId: string,
    sku: string,
    exceptVariantId?: string,
  ) {
    const existing = await tx.productVariant.findFirst({
      where: {
        sku,
        isActive: true,
        product: { businessId },
        ...(exceptVariantId && { NOT: { id: exceptVariantId } }),
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException(`SKU "${sku}" sudah digunakan`);
  }

  private mapUniqueViolation(err: unknown, message: string): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException(message);
    }
    return err;
  }
}
