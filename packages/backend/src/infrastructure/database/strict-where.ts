/**
 * Prisma silently drops `undefined` filter values, so
 * `findMany({ where: { outletId: undefined } })` returns every tenant's rows.
 * This guard makes that mistake fail loudly (Docs/ENGINEERING-RULES.md R4).
 */

/** Keys that must never be `undefined` when present in a where clause. */
const ALWAYS_REQUIRED = ['id', 'businessId'] as const;

/** Keys that may be optional filters, but only inside an otherwise tenant-scoped query. */
const SCOPE_KEYS = ['outletId', 'customerId', 'employeeId', 'productId', 'storeId'] as const;

/** Relation filters that themselves provide tenant scope. */
const SCOPING_RELATIONS = ['business', 'outlet', 'product', 'store'] as const;

const ACTIONS_WITH_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);

export class UnscopedQueryError extends Error {
  constructor(model: string | undefined, action: string, key: string) {
    super(
      `Unscoped Prisma query: ${model ?? '?'}.${action} has where.${key} = undefined. ` +
        'Validate the value or use TenantAccessService.resolveOutletIds().',
    );
    this.name = 'UnscopedQueryError';
  }
}

function isDefined(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function hasTenantScope(where: Record<string, unknown>): boolean {
  if (isDefined(where.id) || isDefined(where.businessId)) return true;
  if (SCOPING_RELATIONS.some((rel) => isDefined(where[rel]))) return true;
  const and = where.AND;
  if (Array.isArray(and)) {
    return and.some(
      (clause) =>
        typeof clause === 'object' &&
        clause !== null &&
        hasTenantScope(clause as Record<string, unknown>),
    );
  }
  return false;
}

export function assertScopedWhere(model: string | undefined, action: string, where: unknown): void {
  if (!ACTIONS_WITH_WHERE.has(action) || typeof where !== 'object' || where === null) {
    return;
  }
  const w = where as Record<string, unknown>;

  for (const key of ALWAYS_REQUIRED) {
    if (key in w && w[key] === undefined) {
      throw new UnscopedQueryError(model, action, key);
    }
  }

  for (const key of SCOPE_KEYS) {
    if (key in w && w[key] === undefined && !hasTenantScope(w)) {
      throw new UnscopedQueryError(model, action, key);
    }
  }

  if (Array.isArray(w.AND)) {
    for (const clause of w.AND) assertScopedWhere(model, action, clause);
  }
}
