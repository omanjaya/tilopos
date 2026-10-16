import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BUSINESS_TZ } from '@shared/utils/business-time';

/**
 * SQL aggregates shared by the report/analytics endpoints.
 *
 * - Every query is scoped by `outletIds` that the caller already resolved
 *   through TenantAccessService (R3) — never pass raw client ids here.
 * - Sums are computed in PostgreSQL NUMERIC (exact) and converted to number
 *   only for the response (R8).
 * - Day/hour/weekday buckets are computed in Asia/Jakarta (R14).
 * - Aggregation happens in the database instead of loading every row (R13).
 */
export interface SalesScope {
  outletIds: string[];
  start: Date;
  end: Date;
}

/** Which transaction amount to sum: grand total, gross subtotal, or net (subtotal - discount). */
export type AmountColumn = 'grand_total' | 'subtotal' | 'net';

export interface BucketRow {
  bucket: string;
  amount: number;
  count: number;
}

export interface ItemSalesRow {
  productId: string | null;
  productName: string;
  variantName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  quantity: number;
  revenue: number;
  cost: number;
  transactionCount: number;
}

type RawBucket = { bucket: string | number; amount: Prisma.Decimal | null; count: number };

const AMOUNT_SQL: Record<AmountColumn, Prisma.Sql> = {
  grand_total: Prisma.sql`t.grand_total`,
  subtotal: Prisma.sql`t.subtotal`,
  net: Prisma.sql`(t.subtotal - t.discount_amount)`,
};

const toNum = (v: Prisma.Decimal | number | bigint | string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v.toString());

@Injectable()
export class AnalyticsQueriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** WHERE fragment for completed sales in scope (alias `t`). */
  private saleWhere(scope: SalesScope): Prisma.Sql {
    return Prisma.sql`t.outlet_id = ANY(${scope.outletIds}::uuid[])
      AND t.transaction_type = 'sale' AND t.status = 'completed'
      AND t.created_at >= ${scope.start} AND t.created_at <= ${scope.end}`;
  }

  private async buckets(
    scope: SalesScope,
    bucketSql: Prisma.Sql,
    amount: AmountColumn,
  ): Promise<BucketRow[]> {
    if (scope.outletIds.length === 0) return [];
    const rows = await this.prisma.$queryRaw<RawBucket[]>`
      SELECT ${bucketSql} AS bucket,
             COALESCE(SUM(${AMOUNT_SQL[amount]}), 0) AS amount,
             COUNT(*)::int AS count
      FROM transactions t
      WHERE ${this.saleWhere(scope)}
      GROUP BY 1
      ORDER BY 1`;
    return rows.map((r) => ({ bucket: String(r.bucket), amount: toNum(r.amount), count: r.count }));
  }

  /** Completed sales per WIB business day, keyed `YYYY-MM-DD`. */
  salesByDay(scope: SalesScope, amount: AmountColumn = 'grand_total'): Promise<BucketRow[]> {
    return this.buckets(
      scope,
      Prisma.sql`to_char(t.created_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM-DD')`,
      amount,
    );
  }

  /** Completed sales per WIB hour of day (bucket "0".."23"). */
  salesByHour(scope: SalesScope, amount: AmountColumn = 'grand_total'): Promise<BucketRow[]> {
    return this.buckets(
      scope,
      Prisma.sql`EXTRACT(HOUR FROM t.created_at AT TIME ZONE ${BUSINESS_TZ})::int`,
      amount,
    );
  }

  /** Completed sales per WIB weekday (bucket "0" = Sunday .. "6"). */
  salesByWeekday(scope: SalesScope, amount: AmountColumn = 'grand_total'): Promise<BucketRow[]> {
    return this.buckets(
      scope,
      Prisma.sql`EXTRACT(DOW FROM t.created_at AT TIME ZONE ${BUSINESS_TZ})::int`,
      amount,
    );
  }

  /** Completed sales per WIB month (bucket `YYYY-MM`). */
  salesByMonth(scope: SalesScope, amount: AmountColumn = 'grand_total'): Promise<BucketRow[]> {
    return this.buckets(
      scope,
      Prisma.sql`to_char(t.created_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM')`,
      amount,
    );
  }

  /** Completed sales per ISO week in WIB (bucket `IYYY-IW|YYYY-MM-DD` of the Monday). */
  salesByIsoWeek(scope: SalesScope, amount: AmountColumn = 'grand_total'): Promise<BucketRow[]> {
    return this.buckets(
      scope,
      Prisma.sql`to_char(t.created_at AT TIME ZONE ${BUSINESS_TZ}, 'IYYY-IW') || '|' ||
        to_char(date_trunc('week', t.created_at AT TIME ZONE ${BUSINESS_TZ}), 'YYYY-MM-DD')`,
      amount,
    );
  }

  /**
   * Cost of goods sold for completed sales, grouped by outlet.
   * Cost = quantity x (variant cost, else product cost). Items without a cost count as 0.
   */
  async cogsByOutlet(scope: SalesScope): Promise<Map<string, number>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ outlet_id: string; cost: Prisma.Decimal | null }[]>`
      SELECT t.outlet_id::text AS outlet_id,
             COALESCE(SUM(ti.quantity * COALESCE(pv.cost_price, p.cost_price, 0)), 0) AS cost
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN product_variants pv ON pv.id = ti.variant_id
      WHERE ${this.saleWhere(scope)}
      GROUP BY t.outlet_id`;
    return new Map(rows.map((r) => [r.outlet_id, toNum(r.cost)]));
  }

  /** Total COGS across the scope. */
  async cogs(scope: SalesScope): Promise<number> {
    let total = 0;
    for (const v of (await this.cogsByOutlet(scope)).values()) total += v;
    return total;
  }

  /** COGS per WIB business day (`YYYY-MM-DD`). */
  async cogsByDay(scope: SalesScope): Promise<Map<string, number>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ bucket: string; cost: Prisma.Decimal | null }[]>`
      SELECT to_char(t.created_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(ti.quantity * COALESCE(pv.cost_price, p.cost_price, 0)), 0) AS cost
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN product_variants pv ON pv.id = ti.variant_id
      WHERE ${this.saleWhere(scope)}
      GROUP BY 1`;
    return new Map(rows.map((r) => [r.bucket, toNum(r.cost)]));
  }

  /**
   * Completed refunds per WIB business day. `amount` is the refunded net sales
   * (ABS(subtotal)), `grandTotal` the cash returned (ABS(grand_total)).
   */
  async refundsByDay(
    scope: SalesScope,
  ): Promise<Map<string, { amount: number; grandTotal: number; count: number }>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      {
        bucket: string;
        amount: Prisma.Decimal | null;
        grand: Prisma.Decimal | null;
        count: number;
      }[]
    >`
      SELECT to_char(t.created_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(ABS(t.subtotal)), 0) AS amount,
             COALESCE(SUM(ABS(t.grand_total)), 0) AS grand,
             COUNT(*)::int AS count
      FROM transactions t
      WHERE t.outlet_id = ANY(${scope.outletIds}::uuid[])
        AND t.transaction_type = 'refund' AND t.status = 'completed'
        AND t.created_at >= ${scope.start} AND t.created_at <= ${scope.end}
      GROUP BY 1`;
    return new Map(
      rows.map((r) => [
        r.bucket,
        { amount: toNum(r.amount), grandTotal: toNum(r.grand), count: r.count },
      ]),
    );
  }

  /** Payments of completed sales per WIB business day. */
  async paymentsByDay(scope: SalesScope): Promise<Map<string, number>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ bucket: string; amount: Prisma.Decimal | null }[]>`
      SELECT to_char(pm.created_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(pm.amount), 0) AS amount
      FROM payments pm
      JOIN transactions t ON t.id = pm.transaction_id
      WHERE ${this.saleWhere(scope)}
      GROUP BY 1`;
    return new Map(rows.map((r) => [r.bucket, toNum(r.amount)]));
  }

  /** Received purchase orders (by receivedAt) per WIB business day. */
  async purchasesByDay(scope: SalesScope): Promise<Map<string, number>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ bucket: string; amount: Prisma.Decimal | null }[]>`
      SELECT to_char(po.received_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(po.total_amount), 0) AS amount
      FROM purchase_orders po
      WHERE po.outlet_id = ANY(${scope.outletIds}::uuid[])
        AND po.status = 'received'
        AND po.received_at >= ${scope.start} AND po.received_at <= ${scope.end}
      GROUP BY 1`;
    return new Map(rows.map((r) => [r.bucket, toNum(r.amount)]));
  }

  /**
   * Item sales of completed transactions grouped by product (and optionally
   * variant name), sorted by revenue. `limit` bounds the result.
   */
  async itemSales(
    scope: SalesScope,
    opts: { limit?: number; offset?: number; search?: string; byVariant?: boolean } = {},
  ): Promise<ItemSalesRow[]> {
    if (scope.outletIds.length === 0) return [];
    const limit = Math.min(Math.max(opts.limit ?? 500, 1), 5000);
    const offset = Math.max(opts.offset ?? 0, 0);
    const groupKey = opts.byVariant
      ? Prisma.sql`COALESCE(ti.product_id::text, ti.product_name), COALESCE(ti.variant_name, '')`
      : Prisma.sql`COALESCE(ti.product_id::text, ti.product_name)`;
    const search = opts.search
      ? Prisma.sql`AND ti.product_name ILIKE ${'%' + opts.search.replace(/[%_\\]/g, '\\$&') + '%'}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        product_id: string | null;
        product_name: string;
        variant_name: string | null;
        category_id: string | null;
        category_name: string | null;
        quantity: Prisma.Decimal | null;
        revenue: Prisma.Decimal | null;
        cost: Prisma.Decimal | null;
        tx_count: number;
      }[]
    >`
      SELECT MAX(ti.product_id::text) AS product_id,
             MAX(ti.product_name) AS product_name,
             ${opts.byVariant ? Prisma.sql`MAX(ti.variant_name)` : Prisma.sql`NULL`} AS variant_name,
             MAX(c.id::text) AS category_id,
             MAX(c.name) AS category_name,
             COALESCE(SUM(ti.quantity), 0) AS quantity,
             COALESCE(SUM(ti.subtotal), 0) AS revenue,
             COALESCE(SUM(ti.quantity * COALESCE(pv.cost_price, p.cost_price, 0)), 0) AS cost,
             COUNT(DISTINCT ti.transaction_id)::int AS tx_count
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN product_variants pv ON pv.id = ti.variant_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${this.saleWhere(scope)} ${search}
      GROUP BY ${groupKey}
      ORDER BY revenue DESC
      LIMIT ${limit} OFFSET ${offset}`;
    return rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      variantName: r.variant_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      quantity: toNum(r.quantity),
      revenue: toNum(r.revenue),
      cost: toNum(r.cost),
      transactionCount: r.tx_count,
    }));
  }

  /** Top `perOutlet` products by item revenue for each outlet (window function, no N+1). */
  async topItemsByOutlet(
    scope: SalesScope,
    perOutlet = 3,
  ): Promise<Map<string, { name: string; grossSales: number; quantity: number }[]>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      {
        outlet_id: string;
        name: string;
        sales: Prisma.Decimal | null;
        qty: Prisma.Decimal | null;
      }[]
    >`
      SELECT outlet_id, name, sales, qty FROM (
        SELECT t.outlet_id::text AS outlet_id,
               MAX(ti.product_name) AS name,
               COALESCE(SUM(ti.subtotal), 0) AS sales,
               COALESCE(SUM(ti.quantity), 0) AS qty,
               ROW_NUMBER() OVER (
                 PARTITION BY t.outlet_id ORDER BY COALESCE(SUM(ti.subtotal), 0) DESC
               ) AS rn
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        WHERE ${this.saleWhere(scope)}
        GROUP BY t.outlet_id, COALESCE(ti.product_id::text, ti.product_name)
      ) ranked
      WHERE rn <= ${perOutlet}
      ORDER BY outlet_id, rn`;
    const out = new Map<string, { name: string; grossSales: number; quantity: number }[]>();
    for (const r of rows) {
      const list = out.get(r.outlet_id) ?? [];
      list.push({ name: r.name, grossSales: toNum(r.sales), quantity: toNum(r.qty) });
      out.set(r.outlet_id, list);
    }
    return out;
  }

  /**
   * Sale invoices (any status) per WIB business day, optionally filtered by a
   * receipt-number substring. Used by the invoice report's daily summary.
   */
  async invoicesByDay(scope: SalesScope, receiptSearch?: string): Promise<BucketRow[]> {
    if (scope.outletIds.length === 0) return [];
    const filter = receiptSearch
      ? Prisma.sql`AND t.receipt_number ILIKE ${'%' + receiptSearch.replace(/[%_\\]/g, '\\$&') + '%'}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<RawBucket[]>`
      SELECT to_char(t.created_at AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(t.grand_total), 0) AS amount,
             COUNT(*)::int AS count
      FROM transactions t
      WHERE t.outlet_id = ANY(${scope.outletIds}::uuid[])
        AND t.transaction_type = 'sale'
        AND t.created_at >= ${scope.start} AND t.created_at <= ${scope.end}
        ${filter}
      GROUP BY 1
      ORDER BY 1 DESC`;
    return rows.map((r) => ({ bucket: String(r.bucket), amount: toNum(r.amount), count: r.count }));
  }

  /** Stock rows at or below their own low-stock threshold (not a hard-coded 10, F1024). */
  async lowStockCount(outletIds: string[]): Promise<number> {
    if (outletIds.length === 0) return 0;
    const [row] = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM stock_levels sl
      WHERE sl.outlet_id = ANY(${outletIds}::uuid[]) AND sl.quantity <= sl.low_stock_alert`;
    return row?.n ?? 0;
  }

  /** Basket size of completed sales with vs without a transaction discount. */
  async basketByDiscount(
    scope: SalesScope,
  ): Promise<
    Record<
      'withDiscount' | 'withoutDiscount',
      { count: number; avgTotal: number; avgItems: number }
    >
  > {
    const empty = { count: 0, avgTotal: 0, avgItems: 0 };
    if (scope.outletIds.length === 0) return { withDiscount: empty, withoutDiscount: empty };
    const rows = await this.prisma.$queryRaw<
      { promo: boolean; n: number; avg_total: Prisma.Decimal | null; qty: Prisma.Decimal | null }[]
    >`
      SELECT (t.discount_amount > 0) AS promo,
             COUNT(*)::int AS n,
             AVG(t.grand_total) AS avg_total,
             COALESCE(SUM(q.qty), 0) AS qty
      FROM transactions t
      LEFT JOIN (
        SELECT transaction_id, SUM(quantity) AS qty FROM transaction_items GROUP BY transaction_id
      ) q ON q.transaction_id = t.id
      WHERE ${this.saleWhere(scope)}
      GROUP BY 1`;
    const pick = (flag: boolean) => {
      const r = rows.find((x) => x.promo === flag);
      if (!r || r.n === 0) return empty;
      return { count: r.n, avgTotal: toNum(r.avg_total), avgItems: toNum(r.qty) / r.n };
    };
    return { withDiscount: pick(true), withoutDiscount: pick(false) };
  }

  /** Items summary totals (distinct products, quantity, revenue) for the scope. */
  async itemTotals(
    scope: SalesScope,
    search?: string,
  ): Promise<{ products: number; quantity: number; revenue: number }> {
    if (scope.outletIds.length === 0) return { products: 0, quantity: 0, revenue: 0 };
    const filter = search
      ? Prisma.sql`AND ti.product_name ILIKE ${'%' + search.replace(/[%_\\]/g, '\\$&') + '%'}`
      : Prisma.empty;
    const [row] = await this.prisma.$queryRaw<
      { products: number; quantity: Prisma.Decimal | null; revenue: Prisma.Decimal | null }[]
    >`
      SELECT COUNT(DISTINCT COALESCE(ti.product_id::text, ti.product_name))::int AS products,
             COALESCE(SUM(ti.quantity), 0) AS quantity,
             COALESCE(SUM(ti.subtotal), 0) AS revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE ${this.saleWhere(scope)} ${filter}`;
    return {
      products: row?.products ?? 0,
      quantity: toNum(row?.quantity),
      revenue: toNum(row?.revenue),
    };
  }

  /** Sum of item quantities and transaction count per employee (avg items per sale). */
  async itemsPerEmployee(
    scope: SalesScope,
  ): Promise<Map<string, { quantity: number; lines: number; transactions: number }>> {
    if (scope.outletIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      { employee_id: string; quantity: Prisma.Decimal | null; lines: number; tx: number }[]
    >`
      SELECT t.employee_id::text AS employee_id,
             COALESCE(SUM(ti.quantity), 0) AS quantity,
             COUNT(ti.id)::int AS lines,
             COUNT(DISTINCT t.id)::int AS tx
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE ${this.saleWhere(scope)} AND t.employee_id IS NOT NULL
      GROUP BY t.employee_id`;
    return new Map(
      rows.map((r) => [
        r.employee_id,
        { quantity: toNum(r.quantity), lines: r.lines, transactions: r.tx },
      ]),
    );
  }

  /** Busiest WIB hour per product key (product id, else name). */
  async peakHourByProduct(scope: SalesScope, keys: string[]): Promise<Map<string, number>> {
    if (scope.outletIds.length === 0 || keys.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ key: string; hour: number }[]>`
      SELECT DISTINCT ON (key) key, hour FROM (
        SELECT COALESCE(ti.product_id::text, ti.product_name) AS key,
               EXTRACT(HOUR FROM t.created_at AT TIME ZONE ${BUSINESS_TZ})::int AS hour,
               COUNT(*) AS n
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        WHERE ${this.saleWhere(scope)}
          AND COALESCE(ti.product_id::text, ti.product_name) = ANY(${keys}::text[])
        GROUP BY 1, 2
      ) s
      ORDER BY key, n DESC, hour`;
    return new Map(rows.map((r) => [r.key, r.hour]));
  }

  /** Top co-purchased product names for each product key (single pass, R13). */
  async commonPairs(
    scope: SalesScope,
    keys: string[],
    perProduct = 3,
  ): Promise<Map<string, string[]>> {
    if (scope.outletIds.length === 0 || keys.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ key: string; other: string; n: number }[]>`
      SELECT a.key, MAX(b.product_name) AS other, COUNT(DISTINCT a.transaction_id)::int AS n
      FROM (
        SELECT ti.transaction_id, COALESCE(ti.product_id::text, ti.product_name) AS key
        FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id
        WHERE ${this.saleWhere(scope)}
          AND COALESCE(ti.product_id::text, ti.product_name) = ANY(${keys}::text[])
      ) a
      JOIN transaction_items b ON b.transaction_id = a.transaction_id
        AND COALESCE(b.product_id::text, b.product_name) <> a.key
      GROUP BY a.key, COALESCE(b.product_id::text, b.product_name)
      ORDER BY a.key, n DESC`;
    const out = new Map<string, string[]>();
    for (const r of rows) {
      const list = out.get(r.key) ?? [];
      if (list.length < perProduct) list.push(r.other);
      out.set(r.key, list);
    }
    return out;
  }
}
