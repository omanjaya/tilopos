import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPageTitle } from '@/components/layout/header/page-titles';

/**
 * Breadcrumb props
 */
interface BreadcrumbProps {
  className?: string;
  homePath?: string;
  homeLabel?: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

/**
 * Parse URL path into breadcrumb items
 */
function parseBreadcrumb(pathname: string, homePath = '/app', homeLabel = 'Dashboard'): BreadcrumbItem[] {
  // Remove leading/trailing slashes and split
  const segments = pathname.split('/').filter(Boolean);

  // Root or empty path
  if (segments.length === 0 || pathname === homePath) {
    return [{ label: homeLabel, path: homePath, isLast: true }];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  // First item is always home/dashboard
  items.push({ label: homeLabel, path: homePath, isLast: false });

  // Build path incrementally
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i] ?? '';
    currentPath += `/${segment}`;

    // Skip if it's the home path (already added)
    if (currentPath === homePath) continue;

    // Try to get page title from PAGE_TITLES
    const title = getPageTitle(currentPath);

    // If no exact match, try to get parent title
    const label = title !== 'Dashboard' ? title : segment;

    // Check if this is the last segment
    const isLast = i === segments.length - 1;

    items.push({ label, path: currentPath, isLast });
  }

  // If there's only home (shouldn't happen with the logic above, but just in case)
  if (items.length === 1 && items[0]?.isLast) {
    return items;
  }

  // Remove duplicate home entry if exists
  if (items.length > 1 && items[0]?.path === homePath && items[1]?.path === homePath) {
    items.shift();
  }

  return items;
}

/**
 * Breadcrumb Component
 *
 * Displays navigation path as clickable links with current page as text.
 *
 * @example
 * ```tsx
 * <Breadcrumb />
 * // Output: Dashboard > Produk > Edit Produk
 * ```
 */
export function Breadcrumb({ className, homePath = '/app', homeLabel = 'Dashboard' }: BreadcrumbProps) {
  const pathname = window.location.pathname;
  const items = parseBreadcrumb(pathname, homePath, homeLabel);

  if (items.length === 1 && items[0]?.isLast) {
    // Single item - just show it without breadcrumb structure
    return (
      <nav aria-label="Breadcrumb" className={className}>
        <span className="text-sm font-medium text-foreground">{items[0]?.label}</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm text-muted-foreground', className)}>
      {items.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && <ChevronRight className="mx-2 h-4 w-4" />}
          {item.isLast ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <NavLink
              to={item.path}
              className="hover:text-foreground transition-colors hover:underline"
            >
              {item.label}
            </NavLink>
          )}
        </div>
      ))}
    </nav>
  );
}
