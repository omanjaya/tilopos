/**
 * Self-Order Multi-Language Translation Support
 * Supports Indonesian (id) and English (en) locales.
 */

export type SupportedLocale = 'id' | 'en';

export interface TranslationStrings {
  // Menu labels
  menu: {
    title: string;
    searchPlaceholder: string;
    allCategories: string;
    noProducts: string;
    outOfStock: string;
    addToCart: string;
    customize: string;
    startingFrom: string;
    perItem: string;
  };
  // Cart labels
  cart: {
    title: string;
    empty: string;
    emptyDescription: string;
    subtotal: string;
    tax: string;
    serviceCharge: string;
    total: string;
    items: string;
    item: string;
    removeItem: string;
    clearCart: string;
    notes: string;
    notesPlaceholder: string;
    quantity: string;
  };
  // Button text
  buttons: {
    addToCart: string;
    viewCart: string;
    checkout: string;
    placeOrder: string;
    pay: string;
    payWithQris: string;
    payAtCounter: string;
    back: string;
    cancel: string;
    confirm: string;
    retry: string;
    done: string;
    scanQr: string;
    close: string;
    continueShopping: string;
  };
  // Order status messages
  orderStatus: {
    pending: string;
    submitted: string;
    paid: string;
    preparing: string;
    ready: string;
    served: string;
    completed: string;
    cancelled: string;
    expired: string;
    orderPlaced: string;
    orderConfirmed: string;
    paymentPending: string;
    paymentSuccess: string;
    paymentFailed: string;
    estimatedTime: string;
  };
  // Error messages
  errors: {
    sessionNotFound: string;
    sessionExpired: string;
    productNotFound: string;
    variantNotFound: string;
    emptyCart: string;
    paymentFailed: string;
    networkError: string;
    invalidAmount: string;
    outOfStock: string;
    sessionNotActive: string;
    orderFailed: string;
    unknown: string;
  };
  // General UI labels
  general: {
    welcome: string;
    selectLanguage: string;
    tableNumber: string;
    orderNumber: string;
    scanToOrder: string;
    poweredBy: string;
    loading: string;
    required: string;
    optional: string;
    select: string;
    selected: string;
    modifiers: string;
  };
}

const ID_TRANSLATIONS: TranslationStrings = {
  menu: {
    title: 'Menu',
    searchPlaceholder: 'Cari menu...',
    allCategories: 'Semua Kategori',
    noProducts: 'Tidak ada menu tersedia',
    outOfStock: 'Stok Habis',
    addToCart: 'Tambah ke Keranjang',
    customize: 'Sesuaikan',
    startingFrom: 'Mulai dari',
    perItem: '/item',
  },
  cart: {
    title: 'Keranjang',
    empty: 'Keranjang kosong',
    emptyDescription: 'Belum ada item di keranjang Anda',
    subtotal: 'Subtotal',
    tax: 'Pajak',
    serviceCharge: 'Biaya Layanan',
    total: 'Total',
    items: 'item',
    item: 'item',
    removeItem: 'Hapus item',
    clearCart: 'Kosongkan keranjang',
    notes: 'Catatan',
    notesPlaceholder: 'Tambahkan catatan khusus...',
    quantity: 'Jumlah',
  },
  buttons: {
    addToCart: 'Tambah ke Keranjang',
    viewCart: 'Lihat Keranjang',
    checkout: 'Pesan Sekarang',
    placeOrder: 'Buat Pesanan',
    pay: 'Bayar',
    payWithQris: 'Bayar dengan QRIS',
    payAtCounter: 'Bayar di Kasir',
    back: 'Kembali',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    retry: 'Coba Lagi',
    done: 'Selesai',
    scanQr: 'Scan QR Code',
    close: 'Tutup',
    continueShopping: 'Lanjut Belanja',
  },
  orderStatus: {
    pending: 'Menunggu',
    submitted: 'Pesanan Dikirim',
    paid: 'Sudah Dibayar',
    preparing: 'Sedang Diproses',
    ready: 'Siap Diambil',
    served: 'Sudah Disajikan',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    expired: 'Kedaluwarsa',
    orderPlaced: 'Pesanan berhasil dibuat!',
    orderConfirmed: 'Pesanan dikonfirmasi',
    paymentPending: 'Menunggu pembayaran...',
    paymentSuccess: 'Pembayaran berhasil!',
    paymentFailed: 'Pembayaran gagal',
    estimatedTime: 'Estimasi waktu',
  },
  errors: {
    sessionNotFound: 'Sesi tidak ditemukan',
    sessionExpired: 'Sesi telah berakhir',
    productNotFound: 'Produk tidak ditemukan',
    variantNotFound: 'Varian tidak ditemukan',
    emptyCart: 'Keranjang kosong, tambahkan item terlebih dahulu',
    paymentFailed: 'Pembayaran gagal, silakan coba lagi',
    networkError: 'Koneksi bermasalah, silakan coba lagi',
    invalidAmount: 'Jumlah pembayaran tidak valid',
    outOfStock: 'Stok habis untuk produk ini',
    sessionNotActive: 'Sesi tidak aktif',
    orderFailed: 'Gagal membuat pesanan, silakan coba lagi',
    unknown: 'Terjadi kesalahan, silakan coba lagi',
  },
  general: {
    welcome: 'Selamat Datang',
    selectLanguage: 'Pilih Bahasa',
    tableNumber: 'Nomor Meja',
    orderNumber: 'Nomor Pesanan',
    scanToOrder: 'Scan untuk memesan',
    poweredBy: 'Didukung oleh',
    loading: 'Memuat...',
    required: 'Wajib',
    optional: 'Opsional',
    select: 'Pilih',
    selected: 'Dipilih',
    modifiers: 'Tambahan',
  },
};

const EN_TRANSLATIONS: TranslationStrings = {
  menu: {
    title: 'Menu',
    searchPlaceholder: 'Search menu...',
    allCategories: 'All Categories',
    noProducts: 'No menu items available',
    outOfStock: 'Out of Stock',
    addToCart: 'Add to Cart',
    customize: 'Customize',
    startingFrom: 'Starting from',
    perItem: '/item',
  },
  cart: {
    title: 'Cart',
    empty: 'Cart is empty',
    emptyDescription: 'No items in your cart yet',
    subtotal: 'Subtotal',
    tax: 'Tax',
    serviceCharge: 'Service Charge',
    total: 'Total',
    items: 'items',
    item: 'item',
    removeItem: 'Remove item',
    clearCart: 'Clear cart',
    notes: 'Notes',
    notesPlaceholder: 'Add special notes...',
    quantity: 'Quantity',
  },
  buttons: {
    addToCart: 'Add to Cart',
    viewCart: 'View Cart',
    checkout: 'Checkout',
    placeOrder: 'Place Order',
    pay: 'Pay',
    payWithQris: 'Pay with QRIS',
    payAtCounter: 'Pay at Counter',
    back: 'Back',
    cancel: 'Cancel',
    confirm: 'Confirm',
    retry: 'Retry',
    done: 'Done',
    scanQr: 'Scan QR Code',
    close: 'Close',
    continueShopping: 'Continue Shopping',
  },
  orderStatus: {
    pending: 'Pending',
    submitted: 'Order Submitted',
    paid: 'Paid',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    orderPlaced: 'Order placed successfully!',
    orderConfirmed: 'Order confirmed',
    paymentPending: 'Waiting for payment...',
    paymentSuccess: 'Payment successful!',
    paymentFailed: 'Payment failed',
    estimatedTime: 'Estimated time',
  },
  errors: {
    sessionNotFound: 'Session not found',
    sessionExpired: 'Session has expired',
    productNotFound: 'Product not found',
    variantNotFound: 'Variant not found',
    emptyCart: 'Cart is empty, please add items first',
    paymentFailed: 'Payment failed, please try again',
    networkError: 'Network error, please try again',
    invalidAmount: 'Invalid payment amount',
    outOfStock: 'This product is out of stock',
    sessionNotActive: 'Session is not active',
    orderFailed: 'Failed to place order, please try again',
    unknown: 'An error occurred, please try again',
  },
  general: {
    welcome: 'Welcome',
    selectLanguage: 'Select Language',
    tableNumber: 'Table Number',
    orderNumber: 'Order Number',
    scanToOrder: 'Scan to order',
    poweredBy: 'Powered by',
    loading: 'Loading...',
    required: 'Required',
    optional: 'Optional',
    select: 'Select',
    selected: 'Selected',
    modifiers: 'Add-ons',
  },
};

const TRANSLATIONS: Record<SupportedLocale, TranslationStrings> = {
  id: ID_TRANSLATIONS,
  en: EN_TRANSLATIONS,
};

/**
 * Get translations for a given locale.
 * Falls back to Indonesian if locale is not supported.
 */
export function getTranslations(locale: string): TranslationStrings {
  const key = locale.toLowerCase().slice(0, 2) as SupportedLocale;
  return TRANSLATIONS[key] ?? TRANSLATIONS['id'];
}

/**
 * Check if a locale is supported.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale === 'id' || locale === 'en';
}

/**
 * Get all supported locale codes.
 */
export function getSupportedLocales(): SupportedLocale[] {
  return ['id', 'en'];
}
