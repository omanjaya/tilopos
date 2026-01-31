import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
 * Export data to Excel
 */
export function exportToExcel(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string,
  summary?: { label: string; value: string | number }[]
) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data with title and summary
  const wsData: (string | number)[][] = [];

  // Add title
  wsData.push([title]);
  wsData.push([`Dicetak: ${formatDate(new Date())}`]);
  wsData.push([]); // Empty row

  // Add summary if provided
  if (summary && summary.length > 0) {
    summary.forEach((item) => {
      wsData.push([item.label, item.value]);
    });
    wsData.push([]); // Empty row
  }

  // Add headers and data
  wsData.push(headers);
  data.forEach((row) => wsData.push(row));

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = headers.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

  // Save file
  XLSX.writeFile(wb, `${filename}.xlsx`);
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
