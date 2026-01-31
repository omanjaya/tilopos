import 'shepherd.js/dist/css/shepherd.css';

interface TourConfig {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
}

interface TourStep {
  id: string;
  title: string;
  text: string;
  attachTo?: {
    element: string;
    on: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  };
  buttons?: Array<{
    text?: string;
    action?: () => void;
    classes?: string;
    secondary?: boolean;
  }>;
  advanceOn?: {
    selector: string;
    event: string;
  };
}

export const tours: Record<string, TourConfig> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard Tour',
    description: 'Pelajari cara menggunakan Dashboard untuk memantau bisnis Anda',
    steps: [
      {
        id: 'dashboard-metrics',
        title: 'Metrik Hari Ini',
        text: 'Lihat ringkasan penjualan hari ini, jumlah transaksi, dan rata-rata nilai order dalam kartu metrik ini.',
        attachTo: {
          element: '[data-tour="dashboard-metrics"]',
          on: 'bottom',
        },
      },
      {
        id: 'dashboard-chart',
        title: 'Grafik Penjualan',
        text: 'Pantau tren penjualan dengan grafik interaktif. Klik tombol filter untuk mengubah rentang tanggal.',
        attachTo: {
          element: '[data-tour="dashboard-chart"]',
          on: 'bottom',
        },
      },
      {
        id: 'dashboard-outlet-selector',
        title: 'Selector Outlet',
        text: 'Jika Anda memiliki multiple outlet, gunakan dropdown ini untuk berpindah antar outlet.',
        attachTo: {
          element: '[data-tour="outlet-selector"]',
          on: 'bottom',
        },
      },
      {
        id: 'dashboard-navigation',
        title: 'Navigasi Sidebar',
        text: 'Akses semua fitur TILO dari menu sidebar. Klik untuk melihat fitur-fitur yang tersedia.',
        attachTo: {
          element: '[data-tour="sidebar"]',
          on: 'right',
        },
      },
      {
        id: 'dashboard-quick-actions',
        title: 'Aksi Cepat',
        text: 'Tombol aksi cepat untuk memulai transaksi baru atau membuka fitur yang sering digunakan.',
        attachTo: {
          element: '[data-tour="quick-actions"]',
          on: 'bottom',
        },
      },
      {
        id: 'dashboard-shortcuts',
        title: 'Keyboard Shortcuts',
        text: 'Tekan ⌘K (Mac) atau Ctrl+K (Windows) kapan saja untuk membuka Command Palette dan akses fitur dengan cepat.',
        attachTo: {
          element: '[data-tour="header"]',
          on: 'bottom',
        },
      },
    ],
  },
  pos: {
    id: 'pos',
    title: 'POS Terminal Tour',
    description: 'Pelajari cara memproses transaksi dengan cepat',
    steps: [
      {
        id: 'pos-product-grid',
        title: 'Grid Produk',
        text: 'Semua produk Anda ditampilkan di sini. Klik produk untuk menambahkan ke keranjang belanja.',
        attachTo: {
          element: '[data-tour="pos-products"]',
          on: 'bottom',
        },
      },
      {
        id: 'pos-categories',
        title: 'Kategori Produk',
        text: 'Filter produk berdasarkan kategori untuk menemukan item lebih cepat.',
        attachTo: {
          element: '[data-tour="pos-categories"]',
          on: 'bottom',
        },
      },
      {
        id: 'pos-search',
        title: 'Cari Produk',
        text: 'Gunakan search bar untuk mencari produk berdasarkan nama atau SKU. Tekan F1 untuk fokus ke search.',
        attachTo: {
          element: '[data-tour="pos-search"]',
          on: 'bottom',
        },
      },
      {
        id: 'pos-cart',
        title: 'Keranjang Belanja',
        text: 'Semua item yang dipilih muncul di sini. Anda bisa edit quantity, hapus item, atau apply discount.',
        attachTo: {
          element: '[data-tour="pos-cart"]',
          on: 'left',
        },
      },
      {
        id: 'pos-customer',
        title: 'Pilih Pelanggan',
        text: 'Pilih pelanggan untuk menerapkan harga khusus atau mengumpulkan poin loyalty.',
        attachTo: {
          element: '[data-tour="pos-customer"]',
          on: 'bottom',
        },
      },
      {
        id: 'pos-payment',
        title: 'Proses Pembayaran',
        text: 'Klik tombol ini untuk memproses pembayaran. Pilih metode pembayaran dan selesaikan transaksi.',
        attachTo: {
          element: '[data-tour="pos-pay"]',
          on: 'left',
        },
      },
      {
        id: 'pos-shortcuts',
        title: 'Keyboard Shortcuts',
        text: 'Gunakan F1-F10 untuk aksi cepat. F1: Search, F2: Tampilan Grid/List, F9: Hold Bill, F10: Bayar.',
        attachTo: {
          element: '[data-tour="pos-shortcuts"]',
          on: 'top',
        },
      },
      {
        id: 'pos-order-type',
        title: 'Tipe Order',
        text: 'Pilih tipe order: Dine-in, Takeaway, atau Delivery. Untuk Dine-in, pilih meja.',
        attachTo: {
          element: '[data-tour="pos-order-type"]',
          on: 'bottom',
        },
      },
    ],
  },
  products: {
    id: 'products',
    title: 'Manajemen Produk Tour',
    description: 'Pelajari cara mengelola produk dan inventori',
    steps: [
      {
        id: 'products-list',
        title: 'Daftar Produk',
        text: 'Lihat semua produk dalam format tabel atau grid. Gunakan search dan filter untuk menemukan produk.',
        attachTo: {
          element: '[data-tour="products-list"]',
          on: 'bottom',
        },
      },
      {
        id: 'products-search',
        title: 'Cari & Filter',
        text: 'Cari produk berdasarkan nama, SKU, atau filter berdasarkan kategori dan status aktif.',
        attachTo: {
          element: '[data-tour="products-search"]',
          on: 'bottom',
        },
      },
      {
        id: 'products-add',
        title: 'Tambah Produk Baru',
        text: 'Klik tombol ini untuk membuat produk baru. Isi nama, harga, stok, dan lainnya.',
        attachTo: {
          element: '[data-tour="products-add"]',
          on: 'bottom',
        },
      },
      {
        id: 'products-variants',
        title: 'Varian Produk',
        text: 'Untuk produk dengan varian (seperti ukuran S/M/L), atur varian dan harga berbeda untuk setiap varian.',
        attachTo: {
          element: '[data-tour="products-variants"]',
          on: 'bottom',
        },
      },
      {
        id: 'products-modifiers',
        title: 'Modifier Groups',
        text: 'Tambahkan opsi tambahan seperti topping, level pedas, atau opsi custom lainnya.',
        attachTo: {
          element: '[data-tour="products-modifiers"]',
          on: 'bottom',
        },
      },
    ],
  },
  inventory: {
    id: 'inventory',
    title: 'Inventori Tour',
    description: 'Pelajari cara mengelola stok dan transfer antar outlet',
    steps: [
      {
        id: 'inventory-overview',
        title: 'Overview Stok',
        text: 'Lihat level stok saat ini untuk semua produk. Item dengan stok rendah akan ditandai merah.',
        attachTo: {
          element: '[data-tour="inventory-overview"]',
          on: 'bottom',
        },
      },
      {
        id: 'inventory-alerts',
        title: 'Alert Stok Rendah',
        text: 'Daftar produk yang stoknya di bawah minimum. Segera restok untuk避免 kehabisan.',
        attachTo: {
          element: '[data-tour="inventory-alerts"]',
          on: 'bottom',
        },
      },
      {
        id: 'inventory-adjust',
        title: 'Penyesuaian Stok',
        text: 'Lakukan penyesuaian stok manual untuk correction stok opname atau barang rusak.',
        attachTo: {
          element: '[data-tour="inventory-adjust"]',
          on: 'bottom',
        },
      },
      {
        id: 'inventory-transfers',
        title: 'Transfer Antar Outlet',
        text: 'Pindahkan stok dari satu outlet ke outlet lain dengan workflow transfer yang terintegrasi.',
        attachTo: {
          element: '[data-tour="inventory-transfers"]',
          on: 'bottom',
        },
      },
      {
        id: 'inventory-purchase',
        title: 'Purchase Order',
        text: 'Buat purchase order ke supplier dan track penerimaan barang.',
        attachTo: {
          element: '[data-tour="inventory-purchase"]',
          on: 'bottom',
        },
      },
      {
        id: 'inventory-suppliers',
        title: 'Manajemen Supplier',
        text: 'Kelola daftar supplier Anda untuk memudahkan pembuatan purchase order.',
        attachTo: {
          element: '[data-tour="inventory-suppliers"]',
          on: 'bottom',
        },
      },
    ],
  },
  reports: {
    id: 'reports',
    title: 'Laporan Tour',
    description: 'Pelajari cara melihat dan export laporan bisnis',
    steps: [
      {
        id: 'reports-types',
        title: 'Tipe Laporan',
        text: 'Pilih jenis laporan: Penjualan, Produk, Kategori, Karyawan, atau Laporan Custom.',
        attachTo: {
          element: '[data-tour="reports-types"]',
          on: 'bottom',
        },
      },
      {
        id: 'reports-date-filter',
        title: 'Filter Tanggal',
        text: 'Pilih rentang tanggal laporan. Options: Hari ini, Kemarin, 7 hari terakhir, Bulan ini, atau custom range.',
        attachTo: {
          element: '[data-tour="reports-date-filter"]',
          on: 'bottom',
        },
      },
      {
        id: 'reports-export',
        title: 'Export Laporan',
        text: 'Download laporan dalam format Excel, PDF, atau CSV untuk analisis lebih lanjut.',
        attachTo: {
          element: '[data-tour="reports-export"]',
          on: 'bottom',
        },
      },
      {
        id: 'reports-metrics',
        title: 'Metrik Penting',
        text: 'Lihat metrik seperti total penjualan, item terlaris, jam sibuk, dan performa karyawan.',
        attachTo: {
          element: '[data-tour="reports-metrics"]',
          on: 'bottom',
        },
      },
    ],
  },
};
