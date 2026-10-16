import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { DocumentNumberService } from '@shared/numbering';
import { AppError, ErrorCode } from '@shared/errors/app-error';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import type {
  AddSelfOrderItemDto,
  MenuTranslationBatchDto,
} from '@application/dtos/self-order-features.dto';
import { getTranslations } from './i18n';
import { loadModifiers, modifierIdsOf, type StoredModifier } from './self-order-pricing';

/** Upper bound for the public menu (R13). */
const MENU_LIMIT = 500;

/** Marker written into Order.notes so a kitchen order can be traced back to its session. */
export function selfOrderNote(sessionId: string): string {
  return `[SELF-ORDER session:${sessionId}]`;
}

/**
 * Products that may be sold at an outlet: active products of the outlet's
 * business, excluding those explicitly disabled for the outlet.
 */
function sellableProductWhere(businessId: string, outletId: string): Prisma.ProductWhereInput {
  return {
    businessId,
    isActive: true,
    NOT: { outletProducts: { some: { outletId, isActive: false } } },
  };
}

/**
 * Translations are (for now) embedded in product.description as JSON
 * `{ defaultDescription, translations: { en: { name, description } } }`.
 * Always return a human-readable description, never the raw JSON.
 */
export function localizeProduct(
  name: string,
  description: string | null,
  language: string,
): { name: string; description: string | null } {
  if (!description || !description.trimStart().startsWith('{')) {
    return { name, description };
  }
  let parsed: {
    defaultDescription?: unknown;
    translations?: Record<string, { name?: unknown; description?: unknown }>;
  };
  try {
    parsed = JSON.parse(description);
  } catch {
    // intentionally ignored: a plain-text description that happens to start with '{'
    return { name, description };
  }
  const fallback = typeof parsed.defaultDescription === 'string' ? parsed.defaultDescription : null;
  const t = parsed.translations?.[language];
  if (language !== 'id' && t) {
    return {
      name: typeof t.name === 'string' && t.name ? t.name : name,
      description: typeof t.description === 'string' ? t.description : fallback,
    };
  }
  return { name, description: fallback };
}

@Injectable()
export class SelfOrderSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly numbers: DocumentNumberService,
  ) {}

  // ==================== Session ====================

  /** Public view of a session: no payment reference, no product cost data. */
  async getPublicSession(code: string) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: code },
      select: {
        id: true,
        outletId: true,
        tableId: true,
        sessionCode: true,
        status: true,
        language: true,
        expiresAt: true,
        createdAt: true,
        paymentStatus: true,
        outlet: { select: { name: true } },
        table: { select: { name: true } },
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            quantity: true,
            notes: true,
            product: { select: { name: true, imageUrl: true } },
            variant: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Session not found or expired',
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      session.status === 'expired' ||
      (session.status === 'active' && this.isPast(session.expiresAt))
    ) {
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Session has expired', HttpStatus.GONE);
    }

    const { outlet, table, items, ...rest } = session;
    return {
      ...rest,
      outletName: outlet.name,
      tableNumber: table?.name ?? null,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.product.name,
        imageUrl: i.product.imageUrl,
        variantName: i.variant?.name ?? null,
        quantity: i.quantity,
        notes: i.notes,
      })),
    };
  }

  // ==================== Menu ====================

  private async findActiveOutlet(outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, isActive: true },
      select: { id: true, businessId: true, name: true },
    });
    if (!outlet) {
      throw new AppError(ErrorCode.OUTLET_NOT_FOUND, 'Outlet not found', HttpStatus.NOT_FOUND);
    }
    return outlet;
  }

  /** Flat menu (GET /self-order/menu). */
  async getMenu(outletId: string, lang?: string) {
    const outlet = await this.findActiveOutlet(outletId);
    const language = lang || 'id';
    const i18nStrings = getTranslations(language);

    const products = await this.prisma.product.findMany({
      where: sellableProductWhere(outlet.businessId, outlet.id),
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        basePrice: true,
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
      },
      orderBy: { name: 'asc' },
      take: MENU_LIMIT,
    });

    return products.map((product) => {
      const variants = product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
      }));
      const price =
        variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : Number(product.basePrice);
      const localized = localizeProduct(product.name, product.description, language);

      return {
        id: product.id,
        name: localized.name,
        description: localized.description,
        price,
        imageUrl: product.imageUrl,
        categoryName: product.category?.name || i18nStrings.menu.allCategories,
        isAvailable: true,
        variants: variants.length > 0 ? variants : undefined,
      };
    });
  }

  /** Menu grouped by category with modifier groups (GET /self-order/menu/:outletId). */
  async getMenuWithLanguage(outletId: string, lang?: string) {
    const language = lang || 'id';
    const outlet = await this.findActiveOutlet(outletId);

    const products = await this.prisma.product.findMany({
      where: sellableProductWhere(outlet.businessId, outlet.id),
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        basePrice: true,
        categoryId: true,
        category: { select: { name: true, sortOrder: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
        productModifierGroups: {
          where: { modifierGroup: { isActive: true } },
          select: {
            modifierGroup: {
              select: {
                id: true,
                name: true,
                isRequired: true,
                modifiers: {
                  where: { isActive: true },
                  select: { id: true, name: true, price: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: MENU_LIMIT,
    });

    type MenuProduct = {
      id: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
      isAvailable: boolean;
      variants?: Array<{ id: string; name: string; price: number }>;
      modifierGroups?: Array<{
        id: string;
        name: string;
        isRequired: boolean;
        modifiers: Array<{ id: string; name: string; price: number }>;
      }>;
    };
    const categoryMap = new Map<
      string,
      { id: string; name: string; sortOrder: number; products: MenuProduct[] }
    >();

    for (const product of products) {
      const categoryId = product.categoryId || 'uncategorized';
      let category = categoryMap.get(categoryId);
      if (!category) {
        category = {
          id: categoryId,
          name: product.category?.name || 'Uncategorized',
          sortOrder: product.category?.sortOrder ?? 999,
          products: [],
        };
        categoryMap.set(categoryId, category);
      }

      const localized = localizeProduct(product.name, product.description, language);
      const variants = product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
      }));
      const price =
        variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : Number(product.basePrice);

      category.products.push({
        id: product.id,
        name: localized.name,
        description: localized.description ?? undefined,
        price,
        imageUrl: product.imageUrl || undefined,
        isAvailable: true,
        variants: variants.length > 0 ? variants : undefined,
        modifierGroups:
          product.productModifierGroups.length > 0
            ? product.productModifierGroups.map((pmg) => ({
                id: pmg.modifierGroup.id,
                name: pmg.modifierGroup.name,
                isRequired: pmg.modifierGroup.isRequired,
                modifiers: pmg.modifierGroup.modifiers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.price),
                })),
              }))
            : undefined,
      });
    }

    return {
      outletName: outlet.name,
      language,
      categories: Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  // ==================== Cart ====================

  async addItem(code: string, dto: AddSelfOrderItemDto) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: code },
      select: {
        id: true,
        outletId: true,
        status: true,
        expiresAt: true,
        outlet: { select: { businessId: true } },
      },
    });
    if (!session) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', HttpStatus.NOT_FOUND);
    }
    if (session.status !== 'active') {
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Session is not active', HttpStatus.CONFLICT);
    }
    if (this.isPast(session.expiresAt)) {
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Session has expired', HttpStatus.GONE);
    }

    const businessId = session.outlet.businessId;
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, ...sellableProductWhere(businessId, session.outletId) },
      select: { id: true },
    });
    if (!product) {
      throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found', HttpStatus.NOT_FOUND);
    }

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: product.id, isActive: true },
        select: { id: true },
      });
      if (!variant) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Variant not found', HttpStatus.NOT_FOUND);
      }
    }

    const modifierIds = dto.modifierIds ?? [];
    const modifiers = await loadModifiers(this.prisma, businessId, modifierIds);
    const stored: StoredModifier[] = [];
    for (const id of modifierIds) {
      const m = modifiers.get(id);
      if (!m || !m.productIds.includes(product.id)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'One or more modifiers are not available for this product',
        );
      }
      stored.push({ id: m.id, name: m.name, price: m.price.toString() });
    }

    return this.prisma.selfOrderItem.create({
      data: {
        sessionId: session.id,
        productId: product.id,
        variantId: dto.variantId ?? null,
        quantity: dto.quantity,
        modifiers: stored as unknown as Prisma.InputJsonValue,
        notes: dto.notes ?? null,
      },
      select: {
        id: true,
        productId: true,
        variantId: true,
        quantity: true,
        modifiers: true,
        notes: true,
        createdAt: true,
      },
    });
  }

  // ==================== Submit ====================

  /**
   * Turns the cart into exactly one kitchen order. The session status moves
   * active -> submitted with a conditional update inside the same transaction
   * as the order insert, so concurrent/double submits create a single order.
   */
  async submitSession(code: string) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: code },
      select: {
        id: true,
        outletId: true,
        tableId: true,
        status: true,
        expiresAt: true,
        outlet: { select: { businessId: true } },
      },
    });
    if (!session) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', HttpStatus.NOT_FOUND);
    }
    if (session.status !== 'active') {
      throw new ConflictException('Session has already been submitted');
    }
    if (this.isPast(session.expiresAt)) {
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Session has expired', HttpStatus.GONE);
    }
    const businessId = session.outlet.businessId;

    const order = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.selfOrderSession.updateMany({
        where: { id: session.id, status: 'active' },
        data: { status: 'submitted' },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Session has already been submitted');
      }

      const items = await tx.selfOrderItem.findMany({
        where: { sessionId: session.id },
        select: { productId: true, variantId: true, quantity: true, notes: true, modifiers: true },
        orderBy: { createdAt: 'asc' },
      });
      if (items.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cannot submit empty order');
      }

      const products = await tx.product.findMany({
        where: { id: { in: [...new Set(items.map((i) => i.productId))] }, businessId },
        select: { id: true, name: true },
      });
      const productNames = new Map(products.map((p) => [p.id, p.name]));
      const modifiers = await loadModifiers(
        tx,
        businessId,
        items.flatMap((i) => modifierIdsOf(i.modifiers)),
      );

      const orderItems = items.map((item) => {
        const name = productNames.get(item.productId);
        if (!name) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            'A product in the cart is no longer available',
          );
        }
        const modifierNames = modifierIdsOf(item.modifiers)
          .map((id) => modifiers.get(id)?.name)
          .filter((n): n is string => !!n);
        const notes = [modifierNames.length ? `+ ${modifierNames.join(', ')}` : null, item.notes]
          .filter(Boolean)
          .join(' | ');
        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: name,
          quantity: item.quantity,
          notes: notes || null,
          status: 'pending' as const,
        };
      });

      const orderNumber = await this.numbers.next(tx, businessId, 'ORD');
      const created = await tx.order.create({
        data: {
          outletId: session.outletId,
          orderNumber,
          orderType: session.tableId ? 'dine_in' : 'takeaway',
          tableId: session.tableId,
          status: 'pending',
          notes: selfOrderNote(session.id),
          items: { create: orderItems },
        },
        select: { id: true, orderNumber: true },
      });

      if (session.tableId) {
        // Occupy the table only if it is free; never steal another party's table.
        await tx.table.updateMany({
          where: { id: session.tableId, outletId: session.outletId, status: 'available' },
          data: { status: 'occupied', currentOrderId: created.id, occupiedAt: new Date() },
        });
      }

      return created;
    });

    this.eventBus.publish(new OrderStatusChangedEvent(order.id, session.outletId, '', 'pending'));

    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  }

  // ==================== Translations (staff) ====================

  async setMenuTranslations(user: AuthUser, dto: MenuTranslationBatchDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, businessId: user.businessId },
      select: { id: true, description: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const results: Array<{ productId: string; success: boolean; error?: string }> = [];
    for (const item of dto.items) {
      const product = byId.get(item.productId);
      if (!product) {
        results.push({ productId: item.productId, success: false, error: 'Product not found' });
        continue;
      }

      let existing: Record<string, unknown> = {};
      if (product.description) {
        try {
          const parsed: unknown = JSON.parse(product.description);
          existing =
            parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : { defaultDescription: product.description };
        } catch {
          // intentionally ignored: plain-text description is kept as the default
          existing = { defaultDescription: product.description };
        }
      }
      existing.translations = {
        ...((existing.translations as Record<string, unknown>) || {}),
        ...item.translations,
      };
      const description = JSON.stringify(existing);
      product.description = description;

      const updated = await this.prisma.product.updateMany({
        where: { id: product.id, businessId: user.businessId },
        data: { description },
      });
      results.push(
        updated.count === 1
          ? { productId: item.productId, success: true }
          : { productId: item.productId, success: false, error: 'Product not found' },
      );
    }

    return { results };
  }

  private isPast(date: Date): boolean {
    return Date.now() > date.getTime();
  }
}
