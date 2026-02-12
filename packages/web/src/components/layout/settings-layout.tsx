import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  Settings, Building2, Monitor, Bell, Calculator, Printer,
  Clock, ListPlus, Store, ToggleLeft, Palette, CreditCard, CalendarClock,
  type LucideIcon,
} from 'lucide-react';

interface SettingsNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

interface SettingsNavGroup {
  title: string;
  items: SettingsNavItem[];
}

const settingsGroups: SettingsNavGroup[] = [
  {
    title: 'Umum',
    items: [
      { to: '/app/settings/business', label: 'Bisnis', icon: Settings, roles: ['owner', 'super_admin'] },
      { to: '/app/settings/outlets', label: 'Outlet', icon: Building2 },
      { to: '/app/settings/business-type', label: 'Tipe Bisnis', icon: Store, roles: ['owner', 'super_admin'] },
      { to: '/app/settings/hours', label: 'Jam Operasional', icon: Clock },
    ],
  },
  {
    title: 'Produk & Penjualan',
    items: [
      { to: '/app/settings/tax', label: 'Pajak', icon: Calculator, roles: ['owner', 'super_admin'] },
      { to: '/app/settings/modifiers', label: 'Modifier', icon: ListPlus },
      { to: '/app/settings/features', label: 'Fitur', icon: ToggleLeft, roles: ['owner', 'super_admin'] },
      { to: '/app/settings/receipt', label: 'Struk', icon: Printer },
      { to: '/app/settings/payments', label: 'Pembayaran', icon: CreditCard, roles: ['owner', 'super_admin'] },
    ],
  },
  {
    title: 'Perangkat',
    items: [
      { to: '/app/settings/devices', label: 'Perangkat', icon: Monitor },
      { to: '/app/settings/printers', label: 'Printer', icon: Printer },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { to: '/app/settings/notifications', label: 'Notifikasi', icon: Bell },
      { to: '/app/settings/appearance', label: 'Tampilan', icon: Palette },
      { to: '/app/settings/report-schedule', label: 'Jadwal Laporan', icon: CalendarClock, roles: ['owner', 'super_admin'] },
    ],
  },
];

export function SettingsLayout() {
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role ?? 'cashier';

  const visibleGroups = settingsGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex gap-8">
      {/* Settings sidebar */}
      <nav className="hidden w-52 shrink-0 lg:block">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Pengaturan</h2>
        <div className="space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Settings content */}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
