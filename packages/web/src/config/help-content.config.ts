/**
 * Contextual help shown by HelpSidebar / InlineHelpCard on back-office pages.
 * Keys must match the `page` prop used by those components.
 */

export interface PageHelp {
  page: string;
  title: string;
  description: string;
  tips: string[];
  commonIssues: Array<{
    problem: string;
    solution: string;
  }>;
}

export const helpContent: Record<string, PageHelp> = {
  products: {
    page: 'products',
    title: 'Bantuan Produk',
    description: 'Kelola katalog produk, harga, dan stok.',
    tips: [
      'Gunakan varian untuk ukuran, warna, atau rasa berbeda dari produk yang sama.',
      'Atur grup modifier untuk item yang bisa disesuaikan (misalnya topping tambahan).',
      'Aktifkan pelacakan stok agar mendapat peringatan saat stok menipis.',
      'Gunakan kategori agar produk lebih mudah dicari di POS.',
    ],
    commonIssues: [
      {
        problem: 'Produk tidak muncul di POS',
        solution:
          'Pastikan produk aktif dan sudah ditetapkan ke outlet yang dipilih (menu Produk per Outlet). Periksa juga apakah kategorinya aktif.',
      },
      {
        problem: 'Harga tidak sesuai',
        solution: 'Periksa apakah ada promosi aktif atau tingkat harga yang berlaku untuk produk tersebut.',
      },
      {
        problem: 'Stok tidak berubah',
        solution: 'Pastikan pelacakan stok aktif untuk produk tersebut.',
      },
    ],
  },

  customers: {
    page: 'customers',
    title: 'Bantuan Pelanggan',
    description: 'Kelola data pelanggan dan program loyalitas.',
    tips: [
      'Simpan nomor telepon pelanggan agar mudah dicari saat transaksi di POS.',
      'Gunakan segmen pelanggan untuk menargetkan promosi.',
      'Aktifkan poin loyalitas untuk memberi hadiah kepada pelanggan setia.',
      'Lihat riwayat pembelian pelanggan untuk memberi layanan yang lebih personal.',
    ],
    commonIssues: [
      {
        problem: 'Pelanggan tidak ditemukan',
        solution: 'Cari dengan nama atau nomor telepon. Data pelanggan berlaku untuk semua outlet dalam bisnis Anda.',
      },
      {
        problem: 'Poin loyalitas tidak bertambah',
        solution: 'Pastikan program loyalitas aktif dan aturan perolehan poin sudah diatur di menu Loyalty.',
      },
    ],
  },

  employees: {
    page: 'employees',
    title: 'Bantuan Karyawan',
    description: 'Kelola akun karyawan dan perannya.',
    tips: [
      'Setiap karyawan memerlukan PIN untuk masuk ke POS.',
      'Pilih peran yang sesuai untuk membatasi akses ke fitur sensitif.',
      'Manajer hanya dapat mengelola karyawan dengan peran di bawahnya.',
      'Tinjau Audit Log secara berkala untuk memantau aktivitas karyawan.',
    ],
    commonIssues: [
      {
        problem: 'Karyawan tidak bisa masuk',
        solution: 'Pastikan akun karyawan aktif dan ditetapkan ke outlet yang benar.',
      },
      {
        problem: 'Akses ke fitur ditolak',
        solution: 'Periksa peran karyawan. Setiap peran hanya dapat membuka menu yang diizinkan.',
      },
    ],
  },

  orders: {
    page: 'orders',
    title: 'Bantuan Pesanan',
    description: 'Kelola pesanan dine-in, penetapan meja, dan status pesanan.',
    tips: [
      'Gunakan nomor meja untuk mengatur pesanan dine-in.',
      'Perbarui status pesanan agar tim dapur selalu mendapat informasi terbaru.',
      'Pesanan yang masuk tampil di Kitchen Display (KDS) bila fitur KDS aktif.',
    ],
    commonIssues: [
      {
        problem: 'Pesanan tidak muncul di KDS',
        solution: 'Pastikan pesanan sudah dikonfirmasi dan fitur KDS aktif untuk outlet ini.',
      },
      {
        problem: 'Pesanan tidak bisa diubah',
        solution: 'Pesanan yang sudah diproses dapur tidak dapat diubah. Batalkan lalu buat pesanan baru bila perlu.',
      },
    ],
  },

  'waiting-list': {
    page: 'waiting-list',
    title: 'Bantuan Daftar Tunggu',
    description: 'Kelola antrean pelanggan yang menunggu meja.',
    tips: [
      'Catat jumlah tamu agar meja yang ditawarkan sesuai kapasitas.',
      'Dudukkan pelanggan dari daftar tunggu saat meja tersedia agar status meja ikut diperbarui.',
      'Tandai pelanggan yang tidak datang agar antrean tetap akurat.',
    ],
    commonIssues: [
      {
        problem: 'Meja tidak muncul saat mendudukkan pelanggan',
        solution: 'Hanya meja berstatus tersedia yang ditampilkan. Periksa status meja di menu Meja.',
      },
    ],
  },

  settings: {
    page: 'settings',
    title: 'Bantuan Pengaturan',
    description: 'Atur detail bisnis, outlet, dan preferensi sistem.',
    tips: [
      'Lengkapi detail bisnis agar tampil benar di struk dan laporan.',
      'Atur tarif pajak sesuai peraturan yang berlaku.',
      'Sesuaikan template struk dengan logo dan informasi kontak Anda.',
      'Atur jam operasional setiap outlet.',
    ],
    commonIssues: [
      {
        problem: 'Perhitungan pajak tidak sesuai',
        solution: 'Periksa tarif pajak dan service charge di menu Pengaturan > Pajak.',
      },
      {
        problem: 'Struk tidak tercetak',
        solution: 'Periksa koneksi printer di Pengaturan > Printer dan pengaturan template struk.',
      },
    ],
  },
};

/**
 * Get help content for a specific page
 */
export function getPageHelp(pageKey: string): PageHelp | undefined {
  return helpContent[pageKey];
}

/**
 * Get all tips for a specific page
 */
export function getPageTips(pageKey: string): string[] {
  return helpContent[pageKey]?.tips || [];
}

/**
 * Get common issues for a specific page
 */
export function getCommonIssues(pageKey: string): Array<{ problem: string; solution: string }> {
  return helpContent[pageKey]?.commonIssues || [];
}
