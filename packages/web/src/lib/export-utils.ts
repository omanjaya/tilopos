import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './format';

// Brand colors
const BRAND_BLUE: [number, number, number] = [37, 99, 235];
const LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const MEDIUM_GRAY: [number, number, number] = [226, 232, 240];
const DARK_TEXT: [number, number, number] = [15, 23, 42];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];

interface ExportPDFOptions {
  summary?: { label: string; value: string | number }[];
  outletName?: string;
  period?: string;
  columnStyles?: Record<number, { halign?: 'left' | 'center' | 'right' }>;
}

/**
 * Export data to PDF with professional layout
 */
export function exportToPDF(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string,
  summaryOrOptions?: { label: string; value: string | number }[] | ExportPDFOptions
) {
  // Support both legacy (array) and new (object) signatures
  let options: ExportPDFOptions = {};
  if (Array.isArray(summaryOrOptions)) {
    options = { summary: summaryOrOptions };
  } else if (summaryOrOptions) {
    options = summaryOrOptions;
  }

  const { summary, outletName, period, columnStyles } = options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── HEADER ──────────────────────────────────────────────
  let y = 16;

  // Outlet name (top left)
  if (outletName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(outletName, margin, y);
  }

  // Print date (top right)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_TEXT);
  const printDate = `Dicetak: ${formatDate(new Date())}`;
  doc.text(printDate, pageWidth - margin, y, { align: 'right' });

  y += outletName ? 8 : 2;

  // Report title (center)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_TEXT);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Period (center, below title)
  if (period) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED_TEXT);
    doc.text(`Periode: ${period}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // Separator line
  y += 2;
  doc.setDrawColor(...MEDIUM_GRAY);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── SUMMARY SECTION ─────────────────────────────────────
  if (summary && summary.length > 0) {
    const cols = Math.min(summary.length, 3);
    const colWidth = contentWidth / cols;
    const boxHeight = Math.ceil(summary.length / cols) * 18 + 8;

    // Background box
    doc.setFillColor(...LIGHT_GRAY);
    doc.setDrawColor(...MEDIUM_GRAY);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    const boxStartY = y + 10;

    summary.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * colWidth + 8;
      const itemY = boxStartY + row * 18;

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED_TEXT);
      doc.text(item.label, x, itemY);

      // Value
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_TEXT);
      doc.text(String(item.value), x, itemY + 6);
    });

    y += boxHeight + 8;
  }

  // ── TABLE SECTION ───────────────────────────────────────
  const tableColumnStyles: Record<number, { halign?: 'left' | 'center' | 'right' }> = {};
  if (columnStyles) {
    Object.entries(columnStyles).forEach(([key, val]) => {
      tableColumnStyles[Number(key)] = val;
    });
  }

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: y,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: DARK_TEXT,
      lineColor: MEDIUM_GRAY,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: tableColumnStyles,
    tableLineColor: MEDIUM_GRAY,
    tableLineWidth: 0.2,
    didDrawPage: (hookData) => {
      // ── FOOTER (every page) ─────────────────────────────
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 10;

      // Separator line
      doc.setDrawColor(...MEDIUM_GRAY);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

      // App name (left)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED_TEXT);
      doc.text('TiloPOS', margin, footerY);

      // Page number (right)
      const pageNumber = (hookData.pageNumber ?? 1).toString();
      const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.text(
        `Halaman ${pageNumber} dari ${totalPages}`,
        pageWidth - margin,
        footerY,
        { align: 'right' }
      );
    },
  });

  // Update total pages on all pages (deferred because total is known only after rendering)
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 10;
    // Overwrite page number area
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - margin - 50, footerY - 4, 50, 6, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED_TEXT);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

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
  const ExcelJS = await import('exceljs');

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
    currentRow++;
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
 * Get human-readable period label for PDF export header
 */
export function getPeriodLabel(
  dateRange: string,
  customFrom?: Date,
  customTo?: Date
): string {
  const labels: Record<string, string> = {
    today: 'Hari Ini',
    this_week: 'Minggu Ini',
    this_month: 'Bulan Ini',
    this_year: 'Tahun Ini',
  };
  if (dateRange === 'custom' && customFrom) {
    const fromStr = formatDate(customFrom);
    const toStr = customTo ? formatDate(customTo) : fromStr;
    return `${fromStr} - ${toStr}`;
  }
  return labels[dateRange] || dateRange;
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

  const columnStyles = { 1: { halign: 'right' as const } };

  return { headers, data, summary, columnStyles };
}

/**
 * Format product data for export
 */
export function formatProductDataForExport(productReport: {
  topProducts: { productName: string; quantity: number; revenue: number }[];
  totalProducts: number;
  totalQuantitySold: number;
}) {
  const headers = ['Produk', 'Qty Terjual', 'Pendapatan'];
  const data = productReport.topProducts.map((item) => [
    item.productName,
    item.quantity,
    formatCurrency(item.revenue),
  ]);

  const summary = [
    { label: 'Total Produk Terjual', value: productReport.totalProducts },
    { label: 'Total Quantity', value: productReport.totalQuantitySold },
  ];

  const columnStyles = {
    1: { halign: 'right' as const },
    2: { halign: 'right' as const },
  };

  return { headers, data, summary, columnStyles };
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

  const columnStyles = { 1: { halign: 'right' as const } };

  return { headers, data, summary: [], columnStyles };
}

/**
 * Format payment data for export
 */
export function formatPaymentDataForExport(paymentReport: {
  paymentBreakdown: { method: string; amount: number; count: number }[];
  totalAmount: number;
  totalTransactions: number;
}) {
  const headers = ['Metode Pembayaran', 'Jumlah', 'Transaksi'];
  const data = paymentReport.paymentBreakdown.map((item) => [
    item.method,
    formatCurrency(item.amount),
    item.count,
  ]);

  const summary = [
    { label: 'Total Pembayaran', value: formatCurrency(paymentReport.totalAmount) },
    { label: 'Total Transaksi', value: paymentReport.totalTransactions },
  ];

  const columnStyles = {
    1: { halign: 'right' as const },
    2: { halign: 'right' as const },
  };

  return { headers, data, summary, columnStyles };
}
