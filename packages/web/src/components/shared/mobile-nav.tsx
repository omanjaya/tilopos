import { Home, ClipboardList, Package, Menu, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cart.store';

/**
 * MobileNav Component
 *
 * Bottom navigation bar for mobile devices.
 * Displays 4 primary navigation items + hamburger menu for secondary items.
 *
 * Features:
 * - Persistent cart badge
 * - Touch-friendly targets (min 48px)
 * - Active state indication
 * - Slide-out menu for secondary navigation
 *
 * @example
 * ```tsx
 * <ShowOn mobile>
 *   <MobileNav />
 * </ShowOn>
 * ```
 */

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

const primaryNavItems: NavItem[] = [
  { label: 'Beranda', icon: Home, path: '/app' },
  { label: 'Pesanan', icon: ClipboardList, path: '/app/orders' },
  { label: 'Produk', icon: Package, path: '/app/products' },
];

const secondaryNavItems = [
  { label: 'Pelanggan', path: '/app/customers' },
  { label: 'Karyawan', path: '/app/employees' },
  { label: 'Transaksi', path: '/app/transactions' },
  { label: 'Meja', path: '/app/tables' },
  { label: 'Shift Kasir', path: '/app/shifts' },
  { label: 'Laporan', path: '/app/reports' },
  { label: 'Pengaturan', path: '/app/settings/business' },
];

export function MobileNav() {
  const location = useLocation();
  const { items } = useCartStore();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {/* Primary Nav Items */}
        {primaryNavItems.map((item) => (
          <NavButton
            key={item.path}
            {...item}
            active={isActive(item.path)}
          />
        ))}

        {/* POS Cart Button */}
        <Link
          to="/pos"
          className={cn(
            'flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-lg transition-colors relative',
            location.pathname === '/pos'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={`POS Terminal${cartItemCount > 0 ? ` (${cartItemCount} item)` : ''}`}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs font-medium">POS</span>
          {cartItemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-0 right-1 h-5 min-w-5 flex items-center justify-center p-1 text-xs"
              aria-live="polite"
            >
              {cartItemCount}
            </Badge>
          )}
        </Link>

        {/* More Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Menu lainnya"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">Lainnya</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Akses fitur lainnya dari TiloPOS
              </SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
            <div className="space-y-1">
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

/**
 * NavButton Component
 * Individual navigation button with active state
 */
interface NavButtonProps extends NavItem {
  active: boolean;
}

function NavButton({ label, icon: Icon, path, active, badge }: NavButtonProps) {
  return (
    <Link
      to={path}
      className={cn(
        'flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-lg transition-colors relative',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-xs font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge
          variant="destructive"
          className="absolute top-0 right-1 h-5 min-w-5 flex items-center justify-center p-1 text-xs"
        >
          {badge}
        </Badge>
      )}
    </Link>
  );
}

/**
 * MobileNavSpacer
 *
 * Adds bottom padding to page content to prevent overlap with fixed mobile nav.
 * Use this at the end of your page content when MobileNav is visible.
 *
 * @example
 * ```tsx
 * <div>
 *   <PageContent />
 *   <MobileNavSpacer />
 * </div>
 * ```
 */
export function MobileNavSpacer() {
  return <div className="h-16" aria-hidden="true" />;
}
