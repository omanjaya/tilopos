import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake/js/Printer').default;
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

@Injectable()
export class PdfGeneratorService {
  private readonly printer: typeof PdfPrinter;

  constructor() {
    // Use standard PDF fonts instead of custom fonts
    this.printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });
  }

  async generate(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  buildSalesReport(data: {
    title: string;
    period: string;
    rows: Array<Record<string, unknown>>;
    totals: Record<string, number>;
  }): TDocumentDefinitions {
    const tableBody: Content[][] = [
      [
        { text: 'Date', bold: true },
        { text: 'Transactions', bold: true },
        { text: 'Total Sales', bold: true },
        { text: 'Discount', bold: true },
        { text: 'Tax', bold: true },
        { text: 'Net Sales', bold: true },
      ],
    ];

    for (const row of data.rows) {
      tableBody.push([
        String(row.date || ''),
        String(row.transactions || 0),
        String(row.totalSales || 0),
        String(row.discount || 0),
        String(row.tax || 0),
        String(row.netSales || 0),
      ]);
    }

    return {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: data.title, style: 'header' },
        { text: `Period: ${data.period}`, style: 'subheader' },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
        },
        { text: '\n' },
        { text: `Total Transactions: ${data.totals.transactions || 0}` },
        { text: `Total Sales: ${data.totals.totalSales || 0}` },
        { text: `Net Sales: ${data.totals.netSales || 0}` },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10] as [number, number, number, number],
        },
        subheader: { fontSize: 12, color: 'grey' },
      },
    };
  }
}
