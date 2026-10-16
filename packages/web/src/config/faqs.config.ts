interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

export const faqs: FAQ[] = [
  // Memulai
  {
    id: 'add-first-product',
    category: 'getting-started',
    question: 'Bagaimana cara menambahkan produk pertama?',
    answer: '1. Buka menu **Produk > Daftar Produk** di sidebar. 2. Klik **Tambah Produk**. 3. Isi nama produk, harga jual, dan harga modal (opsional). 4. Pilih kategori dan unggah foto (opsional). 5. Simpan. Produk baru otomatis ditetapkan ke outlet Anda; atur penetapannya di **Produk per Outlet**.',
    tags: ['produk', 'setup', 'inventori'],
  },
  {
    id: 'create-outlet',
    category: 'getting-started',
    question: 'Bagaimana cara menambahkan outlet baru?',
    answer: '1. Buka **Pengaturan > Outlet**. 2. Tambahkan outlet dan isi nama serta alamatnya. 3. Simpan. Tarif pajak per outlet diatur di **Pengaturan > Pajak**.',
    tags: ['outlet', 'pengaturan', 'setup'],
  },
  {
    id: 'add-employee',
    category: 'getting-started',
    question: 'Bagaimana cara menambahkan karyawan?',
    answer: '1. Buka **Daftar Karyawan** di sidebar. 2. Klik **Tambah Karyawan**. 3. Isi nama, email, dan nomor telepon. 4. Pilih peran dan outlet. 5. Buat PIN untuk masuk ke POS. 6. Simpan. Manajer hanya dapat menambahkan karyawan dengan peran di bawah manajer.',
    tags: ['karyawan', 'setup', 'tim'],
  },

  // POS & Transaksi
  {
    id: 'refund-transaction',
    category: 'pos',
    question: 'Bagaimana cara refund transaksi?',
    answer: '1. Buka **Transaksi** di sidebar. 2. Cari transaksi yang ingin di-refund lalu buka detailnya. 3. Klik **Refund**, pilih item dan jumlahnya, lalu isi alasannya. 4. Konfirmasi. Refund hanya dapat dilakukan oleh supervisor, manajer, atau pemilik dan tercatat di Audit Log.',
    tags: ['refund', 'transaksi', 'pos'],
  },
  {
    id: 'void-vs-refund',
    category: 'pos',
    question: 'Apa bedanya void dan refund?',
    answer: '**Void** membatalkan seluruh transaksi, biasanya karena salah input. **Refund** mengembalikan dana untuk sebagian atau seluruh item dari transaksi yang sudah selesai. Keduanya tercatat di Audit Log.',
    tags: ['void', 'refund', 'transaksi'],
  },
  {
    id: 'reprint-receipt',
    category: 'pos',
    question: 'Bagaimana cara cetak ulang struk?',
    answer: '1. Buka **Transaksi**. 2. Cari transaksi yang struknya ingin dicetak ulang. 3. Klik **Cetak Ulang**.',
    tags: ['struk', 'cetak', 'transaksi'],
  },

  // Inventori
  {
    id: 'transfer-stock',
    category: 'inventory',
    question: 'Bagaimana cara transfer stok antar outlet?',
    answer: '1. Buka **Inventori > Transfer Stok**. 2. Buat transfer baru, pilih outlet asal dan tujuan. 3. Tambahkan item dan jumlahnya, lalu ajukan. 4. Manajer atau pemilik menyetujui transfer. 5. Outlet asal mengirim barang dan outlet tujuan menerima barang untuk menyelesaikan transfer.',
    tags: ['transfer', 'stok', 'outlet'],
  },
  {
    id: 'low-stock-alert',
    category: 'inventory',
    question: 'Bagaimana cara mengetahui stok yang menipis?',
    answer: 'Buka **Inventori > Stok**. Produk dengan stok di bawah batas minimum ditandai sebagai stok rendah. Pastikan pelacakan stok aktif pada produk tersebut.',
    tags: ['stok', 'peringatan'],
  },

  // Laporan
  {
    id: 'export-excel',
    category: 'reports',
    question: 'Bagaimana cara ekspor laporan?',
    answer: '1. Buka **Laporan** yang diinginkan. 2. Atur rentang tanggal dan filter lainnya. 3. Klik tombol **Export PDF** atau **Export Excel**. File akan terunduh ke perangkat Anda.',
    tags: ['ekspor', 'excel', 'laporan'],
  },
  {
    id: 'avg-order-value',
    category: 'reports',
    question: 'Apa arti "rata-rata nilai transaksi"?',
    answer: '**Rata-rata nilai transaksi** = Total penjualan / jumlah transaksi. Angka ini membantu mengukur daya beli pelanggan dan efektivitas upselling, serta membandingkan performa antar periode.',
    tags: ['metrik', 'laporan', 'analitik'],
  },

  // Akun & Keamanan
  {
    id: 'change-pin',
    category: 'account',
    question: 'Bagaimana cara mengganti PIN saya?',
    answer: 'Buka **Profil** dari menu pengguna di pojok kanan atas, lalu ubah PIN Anda di bagian keamanan. Masukkan PIN lama dan PIN baru, lalu simpan.',
    tags: ['pin', 'profil', 'keamanan'],
  },
  {
    id: 'role-access',
    category: 'account',
    question: 'Kenapa saya tidak bisa membuka menu tertentu?',
    answer: 'Setiap peran (pemilik, manajer, supervisor, kasir, dapur, inventori) hanya dapat membuka menu yang sesuai tugasnya. Jika Anda membutuhkan akses tambahan, hubungi pemilik atau manajer bisnis Anda.',
    tags: ['peran', 'akses', 'keamanan'],
  },
];

export const faqCategories = [
  { id: 'all', name: 'Semua', icon: '📚' },
  { id: 'getting-started', name: 'Memulai', icon: '🚀' },
  { id: 'pos', name: 'POS & Transaksi', icon: '💰' },
  { id: 'inventory', name: 'Inventori', icon: '📦' },
  { id: 'reports', name: 'Laporan', icon: '📊' },
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
