import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

/** Hard limits for uploaded workbooks (R13: no unbounded processing). */
export const MAX_XLSX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_XLSX_ROWS = 5000;
export const MAX_XLSX_SHEETS = 20;
export const XLSX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

export interface ColumnMapping {
  excelColumn: string; // Column header from Excel
  field: string; // Target field name
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface SheetPreview {
  sheetName: string;
  headers: string[];
  sampleRows: ParsedRow[];
  totalRows: number;
}

@Injectable()
export class ExcelParserService {
  private async loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
    if (buffer.length > MAX_XLSX_FILE_BYTES) {
      throw new BadRequestException('File size must be under 10MB');
    }
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch (err) {
      throw new BadRequestException(
        `Invalid XLSX file: ${err instanceof Error ? err.message : 'unreadable'}`,
      );
    }
    if (workbook.worksheets.length > MAX_XLSX_SHEETS) {
      throw new BadRequestException(`Workbook has more than ${MAX_XLSX_SHEETS} sheets`);
    }
    return workbook;
  }

  private getSheet(workbook: ExcelJS.Workbook, sheetName: string): ExcelJS.Worksheet {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new BadRequestException(`Sheet "${sheetName}" not found`);
    return sheet;
  }

  async getSheetNames(buffer: Buffer): Promise<string[]> {
    const workbook = await this.loadWorkbook(buffer);
    return workbook.worksheets.map((ws) => ws.name);
  }

  /** Previews every sheet from a single workbook load. */
  async previewAllSheets(buffer: Buffer, sampleCount = 5): Promise<SheetPreview[]> {
    const workbook = await this.loadWorkbook(buffer);
    return workbook.worksheets.map((sheet) => this.buildPreview(sheet, sampleCount));
  }

  async previewSheet(buffer: Buffer, sheetName: string, sampleCount = 5): Promise<SheetPreview> {
    const workbook = await this.loadWorkbook(buffer);
    return this.buildPreview(this.getSheet(workbook, sheetName), sampleCount);
  }

  private buildPreview(sheet: ExcelJS.Worksheet, sampleCount: number): SheetPreview {
    const sheetName = sheet.name;

    const headers: string[] = [];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? `Column ${colNumber}`);
    });

    const sampleRows: ParsedRow[] = [];
    for (let i = 2; i <= Math.min(sheet.rowCount, sampleCount + 1); i++) {
      const row = sheet.getRow(i);
      const parsed: ParsedRow = {};
      headers.forEach((h, idx) => {
        const cell = row.getCell(idx + 1);
        parsed[h] = this.extractCellValue(cell);
      });
      sampleRows.push(parsed);
    }

    return { sheetName, headers, sampleRows, totalRows: sheet.rowCount - 1 };
  }

  async parseRows(
    buffer: Buffer,
    sheetName: string,
    mappings: ColumnMapping[],
  ): Promise<ParsedRow[]> {
    const workbook = await this.loadWorkbook(buffer);
    const sheet = this.getSheet(workbook, sheetName);
    if (sheet.rowCount - 1 > MAX_XLSX_ROWS) {
      throw new BadRequestException(`Sheet has more than ${MAX_XLSX_ROWS} data rows`);
    }

    // Build header index
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '');
    });

    const headerIndexMap = new Map<string, number>();
    headers.forEach((h, idx) => headerIndexMap.set(h, idx));

    const rows: ParsedRow[] = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      // Skip empty rows
      if (!row.hasValues) continue;

      const parsed: ParsedRow = {};
      for (const mapping of mappings) {
        const colIdx = headerIndexMap.get(mapping.excelColumn);
        if (colIdx !== undefined) {
          const cell = row.getCell(colIdx + 1);
          parsed[mapping.field] = this.extractCellValue(cell);
        }
      }
      rows.push(parsed);
    }

    return rows;
  }

  private extractCellValue(cell: ExcelJS.Cell): string | number | null {
    const value = cell.value;
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    // Handle rich text, formula results, etc.
    if (typeof value === 'object') {
      // ExcelJS formula result
      if ('result' in value && value.result !== undefined) {
        return typeof value.result === 'number' ? value.result : String(value.result);
      }
      // ExcelJS rich text
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText.map((rt: { text: string }) => rt.text).join('');
      }
      return String(value);
    }
    return String(value);
  }
}
