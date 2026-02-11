import {
  LayoutDashboard, Package, Users, UserRound, ShoppingCart,
  Receipt, BarChart3, Warehouse, ArrowLeftRight, Truck, ClipboardList,
  UtensilsCrossed, MonitorPlay, Clock, CalendarDays, Tag, Heart,
  FlaskConical, Globe, QrCode, ScrollText, Settings, Building2, Monitor, Bell,
  Banknote, Ticket, Filter, Calculator, Printer, ListPlus,
  ToggleLeft, Store, TrendingUp, RefreshCw, Calendar, Wrench, Hash,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import type { EmployeeRole } from '@/types/auth.types';

// ── Types ────────────────────────────────────────────────────────────────────

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

export type NavSection = {
  id: string;
  title?: string;
  icon?: LucideIcon;
  items: NavItem[];
  /** Max items to show before "Lihat semua" */
  maxVisible?: number;
};

// ── Role-based access mapping ────────────────────────────────────────────────

/** Paths each role is allowed to see. Empty array = sees everything. */
export const ROLE_ALLOWED_PATHS: Record<EmployeeRole, string[]> = {
  super_admin: [],
  owner: [],
  manager: [],
  supervisor: [
    '/app', '/pos', '/kds',
    '/app/transactions', '/app/orders', '/app/tables', '/app/waiting-list',
    '/app/shifts', '/app/settlements',
    '/app/products', '/app/ingredients',
    '/app/inventory/stock', '/app/inventory/transfers', '/app/inventory/suppliers',
    '/app/inventory/purchase-orders', '/app/inventory/price-tiers',
    '/app/inventory/unit-conversion', '/app/inventory/batch-tracking',
    '/app/inventory/serial-numbers', '/app/inventory/product-assignment',
    '/app/customers', '/app/customers/segments',
    '/app/promotions', '/app/promotions/vouchers', '/app/loyalty',
    '/app/reports', '/app/employees',
    '/app/appointments', '/app/work-orders', '/app/item-tracking',
  ],
  cashier: [
    '/app', '/pos',
    '/app/transactions', '/app/orders', '/app/tables', '/app/shifts',
  ],
  kitchen: [
    '/app', '/kds',
    '/app/orders',
  ],
  inventory: [
    '/app',
    '/app/products', '/app/ingredients',
    '/app/inventory/stock', '/app/inventory/transfers', '/app/inventory/suppliers',
    '/app/inventory/purchase-orders', '/app/inventory/price-tiers',
    '/app/inventory/unit-conversion', '/app/inventory/batch-tracking',
    '/app/inventory/serial-numbers', '/app/inventory/product-assignment',
  ],
};

// ── Navigation structure ─────────────────────────────────────────────────────

export const navSections: NavSection[] = [
  {
    id: 'quick',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/pos', label: 'POS Terminal', icon: ShoppingCart, external: true },
      { to: '/kds', label: 'Kitchen Display', icon: MonitorPlay, external: true },
    ],
  },
  {
    id: 'sales',
    title: 'Penjualan',
    icon: Receipt,
    maxVisible: 4,
    items: [
      { to: '/app/transactions', label: 'Transaksi', icon: Receipt },
      { to: '/app/orders', label: 'Pesanan', icon: UtensilsCrossed },
      { to: '/app/tables', label: 'Meja', icon: CalendarDays },
      { to: '/app/shifts', label: 'Shift', icon: Clock },
      { to: '/app/waiting-list', label: 'Daftar Tunggu', icon: ListPlus },
      { to: '/app/settlements', label: 'Penyelesaian', icon: Banknote },
    ],
  },
  {
    id: 'catalog',
    title: 'Produk & Inventori',
    icon: Package,
    maxVisible: 4,
    items: [
      { to: '/app/products', label: 'Produk', icon: Package },
      { to: '/app/inventory/stock', label: 'Stok', icon: Warehouse },
      { to: '/app/inventory/transfers', label: 'Transfer', icon: ArrowLeftRight },
      { to: '/app/inventory/suppliers', label: 'Supplier', icon: Truck },
      { to: '/app/ingredients', label: 'Bahan Baku', icon: FlaskConical },
      { to: '/app/inventory/purchase-orders', label: 'Purchase Order', icon: ClipboardList },
      { to: '/app/inventory/price-tiers', label: 'Harga Bertingkat', icon: TrendingUp },
      { to: '/app/inventory/unit-conversion', label: 'Konversi Satuan', icon: RefreshCw },
      { to: '/app/inventory/batch-tracking', label: 'Batch & Expiry', icon: Calendar },
      { to: '/app/inventory/serial-numbers', label: 'Serial Number', icon: Hash },
      { to: '/app/inventory/product-assignment', label: 'Produk per Outlet', icon: Store },
    ],
  },
  {
    id: 'customers',
    title: 'Pelanggan',
    icon: UserRound,
    maxVisible: 4,
    items: [
      { to: '/app/customers', label: 'Pelanggan', icon: UserRound },
      { to: '/app/promotions', label: 'Promosi', icon: Tag },
      { to: '/app/loyalty', label: 'Loyalty', icon: Heart },
      { to: '/app/online-store', label: 'Toko Online', icon: Globe },
      { to: '/app/customers/segments', label: 'Segmen', icon: Filter },
      { to: '/app/promotions/vouchers', label: 'Voucher', icon: Ticket },
      { to: '/app/self-order', label: 'Self Order', icon: QrCode },
      { to: '/app/appointments', label: 'Appointment', icon: CalendarDays },
      { to: '/app/work-orders', label: 'Work Order', icon: Wrench },
      { to: '/app/item-tracking', label: 'Item Tracking', icon: Package },
    ],
  },
  {
    id: 'reports',
    title: 'Laporan & Tim',
    icon: BarChart3,
    items: [
      { to: '/app/reports', label: 'Laporan', icon: BarChart3 },
      { to: '/app/employees', label: 'Karyawan', icon: Users },
      { to: '/app/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    id: 'settings',
    title: 'Pengaturan',
    icon: Settings,
    items: [
      { to: '/app/settings/business', label: 'Pengaturan', icon: Settings },
    ],
  },
];

export const settingsItems: NavItem[] = [
  { to: '/app/settings/business', label: 'Bisnis', icon: Settings },
  { to: '/app/settings/outlets', label: 'Outlet', icon: Building2 },
  { to: '/app/settings/devices', label: 'Perangkat', icon: Monitor },
  { to: '/app/settings/notifications', label: 'Notifikasi', icon: Bell },
  { to: '/app/settings/tax', label: 'Pajak', icon: Calculator },
  { to: '/app/settings/receipt', label: 'Struk', icon: Printer },
  { to: '/app/settings/hours', label: 'Jam Operasional', icon: Clock },
  { to: '/app/settings/modifiers', label: 'Modifier', icon: ListPlus },
  { to: '/app/settings/business-type', label: 'Tipe Bisnis', icon: Store },
  { to: '/app/settings/features', label: 'Fitur', icon: ToggleLeft },
  { to: '/app/settings/appearance', label: 'Tampilan', icon: Palette },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Collect all nav paths to detect which need `end` (exact match only) */
function buildExactMatchSet(sections: NavSection[]): Set<string> {
  const allPaths = [
    ...sections.flatMap((s) => s.items.map((i) => i.to)),
    ...settingsItems.map((i) => i.to),
  ];
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

export const exactMatchPaths = buildExactMatchSet(navSections);

// Lookup: path → NavItem
const allNavItems: NavItem[] = [
  ...navSections.flatMap((s) => s.items),
  ...settingsItems,
];

export const navItemMap = new Map<string, NavItem>(allNavItems.map((i) => [i.to, i]));

// ── Pinned / Favorites ───────────────────────────────────────────────────────

export const MAX_PINS = 5;
const PINS_STORAGE_KEY = 'sidebar_pinned_items';

export const DEFAULT_PINS_BY_ROLE: Partial<Record<EmployeeRole, string[]>> = {
  cashier: ['/pos', '/app/transactions'],
  kitchen: ['/kds'],
  inventory: ['/app/products', '/app/inventory/stock'],
  supervisor: ['/app', '/app/reports', '/app/products'],
  manager: ['/app', '/app/reports', '/app/products'],
  owner: ['/app', '/app/reports', '/app/employees'],
  super_admin: ['/app', '/app/reports', '/app/employees'],
};

export function loadPinnedItems(role: EmployeeRole): string[] {
  const saved = localStorage.getItem(PINS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_PINS);
    } catch { /* ignore */ }
  }
  return DEFAULT_PINS_BY_ROLE[role] ?? [];
}

export function savePinnedItems(items: string[]) {
  localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(items));
}

// ── Role label mapping ───────────────────────────────────────────────────────

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Kasir',
  kitchen: 'Dapur',
  inventory: 'Inventori',
};
