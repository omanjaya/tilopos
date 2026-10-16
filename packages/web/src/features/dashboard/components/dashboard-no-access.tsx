import { Link } from 'react-router-dom';
import { ShoppingCart, ChefHat, Package, Clock, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { canAccessPath } from '@/config/permissions';

const QUICK_LINKS = [
  { to: '/pos', label: 'Buka Kasir (POS)', icon: ShoppingCart },
  { to: '/kds', label: 'Layar Dapur (KDS)', icon: ChefHat },
  { to: '/app/inventory/stock', label: 'Stok Barang', icon: Package },
  { to: '/app/shifts', label: 'Shift Saya', icon: Clock },
  { to: '/app/profile', label: 'Profil Saya', icon: UserCircle },
];

/**
 * Shown on the dashboard for roles without report access (cashier, kitchen,
 * inventory) instead of KPI cards filled with Rp 0.
 */
export function DashboardNoAccess() {
  const user = useAuthStore((s) => s.user);
  const links = QUICK_LINKS.filter((l) => canAccessPath(user?.role, l.to));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Halo, {user?.name?.split(' ')[0] ?? 'Tim'}</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan penjualan hanya tersedia untuk supervisor, manajer dan pemilik. Pilih menu kerja Anda:
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
