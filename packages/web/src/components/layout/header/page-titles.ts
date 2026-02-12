/** Mapping path → page title for the header bar */
const PAGE_TITLES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/dashboard/owner': 'Dashboard Owner',
  '/app/transactions': 'Transaksi',
  '/app/settlements': 'Penyelesaian',
  '/app/credit-sales': 'Penjualan Kredit',
  '/app/orders': 'Pesanan',
  '/app/tables': 'Meja',
  '/app/waiting-list': 'Daftar Tunggu',
  '/app/shifts': 'Shift',
  '/app/products': 'Produk',
  '/app/products/new': 'Tambah Produk',
  '/app/ingredients': 'Bahan Baku',
  '/app/inventory/stock': 'Stok',
  '/app/inventory/transfers': 'Transfer Stok',
  '/app/inventory/transfers/dashboard': 'Dashboard Transfer',
  '/app/inventory/suppliers': 'Supplier',
  '/app/inventory/purchase-orders': 'Purchase Order',
  '/app/inventory/price-tiers': 'Harga Bertingkat',
  '/app/inventory/unit-conversion': 'Konversi Satuan',
  '/app/inventory/batch-tracking': 'Batch & Expiry',
  '/app/inventory/serial-numbers': 'Serial Number',
  '/app/inventory/product-assignment': 'Produk per Outlet',
  '/app/customers': 'Pelanggan',
  '/app/customers/new': 'Tambah Pelanggan',
  '/app/customers/segments': 'Segmen Pelanggan',
  '/app/employees': 'Karyawan',
  '/app/employees/new': 'Tambah Karyawan',
  '/app/invoices': 'Invoice',
  '/app/reports': 'Laporan',
  '/app/reports/sales': 'Laporan Penjualan',
  '/app/settings': 'Pengaturan',
  '/app/settings/business': 'Pengaturan Bisnis',
  '/app/settings/outlets': 'Pengaturan Outlet',
  '/app/settings/devices': 'Pengaturan Perangkat',
  '/app/settings/notifications': 'Notifikasi',
  '/app/settings/tax': 'Pengaturan Pajak',
  '/app/settings/receipt': 'Template Struk',
  '/app/settings/hours': 'Jam Operasional',
  '/app/settings/modifiers': 'Modifier Produk',
  '/app/settings/business-type': 'Tipe Bisnis',
  '/app/settings/features': 'Fitur',
  '/app/settings/appearance': 'Tampilan',
  '/app/settings/payments': 'Pengaturan Pembayaran',
  '/app/settings/printers': 'Pengaturan Printer',
  '/app/settings/report-schedule': 'Jadwal Laporan',
  '/app/profile': 'Profil Saya',
  '/app/promotions': 'Promosi',
  '/app/promotions/new': 'Tambah Promosi',
  '/app/promotions/vouchers': 'Generator Voucher',
  '/app/loyalty': 'Loyalty',
  '/app/online-store': 'Toko Online',
  '/app/self-order': 'Self Order',
  '/app/appointments': 'Janji Temu',
  '/app/work-orders': 'Work Order',
  '/app/item-tracking': 'Tracking Barang',
  '/app/import': 'Import Data',
  '/app/audit': 'Audit Log',
  '/app/help': 'Bantuan',
  '/app/help/tutorials': 'Tutorial',
};

export function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  // Dynamic route patterns (e.g., /app/products/123/edit → "Edit Produk")
  const dynamicPatterns: [RegExp, string][] = [
    [/^\/app\/products\/[^/]+\/edit$/, 'Edit Produk'],
    [/^\/app\/employees\/[^/]+\/edit$/, 'Edit Karyawan'],
    [/^\/app\/customers\/[^/]+\/edit$/, 'Edit Pelanggan'],
    [/^\/app\/transactions\/[^/]+$/, 'Detail Transaksi'],
    [/^\/app\/orders\/[^/]+$/, 'Detail Pesanan'],
    [/^\/app\/inventory\/transfers\/[^/]+$/, 'Detail Transfer'],
    [/^\/app\/promotions\/[^/]+\/edit$/, 'Edit Promosi'],
  ];
  for (const [pattern, title] of dynamicPatterns) {
    if (pattern.test(pathname)) return title;
  }

  // Prefix match (e.g., /app/settings/business → "Pengaturan Bisnis")
  const segments = pathname.split('/');
  while (segments.length > 2) {
    segments.pop();
    const parent = segments.join('/');
    if (PAGE_TITLES[parent]) return PAGE_TITLES[parent];
  }
  return 'Dashboard';
}
