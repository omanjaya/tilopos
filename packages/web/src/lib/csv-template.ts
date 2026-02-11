/**
 * CSV Template Generator
 * Generates downloadable CSV templates for bulk import
 */

interface CSVColumn {
  key: string;
  label: string;
  example: string;
  required: boolean;
}

const PRODUCT_TEMPLATE_COLUMNS: CSVColumn[] = [
  { key: 'name', label: 'Nama Produk', example: 'Kopi Latte', required: true },
  { key: 'sku', label: 'SKU / Kode', example: 'KOPI-001', required: false },
  { key: 'price', label: 'Harga Jual', example: '25000', required: true },
  { key: 'costPrice', label: 'Harga Modal', example: '15000', required: false },
  { key: 'category', label: 'Kategori', example: 'Minuman', required: false },
  { key: 'description', label: 'Deskripsi', example: 'Kopi susu dengan foam lembut', required: false },
  { key: 'unit', label: 'Satuan', example: 'Cup', required: false },
];

const CUSTOMER_TEMPLATE_COLUMNS: CSVColumn[] = [
  { key: 'name', label: 'Nama Customer', example: 'John Doe', required: true },
  { key: 'phone', label: 'No. Telepon', example: '08123456789', required: false },
  { key: 'email', label: 'Email', example: 'john@example.com', required: false },
  { key: 'address', label: 'Alamat', example: 'Jl. Sudirman No. 123', required: false },
  { key: 'notes', label: 'Catatan', example: 'Customer VIP', required: false },
];

export type TemplateType = 'products' | 'customers';

function generateCSVContent(columns: CSVColumn[], includeExample: boolean = true): string {
  // Header row
  const headers = columns.map((col) => col.label).join(',');

  if (!includeExample) {
    return headers;
  }

  // Example row
  const examples = columns.map((col) => {
    // Escape values with commas or quotes
    const value = col.example;
    if (value.includes(',') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');

  return `${headers}\n${examples}`;
}

export function downloadCSVTemplate(type: TemplateType, includeExample: boolean = true) {
  const columns = type === 'products' ? PRODUCT_TEMPLATE_COLUMNS : CUSTOMER_TEMPLATE_COLUMNS;
  const csvContent = generateCSVContent(columns, includeExample);

  // Create blob and download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const filename = `template_${type}_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getTemplateInstructions(type: TemplateType): string[] {
  const columns = type === 'products' ? PRODUCT_TEMPLATE_COLUMNS : CUSTOMER_TEMPLATE_COLUMNS;
  const requiredFields = columns.filter((col) => col.required).map((col) => col.label);

  return [
    `Field wajib: ${requiredFields.join(', ')}`,
    'Gunakan format CSV (Comma Separated Values)',
    'Baris pertama adalah header kolom (jangan diubah)',
    'Baris kedua adalah contoh data (bisa dihapus)',
    'Tambahkan data Anda mulai dari baris ketiga',
    'Untuk harga, gunakan angka tanpa titik atau koma',
    'Simpan file dalam format .csv atau .xlsx',
  ];
}
