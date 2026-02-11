import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    return workbook;
  }

  async getSheetNames(buffer: Buffer): Promise<string[]> {
    const workbook = await this.loadWorkbook(buffer);
    return workbook.worksheets.map((ws) => ws.name);
  }

  async previewSheet(buffer: Buffer, sheetName: string, sampleCount = 5): Promise<SheetPreview> {
    const workbook = await this.loadWorkbook(buffer);
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

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
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

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
