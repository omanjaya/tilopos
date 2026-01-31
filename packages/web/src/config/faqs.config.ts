interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

export const faqs: FAQ[] = [
  // Getting Started
  {
    id: 'add-first-product',
    category: 'getting-started',
    question: 'Bagaimana cara menambahkan produk pertama?',
    answer: 'Untuk menambahkan produk pertama Anda: 1. Buka menu **Products** di sidebar. 2. Klik tombol **+ Add Product** di pojok kanan atas. 3. Isi nama produk, harga jual, dan harga modal (opsional). 4. Pilih kategori produk. 5. Upload foto produk (opsional). 6. Klik **Save** untuk menyimpan.',
    tags: ['products', 'setup', 'inventory'],
  },
  {
    id: 'create-outlet',
    category: 'getting-started',
    question: 'Cara setup outlet baru?',
    answer: 'Untuk membuat outlet baru: 1. Buka **Settings > Outlets**. 2. Klik **+ Add Outlet**. 3. Isi nama outlet, kode unik, dan alamat. 4. Atur tax rate (default 11% PPN). 5. Klik **Save**. Outlet baru akan aktif seketika.',
    tags: ['outlet', 'settings', 'setup'],
  },
  {
    id: 'add-employee',
    category: 'getting-started',
    question: 'Bagaimana cara menambahkan karyawan?',
    answer: 'Untuk menambahkan karyawan: 1. Buka **Employees** dari sidebar. 2. Klik **+ Add Employee**. 3. Isi nama, email, dan nomor telepon. 4. Pilih role (Owner, Manager, Cashier, etc.). 5. Buat 6-digit PIN untuk login POS. 6. Klik **Save**. Karyawan akan menerima email untuk setup password.',
    tags: ['employee', 'setup', 'team'],
  },

  // POS & Transactions
  {
    id: 'refund-transaction',
    category: 'pos',
    question: 'Cara melakukan refund transaksi?',
    answer: 'Untuk refund transaksi: 1. Buka **Transactions** dari sidebar. 2. Cari transaksi yang ingin di-refund. 3. Klik transaksi untuk melihat detail. 4. Klik **Refund** button. 5. Pilih item yang akan di-refund dan jumlahnya. 6. Pilih alasan refund. 7. Konfirmasi refund. Refund akan mencatat di audit log.',
    tags: ['refund', 'transaction', 'pos'],
  },
  {
    id: 'split-bill',
    category: 'pos',
    question: 'Bagaimana cara split bill untuk meja yang sama?',
    answer: 'Untuk split bill: 1. Di POS, pastikan order type adalah **Dine-in** dan pilih meja. 2. Add items ke cart. 3. Klik **Split Bill** di cart panel. 4. Pilih split type: **Split by Item** atau **Split by Amount**. 5. Drag items ke setiap split bill atau tentukan jumlah per split. 6. Proses pembayaran untuk setiap split secara terpisah.',
    tags: ['split-bill', 'dine-in', 'pos'],
  },
  {
    id: 'void-vs-refund',
    category: 'pos',
    question: 'Apa bedanya void dan refund?',
    answer: '**Void** = Membatalkan transaksi sebelum diproses/harus bayar. Void menghapus transaksi sepenuhnya. **Refund** = Mengembalikan uang untuk transaksi yang sudah selesai diproses. Refund mencatat return dana dan mengembalikan stok. Gunakan void jika ada kesalahan input sebelum bayar. Gunakan refund jika pelanggan meminta batalkan setelah bayar.',
    tags: ['void', 'refund', 'transaction'],
  },
  {
    id: 'reprint-receipt',
    category: 'pos',
    question: 'Cara cetak ulang struk?',
    answer: 'Untuk cetak ulang struk: 1. Buka **Transactions**. 2. Cari transaksi yang struknya mau dicetak ulang. 3. Klik transaksi untuk lihat detail. 4. Klik **Reprint Receipt**. 5. Pilih printer yang akan digunakan. Struk akan dicetak ulang dengan mencatat bahwa ini adalah reprint.',
    tags: ['receipt', 'print', 'transaction'],
  },

  // Inventory
  {
    id: 'transfer-stock',
    category: 'inventory',
    question: 'Cara transfer stok antar outlet?',
    answer: 'Untuk transfer stok: 1. Buka **Inventory > Stock Transfers**. 2. Klik **+ New Transfer**. 3. Pilih source outlet (pengirim) dan destination outlet (penerima). 4. Add items dan quantity yang mau ditransfer. 5. Klik **Submit Request**. 6. Manager dari destination outlet harus approve transfer. 7. Setelah approved, ship stok dan receive stok untuk menyelesaikan transfer.',
    tags: ['transfer', 'stock', 'outlet'],
  },
  {
    id: 'ingredient-deduction',
    category: 'inventory',
    question: 'Bagaimana sistem auto-deduction ingredients?',
    answer: 'Sistem auto-deduct ingredients berdasarkan recipe yang sudah di-setup: 1. Buka **Ingredients** untuk membuat raw material. 2. Buka produk dan setup **Recipe** - tentukan quantity dari setiap ingredient yang dibutuhkan. 3. Setiap kali produk terjual, system akan auto-deduct stok ingredients sesuai recipe. 4. Cek **Ingredient Stock** untuk pantau stok bahan baku.',
    tags: ['ingredients', 'recipe', 'stock', 'auto'],
  },
  {
    id: 'low-stock-alert',
    category: 'inventory',
    question: 'Cara set up low stock alerts?',
    answer: 'Untuk setup alert stok rendah: 1. Buka **Inventory > Stock Levels**. 2. Cari produk yang ingin di-set alert. 3. Set **Minimum Stock Level** (misal: 10). 4. Save perubahan. 5. System akan kirim notifikasi dan menandai item dengan alert saat stok di bawah minimum.',
    tags: ['alert', 'stock', 'notification'],
  },

  // Reports
  {
    id: 'export-excel',
    category: 'reports',
    question: 'Cara export laporan ke Excel?',
    answer: 'Untuk export laporan: 1. Buka halaman **Reports** yang diinginkan. 2. Set filter date range dan filter lainnya. 3. Klik tombol **Export** di pojok kanan atas. 4. Pilih format: **Excel** (.xlsx), **PDF**, atau **CSV**. 5. File akan didownload ke device Anda.',
    tags: ['export', 'excel', 'reports'],
  },
  {
    id: 'employee-reports',
    category: 'reports',
    question: 'Bagaimana cara melihat laporan per karyawan?',
    answer: 'Untuk laporan per karyawan: 1. Buka **Reports > Sales Reports**. 2. Pilih tab **Employee Performance**. 3. Filter berdasarkan employee, date range, dan outlet. 4. Lihat metrik: total transaksi, total penjualan, rata-rata per transaksi. 5. Bisa export untuk analisis lebih lanjut.',
    tags: ['employee', 'reports', 'performance'],
  },
  {
    id: 'avg-order-value',
    category: 'reports',
    question: 'Apa arti metric "Avg Order Value"?',
    answer: '**Average Order Value (AOV)** = Rata-rata nilai per transaksi. Rumus: Total Penjualan / Jumlah Transaksi. Metric ini berguna untuk: - Mengetahui spending power pelanggan rata-rata - Mengukur efektivitas upselling - Membandingkan performa antar periode. Semakin tinggi AOV, semakin baik efisiensi penjualan.',
    tags: ['metrics', 'aov', 'reports', 'analytics'],
  },

  // Integrations
  {
    id: 'connect-gofood',
    category: 'integrations',
    question: 'Cara connect ke GoFood?',
    answer: 'Untuk integrasi GoFood: 1. Buka **Integrations > Marketplace**. 2. Pilih **GoFood**. 3. Masukkan API Key dan Secret dari dashboard GoFood merchant. 4. Pilih outlet yang akan di-integrasikan. 5. Klik **Connect**. Order dari GoFood akan masuk otomatis ke TILO.',
    tags: ['gofood', 'integration', 'marketplace'],
  },
  {
    id: 'setup-xendit',
    category: 'integrations',
    question: 'Setup payment gateway Xendit?',
    answer: 'Untuk setup Xendit: 1. Buka **Settings > Payment Methods**. 2. Pilih **Xendit**. 3. Masukkan API Key dari dashboard Xendit. 4. Aktifkan metode pembayaran yang ingin diterima: QRIS, Virtual Account, E-Wallet, Credit Card. 5. Save perubahan. Pembayaran online akan terproses via Xendit.',
    tags: ['xendit', 'payment', 'integration'],
  },
  {
    id: 'thermal-printer',
    category: 'integrations',
    question: 'Integrasi thermal printer?',
    answer: 'Untuk setup thermal printer: 1. Pastikan printer terhubung ke device (USB/Bluetooth/Network). 2. Buka **Settings > Devices**. 3. Klik **+ Add Printer**. 4. Pilih tipe printer (58mm atau 80mm). 5. Pilih printer dari list yang terdeteksi atau add manual IP address. 6. Test print untuk verifikasi.',
    tags: ['printer', 'hardware', 'integration'],
  },

  // Account & Security
  {
    id: 'reset-pin',
    category: 'account',
    question: 'Cara reset PIN karyawan?',
    answer: 'Untuk reset PIN karyawan: 1. Buka **Employees**. 2. Cari karyawan yang PIN-nya mau di-reset. 3. Klik employee untuk lihat detail. 4. Klik **Reset PIN**. 5. Masukkan PIN baru (6 digit). 6. Confirm dan simpan. Karyawan bisa login dengan PIN baru seketika.',
    tags: ['pin', 'employee', 'reset', 'security'],
  },
  {
    id: 'change-email',
    category: 'account',
    question: 'Bagaimana cara ganti email?',
    answer: 'Untuk mengubah email: 1. Buka **Profile** dari user menu di pojok kanan atas. 2. Pilih tab **Personal Information**. 3. Edit email field. 4. Klik **Save Changes**. 5. Anda akan menerima email verifikasi ke email baru. 6. Klik link verifikasi untuk mengkonfirmasi perubahan.',
    tags: ['email', 'profile', 'account'],
  },
  {
    id: 'what-is-2fa',
    category: 'account',
    question: 'Apa itu Two-Factor Authentication (2FA)?',
    answer: '**Two-Factor Authentication (2FA)** = Lapisan keamanan tambahan selain password. Saat login, Anda harus memasukkan kode dari authenticator app (Google Authenticator, Authy) selain password. Ini mencegah akses tidak sah meskipun password bocor. TILO mendukung 2FA untuk semua akun.',
    tags: ['2fa', 'security', 'login'],
  },
];

export const faqCategories = [
  { id: 'all', name: 'Semua', icon: '📚' },
  { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
  { id: 'pos', name: 'POS & Transaksi', icon: '💰' },
  { id: 'inventory', name: 'Inventori', icon: '📦' },
  { id: 'reports', name: 'Laporan', icon: '📊' },
  { id: 'integrations', name: 'Integrasi', icon: '🔌' },
  { id: 'account', name: 'Akun & Keamanan', icon: '🔐' },
];

export function getFAQsByCategory(category: string): FAQ[] {
  if (category === 'all') return faqs;
  return faqs.filter(faq => faq.category === category);
}

export function searchFAQs(query: string): FAQ[] {
  const lowerQuery = query.toLowerCase();
  return faqs.filter(faq =>
    faq.question.toLowerCase().includes(lowerQuery) ||
    faq.answer.toLowerCase().includes(lowerQuery) ||
    faq.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
