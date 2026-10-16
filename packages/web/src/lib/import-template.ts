/**
 * Import template generator.
 * Produces an .xlsx template matching what the importer accepts
 * (POST /inventory/products/import-xlsx, POST /customers/import-xlsx).
 */
import { format } from 'date-fns';

interface TemplateColumn {
  label: string;
  example: string;
}

// Only columns the backend import actually reads (inventory.controller.ts importXlsx).
const PRODUCT_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { label: 'Nama Produk', example: 'Kopi Latte' },
  { label: 'SKU / Kode', example: 'KOPI-001' },
  { label: 'Harga Jual', example: '25000' },
  { label: 'Harga Modal', example: '15000' },
  { label: 'Deskripsi', example: 'Kopi susu dengan foam lembut' },
  { label: 'Satuan', example: 'Cup' },
  { label: 'Kategori', example: 'Minuman' },
];

const CUSTOMER_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { label: 'Nama Pelanggan', example: 'Budi Santoso' },
  { label: 'No. Telepon', example: '08123456789' },
  { label: 'Email', example: 'budi@example.com' },
  { label: 'Alamat', example: 'Jl. Sudirman No. 123' },
  { label: 'Catatan', example: 'Pelanggan tetap' },
];

export type TemplateType = 'products' | 'customers';

export async function downloadImportTemplate(type: TemplateType): Promise<void> {
  const columns = type === 'products' ? PRODUCT_TEMPLATE_COLUMNS : CUSTOMER_TEMPLATE_COLUMNS;
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type === 'products' ? 'Produk' : 'Pelanggan');

  sheet.addRow(columns.map((c) => c.label)).font = { bold: true };
  sheet.addRow(columns.map((c) => c.example));
  sheet.columns.forEach((col) => {
    col.width = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `template_${type === 'products' ? 'produk' : 'pelanggan'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
