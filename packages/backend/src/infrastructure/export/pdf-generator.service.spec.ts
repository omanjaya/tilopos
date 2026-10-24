import { PdfGeneratorService } from './pdf-generator.service';

describe('PDF attachments', () => {
  it('produces a real PDF buffer with the installed asynchronous printer', async () => {
    const buffer = await new PdfGeneratorService().generate({
      defaultStyle: { font: 'Helvetica' },
      content: [{ text: 'Laporan Penjualan' }],
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });
});
