/** Mapping path → page title for the header bar */
const PAGE_TITLES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/transactions': 'Transaksi',
  '/app/orders': 'Pesanan',
  '/app/tables': 'Meja',
  '/app/shifts': 'Shift',
  '/app/products': 'Produk',
  '/app/inventory': 'Inventori',
  '/app/customers': 'Pelanggan',
  '/app/employees': 'Karyawan',
  '/app/reports': 'Laporan',
  '/app/settings': 'Pengaturan',
  '/app/profile': 'Profil',
  '/app/promotions': 'Promosi',
  '/app/loyalty': 'Loyalty',
  '/app/online-store': 'Toko Online',
  '/app/self-order': 'Self Order',
  '/app/audit': 'Audit Log',
  '/app/help': 'Bantuan',
};

export function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match (e.g., /app/settings/business → "Pengaturan")
  const segments = pathname.split('/');
  while (segments.length > 2) {
    segments.pop();
    const parent = segments.join('/');
    if (PAGE_TITLES[parent]) return PAGE_TITLES[parent];
  }
  return 'Dashboard';
}
