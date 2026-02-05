import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import {
  LayoutDashboard, Package, Users, UserRound, ChevronLeft, ShoppingCart,
  Receipt, BarChart3, Warehouse, ArrowLeftRight, Truck, ClipboardList,
  UtensilsCrossed, MonitorPlay, Clock, CalendarDays, Tag, Heart,
  FlaskConical, Globe, QrCode, ScrollText, Settings, Building2, Monitor, Bell,
  Banknote, Ticket, Filter, Calculator, Printer, ListPlus,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

// Collect all nav paths to detect which need `end` (exact match only)
function buildExactMatchSet(sections: NavSection[]): Set<string> {
  const allPaths = sections.flatMap((s) => s.items.map((i) => i.to));
  const needsEnd = new Set<string>();
  for (const p of allPaths) {
    for (const other of allPaths) {
      if (other !== p && other.startsWith(p + '/')) {
        needsEnd.add(p);
        break;
      }
    }
  }
  return needsEnd;
}

const navSections: NavSection[] = [
  {
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/pos', label: 'POS Terminal', icon: ShoppingCart, external: true },
      { to: '/kds', label: 'Kitchen Display', icon: MonitorPlay, external: true },
    ],
  },
  {
    title: 'Penjualan',
    items: [
      { to: '/app/transactions', label: 'Transaksi', icon: Receipt },
      { to: '/app/orders', label: 'Pesanan', icon: UtensilsCrossed },
      { to: '/app/tables', label: 'Meja', icon: CalendarDays },
      { to: '/app/waiting-list', label: 'Daftar Tunggu', icon: ListPlus },
      { to: '/app/shifts', label: 'Shift', icon: Clock },
      { to: '/app/settlements', label: 'Penyelesaian', icon: Banknote },
    ],
  },
  {
    title: 'Katalog',
    items: [
      { to: '/app/products', label: 'Produk', icon: Package },
      { to: '/app/ingredients', label: 'Bahan Baku', icon: FlaskConical },
    ],
  },
  {
    title: 'Inventori',
    items: [
      { to: '/app/inventory/stock', label: 'Stok', icon: Warehouse },
      { to: '/app/inventory/transfers', label: 'Transfer', icon: ArrowLeftRight },
      { to: '/app/inventory/suppliers', label: 'Supplier', icon: Truck },
      { to: '/app/inventory/purchase-orders', label: 'Purchase Order', icon: ClipboardList },
    ],
  },
  {
    title: 'Pemasaran',
    items: [
      { to: '/app/promotions', label: 'Promosi', icon: Tag },
      { to: '/app/promotions/vouchers', label: 'Voucher', icon: Ticket },
      { to: '/app/loyalty', label: 'Loyalty', icon: Heart },
      { to: '/app/online-store', label: 'Toko Online', icon: Globe },
      { to: '/app/self-order', label: 'Self Order', icon: QrCode },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { to: '/app/employees', label: 'Karyawan', icon: Users },
      { to: '/app/customers', label: 'Pelanggan', icon: UserRound },
      { to: '/app/customers/segments', label: 'Segmen', icon: Filter },
      { to: '/app/reports', label: 'Laporan', icon: BarChart3 },
      { to: '/app/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      { to: '/app/settings/business', label: 'Bisnis', icon: Settings },
      { to: '/app/settings/outlets', label: 'Outlet', icon: Building2 },
      { to: '/app/settings/devices', label: 'Perangkat', icon: Monitor },
      { to: '/app/settings/notifications', label: 'Notifikasi', icon: Bell },
      { to: '/app/settings/tax', label: 'Pajak', icon: Calculator },
      { to: '/app/settings/receipt', label: 'Struk', icon: Printer },
      { to: '/app/settings/hours', label: 'Jam Operasional', icon: Clock },
      { to: '/app/settings/modifiers', label: 'Modifier', icon: ListPlus },
    ],
  },
];

const exactMatchPaths = buildExactMatchSet(navSections);

// Premium Nav Item Component
function PremiumNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app' || exactMatchPaths.has(item.to)}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2',
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
              isActive
                ? 'bg-white/20'
                : 'bg-transparent group-hover:bg-primary/10',
              collapsed && 'h-9 w-9'
            )}
          >
            <item.icon
              className={cn(
                'transition-all',
                isActive ? 'h-[18px] w-[18px]' : 'h-[18px] w-[18px] group-hover:scale-110'
              )}
            />
          </div>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Header */}
      <div className={cn('flex h-16 items-center border-b px-4', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-400 shadow-lg shadow-primary/25">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              TILO
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-400 shadow-lg shadow-primary/25">
            <span className="text-lg font-bold text-white">T</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn('h-8 w-8 rounded-lg', collapsed && 'absolute -right-3 top-5 h-6 w-6 border bg-card shadow-sm')}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {navSections.map((section, idx) => (
          <div key={idx} className={cn(idx > 0 && 'mt-6')}>
            {section.title && !collapsed && (
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {section.title}
              </div>
            )}
            {collapsed && idx > 0 && <div className="mx-2 mb-3 border-t" />}
            <div className="space-y-1">
              {section.items.map((item) => (
                <PremiumNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="rounded-xl bg-gradient-to-r from-primary/5 to-blue-500/5 p-3">
            <p className="text-xs font-medium text-primary">Pro Tip 💡</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tekan <kbd className="rounded bg-muted px-1 font-mono text-[10px]">⌘K</kbd> untuk quick search
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
