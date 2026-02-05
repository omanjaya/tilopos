import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

@Injectable()
export class ExcelGeneratorService {
  private sanitizeCellValue(value: unknown): string | number {
    if (typeof value === 'number') return value;
    const str = String(value ?? '');
    if (/^[=@+\-\t\r]/.test(str)) {
      return "'" + str; // Prefix with single quote to escape formula
    }
    return str;
  }

  async generateSalesReport(data: {
    title: string;
    period: string;
    rows: Array<Record<string, unknown>>;
    totals: Record<string, number>;
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = data.title;
    titleCell.font = { size: 16, bold: true };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Period: ${data.period}`;

    sheet.addRow([]);
    const headerRow = sheet.addRow([
      'Date',
      'Transactions',
      'Total Sales',
      'Discount',
      'Tax',
      'Net Sales',
    ]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    for (const row of data.rows) {
      sheet.addRow([
        this.sanitizeCellValue(row.date),
        this.sanitizeCellValue(row.transactions),
        this.sanitizeCellValue(row.totalSales),
        this.sanitizeCellValue(row.discount),
        this.sanitizeCellValue(row.tax),
        this.sanitizeCellValue(row.netSales),
      ]);
    }

    sheet.addRow([]);
    const totalsRow = sheet.addRow([
      'TOTAL',
      data.totals.transactions,
      data.totals.totalSales,
      data.totals.discount,
      data.totals.tax,
      data.totals.netSales,
    ]);
    totalsRow.font = { bold: true };

    sheet.columns.forEach((column) => {
      column.width = 18;
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async generateInventoryReport(data: {
    title: string;
    rows: Array<Record<string, unknown>>;
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory');

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = data.title;
    sheet.getCell('A1').font = { size: 16, bold: true };

    sheet.addRow([]);
    const headerRow = sheet.addRow([
      'Product',
      'SKU',
      'Current Stock',
      'Low Stock Alert',
      'Status',
    ]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    for (const row of data.rows) {
      sheet.addRow([
        this.sanitizeCellValue(row.productName),
        this.sanitizeCellValue(row.sku),
        this.sanitizeCellValue(row.currentStock),
        this.sanitizeCellValue(row.lowStockAlert),
        this.sanitizeCellValue(row.status),
      ]);
    }

    sheet.columns.forEach((column) => {
      column.width = 20;
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
