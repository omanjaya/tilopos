import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';

interface BreadcrumbProps {
  /** Optional custom breadcrumbs. If not provided, auto-generates from route. */
  items?: BreadcrumbItem[];
  /** Custom className for the nav element. */
  className?: string;
  /** Maximum number of breadcrumbs to show before collapsing with ellipsis. Default: 4. */
  maxVisible?: number;
  /** Home icon instead of text. Default: true. */
  showHomeIcon?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  /** If true, this item is not clickable. */
  current?: boolean;
}

/**
 * Breadcrumb labels mapping for route segments.
 * Add new entries as needed for custom page titles.
 */
const BREADCRUMB_LABELS: Record<string, string> = {
  app: 'Dashboard',
  pos: 'POS',
  products: 'Products',
  inventory: 'Inventory',
  orders: 'Orders',
  customers: 'Customers',
  employees: 'Employees',
  reports: 'Reports',
  settings: 'Settings',
  profile: 'Profile',
  help: 'Help',
  new: 'New',
  edit: 'Edit',
  create: 'Create',
  transfers: 'Stock Transfers',
  adjustments: 'Stock Adjustments',
  purchase: 'Purchase Orders',
  suppliers: 'Suppliers',
  categories: 'Categories',
  discounts: 'Discounts',
  taxes: 'Taxes',
  outlets: 'Outlets',
  shifts: 'Shifts',
  settlements: 'Settlements',
  loyalty: 'Loyalty',
  promotions: 'Promotions',
  vouchers: 'Vouchers',
  'self-order': 'Self Order',
  'online-store': 'Online Store',
  'kitchen-display': 'Kitchen Display',
  kds: 'KDS',
  tables: 'Tables',
  reservations: 'Reservations',
  integrations: 'Integrations',
  audit: 'Audit Logs',
  notifications: 'Notifications',
  billing: 'Billing',
  subscription: 'Subscription',
  tutorials: 'Tutorials',
  shortcuts: 'Shortcuts',
  faq: 'FAQ',
};

/**
 * Format a route segment into a readable label.
 */
function formatSegment(segment: string): string {
  // Handle dynamic segments (UUIDs, IDs)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return '...';
  }

  // Handle numeric IDs
  if (/^\d+$/.test(segment)) {
    return '...';
  }

  // Use mapped label or convert kebab-case to Title Case
  return BREADCRUMB_LABELS[segment] || segmentToLabel(segment);
}

/**
 * Convert kebab-case or snake_case to Title Case.
 */
function segmentToLabel(segment: string): string {
  return segment
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Auto-generate breadcrumbs from the current route.
 */
function generateBreadcrumbs(location: string): BreadcrumbItem[] {
  const segments = location.split('/').filter(Boolean);

  // Start with Dashboard (app root)
  const items: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      path: '/app',
    },
  ];

  // Build breadcrumb path incrementally
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Skip 'app' segment as we already have Dashboard
    if (segment === 'app') return;

    const isLast = index === segments.length - 1;

    items.push({
      label: formatSegment(segment),
      path: isLast ? undefined : currentPath,
      current: isLast,
    });
  });

  return items;
}

/**
 * Collapse breadcrumbs with ellipsis if too many.
 */
function collapseBreadcrumbs(items: BreadcrumbItem[], maxVisible: number): BreadcrumbItem[] {
  if (items.length <= maxVisible) return items;

  // Always show first (Dashboard) and last 2 items
  const first = items[0];
  const lastTwo = items.slice(-2);

  if (!first) return items;

  return [
    first,
    {
      label: '...',
      path: undefined,
      current: false,
    },
    ...lastTwo,
  ];
}

export function Breadcrumbs({
  items: customItems,
  className,
  maxVisible = 4,
  showHomeIcon = true,
}: BreadcrumbProps) {
  const location = useLocation();

  const items = customItems || generateBreadcrumbs(location.pathname);
  const visibleItems = collapseBreadcrumbs(items, maxVisible);

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx('flex items-center gap-2 text-sm text-muted-foreground', className)}
    >
      {visibleItems.map((item, index) => {
        const isFirst = index === 0;

        return (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            )}

            {item.current || !item.path ? (
              <span
                className={clsx(
                  'font-medium',
                  item.current ? 'text-foreground' : 'text-muted-foreground'
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {isFirst && showHomeIcon ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                ) : (
                    item.label
                )}
              </span>
            ) : (
              <Link
                to={item.path}
                className={clsx(
                  'hover:text-foreground transition-colors',
                  isFirst && showHomeIcon && 'flex items-center gap-1'
                )}
              >
                {isFirst && showHomeIcon ? (
                  <>
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * A hook that generates breadcrumbs for the current route.
 * Useful when you need to customize breadcrumbs programmatically.
 *
 * @example
 * ```tsx
 * function ProductPage() {
 *   const breadcrumbs = useBreadcrumbs();
 *   // Customize the last item with product name from API
 *   const { data: product } = useQuery(...);
 *
 *   const customBreadcrumbs = [
 *     ...breadcrumbs.slice(0, -1),
 *     { label: product?.name || 'Product', current: true },
 *   ];
 *
 *   return <Breadcrumbs items={customBreadcrumbs} />;
 * }
 * ```
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  return generateBreadcrumbs(location.pathname);
}

/**
 * Simple breadcrumb separator for custom implementations.
 */
export function BreadcrumbSeparator() {
  return <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

/**
 * Individual breadcrumb item for custom implementations.
 */
export function BreadcrumbItemComponent({
  children,
  current,
  href,
}: {
  children: React.ReactNode;
  current?: boolean;
  href?: string;
}) {
  if (current || !href) {
    return (
      <span className="font-medium text-foreground" aria-current="page">
        {children}
      </span>
    );
  }

  return (
    <Link to={href} className="hover:text-foreground transition-colors">
      {children}
    </Link>
  );
}

/**
 * Breadcrumb list component for fully custom implementations.
 *
 * @example
 * ```tsx
 * <BreadcrumbList>
 *   <BreadcrumbItemComponent href="/app">Dashboard</BreadcrumbItemComponent>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItemComponent href="/app/products">Products</BreadcrumbItemComponent>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItemComponent current>Edit Product</BreadcrumbItemComponent>
 * </BreadcrumbList>
 * ```
 */
export function BreadcrumbList({ children }: { children: React.ReactNode }) {
  return <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">{children}</nav>;
}
