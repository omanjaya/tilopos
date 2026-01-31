interface Tutorial {
  id: string;
  title: string;
  category: 'getting-started' | 'advanced' | 'troubleshooting';
  duration: string;
  thumbnail?: string;
  videoUrl: string;
  description: string;
  tags: string[];
}

export const tutorials: Tutorial[] = [
  // Getting Started
  {
    id: 'setup-first-business',
    title: 'Setup Bisnis Pertama Kali',
    category: 'getting-started',
    duration: '3:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Panduan lengkap setup bisnis pertama Anda di TILO - dari registrasi hingga transaksi pertama.',
    tags: ['setup', 'business', 'onboarding'],
  },
  {
    id: 'add-outlet-employee',
    title: 'Menambahkan Outlet dan Karyawan',
    category: 'getting-started',
    duration: '4:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara membuat outlet baru dan menambahkan karyawan dengan role dan permission yang tepat.',
    tags: ['outlet', 'employee', 'settings'],
  },
  {
    id: 'create-products',
    title: 'Membuat Produk dan Kategori',
    category: 'getting-started',
    duration: '5:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Panduan membuat produk, mengatur harga, dan mengelola kategori produk.',
    tags: ['products', 'categories', 'inventory'],
  },
  {
    id: 'first-transaction',
    title: 'Transaksi Pertama di POS',
    category: 'getting-started',
    duration: '6:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara melakukan transaksi pertama menggunakan POS Terminal - dari pilih produk hingga pembayaran.',
    tags: ['pos', 'transaction', 'payment'],
  },
  {
    id: 'view-reports',
    title: 'Melihat Laporan Penjualan',
    category: 'getting-started',
    duration: '4:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara membaca dan memahami laporan penjualan untuk mengambil keputusan bisnis.',
    tags: ['reports', 'analytics', 'sales'],
  },

  // Advanced Features
  {
    id: 'stock-transfer',
    title: 'Manajemen Stok dan Transfer Antar Outlet',
    category: 'advanced',
    duration: '7:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara melakukan transfer stok antar outlet dengan workflow yang aman dan terlacak.',
    tags: ['inventory', 'transfer', 'stock'],
  },
  {
    id: 'loyalty-promo',
    title: 'Program Loyalty dan Promosi',
    category: 'advanced',
    duration: '6:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Setup program loyalty untuk retensi pelanggan dan buat promo menarik.',
    tags: ['loyalty', 'promotion', 'marketing'],
  },
  {
    id: 'self-order-qr',
    title: 'Self-Order QR Code untuk Pelanggan',
    category: 'advanced',
    duration: '5:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Aktifkan fitur self-order dengan QR code untuk mempercepat pelayanan.',
    tags: ['self-order', 'qr', 'customer'],
  },
  {
    id: 'online-store',
    title: 'Setup Toko Online',
    category: 'advanced',
    duration: '8:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Buat toko online dan mulai jualan online dengan integrasi langsung ke POS.',
    tags: ['online-store', 'ecommerce', 'integration'],
  },
  {
    id: 'marketplace-integration',
    title: 'Integrasi Marketplace (GoFood, GrabFood)',
    category: 'advanced',
    duration: '10:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Hubungkan TILO dengan GoFood, GrabFood, dan ShopeeFood untuk receive order langsung.',
    tags: ['integration', 'gofood', 'grabfood', 'marketplace'],
  },
  {
    id: 'kds-setup',
    title: 'Kitchen Display System (KDS)',
    category: 'advanced',
    duration: '6:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Setup KDS untuk dapur agar order tampil real-time dan improve efficiency.',
    tags: ['kds', 'kitchen', 'operations'],
  },
  {
    id: 'shift-management',
    title: 'Shift Management dan Settlement',
    category: 'advanced',
    duration: '7:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara buka/tutup shift dan lakukan settlement akhir hari.',
    tags: ['shift', 'settlement', 'cashier'],
  },
  {
    id: 'advanced-reports',
    title: 'Analisis dan Laporan Lanjutan',
    category: 'advanced',
    duration: '9:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Deep dive ke laporan lanjutan untuk analisis bisnis yang lebih mendalam.',
    tags: ['reports', 'analytics', 'business'],
  },

  // Troubleshooting
  {
    id: 'handle-refund',
    title: 'Handle Refund dan Void Transaksi',
    category: 'troubleshooting',
    duration: '5:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara proses refund dan void transaksi dengan aman dan proper documentation.',
    tags: ['refund', 'void', 'troubleshooting'],
  },
  {
    id: 'offline-sync',
    title: 'Sinkronisasi Offline',
    category: 'troubleshooting',
    duration: '4:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara kerja offline sync dan apa yang harus dilakukan saat koneksi terputus.',
    tags: ['offline', 'sync', 'troubleshooting'],
  },
  {
    id: 'thermal-printer',
    title: 'Setup Thermal Printer',
    category: 'troubleshooting',
    duration: '6:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Panduan setup thermal printer untuk cetak struk dan kitchen order.',
    tags: ['printer', 'hardware', 'setup'],
  },
  {
    id: 'reset-pin',
    title: 'Reset PIN Karyawan',
    category: 'troubleshooting',
    duration: '3:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Cara reset PIN karyawan yang lupa atau perlu diganti untuk security.',
    tags: ['employee', 'pin', 'security'],
  },
];

export const tutorialCategories = [
  { id: 'all', name: 'Semua Tutorial', count: tutorials.length },
  { id: 'getting-started', name: 'Getting Started', count: tutorials.filter(t => t.category === 'getting-started').length },
  { id: 'advanced', name: 'Advanced Features', count: tutorials.filter(t => t.category === 'advanced').length },
  { id: 'troubleshooting', name: 'Troubleshooting', count: tutorials.filter(t => t.category === 'troubleshooting').length },
];

export function getTutorialById(id: string): Tutorial | undefined {
  return tutorials.find(t => t.id === id);
}

export function getTutorialsByCategory(category: string): Tutorial[] {
  if (category === 'all') return tutorials;
  return tutorials.filter(t => t.category === category);
}

export function searchTutorials(query: string): Tutorial[] {
  const lowerQuery = query.toLowerCase();
  return tutorials.filter(t =>
    t.title.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
