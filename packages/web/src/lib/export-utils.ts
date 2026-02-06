import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { formatCurrency, formatDate } from './format';

/**
 * Export data to PDF
 */
export function exportToPDF(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string,
  summary?: { label: string; value: string | number }[]
) {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Add export date
  doc.setFontSize(10);
  doc.text(`Dicetak: ${formatDate(new Date())}`, 14, 28);

  // Add summary if provided
  let startY = 35;
  if (summary && summary.length > 0) {
    doc.setFontSize(12);
    summary.forEach((item, index) => {
      const yPos = startY + (index * 8);
      doc.text(`${item.label}:`, 14, yPos);
      doc.text(String(item.value), 80, yPos);
    });
    startY = startY + (summary.length * 8) + 5;
  }

  // Add table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save the PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Export data to Excel using ExcelJS
 */
export async function exportToExcel(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string,
  summary?: { label: string; value: string | number }[]
) {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan');

  let currentRow = 1;

  // Add title
  worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64 + headers.length)}${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };
  currentRow++;

  // Add export date
  worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64 + headers.length)}${currentRow}`);
  const dateCell = worksheet.getCell(`A${currentRow}`);
  dateCell.value = `Dicetak: ${formatDate(new Date())}`;
  dateCell.font = { size: 10 };
  currentRow++;

  // Empty row
  currentRow++;

  // Add summary if provided
  if (summary && summary.length > 0) {
    summary.forEach((item) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = item.label;
      row.getCell(2).value = item.value;
      row.getCell(1).font = { bold: true };
      currentRow++;
    });
    currentRow++; // Empty row
  }

  // Add headers
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    cell.alignment = { horizontal: 'center' };
  });
  currentRow++;

  // Add data
  data.forEach((rowData) => {
    const row = worksheet.getRow(currentRow);
    rowData.forEach((value, index) => {
      row.getCell(index + 1).value = value;
    });
    currentRow++;
  });

  // Set column widths
  headers.forEach((_, index) => {
    worksheet.getColumn(index + 1).width = 20;
  });

  // Generate file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Print current page
 */
export function printReport() {
  window.print();
}

/**
 * Generate filename based on report type and date range
 */
export function generateFilename(
  reportType: string,
  dateRange: string,
  outletId?: string
): string {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const outlet = outletId ? `_${outletId}` : '';
  return `${reportType}_${dateRange}${outlet}_${timestamp}`;
}

/**
 * Format sales data for export
 */
export function formatSalesDataForExport(salesReport: {
  totalSales: number;
  totalTransactions: number;
  averageOrderValue: number;
  salesByDate: { date: string; sales: number }[];
}) {
  const headers = ['Tanggal', 'Penjualan'];
  const data = salesReport.salesByDate.map((item) => [
    item.date,
    formatCurrency(item.sales),
  ]);

  const summary = [
    { label: 'Total Penjualan', value: formatCurrency(salesReport.totalSales) },
    { label: 'Total Transaksi', value: salesReport.totalTransactions },
    { label: 'Rata-rata Order', value: formatCurrency(salesReport.averageOrderValue) },
  ];

  return { headers, data, summary };
}

/**
 * Format product data for export
 */
export function formatProductDataForExport(productReport: {
  topProducts: { productName: string; quantity: number; revenue: number }[];
  totalProducts: number;
  totalQuantitySold: number;
}) {
  const headers = ['Produk', 'Quantity', 'Revenue'];
  const data = productReport.topProducts.map((item) => [
    item.productName,
    item.quantity,
    formatCurrency(item.revenue),
  ]);

  const summary = [
    { label: 'Total Produk Terjual', value: productReport.totalProducts },
    { label: 'Total Quantity', value: productReport.totalQuantitySold },
  ];

  return { headers, data, summary };
}

/**
 * Format financial data for export
 */
export function formatFinancialDataForExport(financialReport: {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
}) {
  const headers = ['Metrik', 'Nilai'];
  const data = [
    ['Pendapatan', formatCurrency(financialReport.totalRevenue)],
    ['HPP (Cost)', formatCurrency(financialReport.totalCost)],
    ['Laba Kotor', formatCurrency(financialReport.grossProfit)],
    ['Margin', `${financialReport.grossMargin.toFixed(2)}%`],
  ];

  return { headers, data, summary: [] };
}

/**
 * Format payment data for export
 */
export function formatPaymentDataForExport(paymentReport: {
  paymentBreakdown: { method: string; amount: number; count: number }[];
  totalAmount: number;
  totalTransactions: number;
}) {
  const headers = ['Metode Pembayaran', 'Jumlah', 'Count'];
  const data = paymentReport.paymentBreakdown.map((item) => [
    item.method,
    formatCurrency(item.amount),
    item.count,
  ]);

  const summary = [
    { label: 'Total Amount', value: formatCurrency(paymentReport.totalAmount) },
    { label: 'Total Transaksi', value: paymentReport.totalTransactions },
  ];

  return { headers, data, summary };
}
