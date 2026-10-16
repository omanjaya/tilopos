/**
 * Single source of truth for who may open which page / use which action
 * (Docs/ENGINEERING-RULES.md F3). Values must match the backend @Roles() of the
 * endpoints each page calls — the backend enforces, the frontend mirrors it so
 * users never land on a page that only returns 403.
 *
 * super_admin and owner pass every check except PLATFORM-only ones, matching
 * backend RolesGuard.
 *
 * Consumers: RoleGuard (routes), sidebar, mobile nav, command palette,
 * settings layout, header menu, and in-page action buttons (via `can`).
 */
export type Role =
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'supervisor'
  | 'cashier'
  | 'kitchen'
  | 'inventory';

export const ROLES = {
  PLATFORM: ['super_admin'],
  OWNER: ['super_admin', 'owner'],
  MANAGEMENT: ['super_admin', 'owner', 'manager'],
  SUPERVISION: ['super_admin', 'owner', 'manager', 'supervisor'],
  FRONT_OF_HOUSE: ['super_admin', 'owner', 'manager', 'supervisor', 'cashier'],
  KITCHEN: ['super_admin', 'owner', 'manager', 'supervisor', 'kitchen'],
  STOCK: ['super_admin', 'owner', 'manager', 'inventory'],
  /** Stock counting: stock-opname detail/items also allow supervisor. */
  STOCK_COUNT: ['super_admin', 'owner', 'manager', 'supervisor', 'inventory'],
  /** Content uploads: POST /uploads/image allows owner, manager, supervisor, inventory. */
  CONTENT: ['super_admin', 'owner', 'manager', 'supervisor', 'inventory'],
  ALL: ['super_admin', 'owner', 'manager', 'supervisor', 'cashier', 'kitchen', 'inventory'],
} as const satisfies Record<string, readonly Role[]>;

export type RoleGroup = keyof typeof ROLES;

/**
 * Page access by path under /app (without the /app prefix; `pos` and `kds`
 * are the fullscreen top-level routes). Keys may contain `:param` segments.
 * The most specific matching key wins; unlisted paths are open to every
 * authenticated role.
 *
 * Source: backend @Roles of the endpoints each page loads
 * (packages/backend/src/modules/**\/*.controller.ts).
 */
export const ROUTE_ROLES: Record<string, RoleGroup> = {
  // Fullscreen apps
  pos: 'FRONT_OF_HOUSE', // POST /pos/transactions: cashier,supervisor,manager,owner
  kds: 'KITCHEN', // KDS is for kitchen staff and their supervisors

  // Dashboards
  'dashboard/owner': 'OWNER', // /owner/analytics/*: owner,super_admin

  // Catalog — list reads are open, writes are @Roles(manager,owner,inventory)
  'products/new': 'STOCK',
  'products/:id/edit': 'STOCK',
  'bundle-packages': 'SUPERVISION', // GET /bundle-packages: owner,manager,supervisor
  'bundle-packages/new': 'MANAGEMENT', // POST/PUT: owner,manager
  'bundle-packages/:id/edit': 'MANAGEMENT',
  ingredients: 'STOCK', // POST/PUT /ingredients: manager,owner,inventory

  // People
  employees: 'MANAGEMENT', // GET /employees: manager,owner
  customers: 'FRONT_OF_HOUSE', // customer PII: not for kitchen/inventory staff
  'customers/new': 'FRONT_OF_HOUSE', // POST /customers: owner,manager,supervisor,cashier (POS quick-add)
  'customers/:id/edit': 'SUPERVISION', // PUT /customers/:id: owner,manager,supervisor
  'customers/segments': 'SUPERVISION', // GET /customers/segments: owner,manager,supervisor

  // Sales
  transactions: 'FRONT_OF_HOUSE', // GET /pos/transactions: cashier..owner
  settlements: 'MANAGEMENT', // SettlementsController: owner,manager
  invoices: 'SUPERVISION', // /reports/invoices*: owner,manager,supervisor
  'credit-sales': 'FRONT_OF_HOUSE', // CreditController: cashier,supervisor,manager,owner
  reports: 'SUPERVISION', // /reports/*: owner,manager,supervisor

  // Inventory — writes are @Roles(manager,owner,inventory)
  inventory: 'STOCK',
  'inventory/product-assignment': 'MANAGEMENT', // assign/unassign: manager,owner
  'inventory/price-tiers': 'MANAGEMENT', // price tiers change selling prices: manager,owner
  'inventory/stock-opname/:id': 'STOCK_COUNT', // GET/PATCH items also allow supervisor
  // POST /stock-transfers and PUT :id/receive allow supervisor; list/detail GETs are open.
  // Approve/ship buttons are gated in-page (transfers.approve / transfers.ship).
  'inventory/transfers': 'STOCK_COUNT',
  import: 'STOCK', // product import: manager,owner,inventory (customer import: MANAGEMENT)

  // Operations
  orders: 'FRONT_OF_HOUSE',
  tables: 'FRONT_OF_HOUSE',
  'waiting-list': 'FRONT_OF_HOUSE',
  shifts: 'FRONT_OF_HOUSE', // shift open/close is for cashier-side roles
  appointments: 'FRONT_OF_HOUSE',
  'work-orders': 'FRONT_OF_HOUSE',
  'item-tracking': 'FRONT_OF_HOUSE',

  // Marketing
  promotions: 'FRONT_OF_HOUSE', // GET /promotions: any role (cashier looks up promos)
  'promotions/new': 'MANAGEMENT', // POST/PUT/DELETE /promotions: manager,owner
  'promotions/:id/edit': 'MANAGEMENT',
  'promotions/vouchers': 'MANAGEMENT', // POST /promotions/vouchers/generate: manager,owner
  loyalty: 'MANAGEMENT', // /settings/loyalty*, /loyalty/analytics: owner,manager
  'online-store': 'MANAGEMENT', // settings/sync/analytics: owner,manager
  'self-order': 'MANAGEMENT',

  // Admin
  audit: 'MANAGEMENT', // AuditController: owner,manager
  subscription: 'MANAGEMENT', // GET /subscription(+/invoices): owner,manager; upgrade/cancel: owner
  settings: 'MANAGEMENT', // SettingsController / FeatureController: owner,manager
  'settings/billing': 'MANAGEMENT',
};

/**
 * In-page actions whose backend @Roles is narrower than the page itself.
 * Use `can(role, 'customers.write')` / `useCan('customers.write')` to hide
 * buttons the user cannot use.
 */
export const ACTION_ROLES = {
  'products.write': 'STOCK',
  'products.delete': 'MANAGEMENT',
  'variants.write': 'STOCK', // POST/PUT/DELETE /inventory/products/:id/variants: owner,manager,inventory
  'categories.write': 'MANAGEMENT', // POST/PUT/DELETE /inventory/categories: owner,manager
  'stock.adjust': 'STOCK', // POST /inventory/stock/adjust: owner,manager,inventory
  'uploads.image': 'CONTENT', // POST /uploads/image: owner,manager,supervisor,inventory
  'appointments.cancel': 'SUPERVISION', // PUT /appointments/:id/cancel, status 'cancelled': supervisor+
  'workOrders.supervise': 'SUPERVISION', // DELETE work-order items, finalCost changes: supervisor+
  'bundles.write': 'MANAGEMENT',
  'customers.create': 'FRONT_OF_HOUSE', // POST /customers: owner,manager,supervisor,cashier
  'customers.write': 'SUPERVISION', // PUT/DELETE /customers/:id: owner,manager,supervisor
  'loyalty.earnRedeem': 'SUPERVISION', // POST /customers/:id/loyalty/earn|redeem: owner,manager,supervisor
  'customers.import': 'MANAGEMENT',
  'customers.export': 'MANAGEMENT',
  'promotions.write': 'MANAGEMENT',
  'vouchers.generate': 'MANAGEMENT',
  'subscription.manage': 'OWNER',
  'settings.view': 'MANAGEMENT',
  'outlets.switch': 'MANAGEMENT', // GET /settings/outlets: owner,manager
  'features.read': 'MANAGEMENT', // GET /business/features: owner,manager
  'onboarding.manage': 'MANAGEMENT', // /onboarding/progress|dismiss, /templates(apply): owner,manager
  'onboarding.setup': 'OWNER', // POST /onboarding/setup (guided setup wizard): owner
  'businessType.migrate': 'OWNER', // PUT /business/type: owner
  'business.edit': 'OWNER', // PUT /settings/business: owner
  'outlets.manage': 'OWNER', // POST/DELETE /settings/outlets, PUT isActive: owner
  'notifications.manage': 'MANAGEMENT', // POST/PUT /notifications/settings: owner,manager
  'reports.financial': 'MANAGEMENT', // GET /reports/financial: owner,manager
  'orders.delete': 'SUPERVISION', // DELETE /orders/:id: supervisor,manager,owner
  'tables.manage': 'SUPERVISION', // POST/PUT /tables: supervisor,manager,owner
  'tables.delete': 'MANAGEMENT', // DELETE /tables/:id: manager,owner
  'waitingList.delete': 'SUPERVISION', // DELETE /waiting-list/:id: supervisor,manager,owner
  'refunds.process': 'SUPERVISION', // POST /pos/refunds, /pos/void: supervisor,manager,owner
  'transfers.approve': 'MANAGEMENT', // PUT /stock-transfers/:id/approve: owner,manager
  'transfers.ship': 'STOCK', // PUT /stock-transfers/:id/ship: owner,manager,inventory
  'transfers.receive': 'STOCK_COUNT', // POST /stock-transfers, PUT :id/receive: owner,manager,supervisor,inventory
  'purchaseOrders.approve': 'MANAGEMENT', // PUT /suppliers/purchase-orders/:id/approve|reject: owner,manager
  'stockOpname.complete': 'MANAGEMENT', // POST /inventory/stock-opname/:id/complete|cancel: owner,manager
  'reports.view': 'SUPERVISION',
  'ingredients.delete': 'MANAGEMENT',
  'ingredients.recipes': 'MANAGEMENT',
} as const satisfies Record<string, RoleGroup>;

export type Action = keyof typeof ACTION_ROLES;

export function hasRole(role: string | undefined, group: RoleGroup): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  if (role === 'owner' && group !== 'PLATFORM') return true;
  return (ROLES[group] as readonly string[]).includes(role);
}

export function can(role: string | undefined, action: Action): boolean {
  return hasRole(role, ACTION_ROLES[action]);
}

function normalize(path: string): string {
  const withoutQuery = path.split(/[?#]/)[0] ?? '';
  return withoutQuery.replace(/^\/app(?=\/|$)/, '').replace(/^\/+/, '').replace(/\/+$/, '');
}

/** How many segments of `key` match the start of `segments`; -1 if it doesn't. */
function matchLength(key: string, segments: string[]): number {
  const keySegs = key.split('/');
  if (keySegs.length > segments.length) return -1;
  for (let i = 0; i < keySegs.length; i++) {
    const k = keySegs[i];
    if (k === undefined || k.startsWith(':')) continue;
    if (k !== segments[i]) return -1;
  }
  return keySegs.length;
}

/** Role group required for a path, or undefined when open to all roles. */
export function roleGroupForPath(path: string): RoleGroup | undefined {
  const clean = normalize(path);
  if (!clean) return undefined;
  const segments = clean.split('/');
  let bestKey: string | undefined;
  let bestLen = -1;
  let bestStatic = -1;
  for (const key of Object.keys(ROUTE_ROLES)) {
    const len = matchLength(key, segments);
    if (len < 0) continue;
    const statics = key.split('/').filter((s) => !s.startsWith(':')).length;
    if (len > bestLen || (len === bestLen && statics > bestStatic)) {
      bestKey = key;
      bestLen = len;
      bestStatic = statics;
    }
  }
  return bestKey ? ROUTE_ROLES[bestKey] : undefined;
}

export function canAccessPath(role: string | undefined, path: string): boolean {
  const group = roleGroupForPath(path);
  return group ? hasRole(role, group) : !!role;
}

/** Where a role lands after login / when opening /app. */
export function homePathForRole(role: string | undefined): string {
  switch (role) {
    case 'cashier':
      return '/pos';
    case 'kitchen':
      return '/kds';
    case 'inventory':
      return '/app/inventory/stock';
    default:
      return '/app';
  }
}

/** Mirrors backend shared/constants/roles.ts ROLE_HIERARCHY. */
export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 7,
  owner: 6,
  manager: 5,
  supervisor: 4,
  cashier: 2,
  kitchen: 1,
  inventory: 1,
};

/**
 * Mirrors backend canManageRole: a user may create/edit/delete or assign only
 * roles strictly below their own.
 */
export function canManageRole(callerRole: string | undefined, targetRole: string | undefined): boolean {
  const caller = ROLE_HIERARCHY[callerRole as Role] ?? 0;
  const target = ROLE_HIERARCHY[targetRole as Role] ?? 0;
  return caller > target;
}
