import { Module } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';

@Module({
  providers: [PdfGeneratorService, ExcelGeneratorService],
  exports: [PdfGeneratorService, ExcelGeneratorService],
})
export class ExportModule {}
